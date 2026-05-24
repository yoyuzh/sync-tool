import { describe, expect, it } from "vitest";
import {
  extractClipboardFilePath,
  normalizeClipboardFile,
  normalizeClipboardText
} from "../electron/clipboard/clipboardNormalizer";

describe("clipboardNormalizer", () => {
  it("does not treat whitespace-only text as uploadable text", () => {
    expect(normalizeClipboardText("  \n\t ")).toBeNull();
  });

  it("extracts macOS Finder file urls from clipboard html", () => {
    expect(
      extractClipboardFilePath("", '<a href="file:///Users/mac/Desktop/demo%20file.pdf">demo file.pdf</a>')
    ).toBe("/Users/mac/Desktop/demo file.pdf");
  });

  it("creates a source-file record shape for captured files", () => {
    const normalized = normalizeClipboardFile("/Users/mac/Desktop/demo file.pdf");

    expect(normalized).toMatchObject({
      filePath: "/Users/mac/Desktop/demo file.pdf",
      title: "demo file.pdf",
      mimeType: "application/pdf"
    });
  });
});
