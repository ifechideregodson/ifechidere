const muxTokenId = process.env.MUX_TOKEN_ID;
const muxTokenSecret = process.env.MUX_TOKEN_SECRET;

export function muxProviderStatus() { return { provider: muxTokenId && muxTokenSecret ? "mux" : "unconfigured" }; }

export async function createMuxDirectUpload(input: { corsOrigin: string; passthrough: string }) {
  if (!muxTokenId || !muxTokenSecret) throw new Error("Mux is not configured");
  const basic = Buffer.from(`${muxTokenId}:${muxTokenSecret}`).toString("base64");
  const response = await fetch("https://api.mux.com/video/v1/uploads", { method: "POST", headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/json" }, body: JSON.stringify({ new_asset_settings: { playback_policy: ["public"], passthrough: input.passthrough }, cors_origin: input.corsOrigin }) });
  const data = await response.json() as { data?: { id?: string; url?: string }; error?: { messages?: string[] } };
  if (!response.ok || !data.data?.id || !data.data.url) throw new Error(data.error?.messages?.join(", ") ?? "Mux direct upload failed");
  return { uploadId: data.data.id, uploadUrl: data.data.url };
}
