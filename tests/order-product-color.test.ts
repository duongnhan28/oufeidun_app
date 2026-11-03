import test from 'node:test';
import assert from 'node:assert/strict';
import {orderProductColor} from '../src/lib/order-product-color';

test('document SKU colors use category consistently, including gifts, samples and legacy text',()=>{
 for(const type of ['clear','full_border','matte','other'])assert.equal(orderProductColor(type,'CNT misleading'), '#000000');
 assert.equal(orderProductColor('privacy','IP12'),'#D6A000');
 assert.equal(orderProductColor('premium_borderless','IP15'),'#0070C0');
 for(const sku of ['CNT IP12','IP 12 (PRIVACY)','Kính CL chống nhìn trộm'])assert.equal(orderProductColor(undefined,sku),'#D6A000');
 for(const sku of ['Kính CL không viền IP X','BORDERLESS IP15'])assert.equal(orderProductColor(undefined,sku),'#0070C0');
 for(const sku of ['','FULL VIỀN IP12','ACCESSORY'])assert.equal(orderProductColor(undefined,sku),'#000000');
});
