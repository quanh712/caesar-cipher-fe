import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CipherApiError } from "../../../shared/services/cipherApi";
import { createColumnarGateway } from "../test/createColumnarGateway";
import { useColumnarCipher } from "./useColumnarCipher";

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

beforeEach(() => {
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: vi.fn(() => "blob:test"),
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: vi.fn(),
  });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
});

describe("useColumnarCipher", () => {
  it("loads the HTML example without calling a gateway", () => {
    const gateway = createColumnarGateway();
    const { result } = renderHook(() => useColumnarCipher(gateway));

    act(() => result.current.loadExample());

    expect(result.current).toMatchObject({
      mode: "encrypt",
      inputType: "text",
      text: "khoacongnghethongtin",
      keyType: "permutation",
      key: "3,6,2,1,5,4",
      pad: false,
      canSubmit: true,
    });
    expect(gateway.processText).not.toHaveBeenCalled();
  });

  it("sends the raw numeric key and stores an analysis-ready Backend snapshot", async () => {
    const gateway = createColumnarGateway();
    const { result } = renderHook(() => useColumnarCipher(gateway));
    act(() => result.current.loadExample());

    await act(async () => result.current.processCipher());

    expect(gateway.processText).toHaveBeenCalledWith("encrypt", {
      text: "khoacongnghethongtin",
      key: "3,6,2,1,5,4",
      keyType: "permutation",
      pad: false,
    });
    expect(result.current.result).toMatchObject({
      text: "agnonokntioetchghghn",
      source: "khoacongnghethongtin",
      mode: "encrypt",
      pad: false,
      key: { permutation: [3, 6, 2, 1, 5, 4], readOrder: [4, 3, 1, 6, 5, 2] },
    });
  });

  it("sends a keyword unchanged and only includes pad when encrypting", async () => {
    const gateway = createColumnarGateway({
      processText: vi.fn().mockResolvedValue({ success: true, result: "becxad" }),
    });
    const { result } = renderHook(() => useColumnarCipher(gateway));
    act(() => {
      result.current.setText("abcde");
      result.current.setKeyType("keyword");
      result.current.setKey("CAB");
      result.current.setPad(true);
    });

    await act(async () => result.current.processCipher());

    expect(gateway.processText).toHaveBeenCalledWith("encrypt", {
      text: "abcde",
      key: "CAB",
      keyType: "keyword",
      pad: true,
    });
    expect(result.current.result?.key.permutation).toEqual([3, 1, 2]);

    act(() => {
      result.current.setMode("decrypt");
      result.current.setText("becxad");
    });
    vi.mocked(gateway.processText).mockResolvedValueOnce({ success: true, result: "abcdex" });
    await act(async () => result.current.processCipher());
    expect(gateway.processText).toHaveBeenLastCalledWith("decrypt", {
      text: "becxad",
      key: "CAB",
      keyType: "keyword",
    });
    expect(result.current.result?.pad).toBe(false);
  });

  it("blocks invalid keys and normalized-empty text before the gateway", async () => {
    const gateway = createColumnarGateway();
    const { result } = renderHook(() => useColumnarCipher(gateway));
    act(() => {
      result.current.setText("😀 !");
      result.current.setKey("1,1");
    });

    await act(async () => result.current.processCipher());
    expect(result.current.canSubmit).toBe(false);
    expect(gateway.processText).not.toHaveBeenCalled();
  });

  it("clears stale results on key, pad, mode and input edits", async () => {
    const gateway = createColumnarGateway();
    const { result } = renderHook(() => useColumnarCipher(gateway));
    act(() => result.current.loadExample());
    await act(async () => result.current.processCipher());
    expect(result.current.result).not.toBeNull();

    act(() => result.current.setPad(true));
    expect(result.current.result).toBeNull();
    expect(result.current.processingStatus).toBe("idle");
    expect(result.current.notice).toBeNull();

    await act(async () => result.current.processCipher());
    act(() => result.current.setKey("2,1"));
    expect(result.current.result).toBeNull();
    act(() => result.current.setMode("decrypt"));
    expect(result.current.pad).toBe(true);
    expect(result.current.result).toBeNull();
    act(() => result.current.setText("cipher"));
    expect(result.current.result).toBeNull();
  });

  it("locks duplicate submissions while the gateway request is in flight", async () => {
    const deferred = createDeferred<{ success: true; result: string }>();
    const gateway = createColumnarGateway({
      processText: vi.fn().mockReturnValue(deferred.promise),
    });
    const { result } = renderHook(() => useColumnarCipher(gateway));
    act(() => result.current.loadExample());

    let pending!: Promise<void>;
    act(() => {
      pending = result.current.processCipher();
      void result.current.processCipher();
      result.current.setText("stale edit");
    });
    expect(gateway.processText).toHaveBeenCalledOnce();
    expect(result.current.isLoading).toBe(true);
    expect(result.current.text).toBe("khoacongnghethongtin");

    await act(async () => {
      deferred.resolve({ success: true, result: "agnonokntioetchghghn" });
      await pending;
    });
    expect(result.current.isLoading).toBe(false);
  });

  it("waits for decoded file content and rejects a file with no normalized content", async () => {
    const deferred = createDeferred<string>();
    const file = new File(["placeholder"], "message.txt", { type: "text/plain" });
    Object.defineProperty(file, "text", { value: () => deferred.promise });
    const gateway = createColumnarGateway();
    const { result } = renderHook(() => useColumnarCipher(gateway));
    act(() => {
      result.current.setInputType("file");
      result.current.setKey("3,6,2,1,5,4");
      void result.current.setFile(file);
    });
    expect(result.current.isReadingFile).toBe(true);
    expect(result.current.canSubmit).toBe(false);

    await act(async () => {
      deferred.resolve("\uFEFF 😀 !");
      await deferred.promise;
    });
    expect(result.current.fileText).toBe(" 😀 !");
    expect(result.current.canSubmit).toBe(false);
    expect(gateway.previewFile).not.toHaveBeenCalled();
  });

  it("previews and downloads files with the successful request snapshot", async () => {
    const file = new File(["khoacongnghethongtin"], "message.txt", { type: "text/plain" });
    const gateway = createColumnarGateway();
    const { result } = renderHook(() => useColumnarCipher(gateway));
    act(() => {
      result.current.setInputType("file");
      result.current.setKey("3,6,2,1,5,4");
    });
    await act(async () => result.current.setFile(file));
    expect(result.current.canSubmit).toBe(true);

    await act(async () => result.current.processCipher());
    expect(gateway.previewFile).toHaveBeenCalledWith({
      file,
      key: "3,6,2,1,5,4",
      keyType: "permutation",
      action: "encrypt",
      pad: false,
    });
    expect(result.current.result?.source).toBe("khoacongnghethongtin");

    await act(async () => result.current.downloadResult());
    expect(gateway.downloadFile).toHaveBeenCalledWith({
      file,
      key: "3,6,2,1,5,4",
      keyType: "permutation",
      action: "encrypt",
      pad: false,
    });
    expect(URL.createObjectURL).toHaveBeenCalled();
  });

  it("keeps the latest file if read completions arrive out of order", async () => {
    const first = createDeferred<string>();
    const second = createDeferred<string>();
    const firstFile = new File(["first"], "first.txt");
    const secondFile = new File(["second"], "second.txt");
    Object.defineProperty(firstFile, "text", { value: () => first.promise });
    Object.defineProperty(secondFile, "text", { value: () => second.promise });
    const { result } = renderHook(() => useColumnarCipher(createColumnarGateway()));

    act(() => {
      void result.current.setFile(firstFile);
      void result.current.setFile(secondFile);
    });
    await act(async () => {
      second.resolve("second content");
      await second.promise;
    });
    await act(async () => {
      first.resolve("stale first content");
      await first.promise;
    });
    expect(result.current.file?.name).toBe("second.txt");
    expect(result.current.fileText).toBe("second content");
  });

  it("surfaces Backend errors without a local cipher fallback", async () => {
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
