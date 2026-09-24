export interface ColumnarNormalization {
  text: string;
  changed: boolean;
  removedCount: number;
}

export function foldColumnarText(value: string): string {
  return value
    .replace(/đ/gi, (character) => (character === "Đ" ? "D" : "d"))
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

export function normalizeColumnarText(value: string): ColumnarNormalization {
  const folded = foldColumnarText(value);
  const text = folded.replace(/[^a-z0-9]/g, "");
  const removedPattern = /[^a-z0-9]/gu;
  let removedCount = 0;

  while (removedPattern.exec(folded) !== null) removedCount += 1;

  return { text, changed: text !== value, removedCount };
}
