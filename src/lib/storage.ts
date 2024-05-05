import { S3Client } from "@aws-sdk/client-s3";
import {env} from "@/lib/env.mjs";

export function createS3Client() {
    return new S3Client({
        region: 'auto',
        endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: env.R2_ACCESS_KEY_ID,
            secretAccessKey: env.R2_SECRET_ACCESS_KEY
        }
    })
}

export function prepareUrl(path: string) {
    return new URL(path, env.CDN_URL).toString();
}