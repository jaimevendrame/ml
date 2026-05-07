import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db, categorias, ofertas } from '@ofertaml/db'
import { scrapeUrls } from '@/lib/scraper-client'
import { getItem, getItemPrices, calculateDiscount } from '@/lib/ml-api'

export async function POST() {
  const cats = await db.select().from(categorias).where(eq(categorias.ativa, true))
  if (cats.length === 0) return NextResponse.json({ error: 'Nenhuma categoria ativa' }, { status: 400 })

  const urls = cats.map((c) => c.url)
  let allIds: string[] = []

  try {
    const results = await scrapeUrls(urls)
    allIds = [...new Set(results.flatMap((r) => r.itemIds))]
  } catch (err) {
    return NextResponse.json({ error: `Scraper error: ${err}` }, { status: 502 })
  }

  let novas = 0
  let erros = 0

  for (const itemId of allIds.slice(0, 50)) {
    try {
      const [item, prices] = await Promise.all([getItem(itemId), getItemPrices(itemId)])
      const { precoAtual, precoOriginal, descontoPct } = calculateDiscount(item, prices)

      await db
        .insert(ofertas)
        .values({
          mlItemId: itemId,
          titulo: item.title,
          precoAtual: String(precoAtual),
          precoOriginal: precoOriginal ? String(precoOriginal) : null,
          descontoPct,
          imagemUrl: item.thumbnail,
          permalink: item.permalink,
          status: 'pendente',
        })
        .onConflictDoNothing()

      novas++
    } catch {
      erros++
    }
  }

  return NextResponse.json({ coletadas: allIds.length, novas, erros })
}
