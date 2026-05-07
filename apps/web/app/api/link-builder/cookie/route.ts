import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db, mlSessions } from '@ofertaml/db'
import { createHash } from 'node:crypto'

function hashPreview(raw: string) {
  return createHash('sha256').update(raw.slice(0, 8)).digest('hex').slice(0, 8)
}

export async function GET() {
  const rows = await db.select().from(mlSessions).where(eq(mlSessions.ativa, true)).limit(1)
  return NextResponse.json({ session: rows[0] ?? null })
}

export async function POST(req: NextRequest) {
  const { cookieRaw, tagAfiliado } = await req.json() as { cookieRaw: string; tagAfiliado: string }
  if (!cookieRaw || !tagAfiliado) {
    return NextResponse.json({ error: 'cookieRaw e tagAfiliado obrigatórios' }, { status: 400 })
  }

  // Deactivate previous sessions
  await db.update(mlSessions).set({ ativa: false }).where(eq(mlSessions.ativa, true))

  const [row] = await db
    .insert(mlSessions)
    .values({ cookieRaw, cookieHashPreview: hashPreview(cookieRaw), tagAfiliado, ativa: true })
    .returning({ id: mlSessions.id })

  return NextResponse.json({ ok: true, id: row?.id })
}
