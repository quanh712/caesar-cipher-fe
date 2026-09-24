import { describe, expect, it } from "vitest";
import {
  findModularInverse,
  normalizeAffineKey,
  parseAffineMultiplier,
  parseAffineOffset,
  validateAffineInput,
  validateAffineKeyPair,
} from "./validation";

describe("Affine key validation", () => {
  it("normalizes signed and arbitrarily large integer tokens", () => {
    expect(normalizeAffineKey(-21n)).toBe(5);
    expect(normalizeAffineKey(34n)).toBe(8);
    expect(normalizeAffineKey(10n ** 100n + 7n)).toBe(23);
  });

  it("accepts all and only multipliers coprime with 26", () => {
    const validMultipliers = [1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25];

    for (let value = 0; value < 26; value += 1) {
      expect(parseAffineMultiplier(String(value)).validForAffine).toBe(
        validMultipliers.includes(value),
      );
    }
  });

  it("returns structured multiplier metadata", () => {
    expect(parseAffineMultiplier(" -21 ")).toEqual({
      raw: " -21 ",
      value: -21n,
      normalized: 5,
      error: null,
      gcd: 1,
      inverse: 21,
      validForAffine: true,
    });
  });

  it("accepts signs and leading zeroes while preserving the raw token", () => {
    expect(parseAffineMultiplier("+005")).toMatchObject({
      raw: "+005",
      value: 5n,
      normalized: 5,
      validForAffine: true,
    });
    expect(parseAffineOffset("-00018")).toEqual({
      raw: "-00018",
      value: -18n,
      normalized: 8,
      error: null,
    });
  });

  it("enforces the 32-character key limit only for file requests", () => {
    const longA = `${"0".repeat(32)}5`;
    const longB = `${"0".repeat(32)}8`;

    expect(validateAffineKeyPair(longA, "8", "file").a.error).toBe("a phải là số nguyên.");
    expect(validateAffineKeyPair("5", longB, "file").b.error).toBe("b phải là số nguyên.");
    expect(validateAffineKeyPair(`  +${"0".repeat(30)}5  `, "8", "file").isValid).toBe(true);
    expect(validateAffineKeyPair(longA, "8", "text").a.error).toBeNull();
  });

  it.each(["1.5", "1e2", "NaN", "Infinity", "+", "-"])(
    "rejects the non-integer token %s",
    (token) => {
      expect(parseAffineMultiplier(token)).toMatchObject({
        value: null,
        normalized: null,
        error: "a phải là số nguyên.",
        validForAffine: false,
      });
      expect(parseAffineOffset(token)).toMatchObject({
        value: null,
        normalized: null,
        error: "b phải là số nguyên.",
      });
    },
  );

  it("keeps untouched empty keys neutral but invalid for submission", () => {
    expect(parseAffineMultiplier("")).toMatchObject({
      value: null,
      normalized: null,
      error: null,
      validForAffine: false,
    });
    expect(parseAffineOffset("   ")).toEqual({
      raw: "   ",
      value: null,
      normalized: null,
      error: null,
    });
    expect(validateAffineKeyPair("", "")).toMatchObject({
      isValid: false,
      isIdentity: false,
    });
  });

  it("explains a multiplier that has no modular inverse", () => {
    expect(parseAffineMultiplier("28")).toMatchObject({
      normalized: 2,
      gcd: 2,
      inverse: null,
      validForAffine: false,
      error: "a không hợp lệ vì gcd(2, 26) phải bằng 1.",
    });
  });

  it("finds modular inverses", () => {
    expect(findModularInverse(5)).toBe(21);
    expect(findModularInverse(-21)).toBe(21);
    expect(findModularInverse(2)).toBeNull();
  });

  it("marks only the normalized pair (1, 0) as identity", () => {
    expect(validateAffineKeyPair("27", "-26")).toMatchObject({
      isValid: true,
      isIdentity: true,
    });
    expect(validateAffineKeyPair("1", "1")).toMatchObject({
      isValid: true,
      isIdentity: false,
    });
  });
});

describe("Affine input validation", () => {
  it("rejects empty text but accepts whitespace-only text", () => {
    expect(validateAffineInput("text", "", null)).toBe("Văn bản không được để trống.");
    expect(validateAffineInput("text", "   ", null)).toBeNull();
  });

  it("uses the shared text file validation", () => {
    expect(validateAffineInput("file", "", null)).toBe("Vui lòng chọn file.");
    expect(
      validateAffineInput("file", "", new File(["HELLO"], "message.txt", { type: "text/plain" })),
    ).toBeNull();
  });
});
