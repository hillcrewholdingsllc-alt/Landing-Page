const THANK_YOU='https://kbuyhouses.com/thank-you.html';
const HOME='https://kbuyhouses.com/#get-offer';
const N8N_IP='167.172.134.50';
const SITE_HOST='kbuyhouses.com';
const TURNSTILE_SITEKEY='0x4AAAAAAFYwOra-KgD5KiWY';
const clean=(v,n=2000)=>String(v??'').trim().slice(0,n);
const json=(v,s=200,extra={})=>new Response(JSON.stringify(v),{status:s,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...extra}});
function allowed(req){return req.headers.get('cf-connecting-ip')===N8N_IP;}
async function parse(req){const ct=req.headers.get('content-type')||''; if(ct.includes('application/json')) return await req.json(); const f=await req.formData(); const o={}; for(const [k,v] of f.entries()) if(typeof v==='string') o[k]=v; return o;}
function normalizePhone(v){let d=clean(v,60).replace(/\D/g,'');if(d.length===11&&d.startsWith('1'))d=d.slice(1);return d.length===10?d:'';}
function normalizeAddress(v){return clean(v,500).toLowerCase().replace(/[.,#]/g,' ').replace(/\b(north carolina|n\.?c\.?)\b/g,' nc ').replace(/\bstreet\b/g,' st ').replace(/\broad\b/g,' rd ').replace(/\bavenue\b/g,' ave ').replace(/\bdrive\b/g,' dr ').replace(/\blane\b/g,' ln ').replace(/\bcourt\b/g,' ct ').replace(/\bboulevard\b/g,' blvd ').replace(/\bparkway\b/g,' pkwy ').replace(/\bhighway\b/g,' hwy ').replace(/\bnorth\b/g,' n ').replace(/\bsouth\b/g,' s ').replace(/\beast\b/g,' e ').replace(/\bwest\b/g,' w ').replace(/\s+/g,' ').trim();}
function normalize(r){const p={firstName:clean(r.firstName,120),lastName:clean(r.lastName,120),phone:clean(r.phone,60),email:clean(r.email,320),propertyAddress:clean(r.propertyAddress||r.address,500),sellerSituation:clean(r.sellerSituation||r.situation,500),notes:clean(r.notes,2000),source:clean(r.source||'Website',80),pageUrl:clean(r.pageUrl||'https://kbuyhouses.com/',1000),landingPage:clean(r.landingPage||'/',500),referrer:clean(r.referrer,1000),utmSource:clean(r.utmSource||r.utm_source,300),utmMedium:clean(r.utmMedium||r.utm_medium,300),utmCampaign:clean(r.utmCampaign||r.utm_campaign,500),utmTerm:clean(r.utmTerm||r.utm_term,500),utmContent:clean(r.utmContent||r.utm_content,500),gclid:clean(r.gclid,1000),gbraid:clean(r.gbraid,1000),wbraid:clean(r.wbraid,1000),fbclid:clean(r.fbclid,1000),formStartedAt:clean(r.formStartedAt,100),submittedAt:new Date().toISOString(),submissionId:clean(r.submissionId,150)||crypto.randomUUID(),website:clean(r.website,200),relay:'cloudflare-d1'};p.isTest=r.isTest===true||String(r.isTest||'').toLowerCase()==='true';p.clickId=p.gclid||p.gbraid||p.wbraid||'';const phoneNorm=normalizePhone(p.phone),addressNorm=normalizeAddress(p.propertyAddress);p._contactDedupeKey=phoneNorm&&addressNorm?phoneNorm+'|'+addressNorm:'';if(!p.firstName||!p.phone||!p.propertyAddress)throw new Error('MISSING_REQUIRED_FIELDS');return p;}

function conversionEligible(p,raw){const digits=p.phone.replace(/\D/g,'');const start=Date.parse(p.formStartedAt),age=Date.now()-start;const words=p.propertyAddress.split(/\s+/).filter(Boolean);return !p.website&&raw.isTest!==true&&String(raw.isTest||'').toLowerCase()!=='true'&&(digits.length===10||(digits.length===11&&digits.startsWith('1')))&&Number.isFinite(start)&&age>=1800&&age<=86400000&&p.propertyAddress.length>=6&&(/\d/.test(p.propertyAddress)||words.length>=3)&&!/queef/i.test(p.firstName+' '+p.lastName);}
const SITE_ORIGIN='https://kbuyhouses.com';
function receiptResponse(value,status=200){return json(value,status,{'access-control-allow-origin':SITE_ORIGIN,'vary':'Origin'});}
function errorRedirect(p,kind='submission'){try{const u=new URL(p?.pageUrl||HOME);if(u.hostname!==SITE_HOST)return HOME+'?error='+encodeURIComponent(kind);u.searchParams.set('error',kind);u.hash='get-offer';return u.toString();}catch(_e){return HOME+'?error='+encodeURIComponent(kind);}}
async function verifyTurnstile(req,raw,env){const token=clean(raw['cf-turnstile-response'],2048);if(!token||!env.TURNSTILE_SECRET)return {ok:false,reason:'missing_turnstile'};try{const body={secret:env.TURNSTILE_SECRET,response:token,idempotency_key:crypto.randomUUID()};const ip=req.headers.get('cf-connecting-ip');if(ip)body.remoteip=ip;const r=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const v=await r.json();if(v?.success!==true)return {ok:false,reason:'turnstile_failed',codes:v?.['error-codes']||[]};if(v.hostname&&v.hostname!==SITE_HOST)return {ok:false,reason:'hostname_mismatch'};return {ok:true};}catch(_e){return {ok:false,reason:'turnstile_unavailable'};}}
async function findSemanticDuplicate(env,p){const now=Date.now();if(p.clickId){const cutoff=new Date(now-24*60*60*1000).toISOString();const row=await env.DB.prepare("SELECT id,submission_id,status FROM leads WHERE click_id=? AND created_at>=? AND status NOT IN ('duplicate','rejected','failed') ORDER BY id DESC LIMIT 1").bind(p.clickId,cutoff).first();if(row)return {...row,reason:'same_click_id_24h'};}if(p._contactDedupeKey){const cutoff=new Date(now-60*60*1000).toISOString();const row=await env.DB.prepare("SELECT id,submission_id,status FROM leads WHERE contact_dedupe_key=? AND created_at>=? AND status NOT IN ('duplicate','rejected','failed') ORDER BY id DESC LIMIT 1").bind(p._contactDedupeKey,cutoff).first();if(row)return {...row,reason:'same_phone_address_60m'};}return null;}
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
if(req.method==='GET'&&u.pathname==='/turnstile-config')return receiptResponse({enabled:true,siteKey:TURNSTILE_SITEKEY});
if(req.method==='GET'&&u.pathname==='/health'){const c=await env.DB.prepare("SELECT COUNT(*) c FROM leads WHERE status IN ('pending','processing')").first();const d=await env.DB.prepare("SELECT COUNT(*) c FROM leads WHERE status='duplicate' AND created_at>=?").bind(new Date(Date.now()-24*60*60*1000).toISOString()).first();return json({ok:true,service:'kbuyhouses-lead-relay',queued:Number(c?.c||0),duplicates24h:Number(d?.c||0),turnstile:true});}
if(req.method==='POST'&&u.pathname==='/lead'){const raw=await parse(req);const p=normalize(raw);if(p.website)return Response.redirect(THANK_YOU,303);const tv=await verifyTurnstile(req,raw,env);if(!tv.ok){console.log(JSON.stringify({event:'turnstile_reject',reason:tv.reason,codes:tv.codes||[],submissionId:p.submissionId}));return Response.redirect(errorRedirect(p,'verification'),303);}const existing=await env.DB.prepare('SELECT id,status,payload_json FROM leads WHERE submission_id=?').bind(p.submissionId).first();if(existing)return Response.redirect(THANK_YOU,303);const dup=await findSemanticDuplicate(env,p);p._conversionEligible=conversionEligible(p,raw)&&!dup;p._conversionId=crypto.randomUUID();p._conversionReceipt=Array.from(crypto.getRandomValues(new Uint8Array(32)),x=>x.toString(16).padStart(2,'0')).join('');if(dup){p._duplicateOf=dup.submission_id;p._duplicateReason=dup.reason;p._duplicateDetectedAt=new Date().toISOString();await env.DB.prepare('INSERT INTO leads (submission_id,payload_json,status,created_at,attempts,click_id,contact_dedupe_key,duplicate_of) VALUES (?,?,?,?,0,?,?,?)').bind(p.submissionId,JSON.stringify(p),'duplicate',new Date().toISOString(),p.clickId||null,p._contactDedupeKey||null,dup.id).run();console.log(JSON.stringify({event:'semantic_duplicate',submissionId:p.submissionId,duplicateOf:dup.submission_id,reason:dup.reason}));return Response.redirect(THANK_YOU,303);}await env.DB.prepare('INSERT INTO leads (submission_id,payload_json,status,created_at,attempts,click_id,contact_dedupe_key,duplicate_of) VALUES (?,?,?,?,0,?,?,NULL)').bind(p.submissionId,JSON.stringify(p),'pending',new Date().toISOString(),p.clickId||null,p._contactDedupeKey||null).run();const stored=await env.DB.prepare('SELECT payload_json FROM leads WHERE submission_id=?').bind(p.submissionId).first();if(!stored)throw new Error('LEAD_PERSISTENCE_UNCONFIRMED');const saved=JSON.parse(stored.payload_json);const dest=new URL(THANK_YOU);if(env.CONVERSION_RECEIPTS_ENABLED==='true'&&saved._conversionEligible===true&&saved._conversionReceipt===p._conversionReceipt)dest.hash=new URLSearchParams({submission:p.submissionId,receipt:p._conversionReceipt}).toString();return Response.redirect(dest.toString(),303);}
if(req.method==='GET'&&u.pathname==='/next'){
 if(!allowed(req))return new Response('Forbidden',{status:403});
 const now=new Date().toISOString(),stale=new Date(Date.now()-10*60*1000).toISOString(),retryReady=new Date(Date.now()-6*60*1000).toISOString();
 // Exhausted stale executions remain visible as failed instead of retrying forever.
 await env.DB.prepare("UPDATE leads SET status='failed',last_error='Claim lease expired after maximum attempts' WHERE status='processing' AND claimed_at < ? AND attempts>=5").bind(stale).run();
 // One SQLite statement claims and returns the row. attempts is a monotonic fencing token.
 const row=await env.DB.prepare("UPDATE leads SET status='processing',claimed_at=?,attempts=attempts+1 WHERE id=(SELECT id FROM leads WHERE attempts<5 AND ((status='pending' AND (claimed_at IS NULL OR claimed_at < ?)) OR (status='processing' AND claimed_at < ?)) ORDER BY id LIMIT 1) RETURNING id,submission_id,payload_json,attempts").bind(now,retryReady,stale).first();
 if(!row)return new Response(null,{status:204});
 const payload=JSON.parse(row.payload_json);delete payload._conversionReceipt;delete payload['cf-turnstile-response'];
 return json({ok:true,id:row.id,submissionId:row.submission_id,attempts:row.attempts,payload});
}
if(req.method==='POST'&&u.pathname==='/ack'){
 if(!allowed(req))return new Response('Forbidden',{status:403});const b=await req.json();
 const id=Number(b.id),attempt=Number(b.attempt),submissionId=clean(b.submissionId,150);
 if(!Number.isInteger(id)||id<1||!Number.isInteger(attempt)||attempt<1||!submissionId||!['completed','rejected'].includes(b.outcome))return json({ok:false,error:'INVALID_SETTLEMENT'},400);
 const status=b.outcome==='rejected'?'rejected':'processed';
 const result=await env.DB.prepare("UPDATE leads SET status=?,processed_at=?,last_error=? WHERE id=? AND submission_id=? AND status='processing' AND attempts=?").bind(status,new Date().toISOString(),b.outcome==='rejected'?'Rejected: '+clean(b.reason,800):null,id,submissionId,attempt).run();
 if(result.meta?.changes!==1){const r=await env.DB.prepare('SELECT status,attempts FROM leads WHERE id=? AND submission_id=?').bind(id,submissionId).first();if(r?.status===status&&r.attempts===attempt)return json({ok:true,status,idempotent:true});return json({ok:false,error:'STALE_OR_UNKNOWN_CLAIM'},409);}
 return json({ok:true,status});
}
if(req.method==='POST'&&u.pathname==='/fail'){
 if(!allowed(req))return new Response('Forbidden',{status:403});const b=await req.json();
 const id=Number(b.id),attempt=Number(b.attempt),submissionId=clean(b.submissionId,150);
 if(!Number.isInteger(id)||id<1||!Number.isInteger(attempt)||attempt<1||!submissionId)return json({ok:false,error:'INVALID_SETTLEMENT'},400);
 const status=attempt>=5?'failed':'pending';
 const result=await env.DB.prepare("UPDATE leads SET status=?,last_error=?,claimed_at=? WHERE id=? AND submission_id=? AND status='processing' AND attempts=?").bind(status,clean(b.error,1000),new Date().toISOString(),id,submissionId,attempt).run();
 if(result.meta?.changes!==1)return json({ok:false,error:'STALE_OR_UNKNOWN_CLAIM'},409);
 return json({ok:true,status,retryAfterSeconds:status==='pending'?360:null});
}
return new Response('Not Found',{status:404});
}catch(e){console.error(JSON.stringify({event:'relay_error',message:String(e?.message||e)})); if(req.method==='POST'&&u.pathname==='/lead') return Response.redirect(HOME+'?error=submission',303); return json({ok:false,error:String(e?.message||e)},500);}}
};
