import { index, integer, numeric, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { categorias } from './categorias'
import { mlSessions } from './ml-sessions'

export const statusOfertaEnum = pgEnum('status_oferta', [
  'pendente',
  'pronto',
  'enviada',
  'rejeitada',
  'expirada',
])

export const ofertas = pgTable(
  'ofertas',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    mlItemId: text('ml_item_id').notNull().unique(),
    titulo: text('titulo').notNull(),
    precoAtual: numeric('preco_atual', { precision: 10, scale: 2 }).notNull(),
    precoOriginal: numeric('preco_original', { precision: 10, scale: 2 }),
    descontoPct: integer('desconto_pct'),
    imagemUrl: text('imagem_url'),
    permalink: text('permalink').notNull(),
    linkAfiliado: text('link_afiliado'),
    categoriaId: uuid('categoria_id').references(() => categorias.id, { onDelete: 'set null' }),
    status: statusOfertaEnum('status').notNull().default('pendente'),
    mlSessionId: uuid('ml_session_id').references(() => mlSessions.id, { onDelete: 'set null' }),
    ultimoErro: text('ultimo_erro'),
    coletadoEm: timestamp('coletado_em', { withTimezone: true }).notNull().defaultNow(),
    enriquecidoEm: timestamp('enriquecido_em', { withTimezone: true }),
    publicadoEm: timestamp('publicado_em', { withTimezone: true }),
  },
  (table) => [
    index('idx_ofertas_status').on(table.status),
    index('idx_ofertas_coletado_em').on(table.coletadoEm),
  ],
)

export const ofertasArquivadas = pgTable('ofertas_arquivadas', {
  id: uuid('id').primaryKey().defaultRandom(),
  mlItemId: text('ml_item_id').notNull(),
  titulo: text('titulo').notNull(),
  precoAtual: numeric('preco_atual', { precision: 10, scale: 2 }).notNull(),
  precoOriginal: numeric('preco_original', { precision: 10, scale: 2 }),
  descontoPct: integer('desconto_pct'),
  imagemUrl: text('imagem_url'),
  permalink: text('permalink').notNull(),
  linkAfiliado: text('link_afiliado'),
  categoriaId: uuid('categoria_id'),
  status: statusOfertaEnum('status').notNull(),
  mlSessionId: uuid('ml_session_id'),
  ultimoErro: text('ultimo_erro'),
  coletadoEm: timestamp('coletado_em', { withTimezone: true }).notNull(),
  enriquecidoEm: timestamp('enriquecido_em', { withTimezone: true }),
  publicadoEm: timestamp('publicado_em', { withTimezone: true }),
  arquivadoEm: timestamp('arquivado_em', { withTimezone: true }).notNull().defaultNow(),
})
