import type { CipherMode, InputType } from "../../../shared/types/cipher";

export type ProcessingStatus = "idle" | "loading" | "success" | "error";

export interface AffineKeySnapshot {
  rawA: string;
  rawB: string;
  normalizedA: number;
  normalizedB: number;
  inverseA: number;
}

export interface AffineResultSnapshot extends AffineKeySnapshot {
  text: string;
  source: string;
  mode: CipherMode;
  inputType: InputType;
  file?: File;
}
