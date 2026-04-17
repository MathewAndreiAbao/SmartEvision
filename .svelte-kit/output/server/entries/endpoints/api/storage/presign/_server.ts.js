import { error, json } from "@sveltejs/kit";
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { b as private_env } from "../../../../../chunks/shared-server.js";
import { s as supabase } from "../../../../../chunks/supabase.js";
if (!private_env.B2_ENDPOINT || !private_env.B2_APPLICATION_KEY_ID || !private_env.B2_APPLICATION_KEY || !private_env.B2_BUCKET_NAME) {
  console.warn("[b2] Missing Backblaze B2 environment variables. Storage will fail until configured.");
}
const b2 = new S3Client({
  region: "us-east-005",
  endpoint: private_env.B2_ENDPOINT || "https://s3.us-east-005.backblazeb2.com",
  forcePathStyle: false,
  // B2 requires virtual-hosted style for consistent CORS preflight resolution
  // B2 doesn't always support S3 checksums in pre-signed URLs
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
  credentials: {
    accessKeyId: private_env.B2_APPLICATION_KEY_ID || "",
    secretAccessKey: private_env.B2_APPLICATION_KEY || ""
  }
});
async function getPresignedUploadUrl(key, contentType, expiresIn = 3600) {
  const command = new PutObjectCommand({
    Bucket: private_env.B2_BUCKET_NAME,
    Key: key,
    ContentType: contentType
  });
  return await getSignedUrl(b2, command, { expiresIn });
}
async function getPresignedDownloadUrl(key, expiresIn = 3600) {
  const command = new GetObjectCommand({
    Bucket: private_env.B2_BUCKET_NAME,
    Key: key
  });
  return await getSignedUrl(b2, command, { expiresIn });
}
private_env.B2_BUCKET_NAME;
async function POST({ request }) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) throw error(401, "Unauthorized");
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    console.error("[presign] Auth error:", authError);
    throw error(401, "Unauthorized");
  }
  const { key, contentType, intent = "upload" } = await request.json();
  if (!key) throw error(400, "Missing key");
  try {
    let url;
    if (intent === "download") {
      url = await getPresignedDownloadUrl(key);
    } else {
      if (!contentType) throw error(400, "Missing contentType for upload");
      if (!process.env.B2_APPLICATION_KEY && !process.env.B2_APPLICATION_KEY_ID) {
        console.error("[presign] Missing B2 credentials in environment.");
        throw error(500, "Cloud storage credentials not configured on the server. Please add B2 environment variables to Vercel.");
      }
      url = await getPresignedUploadUrl(key, contentType);
    }
    console.log(`[presign] Generated URL for ${key}: ${url.split("?")[0]}...`);
    return json({ url });
  } catch (err) {
    console.error("[presign] Generation error:", err);
    throw error(500, `Failed to generate pre-signed URL: ${err.message}`);
  }
}
export {
  POST
};
