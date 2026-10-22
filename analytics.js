(function(){
  'use strict';

  window.dataLayer = window.dataLayer || [];
  var GA4_ID = String(window.KREI_GA4_ID || 'G-EG4EF3TWJ6').trim();
  var GOOGLE_ADS_ID = String(window.KREI_GOOGLE_ADS_ID || 'AW-16507283647').trim();
  var GOOGLE_ADS_CONVERSION_LABEL = String(window.KREI_GOOGLE_ADS_CONVERSION_LABEL || 'cUs3CKHXze4cEL_RpL89').trim();
  var META_PIXEL_ID = String(window.KREI_META_PIXEL_ID || '376165588741429').trim();
  var gaReady = false;
  var metaReady = false;
  var adsLeadConversionFired = false;

  function cleanText(value, max){
    return String(value || '').replace(/\s+/g,' ').trim().slice(0, max || 120);
  }
  function getCookie(name){
    var match=document.cookie.match(new RegExp('(?:^|;\\s*)'+name.replace(/[.*+?^${}()|[\\]\\]/g,'\\$&')+'=([^;]*)'));
    return match?decodeURIComponent(match[1]):'';
  }
  function safeParams(){
    try{return new URLSearchParams(location.search || '');}
    catch(_e){return {get:function(){return '';},has:function(){return false;}};}
  }
  function loadStoredAttribution(){
    try{return JSON.parse(sessionStorage.getItem('krei_attribution') || '{}') || {};}
    catch(_e){return {};}
  }
  function saveStoredAttribution(value){
    try{sessionStorage.setItem('krei_attribution',JSON.stringify(value || {}));}catch(_e){}
  }
  function baseParams(){
    return {
      page_path: location.pathname,
      page_title: document.title,
      page_location: location.origin + location.pathname,
      attribution_channel: String(window.KREI_ATTRIBUTION_CHANNEL || 'direct_or_legacy'),
      tracking_number: String(window.KREI_TRACKING_NUMBER || '+12523593197')
    };
  }
  function track(name, params){
    var payload = Object.assign({}, baseParams(), params || {});
    if(gaReady && typeof window.gtag === 'function'){
      window.gtag('event', name, payload);
    }else{
      window.dataLayer.push(Object.assign({event:name}, payload));
    }
  }

  var KREI_PHONE_MAP = {
    main: { channel:'direct_or_legacy', e164:'+12523593197', display:'(252) 359-3197' },
    organic: { channel:'organic_search', e164:'+12528882210', display:'(252) 888-2210' },
    google_ads: { channel:'google_ads_ppc', e164:'+12523041500', display:'(252) 304-1500' },
    gbp: { channel:'google_business_profile', e164:'+12528887483', display:'(252) 888-7483' },
    meta: { channel:'meta_paid_social', e164:'+12526686812', display:'(252) 668-6812' },
    // ChatGPT is explicitly tracked now. Until a dedicated number is provisioned,
    // it intentionally uses the main line so we do not contaminate another source pool.
    chatgpt: { channel:'chatgpt_referral', e164:'+12523593197', display:'(252) 359-3197' }
  };

  function phoneKeyForChannel(channel){
    var found='main';
    Object.keys(KREI_PHONE_MAP).some(function(k){
      if(KREI_PHONE_MAP[k].channel===channel){found=k;return true;}
      return false;
    });
    return found;
  }

  function kreiDetectAttribution(){
    var explicitChannel=cleanText(window.KREI_ATTRIBUTION_CHANNEL,80);
    var explicitNumber=cleanText(window.KREI_TRACKING_NUMBER,30);
    if(explicitChannel && explicitNumber){
      var explicitKey=phoneKeyForChannel(explicitChannel);
      var explicit=KREI_PHONE_MAP[explicitKey] || KREI_PHONE_MAP.main;
      return {key:explicitKey,channel:explicitChannel,e164:explicitNumber,display:explicit.display};
    }

    var params=safeParams();
    var source=cleanText(params.get('utm_source'),80).toLowerCase();
    var medium=cleanText(params.get('utm_medium'),80).toLowerCase();
    var refHost='';
    try{ refHost=document.referrer ? new URL(document.referrer).hostname.toLowerCase() : ''; }catch(_e){}

    if(params.has('gclid') || params.has('gbraid') || params.has('wbraid') ||
       /^(cpc|ppc|paid_search|paidsearch)$/i.test(medium) ||
       /^(google_ads|googleads|adwords)$/i.test(source)){
      return Object.assign({key:'google_ads'},KREI_PHONE_MAP.google_ads);
    }
    if(/^(gmb|gbp|google_business|google_business_profile|googlebusiness)$/i.test(source)){
      return Object.assign({key:'gbp'},KREI_PHONE_MAP.gbp);
    }
    if(params.has('fbclid') || /^(facebook|meta|instagram)$/i.test(source) ||
       /^(paid_social|social_paid)$/i.test(medium)){
      return Object.assign({key:'meta'},KREI_PHONE_MAP.meta);
    }
    if(/chatgpt|openai/.test(source) || /(^|\.)(chatgpt\.com|openai\.com)$/i.test(refHost)){
      return Object.assign({key:'chatgpt'},KREI_PHONE_MAP.chatgpt);
    }
    if(refHost && !/(^|\.)kbuyhouses\.com$/i.test(refHost) &&
       /(^|\.)(google\.|bing\.com$|search\.yahoo\.com$|duckduckgo\.com$|search\.brave\.com$)/i.test(refHost)){
      return Object.assign({key:'organic'},KREI_PHONE_MAP.organic);
    }

    var stored=loadStoredAttribution();
    if(stored.key && KREI_PHONE_MAP[stored.key]){
      return Object.assign({key:stored.key},KREI_PHONE_MAP[stored.key]);
    }
    return Object.assign({key:'main'},KREI_PHONE_MAP.main);
  }

  function captureAttribution(selected){
    var params=safeParams();
    var current={
      key:selected.key || phoneKeyForChannel(selected.channel),
      channel:selected.channel,
      trackingNumber:selected.e164,
      firstLandingPage:location.pathname,
      firstPageUrl:location.href,
      referrer:document.referrer || '',
      utmSource:cleanText(params.get('utm_source'),300),
      utmMedium:cleanText(params.get('utm_medium'),300),
      utmCampaign:cleanText(params.get('utm_campaign'),500),
      utmTerm:cleanText(params.get('utm_term'),500),
      utmContent:cleanText(params.get('utm_content'),500),
      gclid:cleanText(params.get('gclid'),1000),
      gbraid:cleanText(params.get('gbraid'),1000),
      wbraid:cleanText(params.get('wbraid'),1000),
      fbclid:cleanText(params.get('fbclid'),1000),
      capturedAt:new Date().toISOString()
    };
    var previous=loadStoredAttribution();
    if(previous && previous.capturedAt){
      Object.keys(current).forEach(function(k){
        if(!current[k] && previous[k]) current[k]=previous[k];
      });
      if(previous.firstLandingPage) current.firstLandingPage=previous.firstLandingPage;
      if(previous.firstPageUrl) current.firstPageUrl=previous.firstPageUrl;
      if(previous.capturedAt) current.capturedAt=previous.capturedAt;
      if(previous.key && selected.key==='main'){
        current.key=previous.key;
        current.channel=(KREI_PHONE_MAP[previous.key]||KREI_PHONE_MAP.main).channel;
        current.trackingNumber=(KREI_PHONE_MAP[previous.key]||KREI_PHONE_MAP.main).e164;
      }
    }
    saveStoredAttribution(current);
    return current;
  }

  function kreiApplyDynamicPhoneNumber(){
    var selected=kreiDetectAttribution();
    var stored=captureAttribution(selected);
    if(stored.key && KREI_PHONE_MAP[stored.key]) selected=Object.assign({key:stored.key},KREI_PHONE_MAP[stored.key]);

    window.KREI_ATTRIBUTION_CHANNEL=selected.channel;
    window.KREI_TRACKING_NUMBER=selected.e164;

    document.querySelectorAll('a[href^="tel:"]').forEach(function(a){
      var raw=(a.getAttribute('href')||'').replace(/\D/g,'');
      if(raw==='12523593197'){
        a.setAttribute('href','tel:'+selected.e164);
        a.textContent=(a.textContent||'').replace(/\(252\)\s*359-3197/g,selected.display);
      }
    });
  }

  function isGoogleAdsAttribution(){
    var channel=String(window.KREI_ATTRIBUTION_CHANNEL || '');
    if(channel==='google_ads_ppc') return true;
    var params=safeParams();
    if(params.has('gclid') || params.has('gbraid') || params.has('wbraid')) return true;
    var stored=loadStoredAttribution();
    return stored.key==='google_ads' || !!(stored.gclid || stored.gbraid || stored.wbraid);
  }

  function trackGoogleAdsLeadConversion(submissionId){
    if(!isGoogleAdsAttribution()) return;
    if(adsLeadConversionFired || typeof window.gtag !== 'function') return;
    if(!/^AW-\d+$/i.test(GOOGLE_ADS_ID)) return;
    if(!/^[A-Za-z0-9_-]+$/.test(GOOGLE_ADS_CONVERSION_LABEL)) return;
    adsLeadConversionFired = true;
    try{
      window.gtag('event','conversion',{
        send_to: GOOGLE_ADS_ID + '/' + GOOGLE_ADS_CONVERSION_LABEL,
        value: 1.0,
        currency: 'USD',
        transaction_id: cleanText(submissionId,150)
      });
    }catch(_e){
      adsLeadConversionFired = false;
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

  kreiApplyDynamicPhoneNumber();

  window.kreiTrack = function(name, params){
    var p = Object.assign({}, params || {});
    if(name === 'generate_lead' && !p.submission_id && window.__kreiLastSubmissionId){
      p.submission_id = cleanText(window.__kreiLastSubmissionId,120);
    }
    track(name, p);
    if(name === 'generate_lead'){
      trackGoogleAdsLeadConversion(p.submission_id);
    }
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
      track('phone_click',{link_text:text,attribution_channel:String(window.KREI_ATTRIBUTION_CHANNEL||''),tracking_number:String(window.KREI_TRACKING_NUMBER||'')});
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

  function kreiPopulateLeadForms(){
    var params=safeParams();
    var storedPaid={};
    try{storedPaid=JSON.parse(sessionStorage.getItem('krei_paid_attribution')||'{}')||{};}catch(_e){}
    var mapping={utm_source:'utmSource',utm_medium:'utmMedium',utm_campaign:'utmCampaign',utm_term:'utmTerm',utm_content:'utmContent',gclid:'gclid',gbraid:'gbraid',wbraid:'wbraid',fbclid:'fbclid'};
    Object.keys(mapping).forEach(function(k){if(params.get(k))storedPaid[k]=params.get(k);});
    try{sessionStorage.setItem('krei_paid_attribution',JSON.stringify(storedPaid));}catch(_e){}
    var attribution=loadStoredAttribution();

    document.querySelectorAll('form#lead-form,form[data-krei-lead-form]').forEach(function(f){
      function ensure(name){
        var el=f.querySelector('[name="'+name+'"]');
        if(!el){el=document.createElement('input');el.type='hidden';el.name=name;f.appendChild(el);}
        return el;
      }
      function set(name,value){var el=ensure(name);if(!el.value)el.value=value||'';}
      set('pageUrl',location.href);
      set('landingPage',location.pathname);
      set('referrer',document.referrer||'');
      set('formStartedAt',new Date().toISOString());
      set('attributionChannel',String(window.KREI_ATTRIBUTION_CHANNEL||attribution.channel||''));
      set('trackingNumber',String(window.KREI_TRACKING_NUMBER||attribution.trackingNumber||''));
      set('firstLandingPage',attribution.firstLandingPage||location.pathname);
      set('firstPageUrl',attribution.firstPageUrl||location.href);
      Object.keys(mapping).forEach(function(k){set(mapping[k],params.get(k)||storedPaid[k]||attribution[mapping[k]]||'');});
      var sid=ensure('submissionId');
      if(!sid.value){try{sid.value=crypto.randomUUID();}catch(_e){sid.value='web-'+Date.now()+'-'+Math.random().toString(36).slice(2);}}
    });
  }

  function kreiInjectSellerCapture(){
    if(location.pathname==='/'||location.pathname.indexOf('/lp/')===0||location.pathname==='/thank-you.html'||document.getElementById('lead-form'))return;
    var article=document.querySelector('article.article,.content .article'); if(!article)return;
    var section=document.createElement('section');section.className='inline-lead';section.id='inline-offer';
    section.innerHTML='<div class="inline-lead-inner"><div><span class="eyebrow">GET A LOCAL CASH OFFER</span><h2>Want us to review your property?</h2><p>Send the address and best number to reach you. We can gather the rest during follow-up.</p><div class="inline-rating"><span class="stars">★★★★★</span> <strong>5.0 on Google</strong> · 10 reviews</div></div><form data-krei-lead-form id="lead-form" method="POST" action="https://kbuyhouses-lead-relay.hillcrew-automations.workers.dev/lead" enctype="multipart/form-data"><input class="honeypot" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true"><input type="hidden" name="source" value="Seller Resource Page"><input type="hidden" name="pageUrl"><input type="hidden" name="landingPage"><input type="hidden" name="referrer"><input type="hidden" name="formStartedAt"><input type="hidden" name="submissionId"><input type="hidden" name="attributionChannel"><input type="hidden" name="trackingNumber"><input type="hidden" name="firstLandingPage"><input type="hidden" name="firstPageUrl"><input type="hidden" name="utmSource"><input type="hidden" name="utmMedium"><input type="hidden" name="utmCampaign"><input type="hidden" name="utmTerm"><input type="hidden" name="utmContent"><input type="hidden" name="gclid"><input type="hidden" name="gbraid"><input type="hidden" name="wbraid"><input type="hidden" name="fbclid"><label>Property address<input id="property-address" name="propertyAddress" required autocomplete="street-address"></label><div class="inline-row"><label>First name<input name="firstName" required autocomplete="given-name"></label><label>Phone<input name="phone" type="tel" required autocomplete="tel"></label></div><button type="submit">Get My Cash Offer</button><details class="optional-details"><summary>Add optional details</summary><label>Email<input name="email" type="email" autocomplete="email"></label><label>Anything else?<textarea name="notes" rows="3"></textarea></label></details><small>No obligation. We review Greenville and Pitt County properties directly.</small></form></div>';
    article.parentNode.insertBefore(section,article.nextSibling);
  }

  function kreiInjectMobileSticky(){
    if(location.pathname==='/thank-you.html'||document.querySelector('.mobile-sticky-cta'))return;
    var bar=document.createElement('div');bar.className='mobile-sticky-cta';bar.innerHTML='<a class="sticky-offer" href="'+(location.pathname.indexOf('/lp/')===0?'#get-offer':document.getElementById('lead-form')?'#lead-form':'/#get-offer')+'">Get Cash Offer</a><a class="sticky-call" href="tel:+12523593197">Call</a>';document.body.appendChild(bar);
  }

  kreiInjectSellerCapture();
  kreiPopulateLeadForms();
  kreiInjectMobileSticky();
  kreiApplyDynamicPhoneNumber();
  kreiPopulateLeadForms();

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
