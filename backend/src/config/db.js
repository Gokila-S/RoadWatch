import pg from 'pg'
import { env } from './env.js'

const { Pool } = pg

export const pool = new Pool({
  connectionString: env.databaseUrl,
  ssl: { rejectUnauthorized: false },
})

pool.on('error', (error) => {
  console.error('Unexpected PostgreSQL pool error', error)
})
