# External providers

## Stripe payments

Set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` on the API service. Configure a Stripe webhook endpoint at:

```text
https://YOUR_API_DOMAIN/v1/payments/stripe-webhook
```

Subscribe to `checkout.session.completed`. Market and Supply create an order first, then request a Checkout Session at `POST /v1/orders/:orderId/checkout`. The order remains pending until Stripe confirms payment through the signed webhook.

Do not put Stripe secret keys in any `NEXT_PUBLIC_*` variable or commit them to `.env.example`.

## Remaining providers

Portfolio assets and videos currently accept URLs from external storage. Before launch, add a signed-upload provider such as S3/R2/Cloudinary and a video pipeline such as Mux/Cloudflare Stream. Crypto trade requests are persisted as pending intents and require a regulated exchange/custody integration before execution.