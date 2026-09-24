import { describe, expect, it, vi } from "vitest";
import { columnarApi } from "./columnarApi";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("Columnar API contract", () => {
  it("sends exact JSON fields and preserves raw Unicode text and key", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(json({ success: true, result: "A😀é𝄞" }));
    const request = { text: "😀A𝄞é", key: " { 2 1 3 } " };

    expect(await columnarApi.processText("encrypt", request)).toEqual({
      success: true,
      result: "A😀é𝄞",
    });
    expect(vi.mocked(fetch)).toHaveBeenCalledWith("/api/columnar/encrypt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
  });

  it("sends exactly the four Columnar multipart fields in two separate requests", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(json({ success: true, result: "BDAEC" }))
      .mockResolvedValueOnce(
        new Response("BDAEC", {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Content-Disposition": 'attachment; filename="message.encrypted.txt"',
          },
        }),
      );
    const request = {
      file: new File(["ABCDE"], "message.txt"),
      key: "3 1 4 2",
      action: "encrypt" as const,
    };

    expect(await columnarApi.previewFile(request)).toEqual({ success: true, result: "BDAEC" });
    expect((await columnarApi.downloadFile(request)).filename).toBe("message.encrypted.txt");

    const calls = vi.mocked(fetch).mock.calls;
    expect(calls).toHaveLength(2);
    for (const [index, [url, init]] of calls.entries()) {
      expect(url).toBe("/api/columnar/file");
      expect(init?.method).toBe("POST");
      expect(init?.headers).toBeUndefined();
      const form = init?.body as FormData;
      expect(Array.from(form.keys())).toEqual(["file", "key", "action", "response_mode"]);
      expect(form.get("file")).toBe(request.file);
      expect(form.get("key")).toBe("3 1 4 2");
      expect(form.get("action")).toBe("encrypt");
      expect(form.get("response_mode")).toBe(index === 0 ? "content" : "file");
      expect(form.has("key_type")).toBe(false);
      expect(form.has("pad")).toBe(false);
    }
  });

  it("shows the BE error rather than calculating a local fallback", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      json({ success: false, message: "Khóa Columnar không hợp lệ." }, 422),
    );
    await expect(
      columnarApi.processText("decrypt", { text: "BDAEC", key: "1,1" }),
    ).rejects.toMatchObject({ message: "Khóa Columnar không hợp lệ.", status: 422 });
  });
});
