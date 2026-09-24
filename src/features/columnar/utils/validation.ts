import type { InputType } from "../../../shared/types/cipher";
import { validateTextFile } from "../../../shared/utils/textFileValidation";

export type ColumnarKeyKind = "permutation" | "keyword";

export interface ParsedColumnarKey {
  raw: string;
  kind: ColumnarKeyKind;
  canonicalKey: string;
  permutation: number[];
  readOrder: number[];
}

export type ColumnarKeyParseResult =
  { ok: true; value: ParsedColumnarKey } | { ok: false; error: string };

const MIN_COLUMNS = 2;
const MAX_COLUMNS = 256;
const MAX_KEY_CODE_POINTS = 2048;
const OUTER_ASCII_WHITESPACE = /^[ \t\r\n\f\v]+|[ \t\r\n\f\v]+$/g;
const NUMERIC_BODY_PATTERN = /^[0-9]+(?:(?:[ \t\r\n\f\v]+|[ \t\r\n\f\v]*,[ \t\r\n\f\v]*)[0-9]+)*$/;
const INVALID_KEY = "Khóa Columnar phải là hoán vị 1..m hoặc từ khóa gồm 2 đến 256 chữ cái A-Z.";

export function trimColumnarKey(value: string): string {
  return value.replace(OUTER_ASCII_WHITESPACE, "");
}

function parsedKey(
  raw: string,
  kind: ColumnarKeyKind,
  canonicalKey: string,
  permutation: number[],
): ColumnarKeyParseResult {
  const readOrder = permutation
    .map((rank, index) => ({ rank, index }))
    .sort((left, right) => left.rank - right.rank)
    .map(({ index }) => index + 1);
  return { ok: true, value: { raw, kind, canonicalKey, permutation, readOrder } };
}

export function parseColumnarKey(raw: string): ColumnarKeyParseResult {
  const trimmed = trimColumnarKey(raw);
  if (!trimmed) return { ok: false, error: "Thiếu khóa." };
  if (Array.from(trimmed).length > MAX_KEY_CODE_POINTS) {
    return { ok: false, error: INVALID_KEY };
  }

  let numericBody = trimmed;
  if (trimmed.includes("{") || trimmed.includes("}")) {
    if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) {
      return { ok: false, error: INVALID_KEY };
    }
    numericBody = trimColumnarKey(trimmed.slice(1, -1));
    if (numericBody.includes("{") || numericBody.includes("}")) {
      return { ok: false, error: INVALID_KEY };
    }
  }

  if (NUMERIC_BODY_PATTERN.test(numericBody)) {
    const tokens = numericBody.match(/[0-9]+/g) ?? [];
    if (
      tokens.length < MIN_COLUMNS ||
      tokens.length > MAX_COLUMNS ||
      tokens.some((token) => token.length > 1 && token.startsWith("0"))
    ) {
      return { ok: false, error: INVALID_KEY };
    }
    const permutation = tokens.map(Number);
    if (
      permutation.some((rank) => !Number.isSafeInteger(rank) || rank < 1 || rank > tokens.length) ||
      new Set(permutation).size !== tokens.length
    ) {
      return { ok: false, error: INVALID_KEY };
    }
    return parsedKey(raw, "permutation", permutation.join(", "), permutation);
  }

  if (!/^[A-Za-z]{2,256}$/.test(trimmed)) {
    return { ok: false, error: INVALID_KEY };
  }
  const uppercase = trimmed.toUpperCase();
  const sorted = Array.from(uppercase, (character, index) => ({ character, index })).sort(
    (left, right) =>
      left.character.charCodeAt(0) - right.character.charCodeAt(0) || left.index - right.index,
  );
  const permutation = Array<number>(trimmed.length);
  sorted.forEach(({ index }, rank) => {
    permutation[index] = rank + 1;
  });
  return parsedKey(raw, "keyword", uppercase, permutation);
}

export function hasUnpairedSurrogate(value: string): boolean {
  for (let index = 0; index < value.length; index++) {
    const current = value.charCodeAt(index);
    if (current >= 0xd800 && current <= 0xdbff) {
      const next = value.charCodeAt(++index);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return true;
    } else if (current >= 0xdc00 && current <= 0xdfff) {
      return true;
    }
  }
  return false;
}

export function validateColumnarContent(text: string): string | null {
  if (text.length === 0) return "Văn bản không được để trống.";
  if (hasUnpairedSurrogate(text)) return "Văn bản chứa ký tự Unicode không hợp lệ.";
  return null;
}

export function validateColumnarInput(
  inputType: InputType,
  text: string,
  file: File | null,
): string | null {
  return inputType === "file" ? validateTextFile(file) : validateColumnarContent(text);
}
