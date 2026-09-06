# External providers

## Stripe payments

Set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` on the API service. Configure a Stripe webhook endpoint at:

```text
https://YOUR_API_DOMAIN/v1/payments/stripe-webhook
```

Subscribe to `checkout.session.completed`. Market and Supply create an order first, then request a Checkout Session at `POST /v1/orders/:orderId/checkout`. The order remains pending until Stripe confirms payment through the signed webhook.

Do not put Stripe secret keys in any `NEXT_PUBLIC_*` variable or commit them to `.env.example`.

## Paystack and Flutterwave

Set `PAYMENT_PROVIDER=paystack` or `PAYMENT_PROVIDER=flutterwave` to select the checkout provider. Configure the matching secret in `.env.example` and register the matching webhook URL:

```text
https://YOUR_API_DOMAIN/v1/payments/paystack-webhook
https://YOUR_API_DOMAIN/v1/payments/flutterwave-webhook
```

Use the currency supported by the selected provider. Paystack uses the `x-paystack-signature` HMAC header; Flutterwave uses the configured `verif-hash` header.

## Cloudinary

Cloudinary replaces the S3 media path when configured. Call `POST /v1/uploads/cloudinary-signature`, upload directly to the returned Cloudinary URL, and store the returned `secure_url` with the portfolio or video record.

## Remaining providers

OIDC authentication, Mux uploads, Coinbase Advanced Trade execution, and Resend invitations are now wired through the API. Configure their variables from `.env.example` and verify each provider's webhook, API scope, allowed origin, and production account before enabling real traffic.

Portfolio files use the S3-compatible signed-upload flow documented in [MEDIA.md](MEDIA.md). Mux direct uploads return an upload URL through `POST /v1/videos/upload-url`; a production webhook should be added to update the corresponding video asset/playback ID after Mux finishes processing.