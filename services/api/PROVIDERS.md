# External providers

## Stripe payments

Set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` on the API service. Configure a Stripe webhook endpoint at:

```text
https://YOUR_API_DOMAIN/v1/payments/stripe-webhook
```

Subscribe to `checkout.session.completed`. Market and Supply create an order first, then request a Checkout Session at `POST /v1/orders/:orderId/checkout`. The order remains pending until Stripe confirms payment through the signed webhook.

Do not put Stripe secret keys in any `NEXT_PUBLIC_*` variable or commit them to `.env.example`.

## Remaining providers

OIDC authentication, Mux uploads, Coinbase Advanced Trade execution, and Resend invitations are now wired through the API. Configure their variables from `.env.example` and verify each provider's webhook, API scope, allowed origin, and production account before enabling real traffic.

Portfolio files use the S3-compatible signed-upload flow documented in [MEDIA.md](MEDIA.md). Mux direct uploads return an upload URL through `POST /v1/videos/upload-url`; a production webhook should be added to update the corresponding video asset/playback ID after Mux finishes processing.