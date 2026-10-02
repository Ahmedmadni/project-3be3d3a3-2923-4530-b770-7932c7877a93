import { describe, expect, it } from "vitest";
import {
  communityReferenceRepositories,
  getCommunityReferenceRepository,
  isCommunityRepositoryClinicalEvidence,
} from "./community-reference-catalog";

describe("community reference repository catalog", () => {
  it("records all five reviewed repositories", () => {
    expect(
      communityReferenceRepositories.map((item) => item.repositoryUrl),
    ).toEqual(
      expect.arrayContaining([
        "https://github.com/rudi-q/pinkrain_health_journal",
        "https://github.com/saali96/medicalChatbot",
        "https://github.com/khaoula1972/first-aid-chatbot",
        "https://github.com/beamandrew/medical-data",
        "https://github.com/higgi13425/medicaldata",
      ]),
    );
    expect(communityReferenceRepositories).toHaveLength(5);
  });

  it("never promotes a community GitHub repository to clinical evidence", () => {
    for (const item of communityReferenceRepositories) {
      expect(item.clinicalEvidence).toBe(false);
      expect(
        isCommunityRepositoryClinicalEvidence(item.repositoryUrl),
      ).toBe(false);
      expect(item.prohibitedUses.length).toBeGreaterThan(0);
    }
  });

  it("captures the high-value PinkRain and Arabic first-aid patterns", () => {
    expect(
      getCommunityReferenceRepository("pinkrain_health_journal")?.usefulFor,
    ).toEqual(
      expect.arrayContaining([
        "medication schedule and adherence UX",
        "PDF health-summary workflow",
        "local-first privacy patterns",
      ]),
    );

    expect(
      getCommunityReferenceRepository("first_aid_chatbot")?.usefulFor,
    ).toEqual(
      expect.arrayContaining([
        "Arabic first-aid intent routing",
        "classify-then-route interaction pattern",
      ]),
    );
  });

  it("keeps medical datasets limited to research and QA use", () => {
    for (const key of [
      "medical_data_catalog",
      "medicaldata_r_package",
    ]) {
      const item = getCommunityReferenceRepository(key);
      expect(item?.clinicalEvidence).toBe(false);
      expect(item?.prohibitedUses).toContain("diagnosis");
    }
  });
});
