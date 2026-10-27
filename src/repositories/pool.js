import 'dotenv/config'
import pg from 'pg'


// Pool portátil:
// - Si DATABASE_URL esta definida tiene prioridad (connectionString).
// - Si no, se compone el Pool con variables separadas. El default de DB_HOST
//   apunta al socket Unix de Postgres para que la autenticacion local sea peer
//   (no se envian credenciales por red).
const configuracion = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
      host: process.env.DB_HOST ?? '/var/run/postgresql',
      port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
      // Solo se pasan credenciales si estan definidas (contracto peer por socket).
      ...(process.env.DB_USUARIO ? { user: process.env.DB_USUARIO } : {}),
      ...(process.env.DB_CONTRASENA ? { password: process.env.DB_CONTRASENA } : {}),
      database: process.env.DB_NOMBRE ?? 'justina',
    }

export const pool = new pg.Pool(configuracion)
