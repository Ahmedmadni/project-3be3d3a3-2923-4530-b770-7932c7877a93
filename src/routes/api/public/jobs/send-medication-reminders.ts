import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

// Cloud Jobs → this route (managed bearer auth) → Edge Function (x-cron-secret).
// No Vault needed: both secrets live in Lovable Cloud server env.
export const Route = createFileRoute("/api/public/jobs/send-medication-reminders")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;

        const supabaseUrl = process.env["SUPABASE_URL"];
        const cronSecret = process.env["MEDICATION_REMINDER_CRON_SECRET"];
        if (!supabaseUrl || !cronSecret) {
          return Response.json({ error: "REMINDER_PROXY_NOT_CONFIGURED" }, { status: 503 });
        }

        const res = await fetch(
          `${supabaseUrl.replace(/\/$/, "")}/functions/v1/send-medication-reminders`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-cron-secret": cronSecret },
            body: JSON.stringify({ source: "lovable_cloud_job" }),
          },
        );
        // Counts only; the edge function never returns health data.
        const body = await res.text();
        return new Response(body, {
          status: res.status,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
