# Retool Database setup

The database definition is in [schema.sql](schema.sql). Open your Retool Database resource, create a SQL query, paste the full schema, and run it once. The API connects through `DATABASE_URL`; keep that value in Render secret environment variables and never commit it.

The schema covers:

- users, organizations, roles, and organization membership
- portfolios, portfolio items, and professional updates
- marketplace listings, orders, order items, and company products
- video channels and uploaded videos
- moderation cases and an immutable-style audit event stream

Retool Database access is not available to this coding session, so the SQL is prepared for you to execute in your Retool workspace. After it runs, create an executive user through your identity provider and issue a JWT with `sub` and `role: "executive"` for Control.