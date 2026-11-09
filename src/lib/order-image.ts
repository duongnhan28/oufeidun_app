import type { OrderExcelData } from './excel';
import { saveDownload } from './download';
import { quantitySummary } from './catalog';
import { orderItemsForDisplay } from './order-item-order';
import { orderProductColor } from './order-product-color';

const number = (value: number) => new Intl.NumberFormat('vi-VN').format(value);
const money = (value: number) => `${number(value)}đ`;
const safeFilename = (value: string) => value.trim().replace(/[<>:"/\\|?*\u0000-\u001f]+/g, '-').replace(/\s+/g, '-') || 'don-hang';
export type GeneratedOrderImage = { blob: Blob; filename: string };

function wrapText(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split(/\r?\n/)) {
    let line = '';
    for (const word of paragraph.trim().split(/\s+/)) {
      const candidate = line ? `${line} ${word}` : word;
      if (ctx.measureText(candidate).width <= width) { line = candidate; continue; }
      if (line) { lines.push(line); line = ''; }
      for (const character of word) {
        if (line && ctx.measureText(line + character).width > width) { lines.push(line); line = ''; }
        line += character;
      }
    }
    lines.push(line);
  }
  return lines;
}

// Compact spreadsheet layout: one image, full data, no repeated cards or unit
// subrows. Render at 2x for sharp original files instead of enlarging a bitmap.
export async function createOrderImage(input: OrderExcelData): Promise<GeneratedOrderImage> {
  const data = { ...input, items: orderItemsForDisplay(input.items) };
  const width = 1200, scale = 2, left = 12, inner = width - left * 2;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Không thể tạo ảnh đơn hàng trên thiết bị này.');
  const font = (size = 18, bold = false) => { ctx.font = `${bold ? 700 : 400} ${size}px Arial, sans-serif`; };
  const wrapped = (text: string, available: number, size = 18, bold = false) => {
    font(size, bold); return wrapText(ctx, text, available);
  };
  const columns = [52, 390, 70, 100, 100, 100, 150, 214];
  const headers = ['STT', 'MÃ KÍNH', 'ĐVT', 'SL ĐẶT', 'ĐÃ GIAO', 'CÒN THIẾU', 'ĐƠN GIÁ', 'THÀNH TIỀN'];
  const split = Math.round(inner * 0.65);
  const metadata = [
    [`Khách hàng: ${data.customerName}`, `Sales: ${data.sales}`],
    [`SĐT: ${data.phone}`, `Thời gian đặt: ${data.orderedAt}`],
    [`Địa chỉ: ${data.address || 'Chưa cập nhật'}`, `Số: ${data.orderNo}`],
    [`Tình trạng: ${data.fulfillment}`, `Còn thiếu: ${data.missingSummary || 'Không'}`],
  ].map(fields => ({
    lines: [wrapped(fields[0], split - 16, 18, true), wrapped(fields[1], inner - split - 16, 18, true)],
  }));
  const metadataHeights = metadata.map(row => Math.max(36, Math.max(...row.lines.map(lines => lines.length)) * 24 + 12));
  const tableTop = 62 + metadataHeights.reduce((sum, height) => sum + height, 0);
  const rows = data.items.map((item,index) => {
    const sku = wrapped(item.sku, columns[1] - 16, 18);
    const detail = [
      item.kind === 'gift' ? 'Hàng tặng · 0đ' : item.kind === 'sample' ? 'Hàng mẫu · 0đ' : '',
      item.models?.length ? `Dùng chung: ${item.models.join(', ')}` : '',
      item.note ? `Ghi chú: ${item.note}` : '',
    ].filter(Boolean).flatMap(text => wrapped(text, columns[1] - 16, 16));
    const delivered=item.deliveredQuantity;
    const missing=item.missingQuantity ?? (delivered===undefined?undefined:Math.max(0,item.quantity-delivered));
    const values=[String(index+1),'',item.unit||'tấm',number(item.quantity),delivered===undefined?'—':number(delivered),missing===undefined?'—':number(missing),money(item.unitPrice),money((delivered??item.quantity)*item.unitPrice)];
    const valueLines=values.map((value,column)=>wrapped(value,columns[column]-16,18));
    return { sku, detail, values:valueLines, height: Math.max(42, sku.length * 24 + detail.length * 21 + 14,14+24*Math.max(...valueLines.map(lines=>lines.length))) };
  });
  const totalQuantity = (kind: 'ordered' | 'delivered' | 'missing') => {
    if (kind !== 'ordered' && data.items.some(item => kind === 'delivered' ? item.deliveredQuantity === undefined : item.missingQuantity === undefined && item.deliveredQuantity === undefined)) return '—';
    const entries = data.items.map(item => ({
      unit: item.unit,
      quantity: kind === 'ordered' ? item.quantity : kind === 'delivered' ? item.deliveredQuantity! : item.missingQuantity ?? Math.max(0, item.quantity - item.deliveredQuantity!),
    }));
    const units = new Set(entries.map(item => item.unit || 'tấm'));
    return units.size === 1 ? number(entries.reduce((sum, item) => sum + item.quantity, 0)) : quantitySummary(entries);
  };
  const productTotal = data.items.reduce((sum, item) => sum + (item.deliveredQuantity ?? item.quantity) * item.unitPrice, 0);
  const notes = data.note ? wrapped(`Ghi chú: ${data.note}`, inner - columns[0] - 16, 18) : [];
  const fee = wrapped(`Chi phí khác${data.extraCostNote ? `: ${data.extraCostNote}` : ''}`, inner - columns[0] - columns[7] - 16, 18);
  const feeValue=wrapped(money(data.extraCost||0),columns[7]-16,18);
  const grandValue=wrapped(money(productTotal+(data.extraCost||0)),columns[7]-16,21,true);
  const feeHeight=Math.max(44,Math.max(fee.length,feeValue.length)*24+12);
  const grandHeight=Math.max(50,grandValue.length*26+18);
  const summaryHeight = Math.max(40, 12 + 24 * Math.max(...[totalQuantity('ordered'), totalQuantity('delivered'), totalQuantity('missing')].map((text, index) => wrapped(text, columns[index + 3] - 16, 17, true).length)));
  const height = tableTop + 36 + rows.reduce((sum, row) => sum + row.height, 0) + summaryHeight + (notes.length ? notes.length * 24 + 12 : 0) + feeHeight + grandHeight + 14;
  if (height * scale > 16000 || width * height * scale * scale > 40_000_000) throw new Error('Đơn quá dài để xuất an toàn trong một ảnh. Vui lòng dùng In / lưu PDF để giữ đầy đủ nội dung.');
  canvas.width = width * scale; canvas.height = height * scale;
  ctx.scale(scale, scale);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = '#82919b'; ctx.lineWidth = 0.75;
  const cell = (x: number, y: number, w: number, h: number, background = '#ffffff') => {
    ctx.fillStyle = background; ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x + 0.5, y + 0.5, w, h);
  };
  const text = (value: string, x: number, y: number, available: number, options: { bold?: boolean; color?: string; align?: CanvasTextAlign; size?: number } = {}) => {
    font(options.size || 18, options.bold); ctx.fillStyle = options.color || '#111111'; ctx.textAlign = options.align || 'left';
    const xText = options.align === 'right' ? x + available : options.align === 'center' ? x + available / 2 : x;
    ctx.fillText(value, xText, y);
  };
  text('OUFEIDUN', left, 36, 160, { bold: true, size: 15, color: '#405461' });
  text('THEO DÕI ĐƠN HÀNG', left, 41, inner, { bold: true, align: 'center', size: 32 });
  let y = 62;
  metadata.forEach((row, index) => {
    const h = metadataHeights[index];
    cell(left, y, split, h); cell(left + split, y, inner - split, h);
    row.lines[0].forEach((line, n) => text(line, left + 8, y + 25 + n * 24, split - 16, { bold: true }));
    row.lines[1].forEach((line, n) => text(line, left + split + 8, y + 25 + n * 24, inner - split - 16, { bold: true }));
    y += h;
  });
  let x = left;
  headers.forEach((header, index) => {
    cell(x, y, columns[index], 36, '#dcecf4');
    text(header, x + 5, y + 25, columns[index] - 10, { bold: true, align: 'center', size: 16 }); x += columns[index];
  });
  y += 36;
  data.items.forEach((item, index) => {
    const row = rows[index];
    x = left;
    row.values.forEach((lines, column) => {
      cell(x, y, columns[column], row.height);
      if (column === 1) {
        row.sku.forEach((line, n) => text(line, x + 8, y + 27 + n * 24, columns[column] - 16, { color: orderProductColor(item.glassType, item.sku) }));
        row.detail.forEach((line, n) => text(line, x + 8, y + 27 + row.sku.length * 24 + n * 21, columns[column] - 16, { size: 16 }));
      } else {
        lines.forEach((line, n) => text(line, x + 8, y + 27 + n * 24, columns[column] - 16, { align: column >= 3 ? 'right' : column === 0 ? 'center' : 'left' }));
      }
      x += columns[column];
    });
    y += row.height;
  });
  const summary = ['', 'Tiền sản phẩm', '', totalQuantity('ordered'), totalQuantity('delivered'), totalQuantity('missing'), '', money(productTotal)];
  x = left;
  summary.forEach((value, index) => {
    cell(x, y, columns[index], summaryHeight, '#f3f7fa');
    wrapped(value, columns[index] - 16, 17, true).forEach((line, n) => text(line, x + 8, y + 26 + n * 24, columns[index] - 16, { bold: true, color: '#9b2424', size: 17, align: index >= 3 ? 'right' : 'center' }));
    x += columns[index];
  });
  y += summaryHeight;
  if (notes.length) {
    const h = notes.length * 24 + 12; cell(left, y, inner, h);
    notes.forEach((line, n) => text(line, left + columns[0] + 8, y + 25 + n * 24, inner - columns[0] - 16)); y += h;
  }
  const labelWidth = inner - columns[0] - columns[7];
  cell(left, y, columns[0], feeHeight); cell(left + columns[0], y, labelWidth, feeHeight); cell(width - left - columns[7], y, columns[7], feeHeight);
  fee.forEach((line, n) => text(line, left + columns[0] + 8, y + 27 + n * 24, labelWidth - 16));
  feeValue.forEach((line,n)=>text(line, width - left - columns[7] + 8, y + 27+n*24, columns[7] - 16, { align: 'right' })); y += feeHeight;
  cell(left, y, columns[0], grandHeight); cell(left + columns[0], y, labelWidth, grandHeight); cell(width - left - columns[7], y, columns[7], grandHeight);
  text('TỔNG TIỀN', left + columns[0] + 8, y + 33, labelWidth - 16, { bold: true, size: 21 });
  grandValue.forEach((line,n)=>text(line, width - left - columns[7] + 8, y + 33+n*26, columns[7] - 16, { bold: true, align: 'right', size: 21 }));
  // Synchronous encoding also works when an Electron window is occluded.
  const encoded = canvas.toDataURL('image/png').split(',')[1];
  if (!encoded) throw new Error('Không thể xuất ảnh đơn hàng.');
  const bytes = Uint8Array.from(atob(encoded), character => character.charCodeAt(0));
  canvas.width = 1; canvas.height = 1;
  return { blob: new Blob([bytes], { type: 'image/png' }), filename: `${safeFilename(data.orderNo)}-${safeFilename(data.customerName)}.png` };
}

export async function downloadGeneratedOrderImage(image: GeneratedOrderImage) {
  return saveDownload(image.blob, image.filename);
}
export async function downloadOrderImage(data: OrderExcelData) {
  return downloadGeneratedOrderImage(await createOrderImage(data));
}
