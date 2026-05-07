import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db, ofertas } from '@ofertaml/db'

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get('status')
  const rows = status
    ? await db.select().from(ofertas).where(eq(ofertas.status, status as 'pendente')).orderBy(ofertas.coletadoEm).limit(100)
    : await db.select().from(ofertas).orderBy(ofertas.coletadoEm).limit(100)
  return NextResponse.json(rows)
}
