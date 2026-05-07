// Extract MLB item IDs from raw HTML.
// Matches: /MLB-1234567890-titulo and /MLB1234567890 and data-item-id="MLB..."
export function extractItemIds(html: string): string[] {
  const ids = new Set<string>()

  for (const match of html.matchAll(/\bMLB-?(\d{8,12})\b/gi)) {
    ids.add(`MLB${match[1]}`)
  }

  return [...ids]
}
