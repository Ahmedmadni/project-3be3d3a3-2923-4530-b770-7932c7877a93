import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ReferenceData } from "@/engines/reference";

async function all<T>(table: string, order?: string): Promise<T[]> {
  let q = supabase.from(table as never).select("*");
  if (order) q = q.order(order as never);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as T[];
}

export const referenceQuery = queryOptions({
  queryKey: ["reference-data"],
  staleTime: 5 * 60_000,
  queryFn: async (): Promise<ReferenceData> => {
    const [symptoms, conditions, conditionSymptoms, questions, questionOptions, questionRules, redFlags, redFlagRules, emergencyContacts] =
      await Promise.all([
        all("symptoms", "sort_order"), all("conditions"), all("condition_symptoms"), all("questions", "sort_order"),
        all("question_options", "sort_order"), all("question_rules"), all("red_flags"), all("red_flag_rules"), all("emergency_contacts"),
      ]);
    return { symptoms, conditions, conditionSymptoms, questions, questionOptions, questionRules, redFlags, redFlagRules, emergencyContacts } as ReferenceData;
  },
});
