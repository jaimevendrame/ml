import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { scrapeUrls } from './scraper.js'

const app = new Hono()

const TOKEN = process.env.INTERNAL_SERVICE_TOKEN ?? ''

app.use('*', async (c, next) => {
  if (TOKEN && c.req.header('X-Internal-Token') !== TOKEN) {
    return c.json({ error: 'unauthorized' }, 401)
  }
  return next()
})

app.get('/health', (c) => c.json({ status: 'ok' }))

app.post('/scrape', async (c) => {
  const body = await c.req.json<{ urls?: unknown }>().catch(() => ({} as { urls?: unknown }))

  if (!Array.isArray(body.urls) || body.urls.length === 0) {
    return c.json({ error: 'urls array required' }, 400)
  }

  const urls = body.urls.filter((u): u is string => typeof u === 'string')
  const results = await scrapeUrls(urls)
  return c.json({ urls: results })
})

const port = parseInt(process.env.PORT ?? '8081', 10)
console.log(`scraper-service starting on port ${port}`)
serve({ fetch: app.fetch, port })
