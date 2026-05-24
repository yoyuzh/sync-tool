import { describe, expect, it } from "vitest";
import { acceleratorFromKeyEvent } from "../src/lib/shortcutAccelerator";

describe("acceleratorFromKeyEvent", () => {
  it("records pressed shortcuts instead of typed text", () => {
    expect(
      acceleratorFromKeyEvent({
        altKey: false,
        ctrlKey: true,
        metaKey: true,
        shiftKey: false,
        key: "c"
      })
    ).toBe("Control+Command+C");
  });

  it("ignores modifier-only key events", () => {
    expect(
      acceleratorFromKeyEvent({
        altKey: true,
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
        key: "Alt"
      })
    ).toBeNull();
  });
});
