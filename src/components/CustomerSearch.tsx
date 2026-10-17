import {useId,useState} from 'react';
import type {Workspace} from '../types';
import {matchingCustomers} from '../lib/catalog';
export function CustomerSearch({customers,selectedId,onSelect}:{customers:Workspace['customers'];selectedId:string|null;onSelect:(id:string)=>void}){
 const [query,setQuery]=useState(''),[open,setOpen]=useState(false),[active,setActive]=useState(0);
 const id=useId();const selected=customers.find(c=>c.id===selectedId);
 const matches=matchingCustomers(customers,query);
 const choose=(value:string)=>{onSelect(value);setQuery('');setOpen(false);setActive(0);};
 return <div className="customer-search-picker" onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))setOpen(false);}}>
  <input aria-label="Tìm khách hàng theo tên hoặc số điện thoại" role="combobox" aria-expanded={open} aria-controls={id} aria-autocomplete="list" aria-activedescendant={open&&matches[active]?`${id}-${active}`:undefined} value={open?query:selected?`${selected.name} · ${selected.phone}`:''} placeholder="Nhập tên hoặc số điện thoại…" onFocus={()=>setOpen(true)} onChange={e=>{setQuery(e.target.value);setActive(0);setOpen(true);}} onKeyDown={e=>{if(e.key==='Escape'){setOpen(false);e.preventDefault();}if(e.key==='ArrowDown'){setOpen(true);setActive(n=>Math.min(n+1,matches.length-1));e.preventDefault();}if(e.key==='ArrowUp'){setActive(n=>Math.max(0,n-1));e.preventDefault();}if(e.key==='Enter'&&open){e.preventDefault();if(matches[active])choose(matches[active].id);}}}/>
  {open&&<div className="customer-search-results"><button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>choose('')}>+ Khách mới</button><div id={id} role="listbox" aria-label="Khách hàng tìm được">{matches.map((c,index)=><button type="button" role="option" aria-selected={index===active} id={`${id}-${index}`} key={c.id} onMouseDown={e=>e.preventDefault()} onClick={()=>choose(c.id)}><b>{c.name}</b><span>{c.phone} · {c.customer_type==='wholesale'?'Khách sỉ':'Khách lẻ'}</span></button>)}{!matches.length&&<p>Không tìm thấy khách. Chọn “Khách mới” để nhập thông tin.</p>}</div><small>Hiển thị tối đa 3 khách. Nhập thêm để tìm chính xác.</small></div>}
 </div>;
}
