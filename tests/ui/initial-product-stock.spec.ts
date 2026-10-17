import { expect, test } from "@playwright/test";

test("admin can enter opening stock while creating a glass SKU", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Chủ cửa hàng/ }).click();
  await page.getByRole("button", { name: "Kho hàng", exact: true }).click();

  await page.getByRole("button", { name: "Thêm sản phẩm", exact: true }).click();
  const createDialog = page.getByRole("dialog");
  await createDialog.getByLabel("Mã kính", { exact: true }).fill("TEST-TON-DAU");
  await expect(createDialog.getByLabel("Tên sản phẩm", {exact:true})).toHaveCount(0);
  await expect(createDialog.getByLabel("Hãng điện thoại", { exact: true })).toHaveValue("Apple");
  await expect(createDialog.getByLabel("Hãng điện thoại", { exact: true })).toBeEditable();
  await createDialog.getByLabel("Giá bán (đ)", { exact: true }).fill("10000");
  await createDialog
    .getByLabel("Giá vốn cố định (đ)", { exact: true })
    .fill("5000");
  await createDialog
    .getByLabel("Số lượng nhập ban đầu", { exact: true })
    .fill("7");
  await createDialog
    .getByRole("button", { name: "Lưu sản phẩm", exact: true })
    .click();

  await expect(page.getByRole("status")).toContainText(
    "Đã lưu sản phẩm và nhập tồn ban đầu 7 tấm",
  );
  const row = page.locator("tbody tr").filter({ hasText: "TEST-TON-DAU" });
  await expect(row).toContainText("7 tấm");

  await page.getByRole("button", { name: "Lịch sử TEST-TON-DAU", exact: true }).click();
  const historyDialog = page.getByRole("dialog");
  await expect(historyDialog).toContainText("opening");
  await expect(historyDialog).toContainText("+7");
  await historyDialog.getByRole("button", { name: "Đóng", exact: true }).click();

  await page.getByRole("button", { name: "Sửa TEST-TON-DAU", exact: true }).click();
  const editDialog = page.getByRole("dialog");
  await expect(editDialog.getByLabel("Hãng điện thoại", { exact: true })).toHaveValue("Apple");
  await expect(
    editDialog.getByLabel("Số lượng nhập ban đầu", { exact: true }),
  ).toHaveCount(0);
});
