import { S3Client, PutBucketCorsCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
    const b2 = new S3Client({
        region: 'us-east-005',
        endpoint: process.env.B2_ENDPOINT,
        credentials: {
            accessKeyId: process.env.B2_APPLICATION_KEY_ID || '',
            secretAccessKey: process.env.B2_APPLICATION_KEY || '',
        },
    });

    const command = new PutBucketCorsCommand({
        Bucket: process.env.B2_BUCKET_NAME,
        CORSConfiguration: {
            CORSRules: [
                {
                    AllowedHeaders: ["*"],
                    AllowedMethods: ["PUT", "GET", "POST", "HEAD"],
                    AllowedOrigins: ["*"],
                    ExposeHeaders: ["ETag"],
                    MaxAgeSeconds: 3600,
                }
            ]
        }
    });

    try {
        console.log(`Setting CORS for bucket: ${process.env.B2_BUCKET_NAME}...`);
        await b2.send(command);
        console.log("CORS rules successfully updated on Backblaze B2!");
    } catch (err) {
        console.error("Failed to set CORS:", err);
    }
}

main();
