import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import ExcelJS from 'exceljs';

test('patched ExcelJS archive dependencies preserve glob selection and real workbook roundtrip',async()=>{
 const require=createRequire(import.meta.url),excelRequire=createRequire(require.resolve('exceljs'));
 const archiver=excelRequire('archiver'),unzipper=excelRequire('unzipper');
 const tempRoot=fs.realpathSync(os.tmpdir());
 const tmp=fs.mkdtempSync(path.join(tempRoot,'oufeidun-excel-compat-'));
 try{
  fs.mkdirSync(path.join(tmp,'nested'));fs.writeFileSync(path.join(tmp,'one.txt'),'one');fs.writeFileSync(path.join(tmp,'nested','two.txt'),'two');fs.writeFileSync(path.join(tmp,'omit.bin'),'omit');
  const archive=archiver('zip'),chunks:Buffer[]=[];
  const result=new Promise<Buffer>((resolve,reject)=>{archive.on('data',(chunk:Buffer)=>chunks.push(chunk));archive.on('end',()=>resolve(Buffer.concat(chunks)));archive.on('error',reject)});
  archive.glob('**/*.txt',{cwd:tmp});await archive.finalize();
  const zip=await unzipper.Open.buffer(await result);
  assert.deepEqual(zip.files.map((file:any)=>file.path).sort(),['nested/two.txt','one.txt']);
  const book=new ExcelJS.Workbook(),sheet=book.addWorksheet('Đối chiếu');sheet.addRow(['Mã kính','Số lượng','Thành tiền']);sheet.addRow(['CNT IP12',3,45000]);
  const file=path.join(tmp,'roundtrip.xlsx');await book.xlsx.writeFile(file);
  const read=new ExcelJS.Workbook();await read.xlsx.readFile(file);
  assert.equal(read.worksheets[0].getCell('A2').text,'CNT IP12');assert.equal(read.worksheets[0].getCell('B2').value,3);assert.equal(read.worksheets[0].getCell('C2').value,45000);
  // ASAR uses legacy glob semantics on absolute Windows paths. Its development
  // dependency must remain isolated from the patched Excel runtime subtree.
  const asar=require('@electron/asar'),app=path.join(tmp,'app'),packed=path.join(tmp,'app.asar');fs.mkdirSync(app);fs.writeFileSync(path.join(app,'package.json'),JSON.stringify({name:'archive-fixture',main:'main.cjs'}));fs.writeFileSync(path.join(app,'main.cjs'),'module.exports=1');
  await asar.createPackage(app,packed);assert.equal(JSON.parse(asar.extractFile(packed,'package.json').toString()).name,'archive-fixture');assert.ok(asar.listPackage(packed).some((name:string)=>name.endsWith('main.cjs')));
 }finally{
  const target=fs.realpathSync(tmp);
  assert.equal(path.dirname(target).toLowerCase(),tempRoot.toLowerCase());
  assert.ok(path.basename(target).startsWith('oufeidun-excel-compat-'));
  fs.rmSync(target,{recursive:true,force:true});
 }
});
