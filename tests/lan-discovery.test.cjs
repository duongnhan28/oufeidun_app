const {test}=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const {ensureIdentity,signedReply,exportClientProfile}=require('../server/src/discovery.cjs');
const {broadcastTargets,verifyReply,discover,LanConnection,httpsRequest}=require('../electron/lan-connection.cjs');
const {fixture}=require('./lan-fixture.cjs');
test('LAN discovery: signed store identity, changed IP, trusted HTTPS, no mutation replay',async()=>{
 fs.mkdirSync('.local',{recursive:true});const f=await fixture();
 try{
  assert.equal(ensureIdentity(f.dir,f.profile.hostName).serverId,f.identity.serverId);
  const caDir=require('node:path').join(f.dir,'caddy-data','caddy','pki','authorities','local');fs.mkdirSync(caDir,{recursive:true});
  fs.writeFileSync(require('node:path').join(caDir,'root.crt'),f.profile.rootCertificatePem);
  const exported=exportClientProfile(f.dir,f.profile.hostName,'127.0.0.1');
  assert.equal(exported.serverId,f.profile.serverId);assert.equal(exported.privateKey,undefined);assert.ok(!JSON.stringify(exported).includes('PRIVATE KEY'));
  const nonce='ab'.repeat(24),reply=JSON.stringify(signedReply(f.identity,nonce));
  assert.equal(verifyReply(f.profile,nonce,reply),true);
  assert.equal(verifyReply(f.profile,'cd'.repeat(24),reply),false);
  const other=crypto.generateKeyPairSync('ed25519').publicKey.export({type:'spki',format:'pem'});
  assert.equal(verifyReply({...f.profile,publicKey:other},nonce,reply),false);
  assert.deepEqual(broadcastTargets({Ethernet:[{family:'IPv4',internal:false,address:'192.168.88.119',netmask:'255.255.255.0'}],WiFi:[{family:'IPv4',internal:false,address:'192.168.1.23',netmask:'255.255.255.0'}]}),['255.255.255.255','192.168.88.255','192.168.1.255']);
  assert.equal(await discover(f.profile,{targets:['127.0.0.1']}),'127.0.0.1');
  await assert.rejects(discover({...f.profile,serverId:'wrong-store'},{targets:['127.0.0.1'],timeout:100}),/SERVER_NOT_FOUND/);
  await assert.rejects(httpsRequest({...f.profile,hostName:'wrong.home.arpa'},'127.0.0.1','/health'),/Hostname\/IP does not match/);
  let saved;
  const connection=new LanConnection(f.profile,{targets:['127.0.0.1'],save:profile=>{saved=profile.serverIp}});
  const status=await connection.connect();assert.equal(status.ip,'127.0.0.1');assert.equal(saved,'127.0.0.1');
  const response=await connection.request('/api/app/v1/auth/login',{method:'POST',body:'{}',headers:{'content-type':'application/json'}});
  assert.equal(response.status,401);assert.equal(f.mutations,1);
  await assert.rejects(connection.request('/outside'),/FORBIDDEN_PATH/);
  await assert.rejects(connection.request('/api/app/v1/../../../outside'),/FORBIDDEN_PATH/);
  await assert.rejects(connection.request('/api/app/v1/disconnect',{method:'POST',body:'{}'}));
  if(connection.pending)await connection.pending;
  assert.equal(f.mutations,2,'failed mutation must not be replayed');
  const otherFixture=await fixture();
  try{await assert.rejects(httpsRequest({...f.profile,rootCertificatePem:otherFixture.profile.rootCertificatePem},'127.0.0.1','/health'),/certificate|issuer|signature/i)}finally{await otherFixture.close()}
 }finally{await f.close()}
});
