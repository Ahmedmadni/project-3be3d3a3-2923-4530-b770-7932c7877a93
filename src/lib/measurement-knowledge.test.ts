import { describe, expect, it } from "vitest";
import { selectMeasurementKnowledge } from "./measurement-knowledge";
import type {
  MeasurementKnowledgeArticle,
  MeasurementKnowledgeSection,
  MeasurementKnowledgeSource,
} from "@/types/measurement-knowledge";

const draft: MeasurementKnowledgeArticle = {
  id: "draft",
  measurementTypeId: "bp",
  code: "bp_general",
  audience: "general",
  titleAr: "ضغط الدم",
  summaryAr: "مسودة",
  reviewStatus: "draft",
  isActive: false,
  isDemo: false,
  version: 2,
};

const published: MeasurementKnowledgeArticle = {
  ...draft,
  id: "published",
  reviewStatus: "published",
  isActive: true,
  version: 1,
};

const sections: MeasurementKnowledgeSection[] = [
  {
    id: "b",
    articleId: "published",
    sectionType: "warning_signs",
    titleAr: "متى تحتاج مساعدة",
    bodyAr: "محتوى",
    sortOrder: 20,
  },
  {
    id: "a",
    articleId: "published",
    sectionType: "how_to_measure",
    titleAr: "طريقة القياس",
    bodyAr: "محتوى",
    sortOrder: 10,
  },
];

const sources: MeasurementKnowledgeSource[] = [
  {
    articleId: "published",
    sourceId: "source-1",
    sourceRole: "primary",
  },
];

describe("measurement knowledge selection", () => {
  it("shows only published active non-demo content in production", () => {
    const result = selectMeasurementKnowledge({
      measurementTypeId: "bp",
      audience: "general",
      articles: [draft, published],
      sections,
      sources,
      mode: "production",
    });

    expect(result?.article.id).toBe("published");
  });

  it("does not leak draft inactive content to production", () => {
    const result = selectMeasurementKnowledge({
      measurementTypeId: "bp",
      audience: "general",
      articles: [draft],
      sections: [],
      sources: [],
      mode: "production",
    });

    expect(result).toBeNull();
  });

  it("allows inactive draft preview in development only", () => {
    const result = selectMeasurementKnowledge({
      measurementTypeId: "bp",
      audience: "general",
      articles: [draft],
      sections: [],
      sources: [],
      mode: "development",
    });

    expect(result?.article.id).toBe("draft");
  });

  it("orders sections by sort order", () => {
    const result = selectMeasurementKnowledge({
      measurementTypeId: "bp",
      audience: "general",
      articles: [published],
      sections,
      sources,
    });

    expect(result?.sections.map((item) => item.id)).toEqual(["a", "b"]);
  });

  it("keeps professional and general content separate", () => {
    const result = selectMeasurementKnowledge({
      measurementTypeId: "bp",
      audience: "professional",
      articles: [published],
      sections,
      sources,
    });

    expect(result).toBeNull();
  });
});
