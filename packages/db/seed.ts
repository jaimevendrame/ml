import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import * as schema from './schema/index'

const DEV_URL = 'postgres://ofertaml:devpass@localhost:5532/ofertaml'
const client = postgres(process.env.DATABASE_URL ?? DEV_URL)
const db = drizzle(client, { schema })

async function seed() {
  console.log('Iniciando seed...')

  await db
    .insert(schema.categorias)
    .values({
      nome: 'Ofertas do Dia',
      url: 'https://www.mercadolivre.com.br/ofertas',
      ativa: true,
    })
    .onConflictDoNothing()

  console.log('Seed concluído: 1 categoria inserida')
  await client.end()
}

seed().catch((err) => {
  console.error('Erro no seed:', err)
  process.exit(1)
})
