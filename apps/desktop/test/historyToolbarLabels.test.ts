import { describe, expect, it } from "vitest";
import { TOOLBAR_CAPTURE_BUTTON_LABEL } from "../src/components/HistoryToolbar";

describe("HistoryToolbar labels", () => {
  it("does not label local clipboard capture as server publishing", () => {
    expect(TOOLBAR_CAPTURE_BUTTON_LABEL).toBe("+ 捕获");
  });
});
