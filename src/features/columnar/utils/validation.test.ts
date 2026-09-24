import { describe, expect, it } from "vitest";
import { MAX_TEXT_FILE_BYTES } from "../../../shared/utils/textFileValidation";
import { parseColumnarKey, validateColumnarContent, validateColumnarInput } from "./validation";

describe("Columnar key validation", () => {
  it("treats each numeric token as the read rank of its physical column", () => {
    expect(parseColumnarKey("3,6,2,1,5,4", "permutation")).toEqual({
      ok: true,
      value: {
        keyType: "permutation",
        raw: "3,6,2,1,5,4",
        normalizedKey: "3,6,2,1,5,4",
        permutation: [3, 6, 2, 1, 5, 4],
        readOrder: [4, 3, 1, 6, 5, 2],
      },
    });
    expect(parseColumnarKey("3 6, 2 1, 5 4", "permutation")).toMatchObject({ ok: true });
  });

  it("accepts 2 and 20 columns, but rejects one or 21", () => {
    expect(parseColumnarKey("2 1", "permutation")).toMatchObject({ ok: true });
    expect(
      parseColumnarKey(
        Array.from({ length: 20 }, (_, index) => index + 1).join(","),
        "permutation",
      ),
    ).toMatchObject({ ok: true });
    expect(parseColumnarKey("1", "permutation")).toMatchObject({ ok: false });
    expect(
      parseColumnarKey(
        Array.from({ length: 21 }, (_, index) => index + 1).join(","),
        "permutation",
      ),
    ).toMatchObject({ ok: false });
  });

  it.each(["", "  ", "1,1", "1,3", "1,,2", "1,2,", "1.5,2", "+1,2", "1 2 x"])(
    "rejects invalid numeric key %j",
    (raw) => {
      expect(parseColumnarKey(raw, "permutation")).toMatchObject({ ok: false });
    },
  );

  it("assigns repeated keyword letters stable ranks from left to right", () => {
    expect(parseColumnarKey("BALLOON", "keyword")).toEqual({
      ok: true,
      value: {
        keyType: "keyword",
        raw: "BALLOON",
        normalizedKey: "balloon",
        permutation: [2, 1, 3, 4, 6, 7, 5],
        readOrder: [2, 1, 3, 4, 7, 5, 6],
      },
    });
    expect(parseColumnarKey("ĐẮT", "keyword")).toMatchObject({
      ok: true,
      value: { normalizedKey: "dat", permutation: [2, 1, 3] },
    });
  });

  it.each(["", "a", "A B", "KEY1", "KEY!", "ab😀", "ßa"])("rejects invalid keyword %j", (raw) => {
    expect(parseColumnarKey(raw, "keyword")).toMatchObject({ ok: false });
  });
});

describe("Columnar input validation", () => {
  it("rejects text that becomes empty after normalization", () => {
    expect(validateColumnarInput("text", "", null)).toBe("Văn bản không được để trống.");
    expect(validateColumnarInput("text", " \n😀 ", null)).toBe(
      "Văn bản phải chứa ít nhất một chữ cái A-Z hoặc chữ số 0-9 sau chuẩn hóa.",
    );
    expect(validateColumnarInput("text", "Đ 9", null)).toBeNull();
  });

  it("reuses the shared .txt and 5 MiB file limits", () => {
    expect(validateColumnarInput("file", "", null)).toBe("Vui lòng chọn file.");
    expect(validateColumnarInput("file", "", new File(["abc"], "data.TXT"))).toBeNull();
    expect(
      validateColumnarInput(
        "file",
        "",
        new File([new Uint8Array(MAX_TEXT_FILE_BYTES + 1)], "large.txt"),
      ),
    ).toBe("File vượt quá dung lượng tối đa 5 MB.");
  });

  it("can validate decoded file contents before submitting a request", () => {
    expect(validateColumnarContent(" \n😀 ")).toBe(
      "Văn bản phải chứa ít nhất một chữ cái A-Z hoặc chữ số 0-9 sau chuẩn hóa.",
    );
    expect(validateColumnarContent("Đ 9")).toBeNull();
  });
});
