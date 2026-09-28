import type { Tables } from "@/integrations/supabase/types";

type ContentMode = "development" | "production";
type FirstAidTopic = Pick<Tables<"first_aid_topics">, "is_active" | "review_status">;

export function isPublicFirstAidTopicVisible(topic: FirstAidTopic, mode: ContentMode): boolean {
  if (!topic.is_active) return false;
  return mode === "development" || topic.review_status === "published";
}

export function allowedFirstAidSectionStatuses(mode: ContentMode): ("reviewed" | "published")[] {
  return mode === "production" ? ["published"] : ["reviewed", "published"];
}
