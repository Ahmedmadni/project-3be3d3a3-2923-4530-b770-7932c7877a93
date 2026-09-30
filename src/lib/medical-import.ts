import { z } from "zod";
import { isGitHubUrl } from "./external-source-policy";

const SourceRef = z.string().min(1);

export const MedicalImportSourceSchema = z.object({
  ref: SourceRef,
  title: z.string().min(1),
  organization: z.string().min(1),
  url: z.string().url(),
  sourceType: z.enum(["government", "clinical_guideline", "academic", "systematic_review", "reference"]),
  publicationDate: z.string().optional(),
  language: z.string().min(2).optional(),
  country: z.string().min(2).optional(),
});

const GovernedItemBase = z.object({
  code: z.string().min(1),
  sourceRefs: z.array(SourceRef).min(1),
  changeReason: z.string().min(3),
});

export const MedicalImportConditionSchema = GovernedItemBase.extend({
  kind: z.literal("condition"),
  nameAr: z.string().min(1),
  nameEn: z.string().optional(),
  summaryAr: z.string().min(1),
  summaryEn: z.string().optional(),
  specialty: z.string().optional(),
});

export const MedicalImportRedFlagSchema = GovernedItemBase.extend({
  kind: z.literal("red_flag"),
  titleAr: z.string().min(1),
  titleEn: z.string().optional(),
  descriptionAr: z.string().min(1),
  careLevel: z.enum(["urgent", "emergency"]),
});

export const MedicalImportQuestionSchema = GovernedItemBase.extend({
  kind: z.literal("question"),
  questionAr: z.string().min(1),
  questionEn: z.string().optional(),
  questionType: z.enum(["yes_no", "yes_no_unsure", "single_choice", "multi_choice", "number", "text", "severity", "duration"]),
});

export const MedicalImportFirstAidSchema = GovernedItemBase.extend({
  kind: z.literal("first_aid"),
  titleAr: z.string().min(1),
  titleEn: z.string().optional(),
  summaryAr: z.string().min(1),
});

export const MedicalImportItemSchema = z.discriminatedUnion("kind", [
  MedicalImportConditionSchema,
  MedicalImportRedFlagSchema,
  MedicalImportQuestionSchema,
  MedicalImportFirstAidSchema,
]);

export const MedicalImportBundleSchema = z.object({
  schemaVersion: z.literal("1"),
  bundleId: z.string().min(1),
  createdAt: z.string().datetime(),
  sources: z.array(MedicalImportSourceSchema).min(1),
  items: z.array(MedicalImportItemSchema).min(1),
});

export type MedicalImportBundle = z.infer<typeof MedicalImportBundleSchema>;

export type MedicalImportValidation = {
  ok: boolean;
  bundle?: MedicalImportBundle;
  errors: string[];
};

export function validateMedicalImport(input: unknown): MedicalImportValidation {
  const parsed = MedicalImportBundleSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((issue) => `${issue.path.join(".") || "bundle"}: ${issue.message}`),
    };
  }

  const sourceRefs = new Set(parsed.data.sources.map((source) => source.ref));
  const duplicateSources = parsed.data.sources
    .map((source) => source.ref)
    .filter((ref, index, all) => all.indexOf(ref) !== index);
  const duplicateCodes = parsed.data.items
    .map((item) => `${item.kind}:${item.code}`)
    .filter((key, index, all) => all.indexOf(key) !== index);
  const unknownRefs = parsed.data.items.flatMap((item) =>
    item.sourceRefs.filter((ref) => !sourceRefs.has(ref)).map((ref) => `${item.kind}:${item.code} -> ${ref}`),
  );

  const githubClinicalSources = parsed.data.sources
    .filter((source) => isGitHubUrl(source.url))
    .map((source) => source.ref);

  const errors = [
    ...new Set(duplicateSources.map((ref) => `duplicate source ref: ${ref}`)),
    ...new Set(duplicateCodes.map((key) => `duplicate item code: ${key}`)),
    ...unknownRefs.map((ref) => `unknown source ref: ${ref}`),
    ...githubClinicalSources.map(
      (ref) => `GitHub repository URLs are not accepted as primary clinical evidence: ${ref}`,
    ),
  ];

  if (errors.length) return { ok: false, errors };
  return { ok: true, bundle: parsed.data, errors: [] };
}

/**
 * Imported clinical content must always enter governance as a draft.
 * Importing never implies medical review, approval, publication, or rule activation.
 */
export function importGovernanceDefaults() {
  return {
    review_status: "draft" as const,
    is_active: false,
    is_demo: false,
    translation_status: "not_started" as const,
  };
}
