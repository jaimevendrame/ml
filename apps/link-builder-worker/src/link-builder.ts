import { createHash } from 'node:crypto'

/**
 * ML_LINK_BUILDER_API: Discover by opening DevTools on
 * https://www.mercadolivre.com.br/afiliados/link-builder,
 * pasting a product URL, clicking "Gerar link", then copying the
 * request URL from the Network tab.
 * Estimated pattern: /affiliate-program/api/links or similar.
 */
const LINK_BUILDER_API =
  process.env.ML_LINK_BUILDER_API ??
  'https://www.mercadolivre.com.br/affiliate-program/api/links'

export class CookieExpiredError extends Error {
  constructor() {
    super('cookie expired (401/403)')
  }
}

export class RateLimitError extends Error {
  constructor() {
    super('rate limited (429)')
  }
}

/** Hash of first 8 chars — safe to log, never log the raw cookie. */
export function cookieHashPreview(raw: string): string {
  return createHash('sha256').update(raw.slice(0, 8)).digest('hex').slice(0, 8)
}

interface LinkBuilderResponse {
  shortUrl?: string
  short_url?: string
  link?: string
  affiliate_link?: string
  url?: string
}

export async function generateAffiliateLink(
  permalink: string,
  tagAfiliado: string,
  cookieRaw: string,
): Promise<string> {
  const res = await fetch(LINK_BUILDER_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieRaw,
      Origin: 'https://www.mercadolivre.com.br',
      Referer: 'https://www.mercadolivre.com.br/afiliados/link-builder',
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    },
    body: JSON.stringify({ url: permalink, siteId: 'MLB', campaignId: tagAfiliado }),
    signal: AbortSignal.timeout(15_000),
  })

  if (res.status === 401 || res.status === 403) throw new CookieExpiredError()
  if (res.status === 429) throw new RateLimitError()
  if (!res.ok) throw new Error(`Link Builder API ${res.status}`)

  const data = (await res.json()) as LinkBuilderResponse
  const link = data.shortUrl ?? data.short_url ?? data.link ?? data.affiliate_link ?? data.url

  if (typeof link !== 'string' || !link) {
    throw new Error(`Unexpected response: ${JSON.stringify(data).slice(0, 300)}`)
  }

  return link
}
