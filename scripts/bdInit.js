import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import 'dotenv/config'
import { pool } from '../src/repositories/pool.js'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')

const schema = await readFile(join(raiz, 'db', 'schema.sql'), 'utf8')

try {
  await pool.query(schema)
  console.log('bd:init: esquema aplicado en', process.env.DATABASE_URL)
} finally {
  await pool.end()
}
