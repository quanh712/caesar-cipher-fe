import type { CipherMode } from "../../../shared/types/cipher";
import { normalizeColumnarText } from "./normalization";
import type { ParsedColumnarKey } from "./validation";

export interface ColumnarAnalysisInput {
  sourceText: string;
  result: string;
  mode: CipherMode;
  key: ParsedColumnarKey;
  pad: boolean;
}

export interface ColumnarAnalysis {
  mode: CipherMode;
  normalizedInput: string;
  normalizationChanged: boolean;
  removedCount: number;
  keyType: ParsedColumnarKey["keyType"];
  rawKey: string;
  normalizedKey: string;
  permutation: number[];
  readOrder: number[];
  columnLengths: number[];
  columnSegments: string[];
  padCount: number;
  totalRows: number;
  isPreview: boolean;
  rows: Array<Array<string | null>>;
}

const MAX_FULL_MATRIX_CHARACTERS = 200;
const PREVIEW_ROWS = 10;

// Presentation only: the caller must display the Backend result, never derive one from these rows.
export function buildColumnarAnalysis({
  sourceText,
  result,
  mode,
  key,
  pad,
}: ColumnarAnalysisInput): ColumnarAnalysis | null {
  const normalization = normalizeColumnarText(sourceText);
  const normalizedInput = normalization.text;
  if (normalizedInput.length === 0) return null;

  const columnCount = key.permutation.length;
  const padCount =
    mode === "encrypt" && pad
      ? (columnCount - (normalizedInput.length % columnCount)) % columnCount
      : 0;
  const effectiveLength = normalizedInput.length + padCount;
  if (result.length !== effectiveLength || !/^[a-z0-9]+$/.test(result)) return null;

  const quotient = Math.floor(effectiveLength / columnCount);
  const remainder = effectiveLength % columnCount;
  const columnLengths = Array.from(
    { length: columnCount },
    (_, index) => quotient + (index < remainder ? 1 : 0),
  );
  const isPreview = normalizedInput.length > MAX_FULL_MATRIX_CHARACTERS;
  const totalRows = Math.ceil(effectiveLength / columnCount);
  const previewRowCount = isPreview ? Math.min(totalRows, PREVIEW_ROWS) : totalRows;

  const columnStarts = Array<number>(columnCount);
  const columnSegments = Array<string>(columnCount);
  const segmentSource = mode === "encrypt" ? result : normalizedInput;
  let offset = 0;
  for (const column of key.readOrder) {
    const index = column - 1;
    columnStarts[index] = offset;
    columnSegments[index] = segmentSource.slice(
      offset,
      offset + (isPreview ? Math.min(columnLengths[index], PREVIEW_ROWS) : columnLengths[index]),
    );
    offset += columnLengths[index];
  }

  const rows = Array.from({ length: previewRowCount }, (_, row) =>
    Array.from({ length: columnCount }, (_, column) => {
      if (row >= columnLengths[column]) return null;
      if (mode === "decrypt") return normalizedInput[columnStarts[column] + row];

      const sourceIndex = row * columnCount + column;
      return sourceIndex < normalizedInput.length ? normalizedInput[sourceIndex] : "x";
    }),
  );

  return {
    mode,
    normalizedInput,
    normalizationChanged: normalization.changed,
    removedCount: normalization.removedCount,
    keyType: key.keyType,
    rawKey: key.raw,
    normalizedKey: key.normalizedKey,
    permutation: [...key.permutation],
    readOrder: [...key.readOrder],
    columnLengths,
    columnSegments,
    padCount,
    totalRows,
    isPreview,
    rows,
  };
}
