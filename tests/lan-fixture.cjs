const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const https=require('node:https');
const {ensureIdentity,startDiscovery}=require('../server/src/discovery.cjs');
async function fixture({forwardPort}={}){
 const dir=fs.mkdtempSync(path.resolve('.local','lan-test-'));
 const openssl=process.env.TEST_OPENSSL||path.join(process.env.ProgramFiles||'', 'Git','usr','bin','openssl.exe');
 fs.writeFileSync(path.join(dir,'openssl.cnf'),'[req]\ndistinguished_name=dn\n[dn]\n');
 const run=args=>execFileSync(openssl,args,{cwd:dir,stdio:'ignore',env:{...process.env,OPENSSL_CONF:path.join(dir,'openssl.cnf')}});
 run(['req','-x509','-newkey','rsa:2048','-nodes','-keyout','ca.key','-out','ca.pem','-days','1','-subj','/CN=Oufeidun test CA','-addext','basicConstraints=critical,CA:TRUE']);
 run(['req','-newkey','rsa:2048','-nodes','-keyout','leaf.key','-out','leaf.csr','-subj','/CN=lan-test.home.arpa']);
 fs.writeFileSync(path.join(dir,'ext.txt'),'subjectAltName=DNS:lan-test.home.arpa\nbasicConstraints=CA:FALSE\nextendedKeyUsage=serverAuth\n');
 run(['x509','-req','-in','leaf.csr','-CA','ca.pem','-CAkey','ca.key','-CAcreateserial','-out','leaf.pem','-days','1','-extfile','ext.txt']);
 const identity=ensureIdentity(dir,'lan-test.home.arpa');
 let mutations=0,requests=[];
 const server=https.createServer({key:fs.readFileSync(path.join(dir,'leaf.key')),cert:fs.readFileSync(path.join(dir,'leaf.pem'))},(req,res)=>{
  if(forwardPort){
   const headers={...req.headers,host:'127.0.0.1:'+forwardPort};
   const upstream=require('node:http').request({host:'127.0.0.1',port:forwardPort,path:req.url,method:req.method,headers},response=>{res.writeHead(response.statusCode,response.headers);response.pipe(res)});
   upstream.on('error',()=>{res.statusCode=502;res.end()});req.pipe(upstream);return;
  }
  requests.push(req.url);
  req.on('data',()=>{});req.on('end',()=>{
   if(req.url==='/health'){res.setHeader('content-type','application/json');res.end(JSON.stringify({ok:true,service:'oufeidun-local-api'}));return}
   if(req.method==='POST'){mutations++;if(req.url.endsWith('/disconnect')){req.socket.destroy();return}}
   res.setHeader('content-type','application/json');res.statusCode=401;res.end(JSON.stringify({error:'INVALID_CREDENTIALS'}));
  });
 });
 await new Promise(resolve=>server.listen(0,'0.0.0.0',resolve));identity.httpsPort=server.address().port;
 const socket=startDiscovery(identity,{port:0,host:'0.0.0.0'});
 await new Promise(resolve=>socket.once('listening',resolve));
 const profile={v:1,serverId:identity.serverId,publicKey:identity.publicKey,hostName:identity.hostName,httpsPort:identity.httpsPort,discoveryPort:socket.address().port,serverIp:'192.0.2.1',rootCertificatePem:fs.readFileSync(path.join(dir,'ca.pem'),'utf8')};
 return {dir,profile,identity,requests,get mutations(){return mutations},close:async()=>{socket.close();await new Promise(resolve=>server.close(resolve));fs.rmSync(dir,{recursive:true,force:true})}};
}
module.exports={fixture};
