import { error, json } from "@sveltejs/kit";
import { Buffer } from "buffer";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { b as private_env } from "../../../../../chunks/shared-server.js";
import { s as supabase } from "../../../../../chunks/supabase.js";
const b2 = new S3Client({
  region: "us-east-005",
  endpoint: private_env.B2_ENDPOINT || "https://s3.us-east-005.backblazeb2.com",
  forcePathStyle: false,
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
  credentials: {
    accessKeyId: private_env.B2_APPLICATION_KEY_ID || "",
    secretAccessKey: private_env.B2_APPLICATION_KEY || ""
  }
});
async function POST({ request }) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) throw error(401, "Unauthorized");
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    console.error("[upload-api] Auth error:", authError);
    throw error(401, "Unauthorized");
  }
  const formData = await request.formData();
  const file = formData.get("file");
  const key = formData.get("key");
  if (!file || !(file instanceof Blob)) throw error(400, "Missing or invalid file");
  if (!key || typeof key !== "string") throw error(400, "Missing key");
  const MAX_SIZE = 4.2 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    throw error(413, "File exceeds the 4.2MB limit for server-side uploads. Please compress your PDF.");
  }
  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const command = new PutObjectCommand({
      Bucket: private_env.B2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: file.type || "application/pdf"
    });
    await b2.send(command);
    console.log(`[upload-api] Successfully proxied upload for: ${key}`);
    return json({ success: true, key });
  } catch (err) {
    console.error("[upload-api] B2 Upload Error:", err);
    throw error(500, `Failed to proxy upload to cloud storage: ${err.message}`);
  }
}
export {
  POST
};
