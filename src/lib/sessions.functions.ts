import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";

const input = z.object({
  guestSessionId: z.string().uuid(),
  status: z.enum(["completed", "emergency_redirected"]),
  careLevel: z.enum(["emergency", "urgent", "routine", "self_care"]),
  age: z.number().int().min(0).max(120),
  sex: z.enum(["male", "female"]),
  pregnancy: z.string().max(10).nullable(),
  description: z.string().max(4000),
  symptoms: z.array(z.object({
    symptomId: z.string().uuid(),
    severity: z.enum(["mild", "moderate", "severe"]).nullable(),
    startedWhen: z.string().max(200),
    pattern: z.enum(["continuous", "intermittent", "unknown"]),
    aggravating: z.string().max(500),
  })).min(1).max(30),
  answers: z.array(z.object({ questionId: z.string().uuid(), value: z.string().max(200) })).max(100),
  results: z.array(z.object({
    conditionId: z.string().uuid(),
    score: z.number(),
    level: z.enum(["high", "medium", "low"]),
    explanation: z.record(z.string(), z.unknown()),
    rank: z.number().int(),
  })).max(10),
  engineVersion: z.string().max(40),
  extraction: z.object({
    source: z.enum(["ai", "mock", "none"]),
    model: z.string().max(60).nullable(),
    suggested: z.array(z.string().uuid()).max(30),
    confirmed: z.array(z.string().uuid()).max(30),
    negated: z.array(z.string().uuid()).max(30),
    unresolvedCount: z.number().int().min(0).max(50),
  }).nullable().optional(),
});

/**
 * Persists a completed symptom session. Works for guests (guest_session_id)
 * and signed-in users (user_id taken from the verified bearer token, never from the client).
 */
export const saveSymptomSession = createServerFn({ method: "POST" })
  .inputValidator((d) => input.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let userId: string | null = null;
    const auth = getRequestHeader("authorization");
    if (auth?.startsWith("Bearer ")) {
      const { data: u } = await supabaseAdmin.auth.getUser(auth.slice(7));
      userId = u.user?.id ?? null;
    }
    const { data: modeSetting } = await supabaseAdmin
      .from("app_settings")
      .select("value")
      .eq("key", "content_mode")
      .maybeSingle();
    const productionMode = modeSetting?.value === "production";

    let releaseQuery = supabaseAdmin
      .from("knowledge_releases")
      .select("id,version,is_demo")
      .order("published_at", { ascending: false })
      .limit(1);
    if (productionMode) releaseQuery = releaseQuery.eq("is_demo", false);
    const { data: release } = await releaseQuery.maybeSingle();

    const conditionIds = data.results.map((r) => r.conditionId);
    const conditionVersions = new Map<string, number>();
    const snapshots = new Map<string, Record<string, unknown>>();
    if (conditionIds.length) {
      const { data: rows } = await supabaseAdmin.from("conditions")
        .select("id,code,version,name_ar,name_en,summary_ar,summary_en,care_level,specialty,review_status,is_demo")
        .in("id", conditionIds);
      for (const row of rows ?? []) { conditionVersions.set(row.id, row.version); snapshots.set(row.id, row); }
    }

    const { data: s, error } = await supabaseAdmin.from("symptom_sessions").insert({
      user_id: userId,
      guest_session_id: userId ? null : data.guestSessionId,
      status: data.status,
      care_level: data.careLevel,
      age: data.age,
      sex: data.sex,
      pregnancy_status: data.pregnancy,
      free_text_description: data.description || null,
      knowledge_release_id: release?.id ?? null,
      knowledge_release_version: release?.version ?? null,
      completed_at: new Date().toISOString(),
      extraction_meta: data.extraction
        ? { ...data.extraction, extractor_version: "extract-v1", knowledge_release: release?.version ?? null, engine_version: data.engineVersion }
        : null,
    }).select("id").single();
    if (error || !s) throw new Error("تعذر حفظ الفحص");

    const sid = s.id;
    const ops = [
      supabaseAdmin.from("session_symptoms").insert(data.symptoms.map((x) => ({
        session_id: sid, symptom_id: x.symptomId, severity: x.severity, started_when: x.startedWhen || null,
        pattern: x.pattern, aggravating_factors: x.aggravating || null,
      }))),
    ];
    if (data.answers.length) ops.push(supabaseAdmin.from("session_answers").insert(data.answers.map((a) => ({ session_id: sid, question_id: a.questionId, answer_value: a.value }))) as never);
    if (data.results.length) ops.push(supabaseAdmin.from("session_results").insert(data.results.map((r) => ({
      session_id: sid, condition_id: r.conditionId, matching_score: r.score, matching_level: r.level,
      explanation_data: { ...r.explanation, condition_snapshot: snapshots.get(r.conditionId) ?? null, knowledge_release: release?.version ?? null } as never,
      rank: r.rank,
      engine_version: data.engineVersion,
      ruleset_version: release?.version ?? null,
      condition_version: conditionVersions.get(r.conditionId) ?? null,
    }))) as never);
    await Promise.all(ops);
    return { conditionSnapshots: Object.fromEntries(snapshots) as unknown as Record<string, ConditionSnapshot>, sessionId: sid, saved: userId ? "account" as const : "guest" as const, knowledgeReleaseVersion: release?.version ?? null };
  });

export interface ConditionSnapshot {
  id: string; code: string; version: number; name_ar: string; name_en: string | null;
  summary_ar: string | null; summary_en: string | null; care_level: string;
  specialty: string | null; review_status: string; is_demo: boolean;
}
