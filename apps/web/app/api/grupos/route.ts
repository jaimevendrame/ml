import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db, grupos } from '@ofertaml/db'

export async function GET() {
  const rows = await db.select().from(grupos).where(eq(grupos.ativo, true)).orderBy(grupos.criadoEm)
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const { jid, nome } = await req.json() as { jid: string; nome: string }
  if (!jid || !nome) return NextResponse.json({ error: 'jid e nome obrigatórios' }, { status: 400 })

  const [row] = await db
    .insert(grupos)
    .values({ jid, nome })
    .onConflictDoNothing()
    .returning()

  return NextResponse.json(row ?? { error: 'já existe' }, { status: row ? 201 : 409 })
}
