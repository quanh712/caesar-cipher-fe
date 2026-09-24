import { describe, expect, it } from "vitest";
import { buildColumnarAnalysis } from "./analysis";
import { parseColumnarKey } from "./validation";

function key(raw: string) {
  const parsed = parseColumnarKey(raw, "permutation");
  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.value;
}

describe("Columnar result analysis", () => {
  it("shows the official example matrix and physical column lengths for encryption", () => {
    const analysis = buildColumnarAnalysis({
      sourceText: "khoacongnghethongtin",
      result: "agnonokntioetchghghn",
      mode: "encrypt",
      key: key("3,6,2,1,5,4"),
      pad: false,
    });

    expect(analysis).toMatchObject({
      normalizedInput: "khoacongnghethongtin",
      readOrder: [4, 3, 1, 6, 5, 2],
      columnLengths: [4, 4, 3, 3, 3, 3],
      columnSegments: ["knti", "hghn", "ono", "agn", "chg", "oet"],
      totalRows: 4,
      padCount: 0,
      isPreview: false,
      rows: [
        ["k", "h", "o", "a", "c", "o"],
        ["n", "g", "n", "g", "h", "e"],
        ["t", "h", "o", "n", "g", "t"],
        ["i", "n", null, null, null, null],
      ],
    });
  });

  it("allocates irregular ciphertext columns by physical position during decryption", () => {
    const analysis = buildColumnarAnalysis({
      sourceText: "AGNO NOKNTIOETCHGHGHN",
      result: "khoacongnghethongtin",
      mode: "decrypt",
      key: key("3,6,2,1,5,4"),
      pad: false,
    });

    expect(analysis?.rows).toEqual([
      ["k", "h", "o", "a", "c", "o"],
      ["n", "g", "n", "g", "h", "e"],
      ["t", "h", "o", "n", "g", "t"],
      ["i", "n", null, null, null, null],
    ]);
    expect(analysis?.columnLengths).toEqual([4, 4, 3, 3, 3, 3]);
  });

  it("shows optional padding without deleting a terminal x on decryption", () => {
    const padded = buildColumnarAnalysis({
      sourceText: "abcde",
      result: "beadcx",
      mode: "encrypt",
      key: key("2,1,3"),
      pad: true,
    });
    expect(padded).toMatchObject({
      padCount: 1,
      columnLengths: [2, 2, 2],
      rows: [
        ["a", "b", "c"],
        ["d", "e", "x"],
      ],
    });

    const decrypted = buildColumnarAnalysis({
      sourceText: "beadcx",
      result: "abcdex",
      mode: "decrypt",
      key: key("2,1,3"),
      pad: false,
    });
    expect(decrypted?.rows).toEqual(padded?.rows);
    expect(decrypted?.padCount).toBe(0);

    const decryptWithIgnoredPad = buildColumnarAnalysis({
      sourceText: "beadcx",
      result: "abcdex",
      mode: "decrypt",
      key: key("2,1,3"),
      pad: true,
    });
    expect(decryptWithIgnoredPad?.padCount).toBe(0);
  });

  it("does not append padding when the row is already complete", () => {
    const analysis = buildColumnarAnalysis({
      sourceText: "abcdef",
      result: "beadcf",
      mode: "encrypt",
      key: key("2,1,3"),
      pad: true,
    });

    expect(analysis?.padCount).toBe(0);
    expect(analysis?.columnLengths).toEqual([2, 2, 2]);
  });

  it("allows a key longer than the source text and empty physical columns", () => {
    const analysis = buildColumnarAnalysis({
      sourceText: "ab",
      result: "ba",
      mode: "encrypt",
      key: key("3,1,4,2"),
      pad: false,
    });
    expect(analysis?.columnLengths).toEqual([1, 1, 0, 0]);
    expect(analysis?.rows).toEqual([["a", "b", null, null]]);
  });

  it("renders all cells up to 200 chars and only 10 preview rows beyond that", () => {
    const common = { mode: "encrypt" as const, key: key("2,1"), pad: false };
    const full = buildColumnarAnalysis({
      ...common,
      sourceText: "a".repeat(200),
      result: "a".repeat(200),
    });
    const preview = buildColumnarAnalysis({
      ...common,
      sourceText: "a".repeat(201),
      result: "a".repeat(201),
    });

    expect(full).toMatchObject({ isPreview: false, totalRows: 100 });
    expect(full?.rows).toHaveLength(100);
    expect(preview).toMatchObject({ isPreview: true, totalRows: 101 });
    expect(preview?.rows).toHaveLength(10);
    expect(preview?.columnLengths).toEqual([101, 100]);
    expect(preview?.columnSegments).toEqual(["a".repeat(10), "a".repeat(10)]);
  });

  it("does not present an analysis if the official result is malformed", () => {
    const common = { sourceText: "abc", mode: "encrypt" as const, key: key("2,1"), pad: false };
    expect(buildColumnarAnalysis({ ...common, result: "AB", pad: false })).toBeNull();
    expect(buildColumnarAnalysis({ ...common, result: "ab", pad: false })).toBeNull();
  });
});
