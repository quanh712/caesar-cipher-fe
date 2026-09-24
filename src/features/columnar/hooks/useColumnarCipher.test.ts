import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CipherApiError } from "../../../shared/services/cipherApi";
import { createColumnarGateway } from "../test/createColumnarGateway";
import { useColumnarCipher } from "./useColumnarCipher";

beforeEach(() => {
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: vi.fn(() => "blob:test"),
  });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
});

describe("useColumnarCipher", () => {
  it("loads the example and submits only the BE text fields", async () => {
    const gateway = createColumnarGateway();
    const { result } = renderHook(() => useColumnarCipher(gateway));
    act(() => result.current.loadExample());
    expect(result.current).toMatchObject({
      text: "khoacongnghethongtin",
      key: "3,6,2,1,5,4",
      canSubmit: true,
    });
    await act(async () => result.current.processCipher());
    expect(gateway.processText).toHaveBeenCalledWith("encrypt", {
      text: "khoacongnghethongtin",
      key: "3,6,2,1,5,4",
    });
    expect(result.current.result).toMatchObject({
      source: "khoacongnghethongtin",
      key: { readOrder: [4, 3, 1, 6, 5, 2] },
    });
  });

  it("accepts Unicode and whitespace-only text without normalization", async () => {
    const gateway = createColumnarGateway({
      processText: vi.fn().mockResolvedValue({ success: true, result: "\n " }),
    });
    const { result } = renderHook(() => useColumnarCipher(gateway));
    act(() => {
      result.current.setText(" \n");
      result.current.setKey("BALLOON");
    });
    expect(result.current.canSubmit).toBe(true);
    await act(async () => result.current.processCipher());
    expect(gateway.processText).toHaveBeenCalledWith("encrypt", { text: " \n", key: "BALLOON" });
    expect(result.current.result?.source).toBe(" \n");
  });

  it("clears stale results on key, mode and input changes", async () => {
    const { result } = renderHook(() => useColumnarCipher(createColumnarGateway()));
    act(() => result.current.loadExample());
    await act(async () => result.current.processCipher());
    expect(result.current.result).not.toBeNull();
    act(() => result.current.setKey("2 1"));
    expect(result.current.result).toBeNull();
    await act(async () => result.current.processCipher());
    act(() => result.current.setMode("decrypt"));
    expect(result.current.result).toBeNull();
    act(() => result.current.setText("another"));
    expect(result.current.result).toBeNull();
  });

  it("previews and downloads files with exact multipart request fields", async () => {
    const file = new File(["ABCDE"], "message.txt");
    const gateway = createColumnarGateway();
    const { result } = renderHook(() => useColumnarCipher(gateway));
    act(() => {
      result.current.setInputType("file");
      result.current.setKey("3 1 4 2");
    });
    await act(async () => result.current.setFile(file));
    expect(result.current.fileText).toBe("ABCDE");
    await act(async () => result.current.processCipher());
    expect(gateway.previewFile).toHaveBeenCalledWith({ file, key: "3 1 4 2", action: "encrypt" });
    await act(async () => result.current.downloadResult());
    expect(gateway.downloadFile).toHaveBeenCalledWith({ file, key: "3 1 4 2", action: "encrypt" });
  });

  it("allows BOM-only files and rejects invalid UTF-8 before the gateway", async () => {
    const gateway = createColumnarGateway();
    const { result } = renderHook(() => useColumnarCipher(gateway));
    act(() => {
      result.current.setInputType("file");
      result.current.setKey("2 1");
    });
    await act(async () =>
      result.current.setFile(new File([new Uint8Array([0xef, 0xbb, 0xbf])], "bom.txt")),
    );
    expect(result.current.fileText).toBe("");
    expect(result.current.canSubmit).toBe(true);
    await act(async () => result.current.setFile(new File([new Uint8Array([0xff])], "bad.txt")));
    expect(result.current.canSubmit).toBe(false);
    expect(result.current.inputError).toMatch(/UTF-8/);
    expect(gateway.previewFile).not.toHaveBeenCalled();
  });

  it("shows Backend errors without local fallback", async () => {
    const gateway = createColumnarGateway({
      processText: vi.fn().mockRejectedValue(new CipherApiError("Khóa bị từ chối.", 422)),
    });
    const { result } = renderHook(() => useColumnarCipher(gateway));
    act(() => result.current.loadExample());
    await act(async () => result.current.processCipher());
    expect(result.current.result).toBeNull();
    expect(result.current.notice).toEqual({ kind: "error", message: "Khóa bị từ chối." });
  });
});
