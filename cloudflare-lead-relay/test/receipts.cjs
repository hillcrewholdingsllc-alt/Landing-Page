const fs=require('fs'),vm=require('vm'),assert=require('assert'),{webcrypto}=require('crypto');
const code=fs.readFileSync(__dirname+'/../src/index.js','utf8').replace('export default','globalThis.worker=');
const rows=new Map();let writes=0,count=0;
const DB={prepare(sql){return{bind(...args){return{
 async first(){if(sql.includes('WHERE submission_id')){const r=rows.get(args[0]);return r?{...r}:null;}return{c:rows.size};},
 async run(){writes++;if(sql.startsWith('INSERT')){if(!rows.has(args[0]))rows.set(args[0],{payload_json:args[1]});return{meta:{changes:1}};}
 if(sql==='UPDATE leads SET payload_json=? WHERE submission_id=? AND payload_json=?'){const row=rows.get(args[1]);if(row&&row.payload_json===args[2]){row.payload_json=args[0];return{meta:{changes:1}};}return{meta:{changes:0}};}
 throw Error('Unexpected query '+sql);}
 };}};}};
const ctx=vm.createContext({Request,Response,URL,URLSearchParams,crypto:webcrypto,Uint8Array,console,Date});vm.runInContext(code,ctx);const worker=ctx.worker;
async function submit(extra={}){const payload={firstName:'Offline',phone:'2025550123',propertyAddress:'123 Fixture Street',formStartedAt:new Date(Date.now()-10000).toISOString(),...extra};const res=await worker.fetch(new Request('https://fixture/lead',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)}),{DB,CONVERSION_RECEIPTS_ENABLED:'true'});return new URL(res.headers.get('location'));}
async function claim(dest,origin='https://kbuyhouses.com'){const p=new URLSearchParams(dest.hash.slice(1));return worker.fetch(new Request('https://fixture/conversion-receipt',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({submissionId:p.get('submission'),receipt:p.get('receipt')})}),{DB,CONVERSION_RECEIPTS_ENABLED:'true'});}
(async()=>{const dest=await submit();assert(dest.hash.includes('receipt='));count++;const res=await claim(dest);const body=await res.json();assert(body.ok);assert(/^[0-9a-f-]{36}$/.test(body.conversionId));count++;assert.equal((await claim(dest)).status,409);count++;
const concurrent=await submit();const rs=await Promise.all([claim(concurrent),claim(concurrent)]);assert.equal(rs.filter(r=>r.status===200).length,1);count++;
for(const extra of [{website:'bot'},{isTest:true},{phone:'123'},{formStartedAt:''},{propertyAddress:'bad'},{firstName:'queef'}]){assert.equal((await submit(extra)).hash,'');count++;}
const duplicate=await submit({submissionId:'offline-repeat'});assert(duplicate.hash);assert.equal((await submit({submissionId:'offline-repeat'})).hash,'');count++;
const fresh=await submit();assert.equal((await claim(fresh,'https://untrusted.example')).status,403);count++;
for(const path of ['/next','/ack','/fail']){const method=path==='/next'?'GET':'POST';const r=await worker.fetch(new Request('https://fixture'+path,{method,headers:{'cf-connecting-ip':'192.0.2.1'},...(method==='POST'?{body:'{}'}:{})}),{DB,CONVERSION_RECEIPTS_ENABLED:'true'});assert.equal(r.status,403);count++;}
const thank=fs.readFileSync(__dirname+'/../../thank-you.html','utf8');assert(thank.includes('verified_queue_receipt'));assert(thank.includes('if(!response.ok)return'));assert(!thank.includes("conversion_source:'thank_you_page'"));count++;
const analytics=fs.readFileSync(__dirname+'/../../analytics.js','utf8');new vm.Script(analytics);assert(analytics.includes('transaction_id: cleanText(submissionId,150)'));count++;
console.log({passed:count,externalRequests:0,mockedWrites:writes});})().catch(e=>{console.error(e);process.exitCode=1});
