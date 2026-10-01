import { describe, expect, it } from "vitest";
import {
  assessMeasurementCaptureQuality,
  getCaptureQuestions,
  isCaptureComplete,
} from "./measurement-capture";

describe("guided measurement capture", () => {
  it("shows oral-specific temperature question only for oral readings", () => {
    const oral = getCaptureQuestions("temperature", { measurement_site: "oral" });
    const ear = getCaptureQuestions("temperature", { measurement_site: "tympanic" });
    expect(oral.some((q) => q.key === "recent_food_or_drink")).toBe(true);
    expect(oral.some((q) => q.key === "ear_technique_confirmed")).toBe(false);
    expect(ear.some((q) => q.key === "ear_technique_confirmed")).toBe(true);
  });

  it("keeps incomplete capture quality unknown", () => {
    expect(assessMeasurementCaptureQuality("weight", {}).quality).toBe("unknown");
  });

  it("marks a complete careful weight capture good", () => {
    const context = {
      scale_level_surface: true,
      same_scale_for_trend: true,
      shoes_or_heavy_items_removed: true,
      still_until_stable: true,
      time_of_day: "morning",
    };
    expect(isCaptureComplete("weight", context)).toBe(true);
    expect(assessMeasurementCaptureQuality("weight", context).quality).toBe("good");
  });

  it("marks a completed but poor blood pressure capture questionable", () => {
    const context = {
      device_validated: true,
      cuff_size_confirmed: true,
      rest_minutes: 2,
      back_supported: true,
      feet_flat: true,
      legs_crossed: false,
      arm_supported_at_heart_level: true,
      cuff_over_clothing: false,
      talking_during_measurement: false,
      recent_smoking_caffeine_or_exercise_30m: false,
    };
    expect(isCaptureComplete("blood_pressure", context)).toBe(true);
    expect(assessMeasurementCaptureQuality("blood_pressure", context).quality).toBe("questionable");
  });
});
