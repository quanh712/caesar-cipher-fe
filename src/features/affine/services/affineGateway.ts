import type { DownloadResponse, SuccessResponse } from "../../../shared/services/cipherApi";
import type { CipherMode } from "../../../shared/types/cipher";

export interface AffineTextRequest {
  text: string;
  aToken: string;
  bToken: string;
}

export interface AffineFileRequest {
  file: File;
  aToken: string;
  bToken: string;
  action: CipherMode;
}

export interface AffineGateway {
  processText(mode: CipherMode, request: AffineTextRequest): Promise<SuccessResponse>;
  previewFile(request: AffineFileRequest): Promise<SuccessResponse>;
  downloadFile(request: AffineFileRequest): Promise<DownloadResponse>;
}
