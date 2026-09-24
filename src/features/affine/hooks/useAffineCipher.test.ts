import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CipherApiError } from "../../../shared/services/cipherApi";
import { createAffineGateway } from "../test/createAffineGateway";
import { useAffineCipher } from "./useAffineCipher";

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
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

describe("useAffineCipher", () => {
  it("loads the official example as a complete submittable state", () => {
    const gateway = createAffineGateway();
    const { result } = renderHook(() => useAffineCipher(gateway));

    act(() => result.current.loadExample());

    expect(result.current).toMatchObject({
      mode: "encrypt",
      inputType: "text",
      text: "HELLO",
      a: "5",
      b: "8",
      canSubmit: true,
    });
  });

  it("sends raw key values and stores an immutable text snapshot", async () => {
    const gateway = createAffineGateway();
    const { result } = renderHook(() => useAffineCipher(gateway));

    act(() => {
      result.current.setText("HELLO");
      result.current.setA("  +005  ");
      result.current.setB("  34 ");
    });
    await act(async () => result.current.processCipher());

    expect(gateway.processText).toHaveBeenCalledWith("encrypt", {
      text: "HELLO",
      aToken: "  +005  ",
      bToken: "  34 ",
    });
    expect(result.current.result).toMatchObject({
      text: "RCLLA",
      source: "HELLO",
      rawA: "  +005  ",
      rawB: "  34 ",
      normalizedA: 5,
      normalizedB: 8,
      inverseA: 21,
    });
    expect(result.current.notice).toEqual({ kind: "success", message: "Mã hóa thành công." });
  });

  it("does not call the gateway for invalid or incomplete keys", async () => {
    const gateway = createAffineGateway();
    const { result } = renderHook(() => useAffineCipher(gateway));

    act(() => {
      result.current.setText("HELLO");
      result.current.setA("2");
      result.current.setB("8");
    });
    await act(async () => result.current.processCipher());

    expect(result.current.canSubmit).toBe(false);
    expect(gateway.processText).not.toHaveBeenCalled();
  });

  it("locks duplicate submissions while a request is in flight", async () => {
    const deferred = createDeferred<{ success: true; result: string }>();
    const gateway = createAffineGateway();
    vi.mocked(gateway.processText).mockReturnValue(deferred.promise);
    const { result } = renderHook(() => useAffineCipher(gateway));
    act(() => result.current.loadExample());

    let firstRequest!: Promise<void>;
    act(() => {
      firstRequest = result.current.processCipher();
      void result.current.processCipher();
    });

    expect(gateway.processText).toHaveBeenCalledOnce();
    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      deferred.resolve({ success: true, result: "RCLLA" });
      await firstRequest;
    });
    expect(result.current.isLoading).toBe(false);
  });

  it("waits for file content, strips one BOM and previews through the gateway", async () => {
    const deferred = createDeferred<string>();
    const file = new File(["placeholder"], "message.txt", { type: "text/plain" });
    Object.defineProperty(file, "text", { value: () => deferred.promise });
    const gateway = createAffineGateway();
    const { result } = renderHook(() => useAffineCipher(gateway));

    act(() => {
      result.current.setInputType("file");
      result.current.setA("5");
      result.current.setB("8");
      void result.current.setFile(file);
    });
    expect(result.current.isReadingFile).toBe(true);
    expect(result.current.canSubmit).toBe(false);

    await act(async () => {
      deferred.resolve("\uFEFFHELLO");
      await deferred.promise;
    });
    expect(result.current.fileText).toBe("HELLO");
    expect(result.current.canSubmit).toBe(true);

    await act(async () => result.current.processCipher());
    expect(gateway.previewFile).toHaveBeenCalledWith({
      file,
      aToken: "5",
      bToken: "8",
      action: "encrypt",
    });
    expect(result.current.result?.source).toBe("HELLO");
  });

  it("blocks processing and explains a client file read failure", async () => {
    const file = new File(["unreadable"], "message.txt", { type: "text/plain" });
    Object.defineProperty(file, "text", { value: () => Promise.reject(new Error("read failed")) });
    const gateway = createAffineGateway();
    const { result } = renderHook(() => useAffineCipher(gateway));

    act(() => {
      result.current.setInputType("file");
      result.current.setA("5");
      result.current.setB("8");
    });
    await act(async () => result.current.setFile(file));

    expect(result.current.inputError).toBe("Không thể đọc nội dung file. Vui lòng chọn lại file.");
    expect(result.current.processingStatus).toBe("error");
    expect(result.current.canSubmit).toBe(false);
    expect(gateway.previewFile).not.toHaveBeenCalled();
  });

  it("keeps the latest file when reads finish out of order", async () => {
    const firstRead = createDeferred<string>();
    const secondRead = createDeferred<string>();
    const firstFile = new File(["first"], "first.txt", { type: "text/plain" });
    const secondFile = new File(["second"], "second.txt", { type: "text/plain" });
    Object.defineProperty(firstFile, "text", { value: () => firstRead.promise });
    Object.defineProperty(secondFile, "text", { value: () => secondRead.promise });
    const { result } = renderHook(() => useAffineCipher(createAffineGateway()));

    act(() => {
      void result.current.setFile(firstFile);
      void result.current.setFile(secondFile);
    });
    await act(async () => {
      secondRead.resolve("second content");
      await secondRead.promise;
    });
    await act(async () => {
      firstRead.resolve("stale first content");
      await firstRead.promise;
    });

    expect(result.current.file?.name).toBe("second.txt");
    expect(result.current.fileText).toBe("second content");
    expect(result.current.isReadingFile).toBe(false);
  });

  it("uses Backend messages and the generic network fallback", async () => {
    const gateway = createAffineGateway();
    vi.mocked(gateway.processText).mockRejectedValueOnce(
      new CipherApiError("Khóa bị từ chối.", 422),
    );
    const { result } = renderHook(() => useAffineCipher(gateway));
    act(() => result.current.loadExample());

    await act(async () => result.current.processCipher());
    expect(result.current.notice).toEqual({ kind: "error", message: "Khóa bị từ chối." });
    expect(result.current.result).toBeNull();

    vi.mocked(gateway.processText).mockRejectedValueOnce(new Error("offline"));
    await act(async () => result.current.processCipher());
    expect(result.current.notice).toEqual({
      kind: "error",
      message: "Không thể kết nối tới máy chủ. Vui lòng thử lại.",
    });
  });

  it("downloads a file with the successful request snapshot", async () => {
    const file = new File(["HELLO"], "message.txt", { type: "text/plain" });
    const gateway = createAffineGateway();
    const { result } = renderHook(() => useAffineCipher(gateway));

    act(() => {
      result.current.setInputType("file");
      result.current.setA("+005");
      result.current.setB("34");
    });
    await act(async () => result.current.setFile(file));
    await act(async () => result.current.processCipher());
    await act(async () => result.current.downloadResult());

    expect(gateway.downloadFile).toHaveBeenCalledWith({
      file,
      aToken: "+005",
      bToken: "34",
      action: "encrypt",
    });
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(result.current.notice).toEqual({ kind: "success", message: "Đã tải kết quả." });
  });

  it("resets derived state on edits and restores defaults on reset", async () => {
    const { result } = renderHook(() => useAffineCipher(createAffineGateway()));
    act(() => result.current.loadExample());
    await act(async () => result.current.processCipher());
    expect(result.current.result).not.toBeNull();

    act(() => result.current.setB("9"));
    expect(result.current.result).toBeNull();
    expect(result.current.processingStatus).toBe("idle");
    expect(result.current.notice).toBeNull();

    act(() => result.current.resetAll());
    expect(result.current).toMatchObject({
      mode: "encrypt",
      inputType: "text",
      text: "",
      file: null,
      a: "",
      b: "",
      result: null,
    });
  });
});
