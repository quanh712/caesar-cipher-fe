import type { CipherMode, InputType } from "../../../shared/types/cipher";
import type { ParsedColumnarKey } from "../utils/validation";

export type ProcessingStatus = "idle" | "loading" | "success" | "error";

export interface ColumnarResultSnapshot {
  text: string;
  source: string;
  mode: CipherMode;
  inputType: InputType;
  file?: File;
  key: ParsedColumnarKey;
  pad: boolean;
}
