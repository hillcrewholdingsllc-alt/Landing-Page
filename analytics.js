(function(){
  'use strict';

  window.dataLayer = window.dataLayer || [];
  var GA4_ID = String(window.KREI_GA4_ID || 'G-J8NKMZM719').trim();
  var gaReady = false;

  function cleanText(value, max){
    return String(value || '').replace(/\s+/g,' ').trim().slice(0, max || 120);
  }
  function baseParams(){
    return {
      page_path: location.pathname,
      page_title: document.title,
      page_location: location.origin + location.pathname
    };
  }
  function track(name, params){
    var payload = Object.assign({}, baseParams(), params || {});
    window.dataLayer.push(Object.assign({event:name}, payload));
    if(gaReady && typeof window.gtag === 'function'){
      window.gtag('event', name, payload);
    }
  }
  window.kreiGetAnalyticsIdentity = function(timeoutMs){
    timeoutMs = Math.max(250, Math.min(2000, Number(timeoutMs || 900)));
    return new Promise(function(resolve){
      var done=false, result={gaClientId:'',gaSessionId:''}, pending=2;
      function finish(){
        if(done) return;
        done=true;
        resolve(result);
      }
      function setField(field, value){
        result[field]=cleanText(value,120);
        pending-=1;
        if(pending<=0) finish();
      }
      setTimeout(finish, timeoutMs);
      if(!GA4_ID || typeof window.gtag!=='function') return;
      try{ window.gtag('get', GA4_ID, 'client_id', function(v){ setField('gaClientId',v); }); }catch(_e){ setField('gaClientId',''); }
      try{ window.gtag('get', GA4_ID, 'session_id', function(v){ setField('gaSessionId',v); }); }catch(_e){ setField('gaSessionId',''); }
    });
  };

  window.kreiTrack = function(name, params){
    var p = Object.assign({}, params || {});
    if(name === 'generate_lead' && !p.submission_id && window.__kreiLastSubmissionId){
      p.submission_id = cleanText(window.__kreiLastSubmissionId,120);
    }
    track(name, p);
  };

  if(typeof window.fetch === 'function'){
    var nativeFetch = window.fetch.bind(window);
    window.fetch = async function(input, init){
      try{
        var url = typeof input === 'string' ? input : (input && input.url) || '';
        if(/\/website-lead(?:$|[?#])/i.test(url) && init && typeof init.body === 'string'){
          var body = JSON.parse(init.body);
          if(body && body.submissionId){
            window.__kreiLastSubmissionId = cleanText(body.submissionId,120);
            if(body.pageUrl){
              try{ var pu = new URL(body.pageUrl, location.href); body.pageUrl = pu.origin + pu.pathname; }catch(_e){}
            }
            if(!body.gaClientId || !body.gaSessionId){
              var identity = await window.kreiGetAnalyticsIdentity(900);
              if(!body.gaClientId) body.gaClientId = identity.gaClientId;
              if(!body.gaSessionId) body.gaSessionId = identity.gaSessionId;
            }
            init = Object.assign({}, init, {body:JSON.stringify(body)});
          }
        }
      }catch(_e){}
      return nativeFetch(input, init);
    };
  }

  if(/^G-[A-Z0-9]+$/i.test(GA4_ID)){
    window.gtag = window.gtag || function(){window.dataLayer.push(arguments);};
    window.gtag('js', new Date());
    window.gtag('config', GA4_ID, {send_page_view:true});
    var s=document.createElement('script');
    s.async=true;
    s.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(GA4_ID);
    document.head.appendChild(s);
    gaReady=true;
  }

  document.addEventListener('click', function(e){
    var a=e.target.closest && e.target.closest('a');
    if(!a) return;
    var href=a.getAttribute('href') || '';
    var text=cleanText(a.textContent,80);

    if(href.indexOf('tel:')===0){
      track('phone_click',{link_text:text});
      return;
    }
    if(href.indexOf('mailto:')===0){
      track('email_click',{link_text:text});
      return;
    }
    if(href==='#get-offer' || href==='/#get-offer'){
      track('cta_click',{cta_text:text,cta_target:'lead_form'});
    }
    if(a.classList.contains('situation-card') || a.closest('.resource-links')){
      track('seller_resource_click',{link_text:text,link_url:href});
    }
    try{
      var u=new URL(a.href, location.href);
      if(u.hostname && u.hostname!==location.hostname){
        var platform='external';
        if(/facebook\.com$/i.test(u.hostname) || /\.facebook\.com$/i.test(u.hostname)) platform='facebook';
        else if(/linkedin\.com$/i.test(u.hostname) || /\.linkedin\.com$/i.test(u.hostname)) platform='linkedin';
        else if(/share\.google$/i.test(u.hostname)) platform='google_business_profile';
        track('outbound_click',{platform:platform,link_text:text,link_url:u.origin+u.pathname});
      }
    }catch(_e){}
  },{passive:true});

  var form=document.getElementById('lead-form');
  if(form){
    var started=false;
    form.addEventListener('input',function(){
      if(started) return;
      started=true;
      track('form_start',{form_name:'seller_lead'});
    },{passive:true});
  }

  var address=document.getElementById('property-address');
  if(address){
    var addressStarted=false;
    address.addEventListener('input',function(){
      if(addressStarted || address.value.trim().length<4) return;
      addressStarted=true;
      track('address_autofill_start',{form_name:'seller_lead'});
    },{passive:true});
  }
  var results=document.getElementById('address-results');
  if(results){
    results.addEventListener('mousedown',function(e){
      if(e.target.closest && e.target.closest('.address-result')){
        track('address_autofill_select',{form_name:'seller_lead'});
      }
    },{passive:true});
  }

  var fired50=false,fired90=false;
  function onScroll(){
    var d=document.documentElement;
    var max=Math.max(1,d.scrollHeight-window.innerHeight);
    var pct=Math.round((window.scrollY/max)*100);
    if(!fired50 && pct>=50){fired50=true;track('scroll_depth',{percent_scrolled:50});}
    if(!fired90 && pct>=90){fired90=true;track('scroll_depth',{percent_scrolled:90});window.removeEventListener('scroll',onScroll);}
  }
  window.addEventListener('scroll',onScroll,{passive:true});
})();