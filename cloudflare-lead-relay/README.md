# Kbuyhouses Lead Relay

Production flow: website → Cloudflare D1 queue → n8n dispatcher → website intake → Notion CRM.

## Routes

- `POST /lead`: normalize and persist a submission; redirect to thank-you. Eligible submissions receive a one-time conversion receipt in the URL fragment.
- `GET /health`: queue health.
- `GET /next`: claim the next queue item.
- `POST /ack`: settle an item.
- `POST /fail`: release/review a failed item.
- `POST /conversion-receipt`: redeem a valid receipt once. Only the website origin is allowed; token possession is required. No personal information is returned.

Queue-management routes retain the deployed n8n IP restriction. No credentials are stored here. The existing D1 binding is declared in wrangler.jsonc; no schema migration is required.

## Conversion meaning

A lead conversion means an eligible submission was durably queued, not that every CRM action completed. Explicit test flags and the inspected spam checks are excluded. Receipt redemption is atomic. The frontend strips receipt tokens before loading analytics, verifies the receipt, and sends the server-generated conversion ID to Ads/Meta. Direct visits and refreshes do not emit leads.

One-time redemption favors avoiding duplicates. Closing the page, tracking blockers, or losing the response after redemption can undercount. Legacy queued leads have no receipt and are not retroactively counted.

## Release and test

Run `npm test` for offline mocked contract tests; these do not submit production leads or send outreach. Deploy this worker before the updated thank-you page. Preserve the D1 binding, compatibility settings, and existing queue. The repository previously contained a direct-forwarding relay that did not match the deployed queue; this source is based on the inspected deployment.
