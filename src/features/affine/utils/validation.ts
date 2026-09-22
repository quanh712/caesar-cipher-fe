import type { InputType } from "../../../shared/types/cipher";
import { validateTextFile } from "../../../shared/utils/textFileValidation";

const INTEGER_TOKEN = /^[+-]?\d+$/;
const AFFINE_MODULUS = 26;

export interface ParsedAffineKey {
  raw: string;
  value: bigint | null;
  normalized: number | null;
  error: string | null;
}

export interface ParsedAffineMultiplier extends ParsedAffineKey {
  gcd: number | null;
  inverse: number | null;
  validForAffine: boolean;
}

export interface AffineKeyPairValidation {
  a: ParsedAffineMultiplier;
  b: ParsedAffineKey;
  isValid: boolean;
  isIdentity: boolean;
}

export function normalizeAffineKey(value: bigint): number {
  const modulus = BigInt(AFFINE_MODULUS);
  return Number(((value % modulus) + modulus) % modulus);
}

export function greatestCommonDivisor(left: number, right: number): number {
  let a = Math.abs(left);
  let b = Math.abs(right);

  while (b !== 0) {
    const remainder = a % b;
    a = b;
    b = remainder;
  }

  return a;
}

export function findModularInverse(value: number, modulus = AFFINE_MODULUS): number | null {
  const normalizedValue = ((value % modulus) + modulus) % modulus;

  for (let candidate = 1; candidate < modulus; candidate += 1) {
    if ((normalizedValue * candidate) % modulus === 1) return candidate;
  }

  return null;
}

function parseIntegerKey(raw: string, name: "a" | "b"): ParsedAffineKey {
  const token = raw.trim();
  if (token.length === 0) {
    return { raw, value: null, normalized: null, error: null };
  }

  if (!INTEGER_TOKEN.test(token)) {
    return { raw, value: null, normalized: null, error: `${name} phải là số nguyên.` };
  }

  const value = BigInt(token);
  return {
    raw,
    value,
    normalized: normalizeAffineKey(value),
    error: null,
  };
}

export function parseAffineMultiplier(raw: string): ParsedAffineMultiplier {
  const parsed = parseIntegerKey(raw, "a");
  if (parsed.normalized === null) {
    return {
      ...parsed,
      gcd: null,
      inverse: null,
      validForAffine: false,
    };
  }

  const gcd = greatestCommonDivisor(parsed.normalized, AFFINE_MODULUS);
  const validForAffine = gcd === 1;

  return {
    ...parsed,
    error: validForAffine ? null : `a không hợp lệ vì gcd(${parsed.normalized}, 26) phải bằng 1.`,
    gcd,
    inverse: validForAffine ? findModularInverse(parsed.normalized) : null,
    validForAffine,
  };
}

export function parseAffineOffset(raw: string): ParsedAffineKey {
  return parseIntegerKey(raw, "b");
}

export function validateAffineKeyPair(aRaw: string, bRaw: string): AffineKeyPairValidation {
  const a = parseAffineMultiplier(aRaw);
  const b = parseAffineOffset(bRaw);
  const isValid = a.validForAffine && b.value !== null && b.error === null;

  return {
    a,
    b,
    isValid,
    isIdentity: isValid && a.normalized === 1 && b.normalized === 0,
  };
}

export function validateAffineInput(
  inputType: InputType,
  text: string,
  file: File | null,
): string | null {
  if (inputType === "text") {
    return text.length > 0 ? null : "Văn bản không được để trống.";
  }

  return validateTextFile(file);
}
