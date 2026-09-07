const THANK_YOU='https://kbuyhouses.com/thank-you.html';
const HOME='https://kbuyhouses.com/#get-offer';
const N8N_IP='167.172.134.50';
const clean=(v,n=2000)=>String(v??'').trim().slice(0,n);
const json=(v,s=200)=>new Response(JSON.stringify(v),{status:s,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
function allowed(req){return req.headers.get('cf-connecting-ip')===N8N_IP;}
async function parse(req){const ct=req.headers.get('content-type')||''; if(ct.includes('application/json')) return await req.json(); const f=await req.formData(); const o={}; for(const [k,v] of f.entries()) if(typeof v==='string') o[k]=v; return o;}
function normalize(r){const p={firstName:clean(r.firstName,120),lastName:clean(r.lastName,120),phone:clean(r.phone,60),email:clean(r.email,320),propertyAddress:clean(r.propertyAddress||r.address,500),sellerSituation:clean(r.sellerSituation||r.situation,500),notes:clean(r.notes,2000),source:clean(r.source||'Website',80),pageUrl:clean(r.pageUrl||'https://kbuyhouses.com/',1000),landingPage:clean(r.landingPage||'/',500),referrer:clean(r.referrer,1000),utmSource:clean(r.utmSource||r.utm_source,300),utmMedium:clean(r.utmMedium||r.utm_medium,300),utmCampaign:clean(r.utmCampaign||r.utm_campaign,500),utmTerm:clean(r.utmTerm||r.utm_term,500),utmContent:clean(r.utmContent||r.utm_content,500),gclid:clean(r.gclid,1000),gbraid:clean(r.gbraid,1000),wbraid:clean(r.wbraid,1000),fbclid:clean(r.fbclid,1000),formStartedAt:clean(r.formStartedAt,100),submittedAt:new Date().toISOString(),submissionId:clean(r.submissionId,150)||crypto.randomUUID(),website:clean(r.website,200),relay:'cloudflare-d1'}; if(!p.firstName||!p.phone||!p.propertyAddress) throw new Error('MISSING_REQUIRED_FIELDS'); return p;}

function conversionEligible(p,raw){const digits=p.phone.replace(/\D/g,'');const start=Date.parse(p.formStartedAt),age=Date.now()-start;const words=p.propertyAddress.split(/\s+/).filter(Boolean);return !p.website&&raw.isTest!==true&&String(raw.isTest||'').toLowerCase()!=='true'&&(digits.length===10||(digits.length===11&&digits.startsWith('1')))&&Number.isFinite(start)&&age>=1800&&age<=86400000&&p.propertyAddress.length>=6&&(/\d/.test(p.propertyAddress)||words.length>=3)&&!/queef/i.test(p.firstName+' '+p.lastName);}
const SITE_ORIGIN='https://kbuyhouses.com';
function receiptResponse(value,status=200){return new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','access-control-allow-origin':SITE_ORIGIN,'vary':'Origin'}});}
async function claimConversion(req,env){
 if(req.headers.get('origin')!==SITE_ORIGIN)return receiptResponse({ok:false},403);
 const b=await req.json();const id=clean(b.submissionId,150),token=clean(b.receipt,100);
 if(!id||!/^[a-f0-9]{64}$/.test(token))return receiptResponse({ok:false},400);
 const row=await env.DB.prepare('SELECT payload_json FROM leads WHERE submission_id=?').bind(id).first();
 if(!row)return receiptResponse({ok:false},404);
 const p=JSON.parse(row.payload_json);
 if(p._conversionReceipt!==token||p._conversionEligible!==true||p.website||p._conversionClaimedAt)return receiptResponse({ok:false},409);
 if(Date.now()-Date.parse(p.submittedAt)>24*60*60*1000)return receiptResponse({ok:false},410);
 p._conversionClaimedAt=new Date().toISOString();
 const changed=await env.DB.prepare('UPDATE leads SET payload_json=? WHERE submission_id=? AND payload_json=?').bind(JSON.stringify(p),id,row.payload_json).run();
 if(changed.meta?.changes!==1)return receiptResponse({ok:false},409);
 return receiptResponse({ok:true,submissionId:id,conversionId:p._conversionId});
}

export default {async fetch(req,env){const u=new URL(req.url); try{
if(req.method==='OPTIONS'&&u.pathname==='/conversion-receipt'){if(req.headers.get('origin')!==SITE_ORIGIN)return new Response(null,{status:403});return new Response(null,{status:204,headers:{'access-control-allow-origin':SITE_ORIGIN,'access-control-allow-methods':'POST','access-control-allow-headers':'content-type','vary':'Origin'}});}
if(req.method==='POST'&&u.pathname==='/conversion-receipt')return await claimConversion(req,env);
if(req.method==='GET'&&u.pathname==='/health'){const c=await env.DB.prepare("SELECT COUNT(*) c FROM leads WHERE status IN ('pending','processing')").first(); return json({ok:true,service:'kbuyhouses-lead-relay',queued:Number(c?.c||0)});}
if(req.method==='POST'&&u.pathname==='/lead'){const raw=await parse(req); const p=normalize(raw); if(p.website) return Response.redirect(THANK_YOU,303); p._conversionEligible=conversionEligible(p,raw);p._conversionId=crypto.randomUUID();p._conversionReceipt=Array.from(crypto.getRandomValues(new Uint8Array(32)),x=>x.toString(16).padStart(2,'0')).join(''); await env.DB.prepare('INSERT OR IGNORE INTO leads (submission_id,payload_json,status,created_at,attempts) VALUES (?,?,?,?,0)').bind(p.submissionId,JSON.stringify(p),'pending',new Date().toISOString()).run(); const stored=await env.DB.prepare('SELECT payload_json FROM leads WHERE submission_id=?').bind(p.submissionId).first(); if(!stored)throw new Error('LEAD_PERSISTENCE_UNCONFIRMED'); const saved=JSON.parse(stored.payload_json); const dest=new URL(THANK_YOU); if(env.CONVERSION_RECEIPTS_ENABLED==='true'&&saved._conversionEligible===true&&saved._conversionReceipt===p._conversionReceipt)dest.hash=new URLSearchParams({submission:p.submissionId,receipt:p._conversionReceipt}).toString(); return Response.redirect(dest.toString(),303);}
if(req.method==='GET'&&u.pathname==='/next'){if(!allowed(req)) return new Response('Forbidden',{status:403}); const stale=new Date(Date.now()-10*60*1000).toISOString(); const row=await env.DB.prepare("SELECT id,submission_id,payload_json,attempts FROM leads WHERE status='pending' OR (status='processing' AND claimed_at < ?) ORDER BY id LIMIT 1").bind(stale).first(); if(!row) return new Response(null,{status:204}); const now=new Date().toISOString(); await env.DB.prepare("UPDATE leads SET status='processing', claimed_at=?, attempts=attempts+1 WHERE id=?").bind(now,row.id).run(); return json({ok:true,id:row.id,submissionId:row.submission_id,attempts:Number(row.attempts||0)+1,payload:JSON.parse(row.payload_json)});}
if(req.method==='POST'&&u.pathname==='/ack'){if(!allowed(req)) return new Response('Forbidden',{status:403}); const b=await req.json(); await env.DB.prepare("UPDATE leads SET status='processed', processed_at=?, last_error=NULL WHERE id=?").bind(new Date().toISOString(),Number(b.id)).run(); return json({ok:true});}
if(req.method==='POST'&&u.pathname==='/fail'){if(!allowed(req)) return new Response('Forbidden',{status:403}); const b=await req.json(); const row=await env.DB.prepare('SELECT attempts FROM leads WHERE id=?').bind(Number(b.id)).first(); const status=Number(row?.attempts||0)>=5?'failed':'pending'; await env.DB.prepare('UPDATE leads SET status=?, last_error=?, claimed_at=NULL WHERE id=?').bind(status,clean(b.error,1000),Number(b.id)).run(); return json({ok:true,status});}
return new Response('Not Found',{status:404});
}catch(e){console.error(JSON.stringify({event:'relay_error',message:String(e?.message||e)})); if(req.method==='POST'&&u.pathname==='/lead') return Response.redirect(HOME+'?error=submission',303); return json({ok:false,error:String(e?.message||e)},500);}}
};
