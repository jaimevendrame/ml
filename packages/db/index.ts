import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema/index'

export * from './schema/index'
export { schema }

export type Database = ReturnType<typeof drizzle<typeof schema>>

declare global {
  // eslint-disable-next-line no-var
  var _pgClient: postgres.Sql | undefined
}

const client = globalThis._pgClient ?? postgres(process.env.DATABASE_URL!)
if (process.env.NODE_ENV !== 'production') globalThis._pgClient = client

export const db = drizzle(client, { schema })
