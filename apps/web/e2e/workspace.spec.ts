import { test, expect } from "@playwright/test";
for (const format of ["png", "jpeg"]) {
  test(`imports a ${format} room, builds four walls and reopens the saved project`, async ({ page }) => {
    await page.route("http://127.0.0.1:8000/**", route => route.abort());
    await page.goto("/");
    const encoded = await page.evaluate(format => {
      const canvas = document.createElement("canvas");
      canvas.width = 240;
      canvas.height = 180;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, 240, 180);
      ctx.lineWidth = 4;
      ctx.strokeRect(20, 20, 200, 140);
      return canvas.toDataURL("image/" + format).split(",")[1];
    }, format);
    const upload = page.locator('input[type=file][accept*="png"]');
    await upload.setInputFiles({ name: "room." + format, mimeType: "image/" + format, buffer: Buffer.from(encoded, "base64") });
    const editor = page.locator(".editor-canvas.tool-scale");
    await expect(editor.locator("canvas").first()).toBeVisible();
    await editor.click({ position: { x: 60, y: 100 } });
    await editor.click({ position: { x: 200, y: 100 } });
    await page.getByLabel("Khoảng cách (m)").fill("4");
    await page.getByRole("button", { name: "Xác nhận tỷ lệ" }).click();
    await page.getByRole("button", { name: "Phân tích", exact: true }).click();
    await expect(page.getByText("4 ứng viên tường")).toBeVisible();
    await page.getByRole("button", { name: "Đưa ứng viên vào editor" }).click();
    const tab = page.getByRole("button", { name: "Không gian 3D", exact: true });
    if (await tab.isVisible()) await tab.click();
    await expect(page.locator(".model-panel canvas")).toBeVisible();
    await page.getByRole("button", { name: "Lưu dự án", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("Đã lưu");
    await page.reload();
    await page.getByRole("button", { name: "Dự án đã lưu" }).click();
    await page.getByRole("button", { name: /room.*4 tường/ }).click();
    await expect(page.getByText("Ảnh đã tải", { exact: true })).toBeVisible();
  });
}
test("manual wall, properties, history, JSON and local save", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "BuildVision 3D" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Dự án trống", exact: true }).click();
  await page.getByRole("button", { name: "Tường", exact: true }).click();
  const canvas = page.locator(".editor-canvas");
  await expect(canvas.locator("canvas")).toBeVisible();
  await canvas.click({ position: { x: 90, y: 100 } });
  await canvas.click({ position: { x: 190, y: 100 } });
  await expect(
    page.getByText("TƯỜNG ĐANG CHỌN", { exact: true }),
  ).toBeVisible();
  const thickness = page.getByRole("spinbutton", {
    name: "Độ dày",
    exact: true,
  });
  await thickness.fill("0.3");
  await thickness.press("Enter");
  await expect(thickness).toHaveValue("0.3");
  await page.getByRole("button", { name: "Hoàn tác", exact: true }).click();
  await page.getByRole("button", { name: "Làm lại", exact: true }).click();
  await page.getByRole("button", { name: "Lưu dự án", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Đã lưu");
  await page.getByRole("button", { name: "Xuất mô hình" }).click();
  const dl = page.waitForEvent("download");
  await page.getByRole("button", { name: "Tải JSON dự án" }).click();
  expect((await dl).suggestedFilename()).toBe("buildvision-project.json");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test("help dialog opens and closes with Escape", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Hướng dẫn", exact: true })
    .first()
    .click();
  await expect(page.locator("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("dialog")).toHaveCount(0);
});

test("walk moves without pointer lock and exits with Escape", async ({
  page,
}) => {
  await page.goto("/");
  if ((page.viewportSize()?.width || 1440) < 640)
    await page
      .getByRole("button", { name: "Không gian 3D", exact: true })
      .click();
  await page.getByRole("button", { name: "Đi bộ", exact: true }).click();
  const hud = page.getByLabel("Vị trí nhân vật");
  await expect(hud).toContainText("X ");
  expect(await page.evaluate(() => document.pointerLockElement)).toBeNull();
  const before = await hud.textContent();
  await page.keyboard.down("KeyW");
  await page.waitForTimeout(600);
  await page.keyboard.up("KeyW");
  await expect(hud).not.toHaveText(before!);
  const after = await hud.textContent();
  const button = page.getByRole("button", { name: "Đi tới", exact: true });
  const box = await button.boundingBox();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(400);
  await page.mouse.up();
  await expect(hud).not.toHaveText(after!);
  await page.keyboard.press("Escape");
  await expect(hud).toHaveCount(0);
});
