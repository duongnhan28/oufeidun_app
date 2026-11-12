import template from '../data/report-product-order.json';

type ReportProduct = {sku:string; glass_type?:string; sku_aliases?:string[]; product_id?:string; current_sku?:string};
type CatalogProduct = {id:string; sku:string; glass_type:string; sku_aliases?:string[]};
const plain = (value:string) => value.normalize('NFKC').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').toUpperCase();

// Match complete model labels, never substrings (A16 must not match A160).
// Whitespace, slash order, full-width brackets and known category labels are
// presentation differences. Thickness, HQT and BLACK/WHITE remain distinct.
function key(sku:string, glassType?:string):string {
 let text=plain(sku);
 const privacy=/\bCNT(?=\s|IP)|PR[IL]VACY|CHONG\s*NHIN\s*TROM/.test(text);
 const borderless=/KHONG\s*VIEN|BORDERLESS/.test(text);
 const full=/^FULL\s*VIEN(?!\s*CAO\s*CAP)/.test(text);
 const catalogType=glassType==='full_border'?'clear':glassType;
 const inferred=privacy?'privacy':borderless?'premium_borderless':full?'clear':undefined;
 const type=catalogType&&catalogType!=='other'?catalogType:inferred||catalogType||'clear';
 text=text.replace(/^(?:KHONG\s*VIEN(?:\s*CAO\s*CAP)?|FULL\s*VIEN(?!\s*CAO\s*CAP)|CNT)\s*/,'')
  .replace(/PR[IL]VACY|CHONG\s*NHIN\s*TROM|BORDERLESS/g,'')
  .replace(/IPHONE/g,'IP').replace(/SAMSUNG/g,'SAM').replace(/OPPO/g,'OP').replace(/REDMI/g,'RM')
  .replace(/[^A-Z0-9/]/g,'');
 if(text.startsWith('IP'))text='IP'+text.slice(2).split('/').map(part=>part.replace(/^IP/,'')).sort().join('/');
 return `${type}:${text}`;
}

const ranks = new Map<string,number>();
template.forEach((row,index)=>{
 for(const sku of [row.sku,...row.aliases||[]]){
  const label=key(sku,row.glass_type);
  if(ranks.has(label)&&ranks.get(label)!==index)throw new Error('Trùng mã trong thứ tự báo cáo.');
  ranks.set(label,index);
 }
});

/** Book1.xlsx, Sheet1!A1:A84. Only reorder existing report rows; never merge,
 * insert zero rows, change labels/amounts, or mutate the report/API snapshot.
 * Unknown models keep their incoming relative order after all template models.
 */
export function sortReportProducts<T extends ReportProduct>(rows:readonly T[], products:readonly CatalogProduct[]=[]):T[] {
 const byId=new Map(products.map(p=>[p.id,p]));
 const bySku=new Map(products.map(p=>[p.sku,p]));
 return rows.map((row,index)=>{
  const product=(row.product_id?byId.get(row.product_id):undefined)||bySku.get(row.current_sku||row.sku);
  const type=row.glass_type||product?.glass_type;
  const current=ranks.get(key(row.current_sku||row.sku,type));
  const aliases=[...row.sku_aliases||[],...product?.sku_aliases||[]];
  const rank=current??aliases.map(sku=>ranks.get(key(sku,type))).find(value=>value!==undefined)??Infinity;
  return {row,index,rank};
 }).sort((a,b)=>a.rank-b.rank||a.index-b.index).map(item=>item.row);
}
