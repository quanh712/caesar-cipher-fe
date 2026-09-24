import { describe, expect, it, vi } from "vitest";
import { affineApi } from "./affineApi";

describe("Affine API contract", () => {
  it("serializes large signed keys as exact JSON integer tokens", async () => {
    await affineApi.processText("encrypt", {
      text: "HELLO",
      aToken: "  +009007199254740993  ",
      bToken: " -00018 ",
    });

    expect(vi.mocked(fetch)).toHaveBeenCalledWith("/api/affine/encrypt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: '{"text":"HELLO","a":9007199254740993,"b":-18}',
    });
  });

  it("uses exact Affine multipart fields and a second request for attachment", async () => {
    const request = {
      file: new File(["HELLO"], "message.txt", { type: "text/plain" }),
      aToken: " +005 ",
      bToken: " 8 ",
      action: "encrypt" as const,
    };

    expect(await affineApi.previewFile(request)).toEqual({ success: true, result: "RCLLA" });
    expect((await affineApi.downloadFile(request)).filename).toBe("message.encrypted.txt");

    const calls = vi.mocked(fetch).mock.calls;
    expect(calls).toHaveLength(2);
    for (const [index, [url, init]] of calls.entries()) {
      expect(url).toBe("/api/affine/file");
      expect(init?.method).toBe("POST");
      expect(init?.headers).toBeUndefined();
      const form = init?.body as FormData;
      expect(Array.from(form.keys())).toEqual(["file", "a", "b", "action", "response_mode"]);
      expect(form.get("file")).toBe(request.file);
      expect(form.get("a")).toBe(" +005 ");
      expect(form.get("b")).toBe(" 8 ");
      expect(form.get("action")).toBe("encrypt");
      expect(form.get("response_mode")).toBe(index === 0 ? "content" : "file");
      expect(form.has("key")).toBe(false);
    }
  });

  it("surfaces the Backend error message on a failed Affine response", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({ success: false, message: "Khóa a phải nguyên tố cùng nhau với 26." }),
        { status: 422, headers: { "Content-Type": "application/json" } },
      ),
    );

    await expect(
      affineApi.processText("encrypt", { text: "HELLO", aToken: "2", bToken: "8" }),
    ).rejects.toMatchObject({ message: "Khóa a phải nguyên tố cùng nhau với 26.", status: 422 });
  });
});
