import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("uses the real FastAPI text contract through the Vite proxy", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Tạo ví dụ" }).click();
  await page.getByRole("button", { name: "Mã hóa" }).click();

  await expect(page.getByText("Khoor Zruog", { exact: true })).toBeVisible();
  await expect(page.getByText("Mã hóa thành công.", { exact: true })).toBeVisible();
});

test("uses the real Vigenère text contract", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("tab", { name: /Vigenère/ }).click();
  await page.getByRole("button", { name: "Tạo ví dụ" }).click();

  const requestPromise = page.waitForRequest("**/api/vigenere/encrypt");
  await page.getByRole("button", { name: "Mã hóa" }).click();
  const request = await requestPromise;

  expect(request.postDataJSON()).toEqual({ text: "Attack at dawn!", key: "LEMON" });
  await expect(page.getByText("Lxfopv ef rnhr!", { exact: true })).toBeVisible();
});

test("uses the real Vigenère decrypt contract", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("tab", { name: /Vigenère/ }).click();
  await page.getByRole("radio", { name: /Giải mã/ }).click();
  await page.getByRole("textbox", { name: "Nội dung đầu vào" }).fill("Lxfopv ef rnhr!");
  await page.getByRole("textbox", { name: "Khóa Vigenère" }).fill("LEMON");

  const requestPromise = page.waitForRequest("**/api/vigenere/decrypt");
  await page.getByRole("button", { name: "Giải mã" }).click();
  expect((await requestPromise).postDataJSON()).toEqual({ text: "Lxfopv ef rnhr!", key: "LEMON" });
  await expect(page.getByText("Attack at dawn!", { exact: true })).toBeVisible();
});

test("uses the real Playfair text contract", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("tab", { name: /Playfair/ }).click();
  await page.getByRole("button", { name: "Tạo ví dụ" }).click();

  const requestPromise = page.waitForRequest("**/api/playfair/encrypt");
  await page.getByRole("button", { name: "Mã hóa" }).click();
  expect((await requestPromise).postDataJSON()).toEqual({
    text: "HIDE THE GOLD IN THE TREE STUMP",
    key: "PLAYFAIR EXAMPLE",
  });
  await expect(page.getByText("BMODZBXDNABEKUDMUIXMMOUVIF", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Phân tích" }).click();
  await expect(page.getByText("Key Matrix 5×5", { exact: true })).toBeVisible();
  await expect(page.getByText(/HI → BM/)).toBeVisible();
});

test("suggests only internal Playfair fillers while preserving the Backend plaintext", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("tab", { name: /Playfair/ }).click();
  await page.getByRole("radio", { name: /Giải mã/ }).click();
  await page.getByRole("textbox", { name: "Nội dung đầu vào" }).fill("BOFTFT");
  await page.getByRole("textbox", { name: "Khóa Playfair" }).fill("MATMA");
  await page.getByRole("button", { name: "Giải mã" }).click();

  await expect(page.locator("pre.output")).toHaveText("CNTXTX");
  await page.getByRole("tab", { name: "Phân tích" }).click();
  await expect(page.locator(".playfair-filler-suggestion pre")).toHaveText("CNTTX");
  await expect(page.locator(".playfair-filler-suggestion small")).toContainText(
    "Có thể bỏ 1 ký tự X/Q",
  );
  await expect(page.locator("pre.output")).toHaveText("CNTXTX");
});

test("uses the real Affine text contract in both directions", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("tab", { name: /Affine/ }).click();
  await page.getByRole("button", { name: "Tạo ví dụ" }).click();

  const encryptRequest = page.waitForRequest("**/api/affine/encrypt");
  await page.getByRole("button", { name: "Mã hóa" }).click();
  expect((await encryptRequest).postData()).toBe('{"text":"HELLO","a":5,"b":8}');
  await expect(page.locator("pre.output")).toHaveText("RCLLA");

  await page.getByRole("radio", { name: /Giải mã/ }).click();
  await page.getByRole("textbox", { name: "Nội dung đầu vào" }).fill("RCLLA");
  const decryptRequest = page.waitForRequest("**/api/affine/decrypt");
  await page.getByRole("button", { name: "Giải mã" }).click();
  expect((await decryptRequest).postData()).toBe('{"text":"RCLLA","a":5,"b":8}');
  await expect(page.locator("pre.output")).toHaveText("HELLO");
});

test("uses the real Columnar text contract and exactly round-trips Unicode", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("tab", { name: /Hệ mã hàng/ }).click();
  await page.getByRole("textbox", { name: "Nội dung đầu vào" }).fill("😀A𝄞é");
  await page.getByRole("textbox", { name: "Khóa cột" }).fill(" { 2 1 3 } ");

  const encryptRequest = page.waitForRequest("**/api/columnar/encrypt");
  await page.getByRole("button", { name: "Mã hóa" }).click();
  expect((await encryptRequest).postDataJSON()).toEqual({ text: "😀A𝄞é", key: " { 2 1 3 } " });
  await expect(page.locator("pre.output")).toHaveText("A😀é𝄞");

  await page.getByRole("radio", { name: /Giải mã/ }).click();
  await page.getByRole("textbox", { name: "Nội dung đầu vào" }).fill("A😀é𝄞");
  const decryptRequest = page.waitForRequest("**/api/columnar/decrypt");
  await page.getByRole("button", { name: "Giải mã" }).click();
  expect((await decryptRequest).postDataJSON()).toEqual({ text: "A😀é𝄞", key: " { 2 1 3 } " });
  await expect(page.locator("pre.output")).toHaveText("😀A𝄞é");
});

test("matches the canonical Columnar example on the real Backend", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("tab", { name: /Hệ mã hàng/ }).click();
  await page.getByRole("button", { name: "Tạo ví dụ" }).click();

  const requestPromise = page.waitForRequest("**/api/columnar/encrypt");
  await page.getByRole("button", { name: "Mã hóa" }).click();
  expect((await requestPromise).postDataJSON()).toEqual({
    text: "khoacongnghethongtin",
    key: "3,6,2,1,5,4",
  });
  await expect(page.locator("pre.output")).toHaveText("agnonokntioetchghghn");
});

test("previews and downloads a Columnar BOM file using separate Backend requests", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("tab", { name: /Hệ mã hàng/ }).click();
  await page.getByRole("button", { name: "File .txt" }).click();
  await page.getByLabel("Chọn file văn bản").setInputFiles({
    name: "message.TXT",
    mimeType: "text/plain",
    buffer: Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from("ABCDE")]),
  });
  await page.getByRole("textbox", { name: "Khóa cột" }).fill("3 1 4 2");

  const previewRequest = page.waitForRequest("**/api/columnar/file");
  await page.getByRole("button", { name: "Mã hóa" }).click();
  expect((await previewRequest).method()).toBe("POST");
  await expect(page.locator("pre.output")).toHaveText("BDAEC");

  const downloadRequest = page.waitForRequest("**/api/columnar/file");
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Tải kết quả" }).click();
  expect((await downloadRequest).method()).toBe("POST");
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe("message.encrypted.txt");
  expect(await readFile(await download.path())).toEqual(
    Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from("BDAEC")]),
  );
});

test("keeps large Affine text keys as exact JSON integers", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("tab", { name: /Affine/ }).click();
  await page.getByRole("textbox", { name: "Nội dung đầu vào" }).fill("HELLO");
  await page.getByRole("textbox", { name: "Khóa nhân a" }).fill("9007199254740993");
  await page.getByRole("textbox", { name: "Khóa dịch b" }).fill("+0008");

  const requestPromise = page.waitForRequest("**/api/affine/encrypt");
  await page.getByRole("button", { name: "Mã hóa" }).click();
  expect((await requestPromise).postData()).toBe('{"text":"HELLO","a":9007199254740993,"b":8}');
  await expect(page.locator("pre.output")).toHaveText("FKHHC");
});

test("previews and downloads an Affine file with the real Backend", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("tab", { name: /Affine/ }).click();
  await page.getByRole("button", { name: "File .txt" }).click();
  await page.getByLabel("Chọn file văn bản").setInputFiles({
    name: "message.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("HELLO"),
  });
  await page.getByRole("textbox", { name: "Khóa nhân a" }).fill(" +005 ");
  await page.getByRole("textbox", { name: "Khóa dịch b" }).fill(" 8 ");

  const previewRequest = page.waitForRequest("**/api/affine/file");
  await page.getByRole("button", { name: "Mã hóa" }).click();
  expect((await previewRequest).method()).toBe("POST");
  await expect(page.locator("pre.output")).toHaveText("RCLLA");

  const downloadRequest = page.waitForRequest("**/api/affine/file");
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Tải kết quả" }).click();
  expect((await downloadRequest).method()).toBe("POST");
  expect((await downloadEvent).suggestedFilename()).toBe("message.encrypted.txt");
});

test("previews and downloads a Playfair file with two server requests", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("tab", { name: /Playfair/ }).click();
  await page.getByRole("button", { name: "File .txt" }).click();
  await page.getByLabel("Chọn file văn bản").setInputFiles({
    name: "secret.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("HIDE THE GOLD IN THE TREE STUMP"),
  });
  await page.getByRole("textbox", { name: "Khóa Playfair" }).fill("PLAYFAIR EXAMPLE");

  const previewRequest = page.waitForRequest("**/api/playfair/file");
  await page.getByRole("button", { name: "Mã hóa" }).click();
  expect((await previewRequest).method()).toBe("POST");
  await expect(page.getByText("BMODZBXDNABEKUDMUIXMMOUVIF", { exact: true })).toBeVisible();

  const downloadRequest = page.waitForRequest("**/api/playfair/file");
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Tải kết quả" }).click();
  expect((await downloadRequest).method()).toBe("POST");
  expect((await downloadEvent).suggestedFilename()).toBe("secret.encrypted.txt");
});

test("previews and downloads a Vigenère file with two requests", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("tab", { name: /Vigenère/ }).click();
  await page.getByRole("button", { name: "File .txt" }).click();
  await page.getByLabel("Chọn file văn bản").setInputFiles({
    name: "attack.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Attack at dawn!"),
  });
  await page.getByRole("textbox", { name: "Khóa Vigenère" }).fill("LEMON");
  await expect(page.getByLabel("Xem trước nội dung file")).toHaveText("Attack at dawn!");

  const previewRequest = page.waitForRequest("**/api/vigenere/file");
  await page.getByRole("button", { name: "Mã hóa" }).click();
  expect((await previewRequest).method()).toBe("POST");
  await expect(page.getByText("Lxfopv ef rnhr!", { exact: true })).toBeVisible();

  const downloadRequest = page.waitForRequest("**/api/vigenere/file");
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Tải kết quả" }).click();
  expect((await downloadRequest).method()).toBe("POST");
  expect((await downloadEvent).suggestedFilename()).toBe("attack.encrypted.txt");
});

test("sends a large key as an exact JSON integer token", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("textbox", { name: "Nội dung đầu vào" }).fill("A");
  await page.getByRole("textbox", { name: "Khóa Caesar" }).fill("9007199254740993");

  const requestPromise = page.waitForRequest("**/api/caesar/encrypt");
  await page.getByRole("button", { name: "Mã hóa" }).click();
  const request = await requestPromise;

  expect(request.postData()).toBe('{"text":"A","key":9007199254740993}');
  await expect(page.locator("pre.output")).toHaveText("H");
});

test("previews and downloads a file with two server requests", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "File .txt" }).click();
  await page.getByLabel("Chọn file văn bản").setInputFiles({
    name: "bao.cao.v2.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Hello World"),
  });
  await page.getByRole("textbox", { name: "Khóa Caesar" }).fill("3");
  await page.getByRole("button", { name: "Mã hóa" }).click();

  await expect(page.getByText("Khoor Zruog", { exact: true })).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Tải kết quả" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("bao.cao.v2.encrypted.txt");
});

test("shows the canonical backend message for invalid UTF-8", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "File .txt" }).click();
  await page.getByLabel("Chọn file văn bản").setInputFiles({
    name: "invalid.txt",
    mimeType: "text/plain",
    buffer: Buffer.from([0xff]),
  });
  await page.getByRole("textbox", { name: "Khóa Caesar" }).fill("3");
  await page.getByRole("button", { name: "Mã hóa" }).click();

  await expect(page.getByText("File phải sử dụng UTF-8.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Tải kết quả" })).toBeDisabled();
});
