import crypto from "node:crypto";

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;
const uploadFolder = process.env.CLOUDINARY_UPLOAD_FOLDER ?? "ditrine";

export function cloudinaryProviderStatus() { return { provider: cloudName && apiKey && apiSecret ? "cloudinary" : "unconfigured" }; }

export function createCloudinarySignature(input: { purpose: "portfolio" | "video" | "avatar" }) {
  if (!cloudName || !apiKey || !apiSecret) throw new Error("Cloudinary is not configured");
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = `${uploadFolder}/${input.purpose}`;
  const signature = crypto.createHash("sha1").update(`folder=${folder}&timestamp=${timestamp}${apiSecret}`).digest("hex");
  return { cloudName, apiKey, timestamp, folder, signature, uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, expiresIn: 900 };
}
