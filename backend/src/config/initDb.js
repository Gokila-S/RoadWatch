import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { pool } from './db.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const initializeDatabase = async () => {
  const schemaPath = path.resolve(__dirname, '../../sql/schema.sql')
  const schemaSql = await fs.readFile(schemaPath, 'utf8')
  await pool.query(schemaSql)
  console.log('Database schema ensured')
}
