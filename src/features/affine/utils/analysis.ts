import type { CipherMode } from "../../../shared/types/cipher";
import type { AffineKeySnapshot } from "../types/cipher";
import {
  findModularInverse,
  greatestCommonDivisor,
  type AffineKeyPairValidation,
} from "./validation";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const AFFINE_MODULUS = ALPHABET.length;

export interface AffineAlphabetMapping {
  sourceLabel: "Bản rõ" | "Bản mã";
  targetLabel: "Bản rõ" | "Bản mã";
  sourceAlphabet: string[];
  mappedAlphabet: string[];
}

export interface AffineAnalysis {
  mode: CipherMode;
  rawA: string;
  rawB: string;
  normalizedA: number;
  normalizedB: number;
  gcdA: number;
  inverseA: number;
  isIdentity: boolean;
  formula: string;
  totalCharacters: number;
  transformedCharacters: number;
  unchangedCharacters: number;
  mapping: AffineAlphabetMapping;
}

export function isAsciiLetter(character: string): boolean {
  const code = character.charCodeAt(0);
  return (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
}

function mod(value: number, modulus = AFFINE_MODULUS): number {
  return ((value % modulus) + modulus) % modulus;
}

function assertValidMultiplier(a: number): number {
  const normalizedA = mod(a);
  if (greatestCommonDivisor(normalizedA, AFFINE_MODULUS) !== 1) {
    throw new RangeError("Affine multiplier must be coprime with 26.");
  }
  return normalizedA;
}

function transformIndex(index: number, mode: CipherMode, a: number, b: number): number {
  if (mode === "encrypt") return mod(a * index + b);

  const inverseA = findModularInverse(a);
  if (inverseA === null) throw new RangeError("Affine multiplier must be coprime with 26.");
  return mod(inverseA * (index - b));
}

export function formatAffineFormula(mode: CipherMode, a: number, b: number): string {
  const normalizedA = assertValidMultiplier(a);
  const normalizedB = mod(b);

  if (mode === "encrypt") return `E(x) = (${normalizedA} × x + ${normalizedB}) mod 26`;

  const inverseA = findModularInverse(normalizedA);
  if (inverseA === null) throw new RangeError("Affine multiplier must be coprime with 26.");
  return `D(y) = ${inverseA} × (y - ${normalizedB}) mod 26`;
}

/** Visualization/test helper only. Production cipher results must come from the Backend. */
export function transformAffineForAnalysis(
  text: string,
  mode: CipherMode,
  a: number,
  b: number,
): string {
  const normalizedA = assertValidMultiplier(a);
  const normalizedB = mod(b);

  return Array.from(text, (character) => {
    if (!isAsciiLetter(character)) return character;

    const code = character.charCodeAt(0);
    const base = code >= 65 && code <= 90 ? 65 : 97;
    const transformed = transformIndex(code - base, mode, normalizedA, normalizedB);
    return String.fromCharCode(base + transformed);
  }).join("");
}

export function buildAffineMapping(mode: CipherMode, a: number, b: number): AffineAlphabetMapping {
  const normalizedA = assertValidMultiplier(a);
  const normalizedB = mod(b);
  const sourceAlphabet = Array.from(ALPHABET);

  return {
    sourceLabel: mode === "encrypt" ? "Bản rõ" : "Bản mã",
    targetLabel: mode === "encrypt" ? "Bản mã" : "Bản rõ",
    sourceAlphabet,
    mappedAlphabet: sourceAlphabet.map((_, index) =>
      ALPHABET.charAt(transformIndex(index, mode, normalizedA, normalizedB)),
    ),
  };
}

export function analyzeAffine(
  source: string,
  mode: CipherMode,
  keys: AffineKeyPairValidation,
): AffineAnalysis | null {
  if (
    !keys.isValid ||
    keys.a.normalized === null ||
    keys.a.gcd === null ||
    keys.a.inverse === null ||
    keys.b.normalized === null
  ) {
    return null;
  }

  const { normalized: normalizedA, inverse: inverseA } = keys.a;
  const normalizedB = keys.b.normalized;

  return analyzeAffineSnapshot(source, mode, {
    rawA: keys.a.raw,
    rawB: keys.b.raw,
    normalizedA,
    normalizedB,
    inverseA,
    isIdentity: keys.isIdentity,
  });
}

export function analyzeAffineSnapshot(
  source: string,
  mode: CipherMode,
  keys: AffineKeySnapshot & { isIdentity?: boolean },
): AffineAnalysis {
  const normalizedA = assertValidMultiplier(keys.normalizedA);
  const normalizedB = mod(keys.normalizedB);
  const inverseA = findModularInverse(normalizedA);
  if (inverseA === null || inverseA !== keys.inverseA) {
    throw new RangeError("Affine key snapshot contains an invalid modular inverse.");
  }

  const characters = Array.from(source);
  const transformedCharacters = characters.filter(isAsciiLetter).length;

  return {
    mode,
    rawA: keys.rawA,
    rawB: keys.rawB,
    normalizedA,
    normalizedB,
    gcdA: greatestCommonDivisor(normalizedA, AFFINE_MODULUS),
    inverseA,
    isIdentity: keys.isIdentity ?? (normalizedA === 1 && normalizedB === 0),
    formula: formatAffineFormula(mode, normalizedA, normalizedB),
    totalCharacters: characters.length,
    transformedCharacters,
    unchangedCharacters: characters.length - transformedCharacters,
    mapping: buildAffineMapping(mode, normalizedA, normalizedB),
  };
}
