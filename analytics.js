(function(){
  'use strict';

  window.dataLayer = window.dataLayer || [];
  var GA4_ID = String(window.KREI_GA4_ID || 'G-EG4EF3TWJ6').trim();
  var GOOGLE_ADS_ID = String(window.KREI_GOOGLE_ADS_ID || 'AW-16507283647').trim();
  var META_PIXEL_ID = String(window.KREI_META_PIXEL_ID || '376165588741429').trim();
  var gaReady = false;
  var metaReady = false;

  function cleanText(value, max){
    return String(value || '').replace(/\s+/g,' ').trim().slice(0, max || 120);
  }
  function getCookie(name){
    var match=document.cookie.match(new RegExp('(?:^|;\\s*)'+name.replace(/[.*+?^${}()|[\\]\\]/g,'\\$&')+'=([^;]*)'));
    return match?decodeURIComponent(match[1]):'';
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
    if(name === 'generate_lead' && metaReady && typeof window.fbq === 'function'){
      try{
        var metaOptions=p.submission_id?{eventID:cleanText(p.submission_id,120)}:undefined;
        window.fbq('track','Lead',{content_name:'seller_lead'},metaOptions);
      }catch(_e){}
    }
  };

  if(/^G-[A-Z0-9]+$/i.test(GA4_ID)){
    window.gtag = window.gtag || function(){window.dataLayer.push(arguments);};
    window.gtag('js', new Date());
    window.gtag('config', GA4_ID, {send_page_view:true});
    if(/^AW-\d+$/i.test(GOOGLE_ADS_ID)){
      window.gtag('config', GOOGLE_ADS_ID);
    }
    var s=document.createElement('script');
    s.async=true;
    s.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(GA4_ID);
    document.head.appendChild(s);
    gaReady=true;
  }

  if(/^\d{8,20}$/.test(META_PIXEL_ID)){
    window.fbq = window.fbq || function(){
      window.fbq.callMethod ? window.fbq.callMethod.apply(window.fbq,arguments) : window.fbq.queue.push(arguments);
    };
    if(!window._fbq) window._fbq=window.fbq;
    window.fbq.push=window.fbq;
    window.fbq.loaded=true;
    window.fbq.version='2.0';
    window.fbq.queue=window.fbq.queue||[];
    window.fbq('init',META_PIXEL_ID);
    window.fbq('track','PageView');
    var ms=document.createElement('script');
    ms.async=true;
    ms.src='https://connect.facebook.net/en_US/fbevents.js';
    document.head.appendChild(ms);
    metaReady=true;
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
