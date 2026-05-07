import { boolean, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const grupos = pgTable('grupos', {
  id: uuid('id').primaryKey().defaultRandom(),
  nome: text('nome').notNull(),
  jid: text('jid').notNull().unique(),
  ativo: boolean('ativo').notNull().default(true),
  janelaInicio: integer('janela_inicio').notNull().default(8),
  janelaFim: integer('janela_fim').notNull().default(22),
  intervaloMinMinutos: integer('intervalo_min_minutos').notNull().default(5),
  ultimoEnvio: timestamp('ultimo_envio', { withTimezone: true }),
  criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
})
