import { describe, expect, it } from "vitest";
import {
  EMPTY_PROFESSIONAL_EMERGENCY_ASSESSMENT,
  EMPTY_PUBLIC_EMERGENCY_ANSWERS,
  buildProfessionalHandover,
  effectiveEmergencyRole,
  publicEmergencyAttentionItems,
} from "./emergency-flow";

describe("emergency role flow", () => {
  it("treats unsure users as the public pathway", () => {
    expect(effectiveEmergencyRole("unsure")).toBe("public");
    expect(effectiveEmergencyRole("public")).toBe("public");
    expect(effectiveEmergencyRole("practitioner")).toBe("practitioner");
  });

  it("extracts only explicit public attention items", () => {
    expect(publicEmergencyAttentionItems({
      ...EMPTY_PUBLIC_EMERGENCY_ANSWERS,
      conscious: "no",
      breathingNormally: "no",
      severeBleeding: "yes",
    })).toEqual(["unconscious", "abnormal_breathing", "severe_bleeding"]);
  });

  it("builds a factual practitioner handover without inventing fields", () => {
    const text = buildProfessionalHandover({
      ...EMPTY_PROFESSIONAL_EMERGENCY_ASSESSMENT,
      consciousness: "Alert",
      systolicBp: "120",
      diastolicBp: "80",
      heartRate: "92",
      onset: "10 minutes ago",
      allergies: "None known",
    });
    expect(text).toContain("Onset: 10 minutes ago");
    expect(text).toContain("Consciousness: Alert");
    expect(text).toContain("BP 120/80");
    expect(text).toContain("HR 92");
    expect(text).toContain("Allergies: None known");
    expect(text).not.toContain("Diagnosis");
    expect(text).not.toContain("Treatment");
  });

  it("does not add empty professional fields", () => {
    expect(buildProfessionalHandover(EMPTY_PROFESSIONAL_EMERGENCY_ASSESSMENT)).toBe("Emergency handover");
  });
});
