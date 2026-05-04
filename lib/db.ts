import 'server-only'
import { PrismaClient } from '../app/generated/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  pool: Pool | undefined
}

if (!globalForPrisma.pool) {
  globalForPrisma.pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    max: 10,
  })
}

const adapter = new PrismaPg(globalForPrisma.pool)

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({ 
    adapter,
    log: ['warn', 'error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
