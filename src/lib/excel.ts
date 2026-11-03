import { saveDownload } from "./download";
import { InputError } from "./input-error";
import {orderItemsForDisplay} from './order-item-order';
import {orderProductColor} from './order-product-color';

export type ExcelCell = string | number | Date | null | undefined;

export async function downloadWorkbook(
  filename: string,
  sheets: { name: string; columns: string[]; rows: ExcelCell[][]; skuColors?: string[] }[],
) {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Oufeidun";
  workbook.created = new Date();
  for (const sheet of sheets) {
    const ws = workbook.addWorksheet(sheet.name.slice(0, 31));
    ws.addRow(sheet.columns);
    ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF008C9E" } };
    sheet.rows.forEach((row) => ws.addRow(row));
    const skuColumn=sheet.columns.indexOf('Mã kính')+1;
    if(skuColumn && sheet.skuColors)sheet.skuColors.forEach((color,index)=>{ws.getCell(index+2,skuColumn).font={color:{argb:'FF'+color.replace('#','')}};});
    ws.views = [{ state: "frozen", ySplit: 1 }];
    ws.columns.forEach((column) => {
      let width = 12;
      column.eachCell?.({ includeEmpty: true }, (cell) => {
        width = Math.min(45, Math.max(width, String(cell.value ?? "").length + 2));
      });
      column.width = width;
    });
    ws.autoFilter = { from: "A1", to: `${String.fromCharCode(64 + Math.min(sheet.columns.length, 26))}1` };
  }
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer as BlobPart], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  return saveDownload(blob, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
}

export async function readInventoryWorkbook(file: File, quantitiesOnly=false) {
  if (file.size > 10 * 1024 * 1024) throw new InputError("File nhập kho tối đa 10 MB.");
  if (!/\.xlsx$/i.test(file.name)) throw new InputError("Vui lòng lưu file dưới dạng Excel .xlsx trước khi nhập kho.");
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  try { await workbook.xlsx.load(await file.arrayBuffer()); }
  catch { throw new InputError("Không đọc được file Excel. Hãy mở bằng Excel rồi lưu lại dạng .xlsx."); }
  const normalize = (text: string) => text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g,"d").replace(/[^a-z0-9]/g, "");
  const aliases = { sku: ["makinh", "sku"], quantity: ["soluong", "slnhap", "soluongnhap"], price: ["gianhap", "dongianhap", "giamua", "dongiamua", "gianhapd", "dongiamuathucted"] };
  let header: { sheet: typeof workbook.worksheets[number]; row: number; sku: number; quantity: number; price: number } | undefined;
  // Find the data sheet by its headers; guide sheets and reordered columns are valid.
  for (const sheet of workbook.worksheets) {
    for (let row = 1; row <= Math.min(sheet.rowCount, 20); row++) {
      const columns = { sku: 0, quantity: 0, price: 0 };
      sheet.getRow(row).eachCell((cell, index) => {
        for (const key of ["sku", "quantity", "price"] as const) if (aliases[key].includes(normalize(cell.text))) columns[key] = index;
      });
      if(quantitiesOnly&&columns.sku&&columns.quantity){
        if(columns.price||sheet.getRow(row).cellCount!==2)throw new InputError('File nhân viên chỉ được có hai cột Mã kính và Số lượng, không có giá/vốn.');
        header={sheet,row,...columns};break;
      }
      if (!quantitiesOnly && columns.sku && columns.quantity && columns.price) { header = { sheet, row, ...columns }; break; }
    }
    if (header) break;
  }
  if (!header) throw new InputError("Không tìm thấy ba cột Mã kính, Số lượng, Giá nhập. Vui lòng dùng file mẫu của app.");
  const numberValue = (cell: import("exceljs").Cell, row: number, label: string) => {
    let value = cell.value;
    if (value && typeof value === "object" && "formula" in value) value = value.result ?? null;
    if (value && typeof value === "object" && "sharedFormula" in value) value = value.result ?? null;
    if (value && typeof value === "object" && "richText" in value) value = value.richText.map(part => part.text).join("");
    if (typeof value === "string") {
      const text = value.trim().replace(/[\s\u00a0]/g, "").replace(/(?:vnd|đ|₫)$/i, "");
      // Whole VND/units only. Do not reinterpret decimal quantities or round prices.
      value = /^\d{1,3}([.,])\d{3}(?:\1\d{3})*$/.test(text) ? Number(text.replace(/[.,]/g, "")) : /^\d+$/.test(text) ? Number(text) : null;
    }
    if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) throw new InputError(`Dòng ${row}: ${label} phải là số nguyên không âm. Nếu dùng công thức, mở và lưu lại file bằng Excel để có kết quả.`);
    return value;
  };
  const rows: { sku: string; quantity: number; purchase_price: string }[] = [];
  const seen = new Set<string>();
  header.sheet.eachRow((row, index) => {
    if (index <= header!.row) return;
    const cells = [header!.sku, header!.quantity, quantitiesOnly?header!.quantity:header!.price].map(column => row.getCell(column));
    if (cells.every(cell => !cell.text.trim() && (cell.value == null || typeof cell.value === "string"))) return;
    const sku = cells[0].text.trim().toUpperCase();
    if (!sku) throw new InputError(`Dòng ${index}: chưa nhập Mã kính.`);
    if (sku.length > 50) throw new InputError(`Dòng ${index}: Mã kính tối đa 50 ký tự.`);
    const quantity = numberValue(cells[1], index, "Số lượng");
    const purchasePrice = quantitiesOnly?0:numberValue(cells[2], index, "Giá nhập");
    if (quantity < 1 || quantity > 1000000) throw new InputError(`Dòng ${index}: Số lượng phải từ 1 đến 1.000.000.`);
    if (purchasePrice > 999999999999999) throw new InputError(`Dòng ${index}: Giá nhập vượt giới hạn cho phép.`);
    if (seen.has(sku)) throw new InputError(`Dòng ${index}: mã kính ${sku} bị lặp. Vui lòng gộp thành một dòng.`);
    seen.add(sku);
    rows.push({ sku, quantity, purchase_price: String(purchasePrice) });
    if (rows.length > 100) throw new InputError("Mỗi phiếu nhập tối đa 100 mã kính. Vui lòng tách file thành nhiều phiếu.");
  });
  if (!rows.length) throw new InputError("File Excel chưa có dòng nhập hàng.");
  return rows;
}

export type OrderExcelData = {
  orderNo: string;
  customerName: string;
  phone: string;
  address: string;
  sales: string;
  orderedAt: string;
  fulfillment: string;
  missingSummary: string;
  note?: string;
  extraCost?: number;
  extraCostNote?: string;
  items: {
    product_id?: string;
    glassType?: string;
    sku: string;
    name: string;
    quantity: number;
    unit?: 'tấm' | 'sản phẩm';
    deliveredQuantity?: number;
    missingQuantity?: number;
    unitPrice: number;
    models?: string[];
    kind?: 'sale' | 'gift' | 'sample';
    note?: string;
  }[];
};

export async function downloadOrderWorkbook(data: OrderExcelData) {
  data={...data,items:orderItemsForDisplay(data.items)};
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Oufeidun";
  const sheet = workbook.addWorksheet("Theo dõi đơn hàng", {
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  sheet.columns = [
    { width: 7 }, { width: 42 }, { width: 12 },
    { width: 11 }, { width: 11 }, { width: 11 }, { width: 16 }, { width: 18 },
  ];
  sheet.mergeCells("A1:H1");
  const title = sheet.getCell("A1");
  title.value = "THEO DÕI ĐƠN HÀNG";
  title.font = { bold: true, size: 22 };
  title.alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(1).height = 34;

  sheet.mergeCells("A2:E2"); sheet.getCell("A2").value = `Khách hàng: ${data.customerName}`;
  sheet.mergeCells("F2:H2"); sheet.getCell("F2").value = `Sales: ${data.sales}`;
  sheet.mergeCells("A3:E3"); sheet.getCell("A3").value = `SĐT: ${data.phone}`;
  sheet.mergeCells("F3:H3"); sheet.getCell("F3").value = `Thời gian đặt hàng: ${data.orderedAt}`;
  sheet.mergeCells("A4:E4"); sheet.getCell("A4").value = `Địa chỉ: ${data.address || "Chưa cập nhật"}`;
  sheet.mergeCells("F4:H4"); sheet.getCell("F4").value = `Số: ${data.orderNo}`;
  sheet.mergeCells("A5:E5"); sheet.getCell("A5").value = `Tình trạng: ${data.fulfillment}`;
  sheet.mergeCells("F5:H5"); sheet.getCell("F5").value = data.missingSummary ? `Còn thiếu: ${data.missingSummary}` : "";
  for (let row = 2; row <= 5; row++) {
    sheet.getRow(row).font = { bold: true, size: 11 };
    sheet.getRow(row).alignment = { vertical: "middle", wrapText: true };
    sheet.getRow(row).height = 22;
  }

  const header = sheet.addRow(["STT", "MÃ KÍNH", "ĐVT", "SL ĐẶT", "ĐÃ GIAO", "CÒN THIẾU", "ĐƠN GIÁ", "THÀNH TIỀN"]);
  header.font = { bold: true };
  header.alignment = { horizontal: "center", vertical: "middle" };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9EAF7" } };
  data.items.forEach((item, index) => {
    const delivered = item.deliveredQuantity ?? item.quantity;
    const missing = item.missingQuantity ?? Math.max(0, item.quantity - delivered);
    const description = [item.sku, item.kind && item.kind!=="sale" ? (item.kind==="gift"?"Hàng tặng":"Hàng mẫu") : "", item.models?.length ? `Dùng chung: ${item.models.join(', ')}` : '', item.note ? `Ghi chú: ${item.note}` : ''].filter(Boolean).join('\n');
    const row = sheet.addRow([index + 1, description, item.unit === 'sản phẩm' ? 'Sản phẩm' : 'Tấm', item.quantity, delivered, missing, item.unitPrice, delivered * item.unitPrice]);
    row.getCell(2).font = {color:{argb:'FF'+orderProductColor(item.glassType,item.sku).slice(1)}};
    row.height = Math.max(24, 15 * (description.split('\n').reduce((sum,line) => sum + Math.max(1,Math.ceil(line.length/38)),0)));
    row.getCell(1).alignment = { horizontal: "center" };
    row.getCell(4).alignment = { horizontal: "center" };
    row.getCell(5).alignment = { horizontal: "center" };
    row.getCell(7).numFmt = "#,##0";
    row.getCell(8).numFmt = "#,##0";
  });
  const totalQuantity = data.items.reduce((sum, item) => sum + item.quantity, 0);
  const totalDelivered = data.items.reduce((sum, item) => sum + (item.deliveredQuantity ?? item.quantity), 0);
  const totalMissing = data.items.reduce((sum, item) => sum + (item.missingQuantity ?? Math.max(0, item.quantity - (item.deliveredQuantity ?? item.quantity))), 0);
  const totalAmount = data.items.reduce((sum, item) => sum + (item.deliveredQuantity ?? item.quantity) * item.unitPrice, 0);
  const totalRow = sheet.addRow(["", "Tổng cộng", "", totalQuantity, totalDelivered, totalMissing, "", totalAmount]);
  totalRow.font = { bold: true, color: { argb: "FFCC0000" } };
  totalRow.getCell(2).alignment = { horizontal: "center" };
  totalRow.getCell(8).numFmt = "#,##0";
  const addSummary = (label: string, value: number) => {
    const row = sheet.addRow(['',label,'','','','','',value]);
    sheet.mergeCells(`B${row.number}:G${row.number}`);
    row.height = Math.max(24,15 * (Math.ceil(label.length/95) + label.split('\n').length));
    row.font = {bold:true}; row.getCell(8).numFmt = '#,##0';
  };
  totalRow.getCell(2).value = 'Tiền sản phẩm';
  addSummary('Chi phí khác' + (data.extraCostNote ? `: ${data.extraCostNote}` : ''),data.extraCost || 0);
  addSummary('Tổng giá trị đơn hàng',totalAmount + (data.extraCost || 0));
  if (data.note) {
    const row = sheet.addRow([`Ghi chú đơn hàng: ${data.note}`]);
    sheet.mergeCells(`A${row.number}:H${row.number}`);
    row.height = Math.max(30,15*Math.ceil(data.note.length/110) + 15*data.note.split('\n').length);
  }
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber >= 6) row.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
      cell.alignment = { ...cell.alignment, vertical: "middle", wrapText: true };
    });
  });
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  return saveDownload(blob, `${data.orderNo}-${data.customerName || "khach-hang"}.xlsx`);
}
