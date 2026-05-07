import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './schema/index.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://ofertaml:devpass@localhost:5532/ofertaml',
  },
})
