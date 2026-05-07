import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db, grupos } from '@ofertaml/db'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json() as Partial<{ ativo: boolean; janelaInicio: number; janelaFim: number; intervaloMinMinutos: number }>
  await db.update(grupos).set(body).where(eq(grupos.id, id))
  return NextResponse.json({ ok: true })
}
