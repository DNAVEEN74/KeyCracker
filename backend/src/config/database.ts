import { PrismaClient } from '@prisma/client';
import { env } from './env';

const prismaClientSingleton = () => {
    return new PrismaClient({
        datasources: {
            db: {
                url: env.DATABASE_URL,
            },
        },
        log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClientSingleton | undefined;
};

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
