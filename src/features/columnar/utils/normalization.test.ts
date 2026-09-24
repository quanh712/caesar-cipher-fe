import { describe, expect, it } from "vitest";
import { foldColumnarText, normalizeColumnarText } from "./normalization";

describe("Columnar text normalization", () => {
  it("removes Vietnamese accents, punctuation and spaces while retaining ASCII digits", () => {
    expect(normalizeColumnarText("Khóa Công Nghệ Thông Tin 2026!")).toMatchObject({
      text: "khoacongnghethongtin2026",
      changed: true,
    });
    expect(normalizeColumnarText("Đà Nẵng").text).toBe("danang");
    expect(normalizeColumnarText("a\u0301 B 0").text).toBe("ab0");
  });

  it("counts removed Unicode code points without counting deaccented letters as removed", () => {
    expect(normalizeColumnarText("á b!😀")).toEqual({
      text: "ab",
      changed: true,
      removedCount: 3,
    });
  });

  it("distinguishes unchanged content from normalized-empty content", () => {
    expect(normalizeColumnarText("abc123")).toEqual({
      text: "abc123",
      changed: false,
      removedCount: 0,
    });
    expect(normalizeColumnarText("  😀 ")).toMatchObject({ text: "", changed: true });
  });

  it("keeps invalid keyword characters visible to strict key validation", () => {
    expect(foldColumnarText("ĐẮT 2!")).toBe("dat 2!");
  });
});
