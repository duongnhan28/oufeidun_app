import type {Report} from '../types';
import type {ExcelCell} from './excel';
import {dateText} from '../types';

export function reportSheets(report:Report,canSeeCosts:boolean){
 const overview:ExcelCell[][]=[['Số đơn bán ra',report.order_count||0],['Doanh thu',Number(report.revenue)],['Khoản thu chi phí khác',Number(report.other_charges||0)],['Tổng giá trị gồm chi phí khác',Number(report.revenue)+Number(report.other_charges||0)],['Tồn kho hiện tại',report.stock]];
 if(canSeeCosts)overview.push(['Tổng giá vốn',Number(report.cost)],['Tổng lợi nhuận',Number(report.profit)],['Tổng giá vốn tồn kho',Number(report.stock_value)]);
 return [
  {name:'Tổng quan',columns:['Chỉ tiêu','Giá trị'],rows:overview},
  {name:'Báo cáo bán hàng',columns:canSeeCosts?['Mã kính','Giá vốn','Giá bán','Số lượng','Tổng vốn','Tổng bán','Tổng lợi nhuận']:['Mã kính','Giá bán','Số lượng','Tổng bán'],rows:(report.sales||[]).map(r=>canSeeCosts?[r.sku,Number(r.unit_cost),Number(r.sale_price),r.quantity,Number(r.total_cost),Number(r.revenue),Number(r.profit)]:[r.sku,Number(r.sale_price),r.quantity,Number(r.revenue)])},
  {name:'Nhập xuất tồn',columns:['Mã kính','Tồn đầu','Hàng vào','Hàng ra','Tồn cuối'],rows:report.inventory.map(r=>[r.sku,r.opening,r.incoming,r.outgoing,r.closing])},
  {name:'Chi tiết kho',columns:['Thời gian','Mã kính','Loại','Thay đổi','Tồn sau','Sales','Đơn hàng'],rows:(report.movements||[]).map(r=>[dateText(r.occurred_at),r.sku,r.movement_type,r.quantity_delta,r.balance_after,r.sales,r.order_no||''])},
 ];
}
