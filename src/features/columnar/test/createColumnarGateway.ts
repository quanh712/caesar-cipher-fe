import { vi } from "vitest";
import type { ColumnarGateway } from "../services/columnarGateway";

export function createColumnarGateway(overrides: Partial<ColumnarGateway> = {}): ColumnarGateway {
  return {
    processText: vi.fn().mockResolvedValue({
      success: true,
      result: "agnonokntioetchghghn",
    }),
    previewFile: vi.fn().mockResolvedValue({
      success: true,
      result: "agnonokntioetchghghn",
    }),
    downloadFile: vi.fn().mockResolvedValue({
      blob: new Blob(["agnonokntioetchghghn"], { type: "text/plain" }),
      filename: "message.encrypted.txt",
    }),
    ...overrides,
  };
}
