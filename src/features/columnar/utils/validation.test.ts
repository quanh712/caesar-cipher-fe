import { describe, expect, it } from "vitest";
import { MAX_TEXT_FILE_BYTES } from "../../../shared/utils/textFileValidation";
import { parseColumnarKey, validateColumnarContent, validateColumnarInput } from "./validation";

describe("Columnar key contract", () => {
  it("auto-detects numeric keys and stable keyword ranks", () => {
    expect(parseColumnarKey(" { 3, 6 2, 1 5, 4 } ")).toMatchObject({
      ok: true,
      value: {
        kind: "permutation",
        permutation: [3, 6, 2, 1, 5, 4],
        readOrder: [4, 3, 1, 6, 5, 2],
      },
    });
    expect(parseColumnarKey("BALLOON")).toMatchObject({
      ok: true,
      value: { kind: "keyword", canonicalKey: "BALLOON", permutation: [2, 1, 3, 4, 6, 7, 5] },
    });
  });

  it("accepts 2 and 256 columns, including a key longer than the message", () => {
    expect(parseColumnarKey("2 1")).toMatchObject({ ok: true });
    expect(parseColumnarKey(Array.from({ length: 256 }, (_, i) => i + 1).join(","))).toMatchObject({
      ok: true,
    });
    expect(parseColumnarKey("A".repeat(256))).toMatchObject({ ok: true });
    expect(parseColumnarKey("A".repeat(257))).toMatchObject({ ok: false });
  });

  it.each([
    "",
    " ",
    "1",
    "1,1",
    "1,3",
    "01,2",
    "1,,2",
    "1,2,",
    "+1,2",
    "1.0,2",
    "{1,2",
    "{ {1,2} }",
    "KEY1",
    "A B",
    "ĐẮT",
    "١,٢",
    "\u00a02 1\u00a0",
  ])("rejects invalid key %j", (raw) => expect(parseColumnarKey(raw)).toMatchObject({ ok: false }));

  it("enforces the 2048-code-point raw-key limit", () => {
    expect(parseColumnarKey(" ".repeat(2049) + "2 1")).toMatchObject({ ok: true });
    expect(parseColumnarKey("A".repeat(2049))).toMatchObject({ ok: false });
  });
});

describe("Columnar input contract", () => {
  it("preserves all valid nonempty Unicode, including whitespace", () => {
    expect(validateColumnarContent("")).not.toBeNull();
    expect(validateColumnarContent(" \r\n😀é")).toBeNull();
    expect(validateColumnarContent("\ud800")).not.toBeNull();
  });

  it("uses .txt and 5 MiB raw-byte limits", () => {
    expect(validateColumnarInput("file", "", null)).toBe("Vui lòng chọn file.");
    expect(validateColumnarInput("file", "", new File(["abc"], "data.TXT"))).toBeNull();
    expect(
      validateColumnarInput(
        "file",
        "",
        new File([new Uint8Array(MAX_TEXT_FILE_BYTES + 1)], "large.txt"),
      ),
    ).not.toBeNull();
  });
});
