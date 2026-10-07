from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
RELAY = 'https://kbuyhouses-lead-relay.hillcrew-automations.workers.dev/lead'


def patch(path, fn):
    p = ROOT / path
    s = p.read_text()
    ns = fn(s)
    if ns != s:
        p.write_text(ns)
        print('updated', path)


def hidden_fields(source='Website'):
    return f'''<input class="honeypot" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true"><input type="hidden" name="source" value="{source}"><input type="hidden" name="pageUrl" id="page-url"><input type="hidden" name="landingPage" id="landing-page"><input type="hidden" name="referrer" id="referrer"><input type="hidden" name="formStartedAt" id="form-started-at"><input type="hidden" name="submissionId" id="submission-id"><input type="hidden" name="utmSource" id="utm-source"><input type="hidden" name="utmMedium" id="utm-medium"><input type="hidden" name="utmCampaign" id="utm-campaign"><input type="hidden" name="utmTerm" id="utm-term"><input type="hidden" name="utmContent" id="utm-content"><input type="hidden" name="gclid" id="gclid"><input type="hidden" name="gbraid" id="gbraid"><input type="hidden" name="wbraid" id="wbraid"><input type="hidden" name="fbclid" id="fbclid">'''


def homepage(s):
    # Strengthen local schema with exact current GBP address.
    s = s.replace('"address":{"@type":"PostalAddress","addressLocality":"Greenville","addressRegion":"NC","postalCode":"27858","addressCountry":"US"}', '"address":{"@type":"PostalAddress","streetAddress":"323 Clifton St Ste 12","addressLocality":"Greenville","addressRegion":"NC","postalCode":"27858","addressCountry":"US"}')
    # Add explicit dimensions/performance hints to the hero image.
    s = s.replace('<img class="hero-img" src="/krei-homepage-hero.webp" alt="Single-family brick ranch home representative of Eastern North Carolina housing">', '<img class="hero-img" src="/krei-homepage-hero.webp" alt="Single-family brick ranch home representative of Eastern North Carolina housing" width="1600" height="1067" decoding="async" fetchpriority="high">')
    # Add public GBP trust proof once.
    if 'gbp-proof-home' not in s:
        marker = '</section><section class="section" style="background:#e9efea">'
        trust = '''</section><section class="section gbp-proof-home"><div class="wrap"><p class="eyebrow">TRUSTED LOCAL BUYER</p><h2>Greenville sellers have rated us 5.0 on Google.</h2><div class="review-summary"><div class="rating-card"><div class="stars" aria-label="5 out of 5 stars">★★★★★</div><strong>5.0 Google rating</strong><span>Based on 10 public reviews</span></div><div class="review-quote">“Made us feel comfortable and was willing to work with us.”</div><div class="review-quote">“They have treated sellers and buyers fairly.”</div><div class="review-quote">“Professional, honest and trustworthy.”</div></div><p class="local-proof-line"><strong>Local office:</strong> 323 Clifton St Ste 12, Greenville, NC 27858 · <a href="tel:+12523593197">(252) 359-3197</a></p></div>'''
        s = s.replace(marker, trust + '<section class="section" style="background:#e9efea">')
    # Keep first conversion request compact by collapsing optional qualification fields.
    if '<details class="optional-details">' not in s:
        start = s.find('<div class="row"><div class="field"><label for="phone">Phone</label>')
        if start != -1:
            email_block = '<div class="field"><label for="email">Email</label><input id="email" name="email" type="email" autocomplete="email"></div>'
            situation_block = '<div class="field"><label for="situation">Seller situation</label><select id="situation" name="sellerSituation"><option value="">Select one</option><option>Inherited property</option><option>Vacant property</option><option>Rental / landlord</option><option>Needs repairs</option><option>Foreclosure</option><option>Tax or lien issue</option><option>Other</option></select></div>'
            notes_block = '<div class="field"><label for="notes">Anything else?</label><textarea id="notes" name="notes" placeholder="Repairs, occupancy, timing, mortgage balance, or anything else helpful"></textarea></div>'
            s = s.replace(email_block, '')
            s = s.replace(situation_block, '')
            s = s.replace(notes_block, '')
            submit = '<button class="submit" id="lead-submit" type="submit">Request My Cash Offer</button>'
            optional = submit + '<details class="optional-details"><summary>Add optional property details</summary>' + email_block + situation_block + notes_block + '</details>'
            s = s.replace(submit, optional)
    return s


def ppc(s):
    s = s.replace('<h1>Sell your house directly for cash.</h1>', '<h1>Get a cash offer for your Greenville house.</h1>')
    s = s.replace("<p class=\"lead-copy\">If you are considering selling a house in Greenville or Pitt County, request a direct cash offer from K Real Estate. We buy properties as-is and can discuss a closing timeline that fits your situation.</p>", "<p class=\"lead-copy\">Request a direct cash offer from a local Greenville buyer. We buy houses as-is, do not charge an agent commission to you as the buyer, and can discuss a closing timeline that fits your situation.</p>")
    if 'mobile-pitch' not in s:
        s = s.replace('<div class="formcard" id="get-offer">', '<div class="formcard" id="get-offer"><div class="mobile-pitch"><div class="eyebrow">LOCAL GREENVILLE HOME BUYER</div><h1>Get a cash offer for your Greenville house.</h1></div>')
    if 'google-rating-inline' not in s:
        s = s.replace('<p class="intro">Tell us where the property is and how to reach you. We will review the details and follow up.</p>', '<p class="intro">Tell us where the property is and how to reach you. We will review the details and follow up.</p><div class="google-rating-inline"><span class="stars">★★★★★</span><strong>5.0 on Google</strong><span>10 reviews</span></div>')
    # Move optional fields below the primary conversion button.
    if '<details class="optional-details">' not in s:
        email = re.search(r'<div class="field">\s*<label for="email">.*?</div>', s, re.S)
        situation = re.search(r'<div class="field">\s*<label for="situation">.*?</div>', s, re.S)
        notes = re.search(r'<div class="field">\s*<label for="notes">.*?</div>', s, re.S)
        blocks = [m.group(0) for m in (email, situation, notes) if m]
        for b in blocks:
            s = s.replace(b, '')
        button = '<button class="submit" type="submit">Get My Cash Offer</button>'
        s = s.replace(button, button + '<details class="optional-details"><summary>Add optional property details</summary>' + ''.join(blocks) + '</details>')
    if 'review-strip' not in s:
        proof_anchor = '<section class="proof">'
        review_strip = '''<section class="review-strip"><div class="wrap"><div class="review-strip-grid"><div><div class="stars">★★★★★</div><strong>5.0 Google rating</strong><p>Based on 10 public Google reviews for K Real Estate &amp; Investment LLC.</p></div><blockquote>“Made us feel comfortable and was willing to work with us.”</blockquote><blockquote>“They have treated sellers and buyers fairly.”</blockquote><blockquote>“Professional, honest and trustworthy.”</blockquote></div></div></section>'''
        s = s.replace(proof_anchor, review_strip + proof_anchor)
    # Mobile places concise pitch + form before the longer supporting copy.
    s = s.replace('@media(max-width:860px){.hero-grid{grid-template-columns:1fr}', '@media(max-width:860px){.hero-grid{display:flex;flex-direction:column}.hero-grid>.formcard{order:-1}.mobile-pitch{display:block}.hero-grid>div:first-child{padding-top:10px}')
    # Add styles before closing style tag.
    if '.google-rating-inline' not in s:
        s = s.replace('</style>', '.mobile-pitch{display:none}.google-rating-inline{display:flex;gap:9px;align-items:center;flex-wrap:wrap;background:#f7f3eb;border:1px solid #e7dfd1;border-radius:14px;padding:10px 12px;margin:-8px 0 14px}.stars{color:#a97920;letter-spacing:.08em}.optional-details{margin-top:12px;border-top:1px solid #e4e8e4;padding-top:10px}.optional-details summary{cursor:pointer;font-weight:700;color:#244a3a;margin-bottom:12px}.optional-details[open]{display:grid;gap:13px}.review-strip{padding:34px 0;background:#fff}.review-strip-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}.review-strip-grid>div,.review-strip blockquote{margin:0;background:#faf7f1;border:1px solid #e4e0d8;border-radius:18px;padding:18px;line-height:1.5}.review-strip p{font-size:13px;color:#68736c;margin:6px 0 0}@media(max-width:860px){.review-strip-grid{grid-template-columns:1fr 1fr}.mobile-pitch h1{font:700 38px/1.04 Playfair Display,serif;color:#173d2e;margin:10px 0 14px}}@media(max-width:560px){.review-strip-grid{grid-template-columns:1fr}}\n</style>')
    return s


def greenville(s):
    # Replace the legacy FormSubmit form with the production relay and compact capture.
    pat = re.compile(r'<section id="contact" class="contact">.*?</section>', re.S)
    replacement = f'''<section id="contact" class="contact"><div class="wrap"><h2>Request a Greenville property review</h2><p>Start with the address and best phone number. We can gather the rest during follow-up.</p><form id="lead-form" action="{RELAY}" method="POST" enctype="multipart/form-data">{hidden_fields('Website Greenville Guide')}<label>Property address<input id="property-address" name="propertyAddress" required autocomplete="street-address"></label><label>First name<input name="firstName" required autocomplete="given-name"></label><label>Phone<input name="phone" type="tel" required autocomplete="tel"></label><button type="submit">Request a cash offer</button><details class="optional-details"><summary>Add optional details</summary><label>Email<input name="email" type="email" autocomplete="email"></label><label>Property details<textarea name="notes" rows="4"></textarea></label></details><p class="small">No obligation. Your request goes directly into our local seller review workflow.</p></form></div></section>'''
    if 'formsubmit.co' in s:
        s = pat.sub(replacement, s)
    return s


def analytics(s):
    if 'kreiPopulateLeadForms' not in s:
        insertion = r'''
  function kreiPopulateLeadForms(){
    var params; try{params=new URLSearchParams(location.search||'');}catch(_e){params={get:function(){return '';}};}
    var stored={}; try{stored=JSON.parse(sessionStorage.getItem('krei_paid_attribution')||'{}')||{};}catch(_e){}
    var mapping={utm_source:'utmSource',utm_medium:'utmMedium',utm_campaign:'utmCampaign',utm_term:'utmTerm',utm_content:'utmContent',gclid:'gclid',gbraid:'gbraid',wbraid:'wbraid',fbclid:'fbclid'};
    Object.keys(mapping).forEach(function(k){if(params.get(k))stored[k]=params.get(k);});
    try{sessionStorage.setItem('krei_paid_attribution',JSON.stringify(stored));}catch(_e){}
    document.querySelectorAll('form#lead-form,form[data-krei-lead-form]').forEach(function(f){
      function set(name,value){var el=f.querySelector('[name="'+name+'"]');if(el&&!el.value)el.value=value||'';}
      set('pageUrl',location.href);set('landingPage',location.pathname);set('referrer',document.referrer||'');set('formStartedAt',new Date().toISOString());
      Object.keys(mapping).forEach(function(k){set(mapping[k],params.get(k)||stored[k]||'');});
      var sid=f.querySelector('[name="submissionId"]'); if(sid&&!sid.value){try{sid.value=crypto.randomUUID();}catch(_e){sid.value='web-'+Date.now()+'-'+Math.random().toString(36).slice(2);}}
    });
  }

  function kreiInjectSellerCapture(){
    if(location.pathname==='/'||location.pathname.indexOf('/lp/')===0||location.pathname==='/thank-you.html'||document.getElementById('lead-form'))return;
    var article=document.querySelector('article.article,.content .article'); if(!article)return;
    var section=document.createElement('section');section.className='inline-lead';section.id='inline-offer';
    section.innerHTML='<div class="inline-lead-inner"><div><span class="eyebrow">GET A LOCAL CASH OFFER</span><h2>Want us to review your property?</h2><p>Send the address and best number to reach you. We can gather the rest during follow-up.</p><div class="inline-rating"><span class="stars">★★★★★</span> <strong>5.0 on Google</strong> · 10 reviews</div></div><form data-krei-lead-form id="lead-form" method="POST" action="https://kbuyhouses-lead-relay.hillcrew-automations.workers.dev/lead" enctype="multipart/form-data"><input class="honeypot" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true"><input type="hidden" name="source" value="Seller Resource Page"><input type="hidden" name="pageUrl"><input type="hidden" name="landingPage"><input type="hidden" name="referrer"><input type="hidden" name="formStartedAt"><input type="hidden" name="submissionId"><input type="hidden" name="utmSource"><input type="hidden" name="utmMedium"><input type="hidden" name="utmCampaign"><input type="hidden" name="utmTerm"><input type="hidden" name="utmContent"><input type="hidden" name="gclid"><input type="hidden" name="gbraid"><input type="hidden" name="wbraid"><input type="hidden" name="fbclid"><label>Property address<input id="property-address" name="propertyAddress" required autocomplete="street-address"></label><div class="inline-row"><label>First name<input name="firstName" required autocomplete="given-name"></label><label>Phone<input name="phone" type="tel" required autocomplete="tel"></label></div><button type="submit">Get My Cash Offer</button><details class="optional-details"><summary>Add optional details</summary><label>Email<input name="email" type="email" autocomplete="email"></label><label>Anything else?<textarea name="notes" rows="3"></textarea></label></details><small>No obligation. We review Greenville and Pitt County properties directly.</small></form></div>';
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
'''
        s = s.replace('  var form=document.getElementById(\'lead-form\');', insertion + "\n  var form=document.getElementById('lead-form');")
    return s


def css(s):
    if '.inline-lead{' not in s:
        s += '''\n/* CRO seller capture + mobile conversion bar */\n.gbp-proof-home{background:#fff}.review-summary{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-top:22px}.rating-card,.review-quote{border:1px solid #e2e8e3;border-radius:18px;padding:20px;background:#faf7f1}.rating-card{display:grid;gap:4px}.rating-card span{font-size:13px;color:#68736c}.stars{color:#a97920;letter-spacing:.08em}.review-quote{font-weight:600;line-height:1.5}.local-proof-line{margin-top:20px}.optional-details{margin-top:12px}.optional-details summary{cursor:pointer;font-weight:700;color:#244a3a;margin-bottom:10px}.optional-details[open]{display:grid;gap:12px}.inline-lead{max-width:960px;margin:20px auto 72px;background:#173d2e;color:#fff;border-radius:28px;padding:30px}.inline-lead-inner{display:grid;grid-template-columns:.85fr 1.15fr;gap:26px;align-items:start}.inline-lead h2{font-family:'Playfair Display',serif;font-size:36px;line-height:1.1;margin:8px 0 12px}.inline-lead p{color:#dce6df}.inline-rating{margin-top:18px}.inline-lead form{display:grid;gap:11px;background:#fff;color:#272b28;border-radius:20px;padding:20px}.inline-lead label{display:grid;gap:5px;font-size:12px;font-weight:700}.inline-lead input,.inline-lead textarea{width:100%;padding:12px;border:1px solid #ccd6ce;border-radius:10px;font:inherit}.inline-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}.inline-lead button{border:0;border-radius:999px;background:#244a3a;color:#fff;padding:14px;font-weight:800}.inline-lead small{color:#6b756f}.honeypot{position:absolute!important;left:-9999px!important}.mobile-sticky-cta{display:none}@media(max-width:760px){.review-summary{grid-template-columns:1fr 1fr}.inline-lead{margin:18px 14px 82px;padding:22px 16px}.inline-lead-inner{grid-template-columns:1fr}.inline-row{grid-template-columns:1fr}.mobile-sticky-cta{position:fixed;z-index:999;left:0;right:0;bottom:0;display:grid;grid-template-columns:1.5fr 1fr;gap:8px;padding:10px 12px calc(10px + env(safe-area-inset-bottom));background:rgba(247,243,235,.98);border-top:1px solid #dfe4de;box-shadow:0 -8px 30px rgba(0,0,0,.08)}.mobile-sticky-cta a{display:flex;justify-content:center;align-items:center;text-decoration:none;font-weight:800;border-radius:999px;padding:12px}.sticky-offer{background:#244a3a;color:#fff}.sticky-call{background:#fff;border:1px solid #244a3a;color:#244a3a}body{padding-bottom:72px}}@media(max-width:520px){.review-summary{grid-template-columns:1fr}}\n'''
    return s

patch('index.html', homepage)
patch('lp/greenville-cash-offer.html', ppc)
patch('greenville-nc.html', greenville)
patch('analytics.js', analytics)
patch('site.css', css)

# Refresh sitemap dates for files changed by this pass.
p = ROOT/'sitemap.xml'
s = p.read_text()
for url in ['https://kbuyhouses.com/','https://kbuyhouses.com/greenville-nc.html']:
    s = re.sub(r'(<loc>'+re.escape(url)+r'</loc><lastmod>)\d{4}-\d{2}-\d{2}', r'\g<1>2026-10-06', s)
p.write_text(s)
