# Ditrine API

The shared API is the control plane for all five independent websites. It owns staff authorization, platform summaries, worker invitations, and audit events.

Set `DATABASE_URL`, `JWT_SECRET`, and `CORS_ORIGINS` before starting. Apply `db/schema.sql` to the PostgreSQL database used by Retool Database. Never commit the real database URL or JWT secret.

The API expects a bearer JWT with `sub` and `role` claims. In production, issue those tokens from the chosen identity provider after verifying the user; do not mint them from the browser.