const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const dgram=require('node:dgram');
const DISCOVERY_PORT=47631;
function ensureIdentity(dataDir,hostName){
 if(!/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i.test(hostName))throw Error('INVALID_HOSTNAME');
 const file=path.join(dataDir,'config','discovery-identity.json');
 let identity;
 if(fs.existsSync(file))identity=JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));
 else{const pair=crypto.generateKeyPairSync('ed25519');identity={serverId:crypto.randomUUID(),privateKey:pair.privateKey.export({type:'pkcs8',format:'pem'}),publicKey:pair.publicKey.export({type:'spki',format:'pem'})};}
 identity.hostName=hostName;identity.httpsPort=443;identity.discoveryPort=DISCOVERY_PORT;
 fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(identity,null,2),{mode:0o600});
 return identity;
}
function signedReply(identity,nonce){
 const payload={v:1,serverId:identity.serverId,nonce,hostName:identity.hostName,httpsPort:identity.httpsPort};
 return {payload,signature:crypto.sign(null,Buffer.from(JSON.stringify(payload)),identity.privateKey).toString('base64')};
}
function startDiscovery(identity,{port=identity.discoveryPort,host='0.0.0.0'}={}){
 const socket=dgram.createSocket('udp4');let count=0,window=0;
 socket.on('error',error=>console.warn('LAN discovery unavailable: '+error.code));
 socket.on('message',(message,remote)=>{
  if(message.length>512)return;
  try{
   const request=JSON.parse(message.toString());
   if(request.type!=='oufeidun-discover'||request.v!==1||request.serverId!==identity.serverId||!/^[a-f0-9]{48}$/.test(request.nonce))return;
   const now=Math.floor(Date.now()/1000);if(window!==now){window=now;count=0}if(++count>50)return;
   const response=Buffer.from(JSON.stringify(signedReply(identity,request.nonce)));
   socket.send(response,remote.port,remote.address);
  }catch{}
 });
 socket.bind(port,host);return socket;
}
function exportClientProfile(dataDir,hostName,serverIp){
 const identity=ensureIdentity(dataDir,hostName);
 const rootCertificatePem=fs.readFileSync(path.join(dataDir,'caddy-data','caddy','pki','authorities','local','root.crt'),'utf8');
 return {v:1,serverId:identity.serverId,publicKey:identity.publicKey,hostName:identity.hostName,httpsPort:443,discoveryPort:DISCOVERY_PORT,serverIp,rootCertificatePem};
}
if(require.main===module){
 const [action,dataDir,hostName,serverIp]=process.argv.slice(2);
 if(action==='export')process.stdout.write(JSON.stringify(exportClientProfile(dataDir,hostName,serverIp),null,2));
 else if(action==='init')ensureIdentity(dataDir,hostName);
 else throw Error('INVALID_ACTION');
}
module.exports={DISCOVERY_PORT,ensureIdentity,signedReply,startDiscovery,exportClientProfile};
