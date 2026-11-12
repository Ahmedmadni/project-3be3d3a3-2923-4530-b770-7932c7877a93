import { describe, expect, it } from "vitest";
import { newbornBasics, newbornLabels, newbornSources, newbornWarnings } from "@/data/pregnancy-newborn";

describe("newborn safety education", () => {
  const items = [...newbornWarnings, ...newbornBasics];

  it("has unique identifiers, bilingual text and valid source references", () => {
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
    for (const item of items) {
      expect(item.title.ar.trim().length).toBeGreaterThan(5);
      expect(item.title.en.trim().length).toBeGreaterThan(5);
      expect(item.body.ar.trim().length).toBeGreaterThan(15);
      expect(item.body.en.trim().length).toBeGreaterThan(15);
      expect(item.sources.length).toBeGreaterThan(0);
      for (const id of item.sources) {
        expect(newbornSources[id]?.url).toMatch(/^https:\/\//);
      }
    }
  });

  it("routes life-threatening signs to immediate ambulance language", () => {
    for (const id of ["newborn-unresponsive", "newborn-breathing", "newborn-seizure"]) {
      expect(newbornWarnings.find((item) => item.id === id)?.urgency).toBe("ambulance");
    }
  });

  it("does not suggest waiting for fever in a severely ill infant", () => {
    expect(newbornWarnings.find((item) => item.id === "newborn-not-feeding")?.body.en).toContain("Do not wait for a fever");
    expect(newbornWarnings.find((item) => item.id === "newborn-temperature")?.body.en).toContain("without fever");
  });

  it("keeps fever, poor feeding, green vomit and early jaundice in emergency assessment", () => {
    for (const id of ["newborn-temperature", "newborn-not-feeding", "newborn-green-vomit", "newborn-jaundice-24"]) {
      expect(newbornWarnings.find((item) => item.id === id)?.urgency).toBe("urgentAssessment");
    }
  });

  it("provides safer sleep and never presents this as medically approved", () => {
    expect(newbornBasics.find((item) => item.id === "newborn-safe-sleep")?.body.en).toContain("on their back");
    expect(newbornLabels.en.review).toContain("not yet locally clinically approved");
    expect(newbornLabels.ar.local).toContain("السعودية");
  });
});
