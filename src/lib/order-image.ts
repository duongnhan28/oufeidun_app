import type { OrderExcelData } from "./excel";
import { saveDownload } from "./download";
import {quantitySummary} from './catalog';
import {orderItemsForDisplay} from './order-item-order';
import {orderProductColor} from './order-product-color';

const formatNumber = (value: number) => new Intl.NumberFormat("vi-VN").format(value);
const safeFilename = (value: string) => value.trim().replace(/[<>:"/\\|?*\u0000-\u001f]+/g, "-").replace(/\s+/g, "-") || "don-hang";

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
}

function fitText(ctx: CanvasRenderingContext2D, value: string, maxWidth: number) {
  if (ctx.measureText(value).width <= maxWidth) return value;
  let text = value;
  while (text.length > 1 && ctx.measureText(`${text}…`).width > maxWidth) text = text.slice(0, -1);
  return `${text}…`;
}

export type GeneratedOrderImage = { blob: Blob; filename: string };

function wrapText(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split(/\r?\n/)) {
    let line = '';
    for (const word of paragraph.trim().split(/\s+/)) {
      const candidate = line ? `${line} ${word}` : word;
      if (ctx.measureText(candidate).width <= width) { line = candidate; continue; }
      if (line) { lines.push(line); line = ''; }
      // Keep normal words intact; split only identifiers longer than a full line.
      for (const char of word) {
        if (line && ctx.measureText(line + char).width > width) { lines.push(line); line = ''; }
        line += char;
      }
    }
    lines.push(line);
  }
  return lines;
}

export async function createOrderImage(data: OrderExcelData): Promise<GeneratedOrderImage> {
  data={...data,items:orderItemsForDisplay(data.items)};
  const width = 1200;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Không thể tạo ảnh đơn hàng trên thiết bị này.");
  const ink = '#19334b', muted = '#536a7d', teal = '#008799';
  const left = 64, innerWidth = width - left * 2;
  const cardWidth = (innerWidth - 24) / 2;
  const font = (size: number, bold = false) => { ctx.font = `${bold ? '700' : '400'} ${size}px Arial, sans-serif`; };
  const lines = (text: string, available: number, size = 21, bold = false) => {
    font(size, bold); return wrapText(ctx, text, available);
  };
  // Measure with the same font used to render, including long customer/address/SKU values.
  const customerFields = [
    {label:'Khách hàng', value:data.customerName},
    {label:'Số điện thoại', value:data.phone},
    {label:'Địa chỉ', value:data.address || 'Chưa cập nhật'},
  ];
  const orderFields = [
    {label:'Mã đơn hàng', value:data.orderNo},
    {label:'Ngày giờ đặt đơn', value:data.orderedAt},
    {label:'Nhân viên bán hàng', value:data.sales},
  ];
  const measureFields = (fields: typeof customerFields) => fields.map(field => ({...field, lines:lines(field.value,cardWidth-48,22,true)}));
  const customer = measureFields(customerFields), order = measureFields(orderFields);
  const fieldsHeight = (fields: typeof customer) => fields.reduce((sum,field)=>sum+30+field.lines.length*30+18,0);
  const infoTop = 154;
  const infoHeight = 74 + Math.max(fieldsHeight(customer),fieldsHeight(order));
  const shortage = data.missingSummary ? lines(`Còn thiếu: ${data.missingSummary}`,innerWidth-48) : [];
  const statusTop = infoTop + infoHeight + 18;
  const statusHeight = 62 + shortage.length*29;
  const tableTop = statusTop + statusHeight + 26;
  const skuLines = data.items.map(item=>lines(item.sku,462,23,true));
  const details = data.items.map(item => lines([`Đơn vị: ${item.unit || 'tấm'}`,item.kind && item.kind!=='sale' ? (item.kind==='gift'?'Hàng tặng · 0đ':'Hàng mẫu · 0đ') : '',item.models?.length ? `Dùng chung: ${item.models.join(', ')}` : '', item.note ? `Ghi chú: ${item.note}` : ''].filter(Boolean).join('\n'),462,20));
  const rowHeights = details.map((detail,index) => 36 + skuLines[index].length*30 + (detail[0] ? 10+detail.length*28 : 0));
  const rowsHeight = rowHeights.reduce((a,b)=>a+b,0);
  const noteLines = data.note ? lines(data.note,cardWidth-48) : [];
  const feeLines = data.extraCostNote ? lines(data.extraCostNote,cardWidth-48) : [];
  const summaryTop = tableTop + 56 + rowsHeight + 24;
  const notesHeight = Math.max(102,62+noteLines.length*29) + (feeLines.length ? 62+feeLines.length*29 : 0);
  const summaryHeight = Math.max(222,notesHeight);
  const height = summaryTop + summaryHeight + 108;
  canvas.height = height;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#ffffff";
  ctx.fillStyle = teal;
  ctx.fillRect(left, 38, innerWidth, 8);
  ctx.fillStyle = ink;
  font(38,true);
  ctx.fillText("OUFEIDUN", left, 101);
  font(28,true);
  ctx.textAlign = "right";
  ctx.fillText("XÁC NHẬN ĐƠN HÀNG", width - left, 96);
  font(19);ctx.fillStyle=muted;
  ctx.fillText('Thông tin gửi khách kiểm tra',width-left,126);
  ctx.textAlign = "left";

  const drawCard = (x: number, title: string, fields: typeof customer) => {
    ctx.fillStyle='#f4f8fa';roundedRect(ctx,x,infoTop,cardWidth,infoHeight,14);ctx.fill();
    ctx.fillStyle=teal;font(19,true);ctx.fillText(title,x+24,infoTop+36);
    let y=infoTop+74;
    fields.forEach(field=>{
      ctx.fillStyle=muted;font(19);ctx.fillText(field.label,x+24,y);
      ctx.fillStyle=ink;font(22,true);
      field.lines.forEach((line,index)=>ctx.fillText(line,x+24,y+30+index*30));
      y+=30+field.lines.length*30+18;
    });
  }
  drawCard(left,'THÔNG TIN KHÁCH HÀNG',customer);
  drawCard(left+cardWidth+24,'THÔNG TIN ĐƠN HÀNG',order);
  ctx.fillStyle=data.missingSummary ? '#fff7e8' : '#edf8f6';
  roundedRect(ctx,left,statusTop,innerWidth,statusHeight,12);ctx.fill();
  ctx.fillStyle=ink;font(21,true);ctx.fillText(`Tình trạng hàng: ${data.fulfillment}`,left+24,statusTop+38);
  font(21);shortage.forEach((line,index)=>ctx.fillText(line,left+24,statusTop+68+index*29));

  const tableX = left;
  const columns = [60, 490, 140, 170, 212];
  const headers = ["STT", "MÃ KÍNH", "GIAO/ĐẶT", "ĐƠN GIÁ", "THÀNH TIỀN"];
  ctx.fillStyle = "#0f8797";
  ctx.fillRect(tableX, tableTop, innerWidth, 56);
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 18px Arial, sans-serif";
  let cursor = tableX;
  headers.forEach((header, index) => {
    ctx.textAlign = index >= 2 ? "right" : index === 0 ? "center" : "left";
    const x = index >= 2 ? cursor + columns[index] - 16 : index === 0 ? cursor + columns[index] / 2 : cursor + 14;
    ctx.fillText(header, x, tableTop + 37);
    cursor += columns[index];
  });

  let y = tableTop + 56;
  data.items.forEach((item, index) => {
    const rowHeight = rowHeights[index];
    ctx.fillStyle = index % 2 ? "#f7fafc" : "#ffffff";
    ctx.fillRect(tableX, y, innerWidth, rowHeight);
    ctx.strokeStyle = "#d8e2eb";
    ctx.beginPath();ctx.moveTo(tableX, y + rowHeight);ctx.lineTo(width - left, y + rowHeight);ctx.stroke();
    const delivered = item.deliveredQuantity ?? item.quantity;
    const values = [String(index + 1), item.sku, delivered === item.quantity ? String(item.quantity) : `${delivered}/${item.quantity}`, `${formatNumber(item.unitPrice)}đ`, `${formatNumber(delivered * item.unitPrice)}đ`];
    cursor = tableX;
    values.forEach((value, column) => {
      ctx.fillStyle = column===1 ? orderProductColor(item.glassType,item.sku) : ink;
      font(column===1?23:21,column===1||column===4);
      ctx.textAlign = column >= 2 ? "right" : column === 0 ? "center" : "left";
      const x = column >= 2 ? cursor + columns[column] - 16 : column === 0 ? cursor + columns[column] / 2 : cursor + 14;
      if(column===1) skuLines[index].forEach((line,j)=>ctx.fillText(line,x,y+35+j*30));
      else ctx.fillText(fitText(ctx, value, columns[column] - 28), x, y + 35);
      cursor += columns[column];
    });
    ctx.textAlign = 'left'; ctx.fillStyle = muted;font(20);
    if (details[index][0]) details[index].forEach((line,j) => ctx.fillText(line,tableX+74,y+45+skuLines[index].length*30+j*28));
    y += rowHeight;
  });

  const totalAmount = data.items.reduce((sum, item) => sum + (item.deliveredQuantity ?? item.quantity) * item.unitPrice, 0);
  const notesX=left+24, summaryX=left+cardWidth+24;
  ctx.textAlign='left';
  ctx.fillStyle='#f4f8fa';roundedRect(ctx,left,summaryTop,cardWidth,summaryHeight,14);ctx.fill();
  ctx.fillStyle=ink;font(21,true);ctx.fillText('GHI CHÚ ĐƠN HÀNG',notesX,summaryTop+36);
  ctx.fillStyle=muted;font(21);
  (noteLines.length ? noteLines : ['Không có ghi chú.']).forEach((line,j)=>ctx.fillText(line,notesX,summaryTop+69+j*29));
  if(feeLines.length){
    const feeTop=summaryTop+Math.max(102,62+noteLines.length*29);
    ctx.fillStyle=ink;font(21,true);ctx.fillText('Nội dung chi phí khác',notesX,feeTop+29);
    ctx.fillStyle=muted;font(21);feeLines.forEach((line,j)=>ctx.fillText(line,notesX,feeTop+60+j*29));
  }
  ctx.fillStyle='#edf8fa';roundedRect(ctx,summaryX,summaryTop,cardWidth,summaryHeight,14);ctx.fill();
  const amountRight=width-left-24;
  const amountRow = (label: string, value: string, y: number, grand = false) => {
    ctx.textAlign='left';ctx.fillStyle=grand?teal:muted;font(grand?23:21,grand);ctx.fillText(label,summaryX+24,y);
    ctx.textAlign='right';ctx.fillStyle=grand?teal:ink;font(grand?30:23,true);
    ctx.fillText(fitText(ctx,value,grand?290:280),amountRight,y);ctx.textAlign='left';
  }
  amountRow('Số lượng',quantitySummary(data.items.map(item=>({quantity:item.deliveredQuantity??item.quantity,unit:item.unit}))),summaryTop+38);
  amountRow('Tiền sản phẩm',`${formatNumber(totalAmount)}đ`,summaryTop+82);
  amountRow('Chi phí khác',`${formatNumber(data.extraCost || 0)}đ`,summaryTop+126);
  ctx.strokeStyle='#c7dfe4';ctx.beginPath();ctx.moveTo(summaryX+24,summaryTop+150);ctx.lineTo(amountRight,summaryTop+150);ctx.stroke();
  amountRow('TỔNG TIỀN',`${formatNumber(totalAmount+(data.extraCost || 0))}đ`,summaryTop+194,true);
  ctx.fillStyle = "#7890a8";
  ctx.font = "17px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Vui lòng kiểm tra mã kính, số lượng và tổng tiền trước khi xác nhận.", width / 2, height - 43);

  // Chromium can defer toBlob indefinitely when an Electron window is occluded.
  // Encode directly so exporting an order never leaves the sale actions busy.
  const encoded = canvas.toDataURL("image/png").split(",")[1];
  if (!encoded) throw new Error("Không thể xuất ảnh đơn hàng.");
  const bytes = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
  const blob = new Blob([bytes], { type: "image/png" });
  return {
    blob,
    filename: `${safeFilename(data.orderNo)}-${safeFilename(data.customerName)}.png`,
  };
}

export async function downloadGeneratedOrderImage(image: GeneratedOrderImage) {
  return saveDownload(image.blob, image.filename);
}

export async function downloadOrderImage(data: OrderExcelData) {
  return downloadGeneratedOrderImage(await createOrderImage(data));
}
