import type {Product,Item,Order} from '../types';
import {productUnit} from './catalog';
import {orderProductColor} from './order-product-color';
export type StockForecast={from:string;to:string;rows:{product_id:string;sku:string;glass_type:string;on_hand:number;draft_quantity:number;estimated_quantity:number;delivered_quantity:number}[]};
export function forecastDates(from:string,to:string){
 const a=Date.parse(from+'T00:00:00+07:00'),b=Date.parse(to+'T00:00:00+07:00');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(from)||!/^\d{4}-\d{2}-\d{2}$/.test(to)||!Number.isFinite(a)||!Number.isFinite(b)||new Date(a+25200000).toISOString().slice(0,10)!==from||new Date(b+25200000).toISOString().slice(0,10)!==to||b<a||b-a>=366*86400000)throw new Error('VALIDATION_ERROR');
 return [new Date(a).toISOString(),new Date(b+86400000).toISOString()];
}
export function estimateForCart(product:Product,cart:Item[],savedDraft?:Order|null){
 const saved=(savedDraft?.status==='draft'?savedDraft.items:[]).filter(i=>i.product_id===product.id).reduce((s,i)=>s+i.quantity,0);
 const otherDrafts=Math.max(0,(product.draft_quantity||0)-saved);
 const requested=cart.filter(i=>i.product_id===product.id).reduce((s,i)=>s+i.quantity,0);
 return {otherDrafts,requested,remaining:product.on_hand-otherDrafts-requested};
}
export function forecastSheets(forecast:StockForecast){return [{name:'Tồn dự kiến',columns:['Mã sản phẩm','Đơn vị','Tồn hiện tại','Trong đơn nháp','Tồn dự kiến','Hàng đã giao trong kỳ'],skuColors:forecast.rows.map(r=>orderProductColor(r.glass_type,r.sku)),rows:forecast.rows.map(r=>[r.sku,productUnit(r),r.on_hand,r.draft_quantity,r.estimated_quantity,r.delivered_quantity])},{name:'Ghi chú',columns:['Nội dung','Giá trị'],rows:[['Kỳ đã giao',`${forecast.from} → ${forecast.to}`],['Tồn dự kiến','Tồn hiện tại - toàn bộ đơn nháp đang lưu; được phép âm. Không phải giữ hàng.'],['Hàng đã giao','Lượng xuất bán thực tế trong kỳ (gồm giao bổ sung), trước hoàn/hủy. Đã trừ kho, không trừ lại khỏi tồn dự kiến.'],['Tồn và nháp','Tại thời điểm tải báo cáo, không giới hạn theo kỳ đã giao.']]}]};
