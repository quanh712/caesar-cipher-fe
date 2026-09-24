import type { InputType } from "../../../shared/types/cipher";
import { validateTextFile } from "../../../shared/utils/textFileValidation";
import { foldColumnarText, normalizeColumnarText } from "./normalization";

export type ColumnarKeyType = "permutation" | "keyword";

export interface ParsedColumnarKey {
  keyType: ColumnarKeyType;
  raw: string;
  normalizedKey: string;
  permutation: number[];
  readOrder: number[];
}

export type ColumnarKeyParseResult =
  { ok: true; value: ParsedColumnarKey } | { ok: false; error: string };

const MIN_COLUMNS = 2;
const MAX_COLUMNS = 20;
const NUMERIC_KEY_PATTERN = /^\d+(?:\s*,\s*\d+|\s+\d+)*$/;

function buildParsedKey(
  raw: string,
  keyType: ColumnarKeyType,
  normalizedKey: string,
  permutation: number[],
): ColumnarKeyParseResult {
  const readOrder = permutation
    .map((rank, index) => ({ rank, index }))
    .sort((left, right) => left.rank - right.rank)
    .map(({ index }) => index + 1);

  return { ok: true, value: { keyType, raw, normalizedKey, permutation, readOrder } };
}

export function parseColumnarKey(raw: string, keyType: ColumnarKeyType): ColumnarKeyParseResult {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return { ok: false, error: "Thiếu khóa." };

  if (keyType === "permutation") {
    if (!NUMERIC_KEY_PATTERN.test(trimmed)) {
      return {
        ok: false,
        error: "Khóa số chỉ gồm số nguyên dương, ngăn bằng dấu phẩy hoặc khoảng trắng.",
      };
    }

    const permutation = trimmed.split(/[\s,]+/).map(Number);
    const columnCount = permutation.length;
    if (columnCount < MIN_COLUMNS || columnCount > MAX_COLUMNS) {
      return { ok: false, error: "Khóa phải có từ 2 đến 20 cột." };
    }
    if (
      permutation.some((rank) => !Number.isSafeInteger(rank) || rank < 1 || rank > columnCount) ||
      new Set(permutation).size !== columnCount
    ) {
      return { ok: false, error: "Khóa số phải là hoán vị của các số từ 1 đến m." };
    }

    return buildParsedKey(raw, keyType, permutation.join(","), permutation);
  }

  const normalizedKey = foldColumnarText(raw);
  if (!/^[a-z]+$/.test(normalizedKey)) {
    return { ok: false, error: "Từ khóa chỉ được chứa chữ cái." };
  }
  if (normalizedKey.length < MIN_COLUMNS || normalizedKey.length > MAX_COLUMNS) {
    return { ok: false, error: "Từ khóa phải dài từ 2 đến 20 chữ cái." };
  }

  const sorted = Array.from(normalizedKey, (character, index) => ({ character, index })).sort(
    (left, right) =>
      left.character.charCodeAt(0) - right.character.charCodeAt(0) || left.index - right.index,
  );
  const permutation = Array<number>(normalizedKey.length);
  sorted.forEach(({ index }, rank) => {
    permutation[index] = rank + 1;
  });
  return buildParsedKey(raw, keyType, normalizedKey, permutation);
}

export function validateColumnarInput(
  inputType: InputType,
  text: string,
  file: File | null,
): string | null {
  if (inputType === "file") return validateTextFile(file);
  return validateColumnarContent(text);
}

export function validateColumnarContent(text: string): string | null {
  if (text.length === 0) return "Văn bản không được để trống.";
  if (normalizeColumnarText(text).text.length === 0) {
    return "Văn bản phải chứa ít nhất một chữ cái A-Z hoặc chữ số 0-9 sau chuẩn hóa.";
  }
  return null;
}
