import { eq } from 'drizzle-orm'
import { db, mlSessions } from '@ofertaml/db'
import { generateAffiliateLink, CookieExpiredError, cookieHashPreview } from './link-builder.js'

const TEST_PERMALINK = 'https://produto.mercadolivre.com.br/MLB-1414879617'

/**
 * Test cookie for a session. Marks it inactive + logs if expired.
 * Returns true if healthy.
 */
export async function checkCookieHealth(sessionId: string): Promise<boolean> {
  const rows = await db.select().from(mlSessions).where(eq(mlSessions.id, sessionId)).limit(1)
  const session = rows[0]
  if (!session) return false

  try {
    await generateAffiliateLink(TEST_PERMALINK, session.tagAfiliado, session.cookieRaw)
    await db
      .update(mlSessions)
      .set({ ultimoUso: new Date() })
      .where(eq(mlSessions.id, sessionId))
    return true
  } catch (err) {
    const errMsg = err instanceof CookieExpiredError ? 'cookie_expired' : String(err).slice(0, 300)
    console.warn('[cookie-health] unhealthy', {
      sessionId,
      hash: cookieHashPreview(session.cookieRaw),
      err: errMsg,
    })

    if (err instanceof CookieExpiredError) {
      await db
        .update(mlSessions)
        .set({ ativa: false, ultimoErro: 'cookie_expired', ultimoErroEm: new Date() })
        .where(eq(mlSessions.id, sessionId))
    }
    return false
  }
}
