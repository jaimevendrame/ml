import { env } from './env'

export interface ScrapeResult {
  url: string
  itemIds: string[]
  errors: string[]
}

export async function scrapeUrls(urls: string[]): Promise<ScrapeResult[]> {
  const res = await fetch(`${env.SCRAPER_SERVICE_URL}/scrape`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Internal-Token': env.INTERNAL_SERVICE_TOKEN },
    body: JSON.stringify({ urls }),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Scraper service ${res.status}`)
  const data = await res.json() as { urls: ScrapeResult[] }
  return data.urls
}
