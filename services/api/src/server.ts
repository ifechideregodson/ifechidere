import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import helmet from "helmet";
import jwt from "jsonwebtoken";
import pg from "pg";

const { Pool } = pg;
const app = express();
const port = Number(process.env.PORT ?? 10000);
const jwtSecret = process.env.JWT_SECRET;
const databaseUrl = process.env.DATABASE_URL;

if (!jwtSecret) throw new Error("JWT_SECRET is required");
if (!databaseUrl) throw new Error("DATABASE_URL is required");

const pool = new Pool({ connectionString: databaseUrl, ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined });
const origins = (process.env.CORS_ORIGINS ?? "").split(",").map((origin) => origin.trim()).filter(Boolean);

app.use(helmet());
app.use(cors({ origin: origins.length ? origins : true, credentials: true }));
app.use(express.json({ limit: "1mb" }));

type Role = "executive" | "worker" | "user";
type AuthRequest = Request & { actor?: { id: string; role: Role } };

function requireAuth(request: AuthRequest, response: Response, next: NextFunction) {
  const token = request.headers.authorization?.replace("Bearer ", "");
  if (!token) return response.status(401).json({ error: "Authentication required" });
  try {
    const payload = jwt.verify(token, jwtSecret) as { sub: string; role: Role };
    request.actor = { id: payload.sub, role: payload.role };
    return next();
  } catch { return response.status(401).json({ error: "Invalid or expired token" }); }
}

function requireStaff(request: AuthRequest, response: Response, next: NextFunction) {
  if (!request.actor || !["executive", "worker"].includes(request.actor.role)) return response.status(403).json({ error: "Staff access required" });
  return next();
}

function requireExecutive(request: AuthRequest, response: Response, next: NextFunction) {
  if (request.actor?.role !== "executive") return response.status(403).json({ error: "Executive access required" });
  return next();
}

app.get("/health", async (_request, response) => {
  const result = await pool.query("select 1 as healthy");
  response.json({ status: "ok", database: result.rows[0].healthy === 1 });
});

app.get("/v1/summary", requireAuth, requireStaff, async (_request, response) => {
  const result = await pool.query(`select (select count(*) from users where status = 'active')::int as active_users, (select count(*) from orders where status in ('paid','processing','shipped'))::int as open_orders, (select count(*) from moderation_cases where status = 'open')::int as open_reviews, (select count(*) from audit_events where created_at > now() - interval '24 hours')::int as events_today`);
  response.json(result.rows[0]);
});

app.get("/v1/posts", requireAuth, async (request: AuthRequest, response) => {
  const limit = Math.min(Math.max(Number(request.query.limit ?? 20), 1), 50);
  const result = await pool.query("select p.id, p.body, p.media_url, p.visibility, p.created_at, u.display_name, u.avatar_url from posts p join users u on u.id = p.author_id where p.visibility = 'public' or p.author_id = $1 order by p.created_at desc limit $2", [request.actor?.id, limit]);
  response.json(result.rows);
});

app.post("/v1/posts", requireAuth, async (request: AuthRequest, response) => {
  const { body, mediaUrl, visibility = "public" } = request.body as { body?: string; mediaUrl?: string; visibility?: string };
  if (!body?.trim() || body.length > 5000 || !["public", "private"].includes(visibility)) return response.status(400).json({ error: "A post body up to 5000 characters and a valid visibility are required" });
  const result = await pool.query("insert into posts (author_id, body, media_url, visibility) values ($1, $2, $3, $4) returning id, body, media_url, visibility, created_at", [request.actor?.id, body.trim(), mediaUrl ?? null, visibility]);
  await pool.query("insert into audit_events (actor_id, action, entity_type, entity_id) values ($1, 'post.created', 'post', $2)", [request.actor?.id, result.rows[0].id]);
  response.status(201).json(result.rows[0]);
});

app.get("/v1/portfolios/me", requireAuth, async (request: AuthRequest, response) => {
  const result = await pool.query("select p.id, p.title, p.slug, p.bio, p.is_published, p.updated_at, coalesce(json_agg(json_build_object('id', i.id, 'title', i.title, 'description', i.description, 'assetUrl', i.asset_url, 'sortOrder', i.sort_order) order by i.sort_order) filter (where i.id is not null), '[]') as items from portfolios p left join portfolio_items i on i.portfolio_id = p.id where p.owner_id = $1 group by p.id order by p.updated_at desc limit 1", [request.actor?.id]);
  response.json(result.rows[0] ?? null);
});

app.post("/v1/portfolios", requireAuth, async (request: AuthRequest, response) => {
  const { title, slug, bio } = request.body as { title?: string; slug?: string; bio?: string };
  if (!title?.trim() || !slug?.trim()) return response.status(400).json({ error: "title and slug are required" });
  const result = await pool.query("insert into portfolios (owner_id, title, slug, bio) values ($1, $2, $3, $4) returning id, title, slug, bio, is_published, updated_at", [request.actor?.id, title.trim(), slug.trim().toLowerCase(), bio?.trim() ?? null]);
  await pool.query("insert into audit_events (actor_id, action, entity_type, entity_id) values ($1, 'portfolio.created', 'portfolio', $2)", [request.actor?.id, result.rows[0].id]);
  response.status(201).json(result.rows[0]);
});

app.get("/v1/listings", async (request, response) => {
  const limit = Math.min(Math.max(Number(request.query.limit ?? 24), 1), 50);
  const result = await pool.query("select l.id, l.title, l.description, l.listing_type, l.price_cents, l.currency, l.created_at, u.display_name as seller_name from listings l join users u on u.id = l.seller_id where l.status = 'published' order by l.created_at desc limit $1", [limit]);
  response.json(result.rows);
});

app.post("/v1/listings", requireAuth, async (request: AuthRequest, response) => {
  const { title, description, listingType = "goods", priceCents, currency = "USD" } = request.body as { title?: string; description?: string; listingType?: string; priceCents?: number; currency?: string };
  if (!title?.trim() || !description?.trim() || !Number.isInteger(priceCents) || priceCents < 0 || !/^[A-Z]{3}$/.test(currency)) return response.status(400).json({ error: "title, description, integer priceCents, and three-letter currency are required" });
  const result = await pool.query("insert into listings (seller_id, title, description, listing_type, price_cents, currency, status) values ($1, $2, $3, $4, $5, $6, 'published') returning id, title, description, listing_type, price_cents, currency, status, created_at", [request.actor?.id, title.trim(), description.trim(), listingType, priceCents, currency]);
  await pool.query("insert into audit_events (actor_id, action, entity_type, entity_id) values ($1, 'listing.created', 'listing', $2)", [request.actor?.id, result.rows[0].id]);
  response.status(201).json(result.rows[0]);
});

app.post("/v1/orders", requireAuth, async (request: AuthRequest, response) => {
  const { listingId, quantity = 1, shippingAddress } = request.body as { listingId?: string; quantity?: number; shippingAddress?: Record<string, unknown> };
  if (!listingId || !Number.isInteger(quantity) || quantity < 1 || quantity > 100) return response.status(400).json({ error: "listingId and a quantity between 1 and 100 are required" });
  const client = await pool.connect();
  try {
    await client.query("begin");
    const listing = await client.query("select id, seller_id, title, price_cents, currency from listings where id = $1 and status = 'published'", [listingId]);
    if (!listing.rowCount) { await client.query("rollback"); return response.status(404).json({ error: "Published listing not found" }); }
    const item = listing.rows[0];
    const order = await client.query("insert into orders (buyer_id, seller_id, status, total_cents, currency, shipping_address) values ($1, $2, 'pending', $3, $4, $5) returning id, status, total_cents, currency, created_at", [request.actor?.id, item.seller_id, item.price_cents * quantity, item.currency, shippingAddress ?? null]);
    await client.query("insert into order_items (order_id, listing_id, product_name, quantity, unit_price_cents) values ($1, $2, $3, $4, $5)", [order.rows[0].id, item.id, item.title, quantity, item.price_cents]);
    await client.query("insert into audit_events (actor_id, action, entity_type, entity_id, metadata) values ($1, 'order.created', 'order', $2, $3)", [request.actor?.id, order.rows[0].id, JSON.stringify({ listingId, quantity })]);
    await client.query("commit");
    response.status(201).json(order.rows[0]);
  } catch (error) { await client.query("rollback"); throw error; } finally { client.release(); }
});

app.get("/v1/products", async (_request, response) => {
  const result = await pool.query("select id, sku, name, description, price_cents, inventory_count from products where is_active = true and inventory_count > 0 order by created_at desc");
  response.json(result.rows);
});

app.post("/v1/products", requireAuth, requireExecutive, async (request: AuthRequest, response) => {
  const { sku, name, description, priceCents, inventoryCount = 0 } = request.body as { sku?: string; name?: string; description?: string; priceCents?: number; inventoryCount?: number };
  if (!sku?.trim() || !name?.trim() || !description?.trim() || !Number.isInteger(priceCents) || priceCents < 0 || !Number.isInteger(inventoryCount) || inventoryCount < 0) return response.status(400).json({ error: "sku, name, description, integer priceCents, and non-negative inventoryCount are required" });
  const result = await pool.query("insert into products (sku, name, description, price_cents, inventory_count) values ($1, $2, $3, $4, $5) returning id, sku, name, description, price_cents, inventory_count, is_active", [sku.trim(), name.trim(), description.trim(), priceCents, inventoryCount]);
  await pool.query("insert into audit_events (actor_id, action, entity_type, entity_id) values ($1, 'product.created', 'product', $2)", [request.actor?.id, result.rows[0].id]);
  response.status(201).json(result.rows[0]);
});

app.post("/v1/store-orders", requireAuth, async (request: AuthRequest, response) => {
  const { productId, quantity = 1, shippingAddress } = request.body as { productId?: string; quantity?: number; shippingAddress?: Record<string, unknown> };
  if (!productId || !Number.isInteger(quantity) || quantity < 1 || quantity > 100) return response.status(400).json({ error: "productId and a quantity between 1 and 100 are required" });
  const client = await pool.connect();
  try {
    await client.query("begin");
    const product = await client.query("update products set inventory_count = inventory_count - $1 where id = $2 and is_active = true and inventory_count >= $1 returning id, name, price_cents", [quantity, productId]);
    if (!product.rowCount) { await client.query("rollback"); return response.status(409).json({ error: "Product is unavailable or inventory is insufficient" }); }
    const item = product.rows[0];
    const order = await client.query("insert into orders (buyer_id, status, total_cents, currency, shipping_address) values ($1, 'paid', $2, 'USD', $3) returning id, status, total_cents, currency, created_at", [request.actor?.id, item.price_cents * quantity, shippingAddress ?? null]);
    await client.query("insert into order_items (order_id, product_name, quantity, unit_price_cents) values ($1, $2, $3, $4)", [order.rows[0].id, item.name, quantity, item.price_cents]);
    await client.query("insert into shipments (order_id, status) values ($1, 'processing')", [order.rows[0].id]);
    await client.query("insert into audit_events (actor_id, action, entity_type, entity_id, metadata) values ($1, 'store-order.created', 'order', $2, $3)", [request.actor?.id, order.rows[0].id, JSON.stringify({ productId, quantity })]);
    await client.query("commit");
    response.status(201).json(order.rows[0]);
  } catch (error) { await client.query("rollback"); throw error; } finally { client.release(); }
});

app.get("/v1/orders/:orderId/shipment", requireAuth, async (request: AuthRequest, response) => {
  const result = await pool.query("select s.id, s.status, s.carrier, s.tracking_number, s.estimated_delivery, s.shipped_at, s.delivered_at from shipments s join orders o on o.id = s.order_id where s.order_id = $1 and o.buyer_id = $2", [request.params.orderId, request.actor?.id]);
  if (!result.rowCount) return response.status(404).json({ error: "Shipment not found" });
  response.json(result.rows[0]);
});

app.get("/v1/channels", async (_request, response) => {
  const result = await pool.query("select c.id, c.name, c.slug, c.description, c.owner_id, u.display_name as owner_name from channels c join users u on u.id = c.owner_id where c.is_published = true order by c.created_at desc");
  response.json(result.rows);
});

app.post("/v1/channels", requireAuth, async (request: AuthRequest, response) => {
  const { name, slug, description } = request.body as { name?: string; slug?: string; description?: string };
  if (!name?.trim() || !slug?.trim()) return response.status(400).json({ error: "name and slug are required" });
  const result = await pool.query("insert into channels (owner_id, name, slug, description, is_published) values ($1, $2, $3, $4, true) returning id, name, slug, description, is_published", [request.actor?.id, name.trim(), slug.trim().toLowerCase(), description?.trim() ?? null]);
  await pool.query("insert into audit_events (actor_id, action, entity_type, entity_id) values ($1, 'channel.created', 'channel', $2)", [request.actor?.id, result.rows[0].id]);
  response.status(201).json(result.rows[0]);
});

app.get("/v1/videos", async (request, response) => {
  const limit = Math.min(Math.max(Number(request.query.limit ?? 24), 1), 50);
  const result = await pool.query("select v.id, v.title, v.description, v.video_url, v.thumbnail_url, v.duration_seconds, v.published_at, c.name as channel_name, count(distinct vv.id)::int as view_count from videos v join channels c on c.id = v.channel_id left join video_views vv on vv.video_id = v.id where v.status = 'published' and c.is_published = true group by v.id, c.name order by v.published_at desc nulls last limit $1", [limit]);
  response.json(result.rows);
});

app.post("/v1/videos", requireAuth, async (request: AuthRequest, response) => {
  const { channelId, title, description, videoUrl, thumbnailUrl, durationSeconds } = request.body as { channelId?: string; title?: string; description?: string; videoUrl?: string; thumbnailUrl?: string; durationSeconds?: number };
  if (!channelId || !title?.trim() || !videoUrl?.trim() || !/^https?:\/\//.test(videoUrl) || (durationSeconds !== undefined && (!Number.isInteger(durationSeconds) || durationSeconds < 1 || durationSeconds > 600))) return response.status(400).json({ error: "channelId, title, a valid videoUrl, and an optional duration up to 600 seconds are required" });
  const channel = await pool.query("select id from channels where id = $1 and owner_id = $2", [channelId, request.actor?.id]);
  if (!channel.rowCount) return response.status(403).json({ error: "You do not own this channel" });
  const result = await pool.query("insert into videos (channel_id, title, description, video_url, thumbnail_url, duration_seconds, status, published_at) values ($1, $2, $3, $4, $5, $6, 'published', now()) returning id, title, description, video_url, thumbnail_url, duration_seconds, published_at", [channelId, title.trim(), description?.trim() ?? null, videoUrl, thumbnailUrl ?? null, durationSeconds ?? null]);
  await pool.query("insert into audit_events (actor_id, action, entity_type, entity_id) values ($1, 'video.published', 'video', $2)", [request.actor?.id, result.rows[0].id]);
  response.status(201).json(result.rows[0]);
});

app.post("/v1/videos/:videoId/views", async (request, response) => {
  const { viewerId, watchSeconds = 0 } = request.body as { viewerId?: string; watchSeconds?: number };
  if (!Number.isInteger(watchSeconds) || watchSeconds < 0) return response.status(400).json({ error: "watchSeconds must be a non-negative integer" });
  await pool.query("insert into video_views (video_id, viewer_id, watch_seconds) select id, $2, $3 from videos where id = $1 and status = 'published'", [request.params.videoId, viewerId ?? null, watchSeconds]);
  response.status(204).send();
});

app.get("/v1/channels/:channelId/analytics", requireAuth, async (request: AuthRequest, response) => {
  const ownership = await pool.query("select id from channels where id = $1 and owner_id = $2", [request.params.channelId, request.actor?.id]);
  if (!ownership.rowCount) return response.status(403).json({ error: "You do not own this channel" });
  const result = await pool.query("select v.id, v.title, count(vv.id)::int as views, coalesce(sum(vv.watch_seconds), 0)::int as watch_seconds from videos v left join video_views vv on vv.video_id = v.id where v.channel_id = $1 group by v.id order by views desc", [request.params.channelId]);
  response.json(result.rows);
});

app.get("/v1/crypto/assets", async (_request, response) => {
  const result = await pool.query("select id, symbol, name, network from crypto_assets where is_active = true order by symbol");
  response.json(result.rows);
});

app.get("/v1/crypto/trades", requireAuth, async (request: AuthRequest, response) => {
  const result = await pool.query("select t.id, a.symbol, a.name, t.side, t.quantity, t.quote_currency, t.unit_price_cents, t.status, t.provider, t.provider_reference, t.created_at from crypto_trades t join crypto_assets a on a.id = t.asset_id where t.user_id = $1 order by t.created_at desc limit 100", [request.actor?.id]);
  response.json(result.rows);
});

app.post("/v1/crypto/trades", requireAuth, async (request: AuthRequest, response) => {
  const { assetId, side, quantity, quoteCurrency = "USD" } = request.body as { assetId?: string; side?: "buy" | "sell"; quantity?: number; quoteCurrency?: string };
  if (!assetId || !["buy", "sell"].includes(side ?? "") || typeof quantity !== "number" || !Number.isFinite(quantity) || quantity <= 0 || !/^[A-Z]{3}$/.test(quoteCurrency)) return response.status(400).json({ error: "assetId, buy or sell side, positive quantity, and three-letter quote currency are required" });
  const asset = await pool.query("select id from crypto_assets where id = $1 and is_active = true", [assetId]);
  if (!asset.rowCount) return response.status(404).json({ error: "Crypto asset not found" });
  const result = await pool.query("insert into crypto_trades (user_id, asset_id, side, quantity, quote_currency, unit_price_cents, status, provider) values ($1, $2, $3, $4, $5, 0, 'pending', 'unconfigured') returning id, asset_id, side, quantity, quote_currency, status, created_at", [request.actor?.id, assetId, side, quantity, quoteCurrency]);
  await pool.query("insert into audit_events (actor_id, action, entity_type, entity_id, metadata) values ($1, 'crypto-trade.requested', 'crypto_trade', $2, $3)", [request.actor?.id, result.rows[0].id, JSON.stringify({ assetId, side, quantity, quoteCurrency })]);
  response.status(201).json({ ...result.rows[0], message: "Trade intent recorded; connect a regulated exchange provider before execution." });
});

app.get("/v1/workers", requireAuth, requireStaff, async (_request, response) => {
  const result = await pool.query("select id, display_name, email, role, status, last_seen_at from users where role in ('executive', 'worker') order by display_name");
  response.json(result.rows);
});

app.post("/v1/workers", requireAuth, requireExecutive, async (request: AuthRequest, response) => {
  const { displayName, email, role = "worker" } = request.body as { displayName?: string; email?: string; role?: Role };
  if (!displayName || !email || !["worker", "executive"].includes(role)) return response.status(400).json({ error: "displayName, email, and a valid staff role are required" });
  const result = await pool.query("insert into users (display_name, email, role, status) values ($1, $2, $3, 'invited') returning id, display_name, email, role, status", [displayName, email, role]);
  await pool.query("insert into audit_events (actor_id, action, entity_type, entity_id, metadata) values ($1, 'worker.invited', 'user', $2, $3)", [request.actor?.id, result.rows[0].id, JSON.stringify({ email, role })]);
  response.status(201).json(result.rows[0]);
});

app.get("/v1/audit-events", requireAuth, requireStaff, async (_request, response) => {
  const result = await pool.query("select id, action, entity_type, entity_id, metadata, created_at from audit_events order by created_at desc limit 100");
  response.json(result.rows);
});

app.get("/v1/admin/users", requireAuth, requireStaff, async (_request, response) => {
  const result = await pool.query("select id, display_name, email, role, status, created_at, last_seen_at from users order by created_at desc limit 250");
  response.json(result.rows);
});

app.patch("/v1/admin/users/:userId", requireAuth, requireExecutive, async (request: AuthRequest, response) => {
  const { role, status } = request.body as { role?: Role; status?: "invited" | "active" | "suspended" | "deleted" };
  if ((role && !["user", "worker", "executive"].includes(role)) || (status && !["invited", "active", "suspended", "deleted"].includes(status))) return response.status(400).json({ error: "Invalid role or status" });
  const result = await pool.query("update users set role = coalesce($1, role), status = coalesce($2, status), updated_at = now() where id = $3 returning id, display_name, email, role, status", [role ?? null, status ?? null, request.params.userId]);
  if (!result.rowCount) return response.status(404).json({ error: "User not found" });
  await pool.query("insert into audit_events (actor_id, action, entity_type, entity_id, metadata) values ($1, 'user.updated', 'user', $2, $3)", [request.actor?.id, request.params.userId, JSON.stringify({ role, status })]);
  response.json(result.rows[0]);
});

app.get("/v1/admin/orders", requireAuth, requireStaff, async (_request, response) => {
  const result = await pool.query("select o.id, o.status, o.total_cents, o.currency, o.created_at, u.display_name as buyer_name, s.status as shipment_status, s.tracking_number from orders o join users u on u.id = o.buyer_id left join shipments s on s.order_id = o.id order by o.created_at desc limit 250");
  response.json(result.rows);
});

app.patch("/v1/admin/orders/:orderId", requireAuth, requireStaff, async (request: AuthRequest, response) => {
  const { status, shipmentStatus, trackingNumber, carrier } = request.body as { status?: string; shipmentStatus?: string; trackingNumber?: string; carrier?: string };
  const allowedStatuses = ["pending", "paid", "processing", "shipped", "delivered", "cancelled", "refunded"];
  if (status && !allowedStatuses.includes(status)) return response.status(400).json({ error: "Invalid order status" });
  const order = await pool.query("update orders set status = coalesce($1, status), updated_at = now() where id = $2 returning id, status", [status ?? null, request.params.orderId]);
  if (!order.rowCount) return response.status(404).json({ error: "Order not found" });
  await pool.query("update shipments set status = coalesce($1, status), tracking_number = coalesce($2, tracking_number), carrier = coalesce($3, carrier), shipped_at = case when $1 = 'shipped' then coalesce(shipped_at, now()) else shipped_at end, updated_at = now() where order_id = $4", [shipmentStatus ?? null, trackingNumber ?? null, carrier ?? null, request.params.orderId]);
  await pool.query("insert into audit_events (actor_id, action, entity_type, entity_id, metadata) values ($1, 'order.updated', 'order', $2, $3)", [request.actor?.id, request.params.orderId, JSON.stringify({ status, shipmentStatus, trackingNumber, carrier })]);
  response.json(order.rows[0]);
});

app.get("/v1/admin/moderation", requireAuth, requireStaff, async (_request, response) => {
  const result = await pool.query("select id, subject_type, subject_id, reason, status, assigned_to, created_at, resolved_at from moderation_cases order by created_at desc limit 250");
  response.json(result.rows);
});

app.patch("/v1/admin/moderation/:caseId", requireAuth, requireStaff, async (request: AuthRequest, response) => {
  const { status, resolution } = request.body as { status?: string; resolution?: string };
  if (status && !["open", "reviewing", "resolved", "dismissed"].includes(status)) return response.status(400).json({ error: "Invalid moderation status" });
  const result = await pool.query("update moderation_cases set status = coalesce($1, status), resolution = coalesce($2, resolution), assigned_to = coalesce(assigned_to, $3), resolved_at = case when $1 in ('resolved', 'dismissed') then coalesce(resolved_at, now()) else resolved_at end where id = $4 returning id, status, resolution, assigned_to, resolved_at", [status ?? null, resolution ?? null, request.actor?.id, request.params.caseId]);
  if (!result.rowCount) return response.status(404).json({ error: "Moderation case not found" });
  await pool.query("insert into audit_events (actor_id, action, entity_type, entity_id, metadata) values ($1, 'moderation.updated', 'moderation_case', $2, $3)", [request.actor?.id, request.params.caseId, JSON.stringify({ status, resolution })]);
  response.json(result.rows[0]);
});

app.use((error: Error, _request: Request, response: Response, _next: NextFunction) => { console.error(error); response.status(500).json({ error: "Internal server error" }); });
app.listen(port, () => console.log(`Ditrine API listening on ${port}`));