import type {
  MeasurementKnowledgeArticle,
  MeasurementKnowledgeBundle,
  MeasurementKnowledgeSection,
  MeasurementKnowledgeSource,
} from "@/types/measurement-knowledge";

export type KnowledgeContentMode = "production" | "development";

export function selectMeasurementKnowledge(params: {
  measurementTypeId: string;
  audience: MeasurementKnowledgeArticle["audience"];
  articles: MeasurementKnowledgeArticle[];
  sections: MeasurementKnowledgeSection[];
  sources: MeasurementKnowledgeSource[];
  mode?: KnowledgeContentMode;
}): MeasurementKnowledgeBundle | null {
  const mode = params.mode ?? "production";

  const article = params.articles
    .filter((item) => item.measurementTypeId === params.measurementTypeId)
    .filter((item) => item.audience === params.audience)
    .filter((item) => visible(item, mode))
    .sort((a, b) => b.version - a.version)[0];

  if (!article) return null;

  return {
    article,
    sections: params.sections
      .filter((section) => section.articleId === article.id)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id)),
    sources: params.sources.filter((source) => source.articleId === article.id),
  };
}

function visible(
  article: Pick<
    MeasurementKnowledgeArticle,
    "reviewStatus" | "isActive" | "isDemo"
  >,
  mode: KnowledgeContentMode,
): boolean {
  if (!article.isActive || article.reviewStatus === "retired") return false;
  if (mode === "production") {
    return article.reviewStatus === "published" && !article.isDemo;
  }
  return true;
}
