export interface MessageData {
  titulo: string
  precoAtual: number
  precoOriginal: number | null
  descontoPct: number | null
  linkAfiliado: string
}

export function formatMessage(data: MessageData): string {
  const precoFmt = (n: number) => n.toFixed(2).replace('.', ',')

  const lines = [
    '🔥 *OFERTA IMPERDÍVEL*',
    '',
    `📦 ${data.titulo}`,
    '',
  ]

  if (data.precoOriginal) lines.push(`💸 De: ~R$ ${precoFmt(data.precoOriginal)}~`)
  lines.push(`✅ Por: *R$ ${precoFmt(data.precoAtual)}*`)
  if (data.descontoPct) lines.push(`🎯 Desconto: ${data.descontoPct}% OFF`)

  lines.push('', `🔗 ${data.linkAfiliado}`)

  return lines.join('\n')
}
