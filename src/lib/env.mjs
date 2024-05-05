// .mjs is used so that it can be imported in next.config.mjs

import { z } from 'zod';

const envSchema = z.object({
    DATABASE_URL: z.string(),
    R2_ACCOUNT_ID: z.string(),
    R2_ACCESS_KEY_ID: z.string(),
    R2_SECRET_ACCESS_KEY: z.string(),
    R2_BUCKET: z.string(),
    CDN_URL: z.string(),
});

export const env = envSchema.parse(process.env);