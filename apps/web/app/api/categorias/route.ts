import { NextRequest, NextResponse } from 'next/server'
import { db, categorias } from '@ofertaml/db'

export async function GET() {
  const rows = await db.select().from(categorias).orderBy(categorias.criadoEm)
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const { nome, url } = await req.json() as { nome: string; url: string }
  if (!nome || !url) return NextResponse.json({ error: 'nome e url obrigatórios' }, { status: 400 })
  const [row] = await db.insert(categorias).values({ nome, url }).returning()
  return NextResponse.json(row, { status: 201 })
}
