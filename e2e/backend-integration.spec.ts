import { expect, test } from "@playwright/test";

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

test("suggests possible Playfair fillers while preserving the Backend plaintext", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("tab", { name: /Playfair/ }).click();
  await page.getByRole("textbox", { name: "Nội dung đầu vào" }).fill("KHOA CNTT");
  await page.getByRole("textbox", { name: "Khóa Playfair" }).fill("MATMA");
  await page.getByRole("button", { name: "Mã hóa" }).click();

  const ciphertext = await page.locator("pre.output").textContent();
  expect(ciphertext).toBeTruthy();
  await page.getByRole("radio", { name: /Giải mã/ }).click();
  await page.getByRole("textbox", { name: "Nội dung đầu vào" }).fill(ciphertext!);
  await page.getByRole("button", { name: "Giải mã" }).click();

  await expect(page.locator("pre.output")).toHaveText("KHOACNTXTX");
  await page.getByRole("tab", { name: "Phân tích" }).click();
  await expect(page.locator(".playfair-filler-suggestion pre")).toHaveText("KHOACNTT");
  await expect(page.locator(".playfair-filler-suggestion small")).toContainText(
    "cũng có thể là chữ thật",
  );
  await expect(page.locator("pre.output")).toHaveText("KHOACNTXTX");
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
