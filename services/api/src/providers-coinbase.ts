import crypto from "node:crypto";
import { SignJWT } from "jose";

const keyName = process.env.COINBASE_API_KEY_NAME;
const privateKey = process.env.COINBASE_API_PRIVATE_KEY?.replace(/\\n/g, "\n");

export function coinbaseProviderStatus() { return { provider: keyName && privateKey ? "coinbase-advanced-trade" : "unconfigured" }; }

async function createToken(method: string, path: string) {
  if (!keyName || !privateKey) throw new Error("Coinbase is not configured");
  const key = crypto.createPrivateKey(privateKey);
  return new SignJWT({}).setProtectedHeader({ alg: "ES256", kid: keyName, nonce: crypto.randomUUID() }).setIssuer("cdp").setSubject(keyName).setAudience(["retail_rest_api"]).setExpirationTime("2m").setIssuedAt().setClaim("uri", `${method} api.coinbase.com${path}`).sign(key);
}

export async function createCoinbaseMarketOrder(input: { symbol: string; side: "buy" | "sell"; quantity: number; quoteCurrency: string }) {
  const path = "/api/v3/brokerage/orders";
  const token = await createToken("POST", path);
  const productId = `${input.symbol.toUpperCase()}-${input.quoteCurrency.toUpperCase()}`;
  const orderConfiguration = input.side === "buy" ? { market_market_ioc: { base_size: String(input.quantity) } } : { market_market_ioc: { base_size: String(input.quantity) } };
  const response = await fetch(`https://api.coinbase.com${path}`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ client_order_id: crypto.randomUUID(), product_id: productId, side: input.side.toUpperCase(), order_configuration: orderConfiguration }) });
  const data = await response.json() as { success?: boolean; order_id?: string; error_response?: { message?: string } };
  if (!response.ok || !data.success || !data.order_id) throw new Error(data.error_response?.message ?? "Coinbase order failed");
  return { orderId: data.order_id, productId };
}
