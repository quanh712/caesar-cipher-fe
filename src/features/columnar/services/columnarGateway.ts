import type { DownloadResponse, SuccessResponse } from "../../../shared/services/cipherApi";
import type { CipherMode } from "../../../shared/types/cipher";

export interface ColumnarTextRequest {
  text: string;
  key: string;
}

export interface ColumnarFileRequest {
  file: File;
  key: string;
  action: CipherMode;
}

// The transport seam keeps the hook testable while production uses columnarApi.
export interface ColumnarGateway {
  processText(mode: CipherMode, request: ColumnarTextRequest): Promise<SuccessResponse>;
  previewFile(request: ColumnarFileRequest): Promise<SuccessResponse>;
  downloadFile(request: ColumnarFileRequest): Promise<DownloadResponse>;
}
