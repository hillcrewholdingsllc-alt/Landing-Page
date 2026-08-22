(function(){
  'use strict';

  window.dataLayer = window.dataLayer || [];
  var GA4_ID = String(window.KREI_GA4_ID || '').trim();
  var gaReady = false;

  function cleanText(value, max){
    return String(value || '').replace(/\s+/g,' ').trim().slice(0, max || 120);
  }
  function baseParams(){
    return {
      page_path: location.pathname,
      page_title: document.title,
      page_location: location.href.split('#')[0]
    };
  }
  function track(name, params){
    var payload = Object.assign({}, baseParams(), params || {});
    window.dataLayer.push(Object.assign({event:name}, payload));
    if(gaReady && typeof window.gtag === 'function'){
      window.gtag('event', name, payload);
    }
  }
  window.kreiTrack = track;

  // GA4 stays dormant until a real Measurement ID is provided.
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