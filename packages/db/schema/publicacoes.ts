import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { grupos } from './grupos'
import { ofertas } from './ofertas'

export const publicacoes = pgTable(
  'publicacoes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ofertaId: uuid('oferta_id')
      .notNull()
      .references(() => ofertas.id, { onDelete: 'cascade' }),
    grupoId: uuid('grupo_id')
      .notNull()
      .references(() => grupos.id, { onDelete: 'cascade' }),
    enviadoEm: timestamp('enviado_em', { withTimezone: true }).notNull().defaultNow(),
    status: text('status').notNull().default('enviado'),
    erro: text('erro'),
  },
  (table) => [
    index('idx_publicacoes_oferta').on(table.ofertaId),
    index('idx_publicacoes_grupo').on(table.grupoId),
  ],
)
