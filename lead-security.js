(function(){
  'use strict';
  const CONFIG_URL='https://kbuyhouses-lead-relay.hillcrew-automations.workers.dev/turnstile-config';
  function show(form,text){
    let el=document.getElementById('krei-security-status');
    if(!el){el=document.createElement('p');el.id='krei-security-status';el.className='small';el.setAttribute('role','status');form.appendChild(el);}
    el.textContent=text||'';
  }
  async function init(){
    const form=document.getElementById('lead-form');
    if(!form)return;
    let wrap=document.getElementById('turnstile-wrap');
    if(!wrap){wrap=document.createElement('div');wrap.id='turnstile-wrap';wrap.className='turnstile-wrap';const submit=form.querySelector('button[type="submit"]');submit?.parentNode?.insertBefore(wrap,submit);}
    const submit=form.querySelector('button[type="submit"]');
    if(submit)submit.disabled=true;
    const error=new URLSearchParams(location.search).get('error');
    if(error==='verification')show(form,'Please complete the security verification and submit the form again.');
    try{
      const response=await fetch(CONFIG_URL,{cache:'no-store',credentials:'omit'});
      if(!response.ok)throw new Error('config');
      const cfg=await response.json();
      if(!cfg.enabled||!cfg.siteKey)throw new Error('config');
      if(!window.turnstile){await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';s.async=true;s.defer=true;s.onload=resolve;s.onerror=reject;document.head.appendChild(s);});}
      if(!window.turnstile)throw new Error('turnstile');
      window.turnstile.render(wrap,{sitekey:cfg.siteKey,theme:'light',size:'flexible',appearance:'interaction-only',callback:function(){if(submit)submit.disabled=false;show(form,'');},'expired-callback':function(){if(submit)submit.disabled=true;show(form,'Security verification expired. Please verify again.');},'error-callback':function(){if(submit)submit.disabled=true;show(form,'Security verification could not complete. Please try again.');}});
    }catch(_e){if(submit)submit.disabled=true;show(form,'Security verification is temporarily unavailable. Please call us instead.');}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
