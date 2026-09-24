import { describe, expect, it } from "vitest";
import { buildPlayfairMatrix, preparePlayfairDigraphs, suggestPlayfairPlaintext } from "./analysis";

describe("Playfair visualization", () => {
  it("builds the canonical matrix", () => {
    expect(buildPlayfairMatrix("PLAYFAIR EXAMPLE")).toEqual([
      ["P", "L", "A", "Y", "F"],
      ["I", "R", "E", "X", "M"],
      ["B", "C", "D", "G", "H"],
      ["K", "N", "O", "Q", "S"],
      ["T", "U", "V", "W", "Z"],
    ]);
  });

  it("prepares repeated letters and trailing plaintext", () => {
    expect(preparePlayfairDigraphs("BALLOON", "encrypt")).toEqual(["BA", "LX", "LO", "ON"]);
    expect(preparePlayfairDigraphs("X", "encrypt")).toEqual(["XQ"]);
  });

  it("suggests removable duplicate and trailing fillers without changing the canonical text", () => {
    expect(suggestPlayfairPlaintext("KHOACNTXTX")).toEqual({ text: "KHOACNTT", removedCount: 2 });
    expect(suggestPlayfairPlaintext("HELXLO")).toEqual({ text: "HELLO", removedCount: 1 });
    expect(suggestPlayfairPlaintext("XQ")).toEqual({ text: "X", removedCount: 1 });
  });

  it("does not suggest deleting ordinary X/Q or malformed output", () => {
    expect(suggestPlayfairPlaintext("AXBY")).toBeNull();
    expect(suggestPlayfairPlaintext("AQAQ")).toBeNull();
    expect(suggestPlayfairPlaintext("HELXLO!")).toBeNull();
  });
});
