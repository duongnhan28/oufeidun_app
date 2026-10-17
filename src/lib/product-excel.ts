import { typeLabels } from "../types";
import { InputError } from "./input-error";

export const productExcelColumns = ["Mã kính", "Loại kính", "Hãng điện thoại", "Hãng kính", "Giá bán (đ)", "Giá sỉ mặc định (đ)", "Giá vốn cố định (đ)", "Mã/dòng máy dùng chung", "Số lượng"];
export type ProductExcelRow = { sku: string; glass_type: string; brand: string; glass_brand: string; sale_price: string; wholesale_price: string; fixed_cost: string; models: string[]; quantity: number };
const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/[^a-z0-9]/g, "");

// null means the legacy quantity/purchase-price workbook, handled by its own parser.
export async function readProductWorkbook(file: File): Promise<ProductExcelRow[] | null> {
  if (file.size > 10 * 1024 * 1024) throw new InputError("File Excel tối đa 10 MB.");
  if (!/\.xlsx$/i.test(file.name)) throw new InputError("Vui lòng lưu file dưới dạng Excel .xlsx.");
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  try { await workbook.xlsx.load(await file.arrayBuffer()); }
  catch { throw new InputError("Không đọc được file Excel. Hãy mở bằng Excel rồi lưu lại dạng .xlsx."); }
  const aliases = [
    ["makinh", "sku"], ["loaikinh"], ["hangdienthoai"], ["hangkinh"],
    ["giaban", "giaband"], ["giasimacdinh", "giasimacdinhd"], ["giavoncodinh", "giavoncodinhd"],
    ["madongmaydungchung", "madongmaydungchungmoidongmotma", "dongmaydungchung", "maydungchung"],
    ["soluong", "soluongnhap", "soluongnhapmieng", "soluongmieng"],
  ];
  for (const sheet of workbook.worksheets) for (let index = 1; index <= Math.min(20, sheet.rowCount); index++) {
    const columns = aliases.map(() => 0);
    sheet.getRow(index).eachCell((cell, col) => {
      const key = aliases.findIndex(values => values.includes(normalize(cell.text)));
      if (key >= 0) {
        if (columns[key]) throw new InputError(`Dòng ${index}: cột ${productExcelColumns[key]} bị lặp.`);
        columns[key] = col;
      }
    });
    if (!columns[0] || !columns[1]) continue;
    if (columns.slice(0, 8).some(col => !col)) throw new InputError(`Thiếu cột ${productExcelColumns.filter((_, i) => i < 8 && !columns[i]).join(", ")}. Hãy dùng file mẫu của app.`);
    const rows: ProductExcelRow[] = [], seen = new Set<string>();
    const emptyColumn = sheet.columnCount + 1;
    const types = new Map(Object.entries(typeLabels).flatMap(([key, value]) => [[normalize(key), key], [normalize(value), key]]));
    types.set("kinhchongnhintrom", "privacy");
    types.set("kinhtrong","clear");types.set("kinhfullvien","clear");types.set("fullvien","clear");types.set("kinhnham","matte");types.set("khac","other");
    for (let line = index + 1; line <= sheet.rowCount; line++) {
      const cells = columns.map(col => sheet.getRow(line).getCell(col || emptyColumn));
      if (cells.every(cell => !cell.text.trim() && cell.value == null)) continue;
      if (cells.every(cell => !cell.text.trim())) continue;
      const texts = cells.map(cell => cell.text.trim());
      const fail = (message: string): never => { throw new InputError(`Dòng ${line}: ${message}`); };
      const sku = texts[0].toUpperCase();
      if (!sku || sku.length > 50) fail("Mã kính phải có từ 1 đến 50 ký tự.");
      if (seen.has(sku)) fail(`mã kính ${sku} bị lặp.`);
      seen.add(sku);
      const glassType = types.get(normalize(texts[1]));
      if (!glassType) fail(`Loại kính không hợp lệ. Chọn ${Object.values(typeLabels).join(", ")}.`);
      if (texts[2].length > 100 || texts[3].length > 100) fail("Hãng điện thoại / Hãng kính tối đa 100 ký tự.");
      const prices = cells.slice(4, 7).map((cell, pos) => {
        let value = cell.value;
        if (value && typeof value === "object" && ("formula" in value || "sharedFormula" in value)) value = value.result ?? null;
        if (value && typeof value === "object" && "richText" in value) value = value.richText.map(part => part.text).join("");
        if (typeof value === "string") {
          const text = value.trim().replace(/[\s\u00a0]/g, "").replace(/(?:vnd|đ|₫)$/i, "");
          value = /^\d{1,3}([.,])\d{3}(?:\1\d{3})*$/.test(text) ? Number(text.replace(/[.,]/g, "")) : /^\d+$/.test(text) ? Number(text) : null;
        }
        if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0 || value > 999999999999999) fail(`${productExcelColumns[pos + 4]} phải là số nguyên không âm, tối đa 15 chữ số. Công thức phải có kết quả đã lưu.`);
        return String(value);
      });
      const models = [...new Set(texts[7].split(/[,\r\n]+/).map(model => model.trim()).filter(Boolean))];
      if (models.length > 500 || models.some(model => model.length > 200)) fail("Tối đa 500 dòng máy, mỗi tên tối đa 200 ký tự.");
      let quantity = 0;
      if (columns[8]) {
        let value = cells[8].value;
        if (value && typeof value === "object" && ("formula" in value || "sharedFormula" in value)) value = value.result ?? null;
        if (value && typeof value === "object" && "richText" in value) value = value.richText.map(part => part.text).join("");
        if (typeof value === "string") {
          const text = value.trim();
          value = /^\d{1,3}([.,])\d{3}(?:\1\d{3})*$/.test(text) ? Number(text.replace(/[.,]/g, "")) : /^\d+$/.test(text) ? Number(text) : null;
        }
        if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0 || value > 1000000) fail("Số lượng phải là số nguyên từ 0 đến 1.000.000; điền 0 nếu chỉ cập nhật danh mục. Công thức phải có kết quả đã lưu.");
        quantity = value as number;
      }
      rows.push({ sku, glass_type: glassType!, brand: texts[2] || "other", glass_brand: texts[3], sale_price: prices[0], wholesale_price: prices[1], fixed_cost: prices[2], models, quantity });
      if (rows.length > 100) fail("Mỗi file tối đa 100 mã kính.");
    }
    if (!rows.length) throw new InputError("File Excel chưa có mã kính.");
    return rows;
  }
  return null;
}
