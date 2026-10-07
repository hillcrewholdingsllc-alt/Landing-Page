(function () {
  'use strict';
  const AGENT_ID = 'agent_8901m4acsy3qff1r1wc1ekks8dqb';
  const clean = (v, max) => typeof v === 'string' ? v.trim().slice(0, max) : '';
  function init() {
    if (document.getElementById('hope-chat-panel')) return;
    const form = document.querySelector('#lead-form');
    if (!form) return;
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
    const host = document.createElement('div');
    host.className = 'hope-chat-host';
    panel.append(head, disclosure, consent, status, host);
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
    launcher.addEventListener('click', () => {
      panel.hidden = false;
      launcher.setAttribute('aria-expanded', 'true');
      close.focus();
    });
    let prepared = false;
    function prepareOfferRequest(args) {
      args = args || {};
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
      if (notes && summary && !prepared) {
        const existing = notes.value.trim();
        const addition = 'Website chat with Hope (visitor to review): ' + summary;
        // Preserve the visitor's original notes and fit the relay's existing 2,000-character limit.
        if (existing.length + addition.length + 2 <= 2000) notes.value = [existing, addition].filter(Boolean).join('\n\n');
      }
      prepared = true;
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
        widget.setAttribute('markdown-link-allowed-hosts', 'kbuyhouses.com');
        widget.setAttribute('markdown-link-allow-http', 'false');
        widget.addEventListener('elevenlabs-convai:call', event => {
          event.detail.config.clientTools = {prepare_offer_request: prepareOfferRequest};
        });
        host.replaceChildren(widget);
        consent.hidden = true;
        status.textContent = '';
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
