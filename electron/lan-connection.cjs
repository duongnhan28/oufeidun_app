const crypto=require('node:crypto');
const dgram=require('node:dgram');
const os=require('node:os');
const https=require('node:https');
const net=require('node:net');
function validateProfile(profile){
 if(profile?.v!==1||!/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i.test(profile.hostName)||typeof profile.serverId!=='string'||profile.serverId.length>80)throw Error('INVALID_SERVER_PROFILE');
 if(!Number.isInteger(profile.httpsPort)||profile.httpsPort<1||profile.httpsPort>65535||!Number.isInteger(profile.discoveryPort)||profile.discoveryPort<1||profile.discoveryPort>65535)throw Error('INVALID_SERVER_PROFILE');
 if(crypto.createPublicKey(profile.publicKey).asymmetricKeyType!=='ed25519')throw Error('INVALID_SERVER_KEY');
 const ca=new crypto.X509Certificate(profile.rootCertificatePem);if(!ca.ca)throw Error('INVALID_SERVER_CA');
 return profile;
}
function verifyReply(profile,nonce,message){
 try{const {payload,signature}=JSON.parse(message);return payload.v===1&&payload.serverId===profile.serverId&&payload.nonce===nonce&&payload.hostName===profile.hostName&&payload.httpsPort===profile.httpsPort&&crypto.verify(null,Buffer.from(JSON.stringify(payload)),profile.publicKey,Buffer.from(signature,'base64'));}catch{return false}
}
function broadcastTargets(interfaces=os.networkInterfaces()){
 const targets=new Set(['255.255.255.255']);
 for(const entries of Object.values(interfaces))for(const entry of entries||[]){
  if(entry.family!=='IPv4'||entry.internal)continue;
  const ip=entry.address.split('.').map(Number),mask=entry.netmask.split('.').map(Number);
  targets.add(ip.map((value,i)=>(value|(~mask[i]&255))).join('.'));
 }
 return [...targets];
}
function discover(profile,{targets=broadcastTargets(),timeout=2500}={}){
 const nonce=crypto.randomBytes(24).toString('hex');
 const request=Buffer.from(JSON.stringify({type:'oufeidun-discover',v:1,serverId:profile.serverId,nonce}));
 return new Promise((resolve,reject)=>{
  const socket=dgram.createSocket('udp4');let done=false;
  const finish=(error,ip)=>{if(done)return;done=true;clearTimeout(timer);try{socket.close()}catch{};error?reject(error):resolve(ip)};
  const timer=setTimeout(()=>finish(Error('SERVER_NOT_FOUND')),timeout);
  socket.on('error',error=>finish(error));
  socket.on('message',(message,remote)=>{if(message.length<=4096&&verifyReply(profile,nonce,message.toString())&&net.isIPv4(remote.address))finish(null,remote.address)});
  socket.bind(0,'0.0.0.0',()=>{socket.setBroadcast(true);for(const ip of targets)socket.send(request,profile.discoveryPort,ip,error=>{if(error&&targets.length===1)finish(error)})});
 });
}
function httpsRequest(profile,ip,pathname,{method='GET',headers={},body,timeout=15000}={}){
 return new Promise((resolve,reject)=>{
  let deadline;
  const fail=error=>{clearTimeout(deadline);reject(error)};
  const request=https.request({hostname:profile.hostName,port:profile.httpsPort,path:pathname,method,headers,ca:profile.rootCertificatePem,rejectUnauthorized:true,servername:profile.hostName,agent:false,
   lookup:ip?(_hostname,options,callback)=>options?.all?callback(null,[{address:ip,family:4}]):callback(null,ip,4):undefined
  },response=>{const chunks=[];let bytes=0;response.on('data',chunk=>{bytes+=chunk.length;if(bytes>20*1024*1024){request.destroy(Error('RESPONSE_TOO_LARGE'));return}chunks.push(chunk)});response.on('error',fail);response.on('end',()=>{clearTimeout(deadline);resolve({status:response.statusCode,headers:response.headers,body:Buffer.concat(chunks)})});});
  deadline=setTimeout(()=>request.destroy(Error('SERVER_TIMEOUT')),timeout);request.on('error',fail);
  if(body)request.write(body);request.end();
 });
}
class LanConnection {
 constructor(profile,{save=()=>{},targets,timeout}={}){this.profile=validateProfile(profile);this.ip=net.isIPv4(profile.serverIp||'')?profile.serverIp:null;this.save=save;this.targets=targets;this.timeout=timeout;this.pending=null;this.ready=false;}
 async check(ip){const result=await httpsRequest(this.profile,ip,'/health',{timeout:1500});const body=JSON.parse(result.body);if(result.status!==200||!body.ok||body.service!=='oufeidun-local-api')throw Error('SERVER_UNAVAILABLE');return true;}
 async connect(force=false){
  if(this.pending)return this.pending;
  this.pending=(async()=>{
   if(!force){for(const ip of [...new Set([this.ip,null])]){try{await this.check(ip);this.ip=ip;this.ready=true;return this.status()}catch{}}}
   const ip=await discover(this.profile,{targets:this.targets,timeout:this.timeout});await this.check(ip);
   this.ip=ip;this.profile.serverIp=ip;this.save(this.profile);this.ready=true;return this.status();
  })();
  try{return await this.pending}finally{this.pending=null}
 }
 status(){return {connected:this.ready,hostName:this.profile.hostName,ip:this.ip};}
 async request(pathname,options){
  const url=new URL(pathname,'https://'+this.profile.hostName);
  if(url.hostname!==this.profile.hostName||!/^\/api\/app\/v1(?:\/|$)/.test(url.pathname)||/[\r\n]/.test(pathname))throw Error('FORBIDDEN_PATH');
  if(!this.ready)await this.connect();
  try{return await httpsRequest(this.profile,this.ip,pathname,options)}catch(error){
   // Never replay a POST/stock/payment mutation after a connection error.
   this.ready=false;this.connect(true).catch(()=>{});throw error;
  }
 }
}
module.exports={validateProfile,verifyReply,broadcastTargets,discover,httpsRequest,LanConnection};
