import { boolean, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const mlSessions = pgTable('ml_link_builder_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  cookieRaw: text('cookie_raw').notNull(),
  cookieHashPreview: text('cookie_hash_preview'),
  tagAfiliado: text('tag_afiliado').notNull(),
  ativa: boolean('ativa').notNull().default(true),
  ultimoUso: timestamp('ultimo_uso', { withTimezone: true }),
  ultimoErro: text('ultimo_erro'),
  ultimoErroEm: timestamp('ultimo_erro_em', { withTimezone: true }),
  criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
})
