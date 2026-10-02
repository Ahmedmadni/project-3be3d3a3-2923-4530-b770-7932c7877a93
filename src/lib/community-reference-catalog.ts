export type CommunityReferenceCategory =
  | "health_journal_pattern"
  | "conversation_pattern"
  | "first_aid_routing_pattern"
  | "dataset_catalog"
  | "research_data_fixture";

export interface CommunityReferenceRepository {
  key: string;
  repositoryUrl: string;
  category: CommunityReferenceCategory;
  reviewedAt: string;
  clinicalEvidence: false;
  usefulFor: readonly string[];
  prohibitedUses: readonly string[];
  notes: string;
}

export const communityReferenceRepositories = [
  {
    key: "pinkrain_health_journal",
    repositoryUrl: "https://github.com/rudi-q/pinkrain_health_journal",
    category: "health_journal_pattern",
    reviewedAt: "2026-10-02",
    clinicalEvidence: false,
    usefulFor: [
      "health journal information architecture",
      "medication schedule and adherence UX",
      "local-first privacy patterns",
      "wellness trend and correlation presentation",
      "PDF health-summary workflow",
      "notification and end-to-end test patterns",
      "experimental-feature isolation",
    ],
    prohibitedUses: [
      "symptom prediction as clinical evidence",
      "diagnosis",
      "red-flag generation",
      "care-level decisions",
    ],
    notes:
      "The repository marks its symptom-prediction model experimental and disabled by default. Reuse product/testing patterns only; keep clinical decisions in the governed local engine.",
  },
  {
    key: "medical_chatbot",
    repositoryUrl: "https://github.com/saali96/medicalChatbot",
    category: "conversation_pattern",
    reviewedAt: "2026-10-02",
    clinicalEvidence: false,
    usefulFor: [
      "intent taxonomy ideas",
      "fallback and unknown-intent handling",
      "conversation-state test fixtures",
    ],
    prohibitedUses: [
      "mental-health response import",
      "crisis contact import",
      "diagnosis",
      "treatment advice",
    ],
    notes:
      "The repository uses a small bag-of-words/Keras intent classifier and static responses. Its response content is not source-governed and must not enter production medical content.",
  },
  {
    key: "first_aid_chatbot",
    repositoryUrl: "https://github.com/khaoula1972/first-aid-chatbot",
    category: "first_aid_routing_pattern",
    reviewedAt: "2026-10-02",
    clinicalEvidence: false,
    usefulFor: [
      "Arabic first-aid intent routing",
      "classify-then-route interaction pattern",
      "Arabic RTL emergency-chat UX",
      "out-of-scope first-aid fallback patterns",
    ],
    prohibitedUses: [
      "free-form LLM first-aid instructions",
      "unsourced emergency guidance",
      "clinical thresholds",
      "care-level decisions",
    ],
    notes:
      "The project classifies first-aid queries then asks a general LLM for an answer. Our app may reuse the routing concept but must route to governed source-backed content, not free-form medical generation.",
  },
  {
    key: "medical_data_catalog",
    repositoryUrl: "https://github.com/beamandrew/medical-data",
    category: "dataset_catalog",
    reviewedAt: "2026-10-02",
    clinicalEvidence: false,
    usefulFor: [
      "medical dataset discovery",
      "future ML QA dataset inventory",
      "biomedical literature dataset discovery",
      "EHR and imaging research-resource discovery",
    ],
    prohibitedUses: [
      "direct patient guidance",
      "diagnosis",
      "triage rules",
      "automatic clinical-content import",
    ],
    notes:
      "This repository is a curated catalog of external datasets and research resources. Each downstream dataset requires its own provenance, access, license, and suitability review.",
  },
  {
    key: "medicaldata_r_package",
    repositoryUrl: "https://github.com/higgi13425/medicaldata",
    category: "research_data_fixture",
    reviewedAt: "2026-10-02",
    clinicalEvidence: false,
    usefulFor: [
      "data-import QA fixtures",
      "messy medical data cleaning tests",
      "vital-sign and lab schema examples",
      "codebook-driven import validation",
      "professional-mode data-wrangling test cases",
    ],
    prohibitedUses: [
      "patient-specific interpretation",
      "diagnosis",
      "reference-range generation",
      "triage thresholds",
    ],
    notes:
      "The package is designed for teaching reproducible medical research. Its datasets are appropriate for import/quality testing, not as patient-facing clinical guidance.",
  },
] as const satisfies readonly CommunityReferenceRepository[];

export function getCommunityReferenceRepository(
  key: string,
): CommunityReferenceRepository | undefined {
  return communityReferenceRepositories.find((item) => item.key === key);
}

export function isCommunityRepositoryClinicalEvidence(
  repositoryUrl: string,
): false {
  void repositoryUrl;
  return false;
}
