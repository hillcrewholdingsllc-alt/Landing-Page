# Kbuyhouses Lead Relay

Cloudflare Worker relay for first-party seller leads.

Flow: `Kbuyhouses.com -> Cloudflare Worker -> n8n -> Notion CRM`.

Endpoints:
- `POST /lead` accepts HTML form or JSON submissions.
- `GET /health` returns a health response.

The Worker normalizes the request, forwards JSON to the existing production n8n website lead webhook, retries one 5xx response, and redirects successful submissions to `https://kbuyhouses.com/thank-you.html`.

No credentials are stored in this repository. The n8n webhook is currently unauthenticated by design; if webhook authentication is added later, store the relay credential as a Cloudflare Worker secret rather than in source control.
