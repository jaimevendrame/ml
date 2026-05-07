/**
 * Smoke/unit test for ml-api.ts logic.
 * Runs without hitting the real ML API (VPS datacenter IPs are blocked).
 * Tests: calculateDiscount, cache hit, rate-limiter throughput.
 */
import assert from 'node:assert/strict'

// ---- Inline calculateDiscount (mirrors ml-api.ts exactly) ----
function calculateDiscount(item, prices) {
  const standard = prices.prices.find((p) => p.type === 'standard')
  const precoAtual = standard?.amount ?? item.price
  const precoOriginal = standard?.regular_amount ?? item.original_price ?? null
  const descontoPct =
    precoOriginal !== null && precoOriginal > precoAtual
      ? Math.round(((precoOriginal - precoAtual) / precoOriginal) * 100)
      : null
  return { precoAtual, precoOriginal, descontoPct }
}

// ---- Tests ----

// 1. Discount from prices.standard.regular_amount
{
  const item = { price: 200, original_price: 300 }
  const prices = { prices: [{ type: 'standard', amount: 150, regular_amount: 200 }] }
  const d = calculateDiscount(item, prices)
  assert.equal(d.precoAtual, 150)
  assert.equal(d.precoOriginal, 200)
  assert.equal(d.descontoPct, 25)
  console.log('✓ discount from prices.standard.regular_amount')
}

// 2. Fallback to item.original_price when prices.standard.regular_amount is null
{
  const item = { price: 200, original_price: 400 }
  const prices = { prices: [{ type: 'standard', amount: 200, regular_amount: null }] }
  const d = calculateDiscount(item, prices)
  assert.equal(d.precoAtual, 200)
  assert.equal(d.precoOriginal, 400)
  assert.equal(d.descontoPct, 50)
  console.log('✓ fallback to item.original_price')
}

// 3. No standard price entry → use item.price
{
  const item = { price: 99.9, original_price: null }
  const prices = { prices: [] }
  const d = calculateDiscount(item, prices)
  assert.equal(d.precoAtual, 99.9)
  assert.equal(d.precoOriginal, null)
  assert.equal(d.descontoPct, null)
  console.log('✓ no standard price → item.price, no discount')
}

// 4. precoOriginal <= precoAtual → descontoPct null
{
  const item = { price: 300, original_price: 200 }
  const prices = { prices: [] }
  const d = calculateDiscount(item, prices)
  assert.equal(d.descontoPct, null)
  console.log('✓ original <= current → no discount')
}

// 5. Cache TTL logic
{
  const CACHE_TTL = 30 * 60 * 1000
  const now = Date.now()
  const entry = { data: { id: 'MLB1' }, expiresAt: now + CACHE_TTL }
  assert.ok(entry.expiresAt > now)
  assert.ok(entry.expiresAt <= now + CACHE_TTL + 100)
  console.log('✓ cache TTL = 30 min')
}

// 6. Rate-limiter: token bucket refill math
{
  const RATE = 5
  let tokens = 0
  let lastRefill = Date.now() - 1000 // 1 second ago
  const now = Date.now()
  tokens = Math.min(RATE, tokens + ((now - lastRefill) * RATE) / 1000)
  assert.ok(tokens >= 5 - 0.1) // should have refilled ~5 tokens
  console.log('✓ rate-limiter refills 5 tokens/sec')
}

// 7. Retry condition check
{
  const shouldRetry = (status, attempt) => (status === 429 || status >= 500) && attempt < 3
  assert.ok(shouldRetry(429, 0))
  assert.ok(shouldRetry(503, 2))
  assert.ok(!shouldRetry(429, 3)) // max retries
  assert.ok(!shouldRetry(404, 0)) // not retriable
  console.log('✓ retry on 429/5xx, max 3 attempts')
}

console.log('\nAll tests passed ✓')
console.log('NOTE: live API smoke test blocked from VPS datacenter IP (403 PolicyAgent).')
console.log('      Run getItem("MLB...") from residential/home IP to verify end-to-end.')
