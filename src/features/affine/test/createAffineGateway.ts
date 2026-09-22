import { vi } from "vitest";
import type { AffineGateway } from "../services/affineGateway";

export function createAffineGateway(overrides: Partial<AffineGateway> = {}): AffineGateway {
  return {
    processText: vi.fn().mockResolvedValue({ success: true, result: "RCLLA" }),
    previewFile: vi.fn().mockResolvedValue({ success: true, result: "RCLLA" }),
    downloadFile: vi.fn().mockResolvedValue({
      blob: new Blob(["RCLLA"], { type: "text/plain" }),
      filename: "message.encrypted.txt",
    }),
    ...overrides,
  };
}
