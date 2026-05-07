import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '@ofertaml/db'

declare global {
  // eslint-disable-next-line no-var
  var _webPgClient: postgres.Sql | undefined
}

const client = globalThis._webPgClient ?? postgres(process.env.DATABASE_URL!)
if (process.env.NODE_ENV !== 'production') globalThis._webPgClient = client

export const db = drizzle(client, { schema })
