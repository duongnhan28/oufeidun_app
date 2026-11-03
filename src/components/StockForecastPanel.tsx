import {useEffect,useState} from 'react';
import {loadStockForecast,friendly} from '../data/client';
import {type StockForecast,forecastSheets} from '../lib/stock-forecast';
import {today,type Product} from '../types';
import {productUnit,quantitySummary} from '../lib/catalog';
import {downloadWorkbook} from '../lib/excel';
import {orderProductColor} from '../lib/order-product-color';
export default function StockForecastPanel({products}:{products:Product[]}){
 const [from,setFrom]=useState(today()),[to,setTo]=useState(today()),[data,setData]=useState<StockForecast|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{
  let alive=true,pending=false;
  const load=async()=>{if(pending)return;pending=true;setBusy(true);try{const next=await loadStockForecast(from,to);if(alive){setData(next);setError('')}}catch(e){if(alive)setError(friendly(e))}finally{pending=false;if(alive)setBusy(false)}};
  void load();const timer=setInterval(()=>{if(document.visibilityState!=='hidden')void load()},10000);
  return()=>{alive=false;clearInterval(timer)};
 },[from,to]);
 const visible=new Set(products.map(p=>p.id)),rows=data?.rows.filter(r=>visible.has(r.product_id))||[];
 const total=(key:'on_hand'|'draft_quantity'|'estimated_quantity'|'delivered_quantity')=>quantitySummary(rows.map(r=>({quantity:r[key],unit:productUnit(r)})));
 return <section className="panel stock-forecast-panel" aria-label="Tồn dự kiến">
  <div className="list-toolbar"><h2>Tồn dự kiến và hàng đã giao</h2></div>
  <p className="table-foot">Tồn dự kiến = tồn hiện tại − toàn bộ đơn nháp đang lưu. Chỉ cảnh báo, không giữ hàng hoặc trừ kho.</p>
  <div className="list-toolbar forecast-controls">
   <label>Từ ngày đã giao<input type="date" aria-label="Từ ngày đã giao" value={from} onChange={e=>setFrom(e.target.value)}/></label>
   <label>Đến ngày đã giao<input type="date" aria-label="Đến ngày đã giao" value={to} onChange={e=>setTo(e.target.value)}/></label>
   <button disabled={!data||busy||!!error} onClick={async()=>{try{await downloadWorkbook(`ton-du-kien-${from}-${to}.xlsx`,forecastSheets({...data!,rows}))}catch(e){setError(friendly(e))}}}>Tải Excel tồn dự kiến</button>
   {busy&&<span>Đang cập nhật…</span>}
  </div>
  {error&&<p role="alert">{error}</p>}
  <div className="table-scroll"><table><thead><tr><th>Mã sản phẩm</th><th>Đơn vị</th><th className="number">Tồn hiện tại</th><th className="number">Trong đơn nháp</th><th className="number">Tồn dự kiến</th><th className="number">Hàng đã giao trong kỳ</th></tr></thead>
   <tbody>{rows.map(r=><tr key={r.product_id}><td><b style={{color:orderProductColor(r.glass_type,r.sku)}}>{r.sku}</b></td><td>{productUnit(r)}</td><td className="number">{r.on_hand}</td><td className="number">{r.draft_quantity}</td><td className="number"><b className={r.estimated_quantity<0?'forecast-short':''}>{r.estimated_quantity}</b></td><td className="number">{r.delivered_quantity}</td></tr>)}</tbody>
  </table></div>
  {data&&<p className="table-foot">Tồn hiện tại: {total('on_hand')} · Trong nháp: {total('draft_quantity')} · Dự kiến: {total('estimated_quantity')} · Đã giao: {total('delivered_quantity')}</p>}
  <p className="table-foot">Hàng đã giao là lượng xuất bán thực tế trong kỳ, gồm giao bổ sung, trước hoàn/hủy. Lượng này đã trừ kho, không trừ thêm khỏi tồn dự kiến. Tồn và nháp là số hiện tại, không lọc theo ngày đã giao. Excel theo bộ lọc sản phẩm đang chọn.</p>
 </section>;
}
