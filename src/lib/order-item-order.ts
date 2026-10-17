import type {Product} from '../types';

// Keep sale selection order. Pair gifts by product identity, put orphan gifts
// after sale groups and all samples last. Only arrange a copy for views/exports;
// the original array still determines stock allocation and saved positions.
export function orderItemsForDisplay<T>(items:readonly T[],_products:readonly Pick<Product,'id'|'sku'>[]=[]):T[]{
 const row=(item:T)=>item as {product_id?:string|null;sku?:string|null;sku_snapshot?:string|null;item_kind?:string;kind?:string};
 const kind=(item:T)=>row(item).item_kind||row(item).kind||'sale';
 const identity=(item:T)=>{
  const value=row(item);
  if(value.product_id)return `id:${value.product_id}`;
  const sku=(value.sku_snapshot||value.sku||'').normalize('NFC').trim().toLocaleUpperCase('vi');
  return sku?`sku:${sku}`:null;
 };
 const sales=items.filter(item=>!['gift','sample'].includes(kind(item)));
 const gifts=items.filter(item=>kind(item)==='gift');
 const samples=items.filter(item=>kind(item)==='sample');
 const saleKeys=new Set(sales.map(identity).filter(key=>key!==null));
 const giftsByKey=new Map<string,T[]>();
 for(const gift of gifts){const key=identity(gift);if(key&&saleKeys.has(key)){const group=giftsByKey.get(key)||[];group.push(gift);giftsByKey.set(key,group);}}
 const result:T[]=[];
 for(const sale of sales){result.push(sale);const key=identity(sale);if(key&&giftsByKey.has(key)){result.push(...giftsByKey.get(key)!);giftsByKey.delete(key);}}
 return [...result,...gifts.filter(gift=>{const key=identity(gift);return !key||!saleKeys.has(key);}),...samples];
}
