import { z } from 'zod';

const envSchema = z.object({
    PORT: z.string().default('3001'),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    DATABASE_URL: z.string().url(),
    REDIS_URL: z.string().url(),
    GEMINI_API_KEY: z.string().min(1), // Used for schema parsing
    GEMINI_SOLUTIONS_API_KEY: z.string().min(1), // Used for generating detailed solutions
    AWS_REGION: z.string().optional().default('ap-south-1'),
    AWS_ACCESS_KEY_ID: z.string().optional(),
    AWS_SECRET_ACCESS_KEY: z.string().optional(),
    S3_BUCKET_NAME: z.string().optional().default('keycracker-uploads'),
});

const parseEnv = () => {
    const parsed = envSchema.safeParse(process.env);

    if (!parsed.success) {
        console.error('❌ Invalid environment variables:', parsed.error.format());
        process.exit(1);
    }

    return parsed.data;
};

export const env = parseEnv();
