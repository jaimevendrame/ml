import { boolean, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const categorias = pgTable('categorias', {
  id: uuid('id').primaryKey().defaultRandom(),
  nome: text('nome').notNull(),
  url: text('url').notNull(),
  ativa: boolean('ativa').notNull().default(true),
  ultimaColeta: timestamp('ultima_coleta', { withTimezone: true }),
  criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
})
