const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync(__dirname+'/../../thank-you.html','utf8');const script=html.match(/<script>\s*([\s\S]*?)<\/script>/)[1];
assert(html.indexOf('history.replaceState')<html.indexOf('src="/analytics.js'));new vm.Script(script);let count=1;
async function run(hash,result,fail=false){let callback,events=[],cleared=false,fetches=0;const context={URLSearchParams,location:{hash,pathname:'/thank-you.html',search:''},history:{replaceState(){cleared=true;}},window:{addEventListener(name,fn){callback=fn;},kreiTrack(...args){events.push(args);}},fetch:async()=>{fetches++;assert(cleared);if(fail)throw Error('offline network failure');return{ok:result?.ok===true,json:async()=>result?.body};}};vm.runInNewContext(script,context);await callback();return{events,fetches};}
(async()=>{let r=await run('',{});assert.equal(r.fetches,0);assert.equal(r.events.length,0);count++;
const hash='#submission=fixture&receipt='+'a'.repeat(64),body={ok:true,submissionId:'fixture',conversionId:'11111111-1111-4111-8111-111111111111'};
r=await run(hash,{ok:true,body});assert.equal(r.events.length,1);assert.equal(r.events[0][1].submission_id,body.conversionId);count++;
for(const [result,fail]of [[{ok:false},false],[{ok:true,body:{...body,submissionId:'wrong'}},false],[{ok:true,body},true]]){r=await run(hash,result,fail);assert.equal(r.events.length,0);count++;}
console.log({passed:count,externalRequests:0});})().catch(e=>{console.error(e);process.exitCode=1});
