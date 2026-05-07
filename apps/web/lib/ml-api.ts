const ML_API = process.env.ML_API_BASE ?? 'https://api.mercadolibre.com'
const CACHE_TTL_MS = 30 * 60 * 1000 // 30 min
const MAX_RETRIES = 3
const RATE_LIMIT_RPS = 5

// --- Types ---

export interface MLItem {
  id: string
  title: string
  price: number
  original_price: number | null
  currency_id: string
  thumbnail: string
  permalink: string
  status: string
  category_id: string
}

export interface MLPriceEntry {
  id: string
  type: string
  amount: number
  regular_amount: number | null
  currency_id: string
}

export interface MLPrices {
  id: string
  prices: MLPriceEntry[]
}

// --- In-memory cache ---

type CacheEntry<T> = { data: T; expiresAt: number }
const _cache = new Map<string, CacheEntry<unknown>>()

function getCached<T>(key: string): T | null {
  const entry = _cache.get(key) as CacheEntry<T> | undefined
  if (!entry || Date.now() > entry.expiresAt) {
    _cache.delete(key)
    return null
  }
  return entry.data
}

function setCached<T>(key: string, data: T): void {
  _cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS })
}

// --- Token-bucket rate limiter (5 req/sec) ---

let _tokens = RATE_LIMIT_RPS
let _lastRefill = Date.now()

function acquireToken(): Promise<void> {
  return new Promise((resolve) => {
    const attempt = () => {
      const now = Date.now()
      _tokens = Math.min(RATE_LIMIT_RPS, _tokens + ((now - _lastRefill) * RATE_LIMIT_RPS) / 1000)
      _lastRefill = now
      if (_tokens >= 1) {
        _tokens -= 1
        resolve()
      } else {
        setTimeout(attempt, 100)
      }
    }
    attempt()
  })
}

// --- Fetch with exponential retry ---

async function mlFetch<T>(path: string, attempt = 0): Promise<T> {
  await acquireToken()

  const res = await fetch(`${ML_API}${path}`, {
    headers: { 'Accept-Encoding': 'gzip' },
    signal: AbortSignal.timeout(10_000),
  })

  if ((res.status === 429 || res.status >= 500) && attempt < MAX_RETRIES) {
    const delay = 2 ** attempt * 1_000 + Math.random() * 500
    await new Promise((r) => setTimeout(r, delay))
    return mlFetch<T>(path, attempt + 1)
  }

  if (!res.ok) throw new Error(`ML API ${res.status} on ${path}`)
  return res.json() as Promise<T>
}

// --- Public API ---

export async function getItem(itemId: string): Promise<MLItem> {
  const key = `item:${itemId}`
  return getCached<MLItem>(key) ?? setCachedReturn(key, await mlFetch<MLItem>(`/items/${itemId}`))
}

export async function getItemPrices(itemId: string): Promise<MLPrices> {
  const key = `prices:${itemId}`
  return (
    getCached<MLPrices>(key) ?? setCachedReturn(key, await mlFetch<MLPrices>(`/items/${itemId}/prices`))
  )
}

export function calculateDiscount(
  item: MLItem,
  prices: MLPrices,
): { precoAtual: number; precoOriginal: number | null; descontoPct: number | null } {
  const standard = prices.prices.find((p) => p.type === 'standard')

  const precoAtual = standard?.amount ?? item.price
  const precoOriginal = standard?.regular_amount ?? item.original_price ?? null

  const descontoPct =
    precoOriginal !== null && precoOriginal > precoAtual
      ? Math.round(((precoOriginal - precoAtual) / precoOriginal) * 100)
      : null

  return { precoAtual, precoOriginal, descontoPct }
}

// helper: set cache and return value (avoids intermediate variable)
function setCachedReturn<T>(key: string, data: T): T {
  setCached(key, data)
  return data
}
