import type { DownloadResponse, SuccessResponse } from "../../../shared/services/cipherApi";
import type { CipherMode } from "../../../shared/types/cipher";
import type { ColumnarKeyType } from "../utils/validation";

export interface ColumnarTextRequest {
  text: string;
  key: string;
  keyType: ColumnarKeyType;
  pad?: boolean;
}

export interface ColumnarFileRequest {
  file: File;
  key: string;
  keyType: ColumnarKeyType;
  action: CipherMode;
  pad?: boolean;
}

// Test boundary until the Backend contract and endpoint have been accepted.
export interface ColumnarGateway {
  processText(mode: CipherMode, request: ColumnarTextRequest): Promise<SuccessResponse>;
  previewFile(request: ColumnarFileRequest): Promise<SuccessResponse>;
  downloadFile(request: ColumnarFileRequest): Promise<DownloadResponse>;
}
