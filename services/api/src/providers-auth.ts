import { createRemoteJWKSet, jwtVerify } from "jose";
import jwt from "jsonwebtoken";

export type ProviderActor = { id: string; role: "executive" | "worker" | "user" };
const localSecret = process.env.JWT_SECRET;
const issuer = process.env.OIDC_ISSUER_URL?.replace(/\/$/, "");
const audience = process.env.OIDC_AUDIENCE;
const roleClaim = process.env.OIDC_ROLE_CLAIM ?? "https://ditrine.com/role";
const jwks = issuer ? createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`)) : null;

function normalizeRole(value: unknown): ProviderActor["role"] {
  return value === "executive" || value === "worker" ? value : "user";
}

export async function verifyAccessToken(token: string): Promise<ProviderActor> {
  if (jwks && issuer && audience) {
    const verified = await jwtVerify(token, jwks, { issuer, audience });
    const claims = verified.payload as typeof verified.payload & { [key: string]: unknown };
    if (!claims.sub) throw new Error("OIDC token has no subject");
    return { id: claims.sub, role: normalizeRole(claims[roleClaim] ?? claims.role) };
  }
  if (!localSecret) throw new Error("No OIDC provider or JWT_SECRET is configured");
  const payload = jwt.verify(token, localSecret) as { sub: string; role?: string };
  if (!payload.sub) throw new Error("Token has no subject");
  return { id: payload.sub, role: normalizeRole(payload.role) };
}

export function authProviderStatus() { return { provider: jwks && issuer && audience ? "oidc" : localSecret ? "local-jwt" : "unconfigured" }; }
