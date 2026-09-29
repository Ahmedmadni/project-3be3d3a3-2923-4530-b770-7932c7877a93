import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";

const input = z.object({
  term: z.string().trim().min(2).max(120),
  sourceVocabulary: z.string().trim().max(40).optional(),
});

export type UmlsSearchItem = {
  ui: string;
  name: string;
  rootSource: string | null;
  uri: string | null;
};

export type UmlsSearchResponse =
  | { ok: true; items: UmlsSearchItem[] }
  | { ok: false; error: "AUTH_REQUIRED" | "FORBIDDEN" | "NOT_CONFIGURED" | "UNAVAILABLE" };

/**
 * Staff-only UMLS terminology lookup.
 *
 * Important: this accepts terminology terms only. Do not pass a patient's free
 * text, history, identifiers, or assessment data to UMLS.
 */
export const searchUmlsTerminology = createServerFn({ method: "POST" })
  .inputValidator((data) => input.parse(data))
  .handler(async ({ data }): Promise<UmlsSearchResponse> => {
    const apiKey = process.env["UMLS_API_KEY"];
    if (!apiKey) return { ok: false, error: "NOT_CONFIGURED" };

    const auth = getRequestHeader("authorization");
    if (!auth?.startsWith("Bearer ")) return { ok: false, error: "AUTH_REQUIRED" };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: authData } = await supabaseAdmin.auth.getUser(auth.slice(7));
    const userId = authData.user?.id;
    if (!userId) return { ok: false, error: "AUTH_REQUIRED" };

    const { data: roles, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    if (roleError) return { ok: false, error: "UNAVAILABLE" };
    const allowed = new Set(["content_editor", "medical_reviewer", "admin", "super_admin"]);
    if (!(roles ?? []).some((row) => allowed.has(row.role))) {
      return { ok: false, error: "FORBIDDEN" };
    }

    const url = new URL("https://uts-ws.nlm.nih.gov/rest/search/current");
    url.searchParams.set("string", data.term);
    url.searchParams.set("apiKey", apiKey);
    url.searchParams.set("returnIdType", "concept");
    url.searchParams.set("pageSize", "15");
    if (data.sourceVocabulary) url.searchParams.set("sabs", data.sourceVocabulary);

    try {
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) return { ok: false, error: "UNAVAILABLE" };

      const json = await response.json() as {
        result?: {
          results?: Array<{
            ui?: string;
            name?: string;
            rootSource?: string;
            uri?: string;
          }>;
        };
      };

      const items = (json.result?.results ?? [])
        .filter((item) => item.ui && item.ui !== "NONE" && item.name)
        .map((item) => ({
          ui: item.ui!,
          name: item.name!,
          rootSource: item.rootSource ?? null,
          uri: item.uri ?? null,
        }));

      return { ok: true, items };
    } catch {
      return { ok: false, error: "UNAVAILABLE" };
    }
  });
