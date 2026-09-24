import {
  CipherApiError,
  readFileDownload,
  readJsonSuccess,
  transformText,
} from "../../../shared/services/cipherApi";
import type { AffineFileRequest, AffineGateway, AffineTextRequest } from "./affineGateway";

function integerToken(raw: string, name: "a" | "b"): string {
  const token = raw.trim();
  if (token === "") {
    throw new CipherApiError(`Thiếu khóa ${name}.`, 422);
  }
  if (!/^[+-]?[0-9]+$/.test(token)) {
    throw new CipherApiError(`Khóa ${name} phải là số nguyên.`, 422);
  }
  return BigInt(token).toString();
}

function fileForm(request: AffineFileRequest, responseMode: "content" | "file") {
  const form = new FormData();
  form.append("file", request.file);
  form.append("a", request.aToken);
  form.append("b", request.bToken);
  form.append("action", request.action);
  form.append("response_mode", responseMode);
  return form;
}

export const affineApi: AffineGateway = {
  processText(mode, request: AffineTextRequest) {
    const a = integerToken(request.aToken, "a");
    const b = integerToken(request.bToken, "b");
    const body = `{"text":${JSON.stringify(request.text)},"a":${a},"b":${b}}`;
    return transformText("affine", mode, body);
  },

  async previewFile(request: AffineFileRequest) {
    const response = await fetch("/api/affine/file", {
      method: "POST",
      body: fileForm(request, "content"),
    });
    return readJsonSuccess(response);
  },

  async downloadFile(request: AffineFileRequest) {
    const response = await fetch("/api/affine/file", {
      method: "POST",
      body: fileForm(request, "file"),
    });
    return readFileDownload(response);
  },
};
