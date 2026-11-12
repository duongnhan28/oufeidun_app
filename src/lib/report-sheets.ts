import type {Report,Product} from '../types';
import type {ExcelCell} from './excel';
import {dateText} from '../types';
import {orderProductColor} from './order-product-color';
import {reportTotals} from './report-totals';
import {sortReportProducts} from './report-product-order';

export function reportSheets(report:Report,canSeeCosts:boolean,products:Product[]=[]){
 const colors=(rows:{sku:string;glass_type?:string}[])=>rows.map(r=>orderProductColor(r.glass_type||products.find(p=>p.sku===r.sku)?.glass_type,r.sku));
 const totals=reportTotals(report);
 const sales=sortReportProducts(report.sales||[],products);
 const inventory=sortReportProducts(report.inventory,products);
 const overview:ExcelCell[][]=[['Số đơn bán ra',report.order_count||0],['Doanh thu',Number(totals.revenue)],['Tiền sản phẩm sau trả hàng',Number(totals.products)],['Chi phí khác trong đơn',Number(totals.fees)],['Tổng giá trị gồm chi phí khác',Number(totals.revenue)],['Tồn kho hiện tại',report.stock]];
 if(canSeeCosts)overview.push(['Tổng giá vốn',Number(report.cost)],['Tổng lợi nhuận',Number(report.profit)],['Tổng giá vốn tồn kho',Number(report.stock_value)]);
 if(canSeeCosts&&report.unconfigured_products)overview.push(['Mã tồn kho chưa thiết lập vốn (giá trị tồn chưa đầy đủ)',report.unconfigured_products]);
 return [
  {name:'Tổng quan',columns:['Chỉ tiêu','Giá trị'],rows:overview},
  {name:'Báo cáo bán hàng',columns:canSeeCosts?['Mã kính','Giá vốn','Giá bán','Số lượng','Tổng vốn','Tổng bán','Tổng lợi nhuận','Mã cũ']:['Mã kính','Giá bán','Số lượng','Tổng bán','Mã cũ'],rows:sales.map(r=>canSeeCosts?[r.sku,Number(r.unit_cost),Number(r.sale_price),r.quantity,Number(r.total_cost),Number(r.revenue),Number(r.profit),(r.sku_aliases||products.find(p=>p.sku===r.sku)?.sku_aliases||[]).join(' / ')]:[r.sku,Number(r.sale_price),r.quantity,Number(r.revenue),(r.sku_aliases||products.find(p=>p.sku===r.sku)?.sku_aliases||[]).join(' / ')])},
  {name:'Nhập xuất tồn',columns:['Mã kính','Tồn đầu','Hàng vào','Hàng ra','Tồn cuối','Mã cũ'],rows:inventory.map(r=>[r.sku,r.opening,r.incoming,r.outgoing,r.closing,(r.sku_aliases||products.find(p=>p.sku===r.sku)?.sku_aliases||[]).join(' / ')])},
  {name:'Chi tiết kho',columns:['Thời gian','Mã kính','Loại','Thay đổi','Tồn sau','Sales','Đơn hàng','Lý do / ghi chú','Mã hiện tại'],rows:(report.movements||[]).map(r=>[dateText(r.occurred_at),r.sku,r.movement_type,r.quantity_delta,r.balance_after,r.sales,r.order_no||'',r.reason||'',r.current_sku||r.sku])},
 ].map(sheet=>({...sheet,skuColors:sheet.name==='Báo cáo bán hàng'?colors(sales):sheet.name==='Nhập xuất tồn'?colors(inventory):sheet.name==='Chi tiết kho'?colors(report.movements||[]):undefined}));
}
