import { describe, expect, it } from "vitest";
import { readColumnarFile } from "./fileText";

describe("Columnar UTF-8 file reader", () => {
  it("strips only the leading BOM from logical text", async () => {
    expect(
      await readColumnarFile(new File([new Uint8Array([0xef, 0xbb, 0xbf])], "bom.txt")),
    ).toEqual({ text: "", hasBom: true });
    expect(await readColumnarFile(new File(["A\uFEFFB"], "middle.txt"))).toEqual({
      text: "A\uFEFFB",
      hasBom: false,
    });
  });

  it("rejects malformed UTF-8 instead of replacing bytes", async () => {
    await expect(readColumnarFile(new File([new Uint8Array([0xff])], "bad.txt"))).rejects.toThrow();
  });
});
