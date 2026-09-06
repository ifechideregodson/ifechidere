# Ditrine multi-site workspace

Ditrine is organized as five separate Next.js applications. They share a brand direction, but each app owns its own page, styles, package manifest, and runtime.

| Website | Folder | Local URL |
| --- | --- | --- |
| Pulse | `apps/pulse` | http://localhost:3001 |
| Market | `apps/market` | http://localhost:3002 |
| Supply | `apps/supply` | http://localhost:3003 |
| Stream | `apps/stream` | http://localhost:3004 |
| Control | `apps/control` | http://localhost:3005 |

## Development

Install all workspace dependencies from the repository root:

```bash
npm install
```

Run one website:

```bash
npm run dev:pulse
npm run dev:market
npm run dev:supply
npm run dev:stream
npm run dev:control
```

Build or lint every website with `npm run build` or `npm run lint`.

The navigation inside each website points to the other applications by URL. They are independent deployables, not route pages inside a single Next.js app.

## Render deployment

Create a new Render Blueprint from this repository and select `render.yaml`. It creates five independent web services plus `ditrine-api`. Render will ask for `DATABASE_URL`, `CORS_ORIGINS`, and the public site URL variables. Set each URL to its final `https://...onrender.com` address after the services are created.

Before deploying the API, run `db/schema.sql` in Retool Database and use the resulting connection string as `DATABASE_URL`. The API requires a real identity provider to mint JWTs; the Control console accepts a verified token in the `ditrine_access_token` browser storage key for the current integration.

The current foundation includes the production boundaries, schema, service separation, RBAC checks, audit logging, and deployment configuration. Payment processing, crypto custody, media transcoding/storage, email delivery, and identity-provider wiring still require provider credentials and business policy decisions before launch.
