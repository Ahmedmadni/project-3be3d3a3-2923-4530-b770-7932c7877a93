import { describe, expect, it } from "vitest";
import {
  historyPreviewNames,
  historyTone,
  isEmergencyHistorySession,
} from "./history-presentation";

describe("history presentation", () => {
  it("maps care levels to clear visual tones", () => {
    expect(historyTone("emergency")).toBe("danger");
    expect(historyTone("urgent")).toBe("warning");
    expect(historyTone("routine")).toBe("primary");
    expect(historyTone("self_care")).toBe("success");
    expect(historyTone(null)).toBe("primary");
  });

  it("recognizes emergency history from status or care level", () => {
    expect(isEmergencyHistorySession("emergency_redirected", "routine")).toBe(true);
    expect(isEmergencyHistorySession("completed", "emergency")).toBe(true);
    expect(isEmergencyHistorySession("completed", "urgent")).toBe(false);
  });

  it("keeps symptom previews short", () => {
    expect(historyPreviewNames(["a", "b", "c", "d"])).toEqual(["a", "b", "c"]);
    expect(historyPreviewNames(["a", "", "b"], 2)).toEqual(["a", "b"]);
  });
});
