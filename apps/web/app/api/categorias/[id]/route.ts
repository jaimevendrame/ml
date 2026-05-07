import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db, categorias } from '@ofertaml/db'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json() as Partial<{ nome: string; url: string; ativa: boolean }>
  await db.update(categorias).set(body).where(eq(categorias.id, id))
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await db.delete(categorias).where(eq(categorias.id, id))
  return NextResponse.json({ ok: true })
}
