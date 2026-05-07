import { eq } from 'drizzle-orm'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { db, mlSessions, ofertas } from '@ofertaml/db'
import {
  generateAffiliateLink,
  CookieExpiredError,
  RateLimitError,
  cookieHashPreview,
} from './link-builder.js'
import { checkCookieHealth } from './cookie-health.js'

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required')
  process.exit(1)
}

const TOKEN = process.env.INTERNAL_SERVICE_TOKEN ?? ''
const BATCH_SIZE = 10
const LOOP_INTERVAL_MS = 60_000
const RATE_LIMIT_BACKOFF_MS = 30_000

// --- Worker ---

let loopRunning = false

async function processPendingOffers(): Promise<number> {
  const sessions = await db
    .select()
    .from(mlSessions)
    .where(eq(mlSessions.ativa, true))
    .limit(1)
  const session = sessions[0]

  if (!session) {
    console.log('[worker] no active session')
    return 0
  }

  const pending = await db
    .select()
    .from(ofertas)
    .where(eq(ofertas.status, 'pendente'))
    .limit(BATCH_SIZE)

  if (pending.length === 0) return 0

  console.log(`[worker] processing ${pending.length} pending offers`)
  let processed = 0

  for (const oferta of pending) {
    try {
      const link = await generateAffiliateLink(
        oferta.permalink,
        session.tagAfiliado,
        session.cookieRaw,
      )

      await db
        .update(ofertas)
        .set({ status: 'pronto', linkAfiliado: link, enriquecidoEm: new Date(), ultimoErro: null })
        .where(eq(ofertas.id, oferta.id))

      processed++
      console.log(`[worker] enriched ${oferta.mlItemId}`)
    } catch (err) {
      if (err instanceof CookieExpiredError) {
        console.warn('[worker] cookie expired — stopping. hash:', cookieHashPreview(session.cookieRaw))

        await Promise.all([
          db
            .update(mlSessions)
            .set({ ativa: false, ultimoErro: 'cookie_expired', ultimoErroEm: new Date() })
            .where(eq(mlSessions.id, session.id)),
          db
            .update(ofertas)
            .set({ ultimoErro: 'cookie_expired' })
            .where(eq(ofertas.id, oferta.id)),
        ])
        break
      }

      if (err instanceof RateLimitError) {
        console.warn('[worker] rate limited — backoff 30s')
        await new Promise((r) => setTimeout(r, RATE_LIMIT_BACKOFF_MS))
        continue
      }

      const msg = String(err).slice(0, 500)
      console.error('[worker] error on', oferta.mlItemId, msg)
      await db.update(ofertas).set({ ultimoErro: msg }).where(eq(ofertas.id, oferta.id))
    }
  }

  return processed
}

function startWorkerLoop() {
  setInterval(async () => {
    if (loopRunning) return
    loopRunning = true
    try {
      await processPendingOffers()
    } catch (err) {
      console.error('[worker] loop error:', err)
    } finally {
      loopRunning = false
    }
  }, LOOP_INTERVAL_MS)

  console.log(`[worker] loop started, interval=${LOOP_INTERVAL_MS}ms`)
}

// --- HTTP server ---

const app = new Hono()

app.use('*', async (c, next) => {
  if (TOKEN && c.req.header('X-Internal-Token') !== TOKEN) {
    return c.json({ error: 'unauthorized' }, 401)
  }
  return next()
})

app.get('/health', (c) =>
  c.json({ status: 'ok', loopRunning }),
)

app.post('/enrich-pending', async (c) => {
  if (loopRunning) return c.json({ error: 'already running' }, 409)
  loopRunning = true
  try {
    const processed = await processPendingOffers()
    return c.json({ processed })
  } finally {
    loopRunning = false
  }
})

app.post('/cookie-health/:sessionId', async (c) => {
  const sessionId = c.req.param('sessionId')
  const healthy = await checkCookieHealth(sessionId)
  return c.json({ healthy }, healthy ? 200 : 503)
})

const port = parseInt(process.env.PORT ?? '8082', 10)
serve({ fetch: app.fetch, port })
console.log(`link-builder-worker listening on port ${port}`)
startWorkerLoop()
