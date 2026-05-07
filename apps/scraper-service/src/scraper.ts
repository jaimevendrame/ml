import { chromium, type Browser } from 'playwright'
import { extractItemIds } from './parser.js'

export interface ScrapeResult {
  url: string
  itemIds: string[]
  errors: string[]
}

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

export async function scrapeUrls(urls: string[]): Promise<ScrapeResult[]> {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  })

  const results: ScrapeResult[] = []
  try {
    for (const url of urls) {
      results.push(await scrapeOne(browser, url))
    }
  } finally {
    await browser.close()
  }

  return results
}

async function scrapeOne(browser: Browser, url: string): Promise<ScrapeResult> {
  const context = await browser.newContext({
    userAgent: USER_AGENT,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    viewport: { width: 1280, height: 800 },
  })
  const page = await context.newPage()

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 })

    // Wait for at least one product link — best effort
    await page.waitForSelector('a[href*="MLB"]', { timeout: 10_000 }).catch(() => {})

    // Trigger lazy-load
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2))
    await page.waitForTimeout(1_500)

    const html = await page.content()
    return { url, itemIds: extractItemIds(html), errors: [] }
  } catch (err) {
    return { url, itemIds: [], errors: [String(err)] }
  } finally {
    await context.close()
  }
}
