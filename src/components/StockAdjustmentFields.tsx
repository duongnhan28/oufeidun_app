import {useState} from 'react';
import type {Product} from '../types';
import {productUnit} from '../lib/catalog';
import {stockAdjustmentTarget,type StockAdjustmentMode} from '../lib/stock-adjustment';

export function StockAdjustmentFields({products,initialProduct}:{products:Product[];initialProduct?:Product}) {
  const [id,setId]=useState(initialProduct?.id||products[0]?.id||'');
  const [mode,setMode]=useState<StockAdjustmentMode>('decrease');
  const [quantity,setQuantity]=useState('1');
  const product=products.find(p=>p.id===id);
  const current=product?.on_hand||0,unit=productUnit(product);
  let target:number|undefined,error='';
  try{target=stockAdjustmentTarget(current,mode,quantity);}catch(e){error=(e as Error).message;}
  return <div className="stock-adjustment-fields">
    <label className="field">Mã sản phẩm cần điều chỉnh
      <select aria-label="Mã sản phẩm cần điều chỉnh" name="product_id" value={id} required onChange={e=>{setId(e.target.value);setQuantity(mode==='count'?String(products.find(p=>p.id===e.target.value)?.on_hand||0):'1');}}>
        {products.map(p=><option key={p.id} value={p.id}>{p.sku} · Tồn: {p.on_hand} {productUnit(p)}</option>)}
      </select>
    </label>
    <label className="field">Cách điều chỉnh
      <select aria-label="Cách điều chỉnh" name="adjustment_mode" value={mode} onChange={e=>{const next=e.target.value as StockAdjustmentMode;setMode(next);setQuantity(next==='count'?String(current):'1');}}>
        <option value="decrease">Giảm tồn</option><option value="increase">Tăng tồn</option><option value="count">Nhập tồn thực tế</option>
      </select>
    </label>
    <label className="field">{mode==='count'?'Tồn thực tế sau kiểm kê':'Số lượng '+(mode==='decrease'?'giảm':'tăng')}
      <input name="adjustment_amount" type="number" value={quantity} onChange={e=>setQuantity(e.target.value)} required min={mode==='count'?0:1} max={mode==='decrease'?current:mode==='increase'?Math.max(0,1000000-current):1000000} step="1" />
    </label>
    <div className="stock-adjustment-summary" aria-live="polite">
      <span>Tồn hiện tại <b>{current} {unit}</b></span>
      <span>Tồn sau điều chỉnh <b>{target===undefined?'—':`${target} ${unit}`}</b></span>
      {error&&<small>{error}</small>}
    </div>
  </div>;
}
