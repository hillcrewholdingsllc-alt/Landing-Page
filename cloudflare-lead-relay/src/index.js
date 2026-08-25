const N8N_WEBHOOK = 'https://n8n.hcautomations.fyi/webhook/7f671b06-1d6d-479f-8109-e12541982ce0/website-lead';
const THANK_YOU_URL = 'https://kbuyhouses.com/thank-you.html';
const HOME_URL = 'https://kbuyhouses.com/#get-offer';
const MAX_BODY_BYTES = 64 * 1024;
const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const ALLOWED_PAGE_HOSTS = new Set(['kbuyhouses.com', 'www.kbuyhouses.com']);

function text(value, max = 2000) {
  return String(value ?? '').trim().slice(0, max);
}

function jsonResponse(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...extraHeaders,
    },
  });
}

async function parsePayload(request) {
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > MAX_BODY_BYTES) throw new Error('PAYLOAD_TOO_LARGE');

  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return await request.json();

  if (
    contentType.includes('multipart/form-data') ||
    contentType.includes('application/x-www-form-urlencoded')
  ) {
    const form = await request.formData();
    const payload = {};
    for (const [key, value] of form.entries()) {
      if (typeof value === 'string') payload[key] = value;
    }
    return payload;
  }

  throw new Error('UNSUPPORTED_CONTENT_TYPE');
}

function normalizePayload(raw, request) {
  const payload = {
    firstName: text(raw.firstName, 120),
    lastName: text(raw.lastName, 120),
    phone: text(raw.phone, 60),
    email: text(raw.email, 320),
    propertyAddress: text(raw.propertyAddress || raw.address, 500),
    sellerSituation: text(raw.sellerSituation || raw.situation, 500),
    notes: text(raw.notes, 2000),
    source: text(raw.source || 'Website', 80),
    pageUrl: text(raw.pageUrl || 'https://kbuyhouses.com/', 1000),
    landingPage: text(raw.landingPage || '/', 500),
    referrer: text(raw.referrer, 1000),
    utmSource: text(raw.utmSource || raw.utm_source, 300),
    utmMedium: text(raw.utmMedium || raw.utm_medium, 300),
    utmCampaign: text(raw.utmCampaign || raw.utm_campaign, 500),
    utmTerm: text(raw.utmTerm || raw.utm_term, 500),
    utmContent: text(raw.utmContent || raw.utm_content, 500),
    gclid: text(raw.gclid, 1000),
    gbraid: text(raw.gbraid, 1000),
    wbraid: text(raw.wbraid, 1000),
    fbclid: text(raw.fbclid, 1000),
    formStartedAt: text(raw.formStartedAt, 100),
    submittedAt: new Date().toISOString(),
    submissionId: text(raw.submissionId, 150) || crypto.randomUUID(),
    website: text(raw.website, 200),
  };

  if (!payload.firstName || !payload.phone || !payload.propertyAddress) {
    throw new Error('MISSING_REQUIRED_FIELDS');
  }

  const digits = payload.phone.replace(/\D/g, '');
  if (!(digits.length === 10 || (digits.length === 11 && digits.startsWith('1')))) {
    throw new Error('INVALID_PHONE');
  }

  if (payload.website) throw new Error('SPAM_HONEYPOT');

  const startedMs = Date.parse(payload.formStartedAt);
  if (!payload.formStartedAt || !Number.isFinite(startedMs)) {
    throw new Error('SPAM_TIMING_MISSING');
  }
  const formAgeMs = Date.now() - startedMs;
  if (formAgeMs < 1800 || formAgeMs > 2 * 60 * 60 * 1000) {
    throw new Error('SPAM_TIMING_INVALID');
  }

  try {
    const host = new URL(payload.pageUrl).hostname.toLowerCase();
    if (!ALLOWED_PAGE_HOSTS.has(host)) throw new Error('SPAM_PAGE_ORIGIN');
  } catch (error) {
    if (error instanceof Error && error.message === 'SPAM_PAGE_ORIGIN') throw error;
    throw new Error('SPAM_PAGE_ORIGIN');
  }

  payload.relay = 'cloudflare-worker';
  payload.relayRequestId = crypto.randomUUID();
  payload.userAgent = text(request.headers.get('user-agent'), 500);
  payload.cfRay = text(request.headers.get('cf-ray'), 100);

  return payload;
}

async function verifyTurnstile(raw, request, env) {
  const secret = text(env?.TURNSTILE_SECRET_KEY, 500);
  const siteKey = text(env?.TURNSTILE_SITE_KEY, 500);
  if (!secret || !siteKey) return { enabled: false, success: true };

  const token = text(raw['cf-turnstile-response'], 4096);
  if (!token) return { enabled: true, success: false, reason: 'missing-token' };

  const form = new FormData();
  form.append('secret', secret);
  form.append('response', token);
  const remoteIp = text(request.headers.get('cf-connecting-ip'), 100);
  if (remoteIp) form.append('remoteip', remoteIp);
  form.append('idempotency_key', crypto.randomUUID());

  const response = await fetch(TURNSTILE_VERIFY_URL, { method: 'POST', body: form });
  if (!response.ok) {
    return { enabled: true, success: false, reason: 'verify-http-' + response.status };
  }

  const result = await response.json();
  return {
    enabled: true,
    success: result.success === true,
    reason: result.success === true
      ? ''
      : (Array.isArray(result['error-codes']) ? result['error-codes'].join(',') : 'verification-failed'),
  };
}

async function forwardToN8n(payload) {
  const send = () => fetch(N8N_WEBHOOK, {
    method: 'POST',
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'accept': 'application/json',
      'x-krei-relay': 'cloudflare-worker',
    },
    body: JSON.stringify(payload),
    redirect: 'manual',
  });

  let response = await send();
  if (response.status >= 500) response = await send();
  return response;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'GET' && url.pathname === '/health') {
      return jsonResponse({
        ok: true,
        service: 'kbuyhouses-lead-relay',
        turnstileEnabled: Boolean(env?.TURNSTILE_SECRET_KEY && env?.TURNSTILE_SITE_KEY),
      });
    }

    if (request.method === 'GET' && url.pathname === '/turnstile-config') {
      const siteKey = text(env?.TURNSTILE_SITE_KEY, 500);
      const enabled = Boolean(siteKey && env?.TURNSTILE_SECRET_KEY);
      return jsonResponse({ enabled, siteKey: enabled ? siteKey : '' }, 200, {
        'access-control-allow-origin': 'https://kbuyhouses.com',
        'vary': 'Origin',
      });
    }

    if (request.method !== 'POST' || url.pathname !== '/lead') {
      return new Response('Not Found', { status: 404 });
    }

    try {
      const raw = await parsePayload(request);
      const turnstile = await verifyTurnstile(raw, request, env);

      if (!turnstile.success) {
        console.warn(JSON.stringify({
          event: 'turnstile_rejected',
          reason: turnstile.reason,
          cfRay: text(request.headers.get('cf-ray'), 100),
        }));
        return Response.redirect(`${HOME_URL}&error=verification`, 303);
      }

      const payload = normalizePayload(raw, request);
      payload.turnstileVerified = turnstile.enabled === true;
      const upstream = await forwardToN8n(payload);

      if (upstream.status >= 200 && upstream.status < 400) {
        console.log(JSON.stringify({
          event: 'lead_forwarded',
          submissionId: payload.submissionId,
          upstreamStatus: upstream.status,
          turnstileVerified: payload.turnstileVerified,
        }));
        return Response.redirect(THANK_YOU_URL, 303);
      }

      console.error(JSON.stringify({
        event: 'n8n_rejected',
        submissionId: payload.submissionId,
        upstreamStatus: upstream.status,
      }));
      return Response.redirect(`${HOME_URL}&error=submission`, 303);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
      console.error(JSON.stringify({ event: 'lead_relay_error', message }));

      if (message === 'PAYLOAD_TOO_LARGE') return jsonResponse({ ok: false, error: message }, 413);
      if (message === 'UNSUPPORTED_CONTENT_TYPE') return jsonResponse({ ok: false, error: message }, 415);
      if (['MISSING_REQUIRED_FIELDS', 'INVALID_PHONE'].includes(message)) {
        return Response.redirect(`${HOME_URL}&error=validation`, 303);
      }
      if (message.startsWith('SPAM_')) return Response.redirect(THANK_YOU_URL, 303);
      return Response.redirect(`${HOME_URL}&error=submission`, 303);
    }
  },
};
