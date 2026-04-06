import pg from 'pg'
import dns from 'node:dns'
import { env } from './env.js'

const { Pool } = pg

// Some networks time out on IPv6 routes to managed Postgres hosts.
// Prefer IPv4 first to reduce intermittent ETIMEDOUT failures.
dns.setDefaultResultOrder('ipv4first')

export const pool = new Pool({
  connectionString: env.databaseUrl,
  ssl: { rejectUnauthorized: false },
  family: 4,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
  connectionTimeoutMillis: 30000,
  idleTimeoutMillis: 30000,
  max: 10,
  maxUses: 7500,
})

pool.on('error', (error) => {
  console.error('Unexpected PostgreSQL pool error', error)
})
