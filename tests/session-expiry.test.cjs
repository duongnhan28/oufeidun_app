const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

test('LOCAL sessions survive stale presence before/after 17h until their absolute deadline',async()=>{
 const source=fs.readFileSync(path.join(__dirname,'../server/src/auth.cjs'),'utf8');
 for(const hour of ['09:00:00','16:59:59','17:00:00','17:01:00','23:00:00']){
  for(const age of [25,89,91,3600,14400]){
   const now=Date.parse('2026-10-30T'+hour+'+07:00');
   const seen=new Date(now-age*1000+7*3600*1000).toISOString().slice(0,23).replace('T',' ');
   const user={id:'test',active:true,session_last_seen:seen,session_expires_at:new Date(now+3600000+7*3600000).toISOString().slice(0,23).replace('T',' ')};
   const updates=[];
   class Clock extends Date{static now(){return now}}
   const appError=(code,status)=>Object.assign(Error(code),{code,status});
   const core={config:{sessionIdleSeconds:90},hashToken:()=> 'mock-hash',appError,pool:{execute:async(sql)=>{
    if(sql.startsWith('SELECT'))return [[user]];
    updates.push(sql);return [{affectedRows:1}];
   }}};
   const module={exports:{}};
   vm.runInNewContext(source,{module,Date:Clock,require:name=>name==='./core.cjs'?core:require(name)});
   const request={headers:{authorization:'Bearer isolated-token'}};
    assert.equal((await module.exports.actorFromRequest(request)).id,'test');
    assert.equal(updates.length,1);assert.match(updates[0],/session_last_seen=NOW/);
  }
 }
});

test('deadline, legacy NULL, disabled account and a concurrent token replacement still require login',async()=>{
 const source=fs.readFileSync(path.join(__dirname,'../server/src/auth.cjs'),'utf8');
 const now=Date.parse('2026-11-03T17:00:00+07:00');class Clock extends Date{static now(){return now}}
 for(const scenario of ['expired','boundary','legacy','malformed','disabled','replaced']){
  const user={id:'employee',active:scenario!=='disabled',session_expires_at:scenario==='legacy'?null:scenario==='malformed'?'invalid':scenario==='expired'?'2026-11-03 16:59:59.999':scenario==='boundary'?'2026-11-03 17:00:00.000':'2026-11-03 18:00:00.000'};
  const updates=[];const module={exports:{}};
  const core={config:{sessionIdleSeconds:90,sessionMaxSeconds:43200},hashToken:()=> 'old-hash',appError:(code,status)=>Object.assign(Error(code),{code,status}),pool:{execute:async(sql,params)=>{
   if(sql.startsWith('SELECT'))return [[user]];
   updates.push({sql,params});return [{affectedRows:scenario==='replaced'?0:1}];
  }}};
  vm.runInNewContext(source,{module,Date:Clock,require:name=>name==='./core.cjs'?core:require(name)});
  await assert.rejects(module.exports.actorFromRequest({headers:{authorization:'Bearer isolated-token'}}),{code:'SESSION_REQUIRED',status:401});
  if(scenario==='disabled')assert.equal(updates.length,0);
  else {assert.equal(updates.length,1);assert.match(updates[0].sql,/AND session_token_hash=\?/);assert.equal(updates[0].params[1],'old-hash');}
 }
});

test('same employee device may relogin immediately while a different active device remains blocked',async()=>{
 const source=fs.readFileSync(path.join(__dirname,'../server/src/auth.cjs'),'utf8');
 const now=Date.parse('2026-10-30T17:00:00+07:00');
 class Clock extends Date{static now(){return now}}
 let rotations=0;
 const user={id:'employee',active:true,session_device_id:'same-desktop',session_token_hash:'mock-hash',session_last_seen:'2026-10-30 16:59:59.000',session_expires_at:'2026-10-31 01:00:00.000'};
 const appError=(code,status)=>Object.assign(Error(code),{code,status});
 const core={config:{sessionIdleSeconds:90,sessionMaxSeconds:43200},appError,cleanText:value=>String(value),passwordMatches:()=>true,publicUser:row=>({id:row.id}),hashToken:()=> 'mock-hash',audit:async()=>{},transaction:async action=>action({execute:async sql=>{
  if(sql.startsWith('SELECT'))return [[user]];
  rotations++;return [{}];
 }})};
 const module={exports:{}};vm.runInNewContext(source,{module,Date:Clock,require:name=>name==='./core.cjs'?core:require(name)});
 await module.exports.login('employee','isolated-password','same-desktop');
 await module.exports.login('employee','isolated-password','same-desktop');
 assert.equal(rotations,2);
 await assert.rejects(module.exports.login('employee','isolated-password','other-desktop'),{code:'SESSION_ALREADY_ACTIVE',status:409});
 assert.equal(rotations,2);
});
