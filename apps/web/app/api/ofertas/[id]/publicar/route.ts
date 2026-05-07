import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db, ofertas, grupos, publicacoes } from '@ofertaml/db'
import { waClient } from '@/lib/whatsapp-client'
import { formatMessage } from '@/lib/message-template'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { grupoId } = await req.json() as { grupoId: string }

  const [oferta] = await db.select().from(ofertas).where(eq(ofertas.id, id)).limit(1)
  if (!oferta) return NextResponse.json({ error: 'Oferta não encontrada' }, { status: 404 })
  if (oferta.status !== 'pronto') return NextResponse.json({ error: 'Oferta não está pronta' }, { status: 400 })
  if (!oferta.linkAfiliado) return NextResponse.json({ error: 'Link afiliado ausente' }, { status: 400 })

  const [grupo] = await db.select().from(grupos).where(eq(grupos.id, grupoId)).limit(1)
  if (!grupo) return NextResponse.json({ error: 'Grupo não encontrado' }, { status: 404 })

  const text = formatMessage({
    titulo: oferta.titulo,
    precoAtual: Number(oferta.precoAtual),
    precoOriginal: oferta.precoOriginal ? Number(oferta.precoOriginal) : null,
    descontoPct: oferta.descontoPct,
    linkAfiliado: oferta.linkAfiliado,
  })

  try {
    await waClient.sendMessage(grupo.jid, text, oferta.imagemUrl ?? undefined)
  } catch (err) {
    return NextResponse.json({ error: `WA send failed: ${err}` }, { status: 502 })
  }

  await Promise.all([
    db.insert(publicacoes).values({ ofertaId: id, grupoId, status: 'enviado' }),
    db.update(ofertas).set({ status: 'enviada', publicadoEm: new Date() }).where(eq(ofertas.id, id)),
    db.update(grupos).set({ ultimoEnvio: new Date() }).where(eq(grupos.id, grupoId)),
  ])

  return NextResponse.json({ ok: true })
}
