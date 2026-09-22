import { describe, expect, it } from "vitest";
import { analyzeAffine, buildAffineMapping, transformAffineForAnalysis } from "./analysis";
import { validateAffineKeyPair } from "./validation";

describe("Affine analysis transformation", () => {
  it("matches the official example vector in both directions", () => {
    expect(transformAffineForAnalysis("HELLO", "encrypt", 5, 8)).toBe("RCLLA");
    expect(transformAffineForAnalysis("RCLLA", "decrypt", 5, 8)).toBe("HELLO");
  });

  it("preserves case and non-ASCII-letter characters", () => {
    const source = "Hello, Việt Nam! 😀\r\n123";
    const encrypted = transformAffineForAnalysis(source, "encrypt", 5, 8);

    expect(encrypted).toBe("Rclla, Jwệz Viq! 😀\r\n123");
    expect(transformAffineForAnalysis(encrypted, "decrypt", 5, 8)).toBe(source);
  });

  it("rejects a multiplier without an inverse", () => {
    expect(() => transformAffineForAnalysis("HELLO", "encrypt", 2, 8)).toThrow(
      "Affine multiplier must be coprime with 26.",
    );
  });
});

describe("Affine alphabet mapping", () => {
  it("builds a plaintext-to-ciphertext mapping for encryption", () => {
    const mapping = buildAffineMapping("encrypt", 5, 8);

    expect(mapping.sourceLabel).toBe("Bản rõ");
    expect(mapping.targetLabel).toBe("Bản mã");
    expect(mapping.sourceAlphabet.join("")).toBe("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
    expect(mapping.mappedAlphabet.join("")).toBe("INSXCHMRWBGLQVAFKPUZEJOTYD");
  });

  it("builds a ciphertext-to-plaintext mapping for decryption", () => {
    const mapping = buildAffineMapping("decrypt", 5, 8);

    expect(mapping.sourceLabel).toBe("Bản mã");
    expect(mapping.targetLabel).toBe("Bản rõ");
    expect(mapping.mappedAlphabet[17]).toBe("H");
  });
});

describe("Affine result analysis", () => {
  it("returns normalized key metadata, formula and Unicode code-point statistics", () => {
    const analysis = analyzeAffine("Hi 😀!", "encrypt", validateAffineKeyPair("-21", "34"));

    expect(analysis).toMatchObject({
      mode: "encrypt",
      rawA: "-21",
      rawB: "34",
      normalizedA: 5,
      normalizedB: 8,
      gcdA: 1,
      inverseA: 21,
      isIdentity: false,
      formula: "E(x) = (5 × x + 8) mod 26",
      totalCharacters: 5,
      transformedCharacters: 2,
      unchangedCharacters: 3,
    });
  });

  it("uses the inverse in the decryption formula", () => {
    const analysis = analyzeAffine("R", "decrypt", validateAffineKeyPair("5", "8"));

    expect(analysis?.formula).toBe("D(y) = 21 × (y - 8) mod 26");
    expect(analysis?.mapping.sourceLabel).toBe("Bản mã");
  });

  it("marks an identity key without rejecting it", () => {
    const analysis = analyzeAffine("Identity", "encrypt", validateAffineKeyPair("27", "-26"));

    expect(analysis?.isIdentity).toBe(true);
    expect(transformAffineForAnalysis("Identity", "encrypt", 1, 0)).toBe("Identity");
  });

  it("does not create analysis for invalid or incomplete keys", () => {
    expect(analyzeAffine("HELLO", "encrypt", validateAffineKeyPair("2", "8"))).toBeNull();
    expect(analyzeAffine("HELLO", "encrypt", validateAffineKeyPair("5", ""))).toBeNull();
  });
});
