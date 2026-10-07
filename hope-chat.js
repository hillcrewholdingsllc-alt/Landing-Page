(function () {
  'use strict';
  const AGENT_ID = 'agent_8901m4acsy3qff1r1wc1ekks8dqb';
  const CHAT_START_WEBHOOK = 'https://n8n.hcautomations.fyi/webhook/2c8186ba-5e9c-4919-a930-d4ae19e06427/krei-website-chat-start';
  const QUICK_REPLIES = ['How fast can you buy?','Do I need to make repairs?','What fees do I pay?','I want a cash offer.'];
  const clean = (v, max) => typeof v === 'string' ? v.trim().slice(0, max) : '';
  const track = (name, params) => {
    if (typeof window.kreiTrack === 'function') window.kreiTrack(name, params || {});
  };

  function enhanceHomepage(form) {
    if (location.pathname !== '/') return;

    const offer = document.getElementById('get-offer');
    const reviews = document.querySelector('.gbp-proof-home');
    if (offer && reviews && reviews.nextElementSibling !== offer) reviews.after(offer);

    const heroActions = document.querySelector('.home-hero .actions');
    if (heroActions && !document.getElementById('krei-hero-offer')) {
      const heroOffer = document.createElement('form');
      heroOffer.id = 'krei-hero-offer';
      heroOffer.className = 'krei-hero-offer';
      heroOffer.setAttribute('aria-label', 'Start your cash offer request');
      heroOffer.innerHTML = '<label for="krei-hero-address">Start with the property address</label><div class="krei-hero-offer-row"><input id="krei-hero-address" name="heroPropertyAddress" autocomplete="street-address" placeholder="Property address" required><button type="submit">Start My Cash Offer</button></div><small>No obligation. We just need the property to get started.</small>';
      heroActions.after(heroOffer);
      heroOffer.addEventListener('submit', e => {
        e.preventDefault();
        const source = heroOffer.elements.namedItem('heroPropertyAddress');
        const target = form.elements.namedItem('propertyAddress');
        const value = clean(source && source.value, 500);
        if (!value || !target) return;
        target.value = value;
        target.dispatchEvent(new Event('input', {bubbles:true}));
        track('hero_address_start', {form_name:'seller_lead', cta_location:'hero'});
        if (offer) offer.scrollIntoView({behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block:'start'});
        const next = form.elements.namedItem('firstName') || form.querySelector('input[required]');
        if (next && typeof next.focus === 'function') setTimeout(() => next.focus({preventScroll:true}), 350);
      });
    }

    const formCard = form.closest('.formcard');
    if (formCard && !document.getElementById('krei-next-steps')) {
      const steps = document.createElement('div');
      steps.id = 'krei-next-steps';
      steps.className = 'krei-next-steps';
      steps.innerHTML = '<strong>What happens next?</strong><ol><li>Send us the property</li><li>We review the details</li><li>We contact you directly about next steps</li></ol>';
      formCard.insertBefore(steps, form);
    }

    const submit = form.querySelector('#lead-submit');
    if (submit && !document.getElementById('krei-submit-reassurance')) {
      const reassurance = document.createElement('p');
      reassurance.id = 'krei-submit-reassurance';
      reassurance.className = 'krei-submit-reassurance';
      reassurance.textContent = 'No obligation. Sell as-is. No agent commission to us.';
      submit.insertAdjacentElement('afterend', reassurance);
    }
  }

  function init() {
    if (document.getElementById('hope-chat-panel')) return;
    const form = document.querySelector('#lead-form');
    if (!form) return;

    enhanceHomepage(form);

    const isPpc = location.pathname.startsWith('/lp/');
    const launcher = document.createElement('button');
    launcher.type = 'button';
    launcher.className = isPpc ? 'hope-chat-launcher hope-chat-secondary' : 'hope-chat-launcher';
    launcher.textContent = 'Questions? Chat with Hope';
    launcher.setAttribute('aria-controls', 'hope-chat-panel');
    launcher.setAttribute('aria-expanded', 'false');
    const panel = document.createElement('section');
    panel.id = 'hope-chat-panel';
    panel.hidden = true;
    panel.setAttribute('aria-label', 'Chat with Hope, our AI assistant');
    const head = document.createElement('div');
    head.className = 'hope-chat-heading';
    const title = document.createElement('strong');
    title.textContent = 'Hope · AI website assistant';
    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = 'Close';
    close.setAttribute('aria-label', 'Close chat');
    head.append(title, close);
    const disclosure = document.createElement('p');
    disclosure.className = 'hope-chat-disclosure';
    disclosure.append('Chat is processed and stored by ElevenLabs and service providers. Avoid sensitive information. ');
    const privacy = document.createElement('a');
    privacy.href = '/privacy-policy.html';
    privacy.textContent = 'Privacy Policy';
    disclosure.append(privacy);
    const consent = document.createElement('button');
    consent.type = 'button';
    consent.className = 'hope-chat-consent';
    consent.textContent = 'Start text chat';
    const status = document.createElement('p');
    status.className = 'hope-chat-status';
    status.setAttribute('role', 'status');
    const quickReplies = document.createElement('div');
    quickReplies.className = 'hope-chat-quick-replies';
    quickReplies.hidden = true;
    quickReplies.setAttribute('aria-label', 'Common questions');
    const host = document.createElement('div');
    host.className = 'hope-chat-host';
    panel.append(head, disclosure, consent, status, quickReplies, host);
    document.body.append(panel);
    if (isPpc) form.parentElement.append(launcher);
    else document.body.append(launcher);

    function hide() {
      panel.hidden = true;
      launcher.setAttribute('aria-expanded', 'false');
      launcher.focus();
    }
    close.addEventListener('click', hide);
    panel.addEventListener('keydown', e => { if (e.key === 'Escape') hide(); });

    let launcherTracked = false;
    launcher.addEventListener('click', () => {
      panel.hidden = false;
      launcher.setAttribute('aria-expanded', 'true');
      if (!launcherTracked) {
        launcherTracked = true;
        track('chat_launcher_open', {chat_agent:'hope'});
      }
      close.focus();
    });

    document.addEventListener('click', e => {
      const a = e.target.closest && e.target.closest('.mobile-sticky-cta .sticky-offer');
      if (!a) return;
      const href = a.getAttribute('href') || '';
      if (href === '#lead-form') {
        track('cta_click', {cta_text:'Get Cash Offer', cta_target:'lead_form', cta_location:'mobile_sticky'});
      }
    }, {passive:true});

    let prepared = false;
    function prepareOfferRequest(args) {
      args = args || {};
      const firstPreparation = !prepared;
      // The client tool never submits a form, starts outreach, or changes attribution.
      for (const [key, limit] of Object.entries({firstName:120, phone:60, propertyAddress:500, email:320})) {
        const field = form.elements.namedItem(key);
        const value = clean(args[key], limit);
        if (field && !field.value.trim() && value) {
          field.value = value;
          field.dispatchEvent(new Event('input', {bubbles:true}));
        }
      }
      const notes = form.elements.namedItem('notes');
      const summary = clean(args.summary, 1200);
      if (notes && summary && firstPreparation) {
        const existing = notes.value.trim();
        const addition = 'Website chat with Hope (visitor to review): ' + summary;
        // Preserve the visitor's original notes and fit the relay's existing 2,000-character limit.
        if (existing.length + addition.length + 2 <= 2000) notes.value = [existing, addition].filter(Boolean).join('\n\n');
      }
      prepared = true;
      if (firstPreparation) {
        track('chat_offer_prepared', {chat_agent:'hope', form_name:'seller_lead'});
        try {
          sessionStorage.setItem('krei_chat_offer_prepared', '1');
          const submission = form.elements.namedItem('submissionId');
          if (submission && submission.value) sessionStorage.setItem('krei_chat_offer_submission_id', submission.value);
        } catch (_) {}
      }
      const details = form.querySelector('details');
      if (details) details.open = true;
      let notice = document.getElementById('hope-form-review');
      if (!notice) {
        notice = document.createElement('p');
        notice.id = 'hope-form-review';
        notice.className = 'hope-form-review';
        notice.setAttribute('role', 'status');
        form.prepend(notice);
      }
      notice.textContent = 'Please review your details. Nothing has been sent yet. Submit this form to ask K Real Estate to contact you about this property.';
      panel.hidden = true;
      launcher.setAttribute('aria-expanded', 'false');
      form.scrollIntoView({behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block:'center'});
      const field = form.querySelector('input[required]');
      if (field) field.focus({preventScroll:true});
      return JSON.stringify({status:'review_required', submitted:false, message:'Form is ready for visitor review. The visitor must submit it. No contact request or appointment has been created.'});
    }

    let chatStarted = false;
    let chatStartNotified = false;
    function notifyChatStarted() {
      if (chatStartNotified) return;
      chatStartNotified = true;
      const body = {
        event:'chat_started',
        pagePath:location.pathname,
        pageUrl:location.origin + location.pathname,
        attribution:String(window.KREI_ATTRIBUTION_CHANNEL || 'direct_or_legacy'),
        startedAt:new Date().toISOString()
      };
      fetch(CHAT_START_WEBHOOK, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        credentials:'omit',
        keepalive:true,
        body:JSON.stringify(body)
      }).catch(() => {});
    }

    consent.addEventListener('click', async () => {
      consent.disabled = true;
      status.textContent = 'Loading chat…';
      try {
        if (!customElements.get('elevenlabs-convai')) {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/@elevenlabs/convai-widget-embed';
            script.async = true;
            const timeout = setTimeout(() => reject(new Error('Chat load timeout')), 15000);
            script.onload = () => { clearTimeout(timeout); resolve(); };
            script.onerror = () => { clearTimeout(timeout); reject(new Error('Chat unavailable')); };
            document.head.append(script);
          });
        }
        if (!customElements.get('elevenlabs-convai')) throw new Error('Chat unavailable');
        const widget = document.createElement('elevenlabs-convai');
        widget.setAttribute('agent-id', AGENT_ID);
        widget.setAttribute('variant', 'expanded');
        widget.setAttribute('dismissible', 'false');
        widget.setAttribute('allow-events', 'true');
        widget.setAttribute('markdown-link-allowed-hosts', 'kbuyhouses.com');
        widget.setAttribute('markdown-link-allow-http', 'false');
        widget.addEventListener('elevenlabs-convai:call', event => {
          event.detail.config.clientTools = {prepare_offer_request: prepareOfferRequest};
        });
        host.replaceChildren(widget);
        quickReplies.replaceChildren();
        QUICK_REPLIES.forEach(text => {
          const button = document.createElement('button');
          button.type = 'button';
          button.textContent = text;
          button.addEventListener('click', () => {
            track('chat_quick_reply', {chat_agent:'hope', quick_reply:text});
            widget.dispatchEvent(new CustomEvent('elevenlabs-agent:user-message', {detail:{message:text}}));
            quickReplies.hidden = true;
          });
          quickReplies.append(button);
        });
        quickReplies.hidden = false;
        consent.hidden = true;
        status.textContent = '';
        if (!chatStarted) {
          chatStarted = true;
          track('chat_started', {chat_agent:'hope'});
          notifyChatStarted();
        }
      } catch (_) {
        consent.disabled = false;
        consent.textContent = 'Try chat again';
        status.textContent = 'Chat is unavailable. You can still use the property request form or call the number on this page.';
      }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();
