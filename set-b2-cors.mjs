import { S3Client, PutBucketCorsCommand } from '@aws-sdk/client-s3';

async function main() {
    const b2 = new S3Client({
        region: 'us-east-005',
        endpoint: 'https://s3.us-east-005.backblazeb2.com',
        credentials: {
            accessKeyId: 'dc38f9f5bbe9',
            secretAccessKey: '00579f79e76e04cb4303a5c3790d9754221f8f8375',
        },
    });

    const command = new PutBucketCorsCommand({
        Bucket: 's-e-vision-submissions',
        CORSConfiguration: {
            CORSRules: [
                {
                    AllowedHeaders: ["*"],
                    AllowedMethods: ["PUT", "GET", "POST", "HEAD", "OPTIONS"],
                    AllowedOrigins: ["*"],
                    ExposeHeaders: ["ETag"],
                    MaxAgeSeconds: 3600,
                }
            ]
        }
    });

    try {
        console.log(`Setting CORS for bucket: s-e-vision-submissions...`);
        await b2.send(command);
        console.log("CORS rules successfully updated on Backblaze B2!");
    } catch (err) {
        console.error("Failed to set CORS:", err);
    }
}

main();
