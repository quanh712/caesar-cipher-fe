import { expect, test } from "@playwright/test";

test("switches and restores the chosen color theme", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");

  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("button", { name: "Chuyển sang nền tối" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  await page.reload();

  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("button", { name: "Chuyển sang nền sáng" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("switches between available ciphers and preserves the Playfair draft", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("tab", { name: /Playfair/ }).click();
  await expect(page.getByRole("textbox", { name: "Khóa Playfair" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Mã hóa" })).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(
    false,
  );
  await page.getByRole("textbox", { name: "Nội dung đầu vào" }).fill("Playfair draft");
  await page.getByRole("textbox", { name: "Khóa Playfair" }).fill("MONARCHY");
  await expect(page.getByRole("button", { name: "Mã hóa" })).toBeEnabled();

  await page.getByRole("tab", { name: /Vigenère/ }).click();
  await expect(page.getByRole("textbox", { name: "Khóa Vigenère" })).toBeVisible();
  await page.getByRole("textbox", { name: "Nội dung đầu vào" }).fill("Vigenere draft");
  await page.getByRole("textbox", { name: "Khóa Vigenère" }).fill("LEMON");
  await expect(page.getByRole("button", { name: "Mã hóa" })).toBeEnabled();

  await page.getByRole("tab", { name: /Playfair/ }).click();
  await expect(page.getByRole("textbox", { name: "Nội dung đầu vào" })).toHaveValue(
    "Playfair draft",
  );
  await expect(page.getByRole("textbox", { name: "Khóa Playfair" })).toHaveValue("MONARCHY");

  await page.getByRole("tab", { name: /Caesar/ }).click();
  await expect(page.getByRole("textbox", { name: "Nội dung đầu vào" })).toBeVisible();
});

test("shows Affine and preserves its draft across cipher changes", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("tab", { name: /Affine/ }).click();
  await page.getByRole("textbox", { name: "Nội dung đầu vào" }).fill("Affine draft");
  await page.getByRole("textbox", { name: "Khóa nhân a" }).fill("5");
  await page.getByRole("textbox", { name: "Khóa dịch b" }).fill("8");
  await expect(page.getByRole("button", { name: "Mã hóa" })).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(
    false,
  );

  await page.getByRole("tab", { name: /Caesar/ }).click();
  await page.getByRole("tab", { name: /Affine/ }).click();
  await expect(page.getByRole("textbox", { name: "Nội dung đầu vào" })).toHaveValue("Affine draft");
  await expect(page.getByRole("textbox", { name: "Khóa nhân a" })).toHaveValue("5");
  await expect(page.getByRole("textbox", { name: "Khóa dịch b" })).toHaveValue("8");
});

test("keeps the live Columnar workspace usable at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/");
  const columnar = page.getByRole("tab", { name: /Hệ mã hàng/ });
  await expect(columnar).toContainText("Khả dụng");
  await columnar.click();
  await page.getByRole("button", { name: "Tạo ví dụ" }).click();
  await page.getByRole("button", { name: "Mã hóa" }).click();
  await expect(page.locator("pre.output")).toHaveText("agnonokntioetchghghn");
  await page.getByRole("tab", { name: "Phân tích" }).click();
  await expect(page.getByRole("table", { name: "Ma trận Hệ mã hàng" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(
    false,
  );
});

test("keeps Caesar-style panels and result actions visible at 320px for every cipher", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/");

  for (const algorithm of ["caesar", "vigenere", "playfair", "affine", "columnar"]) {
    await page.locator(`#algorithm-tab-${algorithm}`).click();
    const columns = page.locator(".workspace__columns");
    const resultPanel = columns.locator(":scope > section:nth-child(2) .panel");

    await expect(columns.locator(".highlighted-input textarea")).toBeVisible();
    await expect(resultPanel.getByRole("tab", { name: "Văn bản" })).toBeVisible();
    await expect(resultPanel.getByRole("tab", { name: "Phân tích" })).toBeVisible();
    await expect(resultPanel.getByRole("button", { name: "Xóa" })).toBeVisible();
    expect(
      await resultPanel.evaluate((panel) => {
        const clear = [...panel.querySelectorAll("button")].find(
          (button) => button.textContent?.trim() === "Xóa",
        );
        if (!clear) return false;
        const panelBounds = panel.getBoundingClientRect();
        const clearBounds = clear.getBoundingClientRect();
        return clearBounds.left >= panelBounds.left && clearBounds.right <= panelBounds.right;
      }),
    ).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
      false,
    );
  }
});

test("encrypts the generated example", async ({ page }) => {
  const browserErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });
  page.on("pageerror", (error) => browserErrors.push(error.message));

  await page.goto("/");
  await expect(page.getByRole("link", { name: "Cipher Workbench" })).toBeVisible();
  await expect(page).toHaveTitle("Cipher Workbench | Encode and Decode");
  await expect(page.getByText("Bảng dịch chuyển")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(
    false,
  );

  await page.getByRole("button", { name: "Tạo ví dụ" }).click();
  await page.getByRole("button", { name: "Mã hóa" }).click();

  await expect(page.getByText("Khoor Zruog")).toBeVisible();
  await expect(page.getByText("Mã hóa thành công.", { exact: true })).toBeVisible();

  await page.getByRole("tab", { name: "Phân tích" }).click();
  await expect(page.getByText("Tổng ký tự")).toBeVisible();
  await expect(page.getByText("11", { exact: true })).toBeVisible();
  expect(browserErrors).toEqual([]);
});

test("decrypts text", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("radio", { name: /Giải mã/ }).click();
  await page.getByRole("textbox", { name: "Nội dung đầu vào" }).fill("Khoor Zruog");
  await page.getByRole("textbox", { name: "Khóa Caesar" }).fill("3");
  await page.getByRole("button", { name: "Giải mã" }).click();

  await expect(page.getByText("Hello World")).toBeVisible();
  await expect(page.getByText("Giải mã thành công.", { exact: true })).toBeVisible();
});

for (const scenario of [
  { mode: "encrypt", source: "Hello", expected: "Khoor", action: "Mã hóa" },
  { mode: "decrypt", source: "Khoor", expected: "Hello", action: "Giải mã" },
] as const) {
  test(`${scenario.mode}s and downloads a text file`, async ({ page }) => {
    await page.goto("/");
    if (scenario.mode === "decrypt") {
      await page.getByRole("radio", { name: /Giải mã/ }).click();
    }
    await page.getByRole("button", { name: "File .txt" }).click();
    await page.getByLabel("Chọn file văn bản").setInputFiles({
      name: "message.txt",
      mimeType: "text/plain",
      buffer: Buffer.from(scenario.source),
    });
    await page.getByRole("textbox", { name: "Khóa Caesar" }).fill("3");
    await page.getByRole("button", { name: scenario.action }).click();

    await expect(page.getByText(scenario.expected, { exact: true })).toBeVisible();
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Tải kết quả" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe(
      `message.${scenario.mode === "encrypt" ? "encrypted" : "decrypted"}.txt`,
    );
  });
}
