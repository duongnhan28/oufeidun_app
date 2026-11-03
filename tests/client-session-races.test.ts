import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function client() {
  const source=fs.readFileSync('src/data/client.ts','utf8').replaceAll('import.meta.env','({VITE_DATA_BACKEND:"api",VITE_DEMO_MODE:"false"})');
  const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const calls:{url:string;init:RequestInit;resolve:(response:unknown)=>void;reject:(error:unknown)=>void}[]=[];
  const exports:any={};
  vm.runInNewContext(compiled,{
    exports,require:(name:string)=>name==='@supabase/supabase-js'?{}:name.includes('input-error')?{InputError:class extends Error{}}:{},
    localStorage:{removeItem(){},getItem(){return 'isolated-device';}},
    window:{oufeidun:{apiBaseUrl:'https://isolated.invalid/api/app/v1'},setTimeout,clearTimeout},
    crypto:globalThis.crypto,Headers,FormData,AbortController,
    fetch:(url:string,init:RequestInit)=>new Promise((resolve,reject)=>calls.push({url,init,resolve,reject})),
  });
  const respond=(index:number,status:number,body:unknown)=>calls[index].resolve({ok:status<400,status,json:async()=>body});
  const login=async(token:string)=>{
    const index=calls.length,pending=exports.loginOnline('test','not-a-store-password');
    respond(index,200,{access_token:token,user:{id:token}});await pending;
  };
  return {api:exports,calls,respond,login};
}

test('late old 401 cannot clear a new LOCAL login token',async()=>{
  const c=client();await c.login('old-token');
  const stale=c.api.touchOnlineSession();const rejection=assert.rejects(stale,/SESSION_STALE/);
  await c.login('new-token');c.respond(1,401,{error:'SESSION_REQUIRED'});await rejection;
  const touch=c.api.touchOnlineSession();assert.equal(new Headers(c.calls[3].init.headers).get('Authorization'),'Bearer new-token');
  c.respond(3,200,{ok:true});await touch;
});

test('late successful workspace cannot restore data from an earlier session',async()=>{
  const c=client();await c.login('old-token');
  const stale=c.api.workspace();const rejection=assert.rejects(stale,/SESSION_STALE/);
  await c.api.forgetOnlineSession();await c.login('new-token');
  c.respond(1,200,{me:{id:'old-user'},products:[]});await rejection;
});

test('login is independent of an old token expiring while the password request is pending',async()=>{
  const c=client();await c.login('old-token');
  const touch=c.api.touchOnlineSession();const rejection=assert.rejects(touch,/SESSION_REQUIRED/);
  const login=c.api.loginOnline('test','not-a-store-password');
  assert.equal(new Headers(c.calls[2].init.headers).has('Authorization'),false);
  c.respond(1,401,{error:'SESSION_REQUIRED'});await rejection;
  c.respond(2,200,{access_token:'new-token',user:{id:'new-user'}});await login;
  await c.api.claimOnlineSession();
});

test('old logout completing or failing cannot clear a newly established token',async()=>{
  for(const failure of [false,true]){
    const c=client();await c.login('old-token');const logout=c.api.releaseOnlineSession();
    const rejection=assert.rejects(logout,failure?/network/:/SESSION_STALE/);
    await c.login('new-token');
    if(failure)c.calls[1].reject(Error('network'));else c.respond(1,200,{ok:true});
    await rejection;
    const touch=c.api.touchOnlineSession();assert.equal(new Headers(c.calls[3].init.headers).get('Authorization'),'Bearer new-token');
    c.respond(3,200,{ok:true});await touch;
  }
});

test('current 401 clears token, and failed logout clears its own local token',async()=>{
  for(const logoutFailure of [false,true]){
    const c=client();await c.login('current-token');
    const pending=logoutFailure?c.api.releaseOnlineSession():c.api.touchOnlineSession();
    const rejection=assert.rejects(pending,logoutFailure?/network/:/SESSION_REQUIRED/);
    if(logoutFailure)c.calls[1].reject(Error('network'));else c.respond(1,401,{error:'SESSION_REQUIRED'});
    await rejection;
    await assert.rejects(c.api.claimOnlineSession(),/SESSION_REQUIRED/);
    await c.login('relogin-token');await c.api.claimOnlineSession();
  }
});
