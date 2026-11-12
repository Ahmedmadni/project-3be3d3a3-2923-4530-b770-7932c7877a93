import { describe, expect, it } from "vitest";
import { aftercare, birthPreparation, birthSources, labourWarnings, postpartumWarnings } from "@/data/pregnancy-birth";
import { pregnancyBirthLabels } from "@/data/pregnancy-birth-labels";

describe("birth and postpartum education safety", () => {
  const groups = [birthPreparation, labourWarnings, postpartumWarnings, aftercare];

  it("references documented HTTPS sources for every item, in both languages", () => {
    for (const group of groups) for (const item of group) {
      expect(item.id).toBeTruthy();
      expect(item.title.ar && item.title.en && item.body.ar && item.body.en).toBeTruthy();
      expect(item.sources.length).toBeGreaterThan(0);
      for (const sourceId of item.sources) {
        expect(birthSources[sourceId]?.url).toMatch(/^https:\/\//);
      }
    }
  });

  it("does not duplicate identifiers that could hide warnings in the interface", () => {
    const ids = groups.flatMap((items) => items.map((item) => item.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keeps critical labour signals in immediate or emergency categories", () => {
    for (const id of ["birth-imminent", "labour-collapse"]) {
      expect(labourWarnings.find((item) => item.id === id)?.severity).toBe("emergency");
    }
    for (const id of ["waters", "any-bleeding", "movements", "preterm"]) {
      expect(labourWarnings.find((item) => item.id === id)?.severity).toBe("immediate");
    }
  });

  it("keeps postpartum haemorrhage, breathing emergencies and harm risk as ambulance warnings", () => {
    for (const id of ["after-bleeding", "after-breathing", "after-mental"]) {
      expect(postpartumWarnings.find((item) => item.id === id)?.severity).toBe("emergency");
    }
  });

  it("never treats the contraction timer as triage or a reason to defer help", () => {
    expect(pregnancyBirthLabels.ar.timerSafety).toContain("دون استخدام المؤقت");
    expect(pregnancyBirthLabels.en.timerIntro).toContain("cannot diagnose");
    expect(pregnancyBirthLabels.ar.saOnly).toContain("السعودية فقط");
  });
});
