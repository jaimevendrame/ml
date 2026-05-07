import { env } from './env'

async function waFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${env.WHATSAPP_SERVICE_URL}${path}`, {
    ...init,
    headers: { 'X-Internal-Token': env.INTERNAL_SERVICE_TOKEN, 'Content-Type': 'application/json', ...init?.headers },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`WA service ${res.status} on ${path}`)
  return res.json() as Promise<T>
}

export const waClient = {
  getQR: () => waFetch<{ status: string; qr: string | null }>('/qr'),
  getStatus: () => waFetch<{ status: string; connected: boolean }>('/status'),
  getGroups: () => waFetch<{ groups: { jid: string; name: string }[] }>('/groups'),
  sendMessage: (jid: string, text: string, imageUrl?: string) =>
    waFetch<{ id: string }>('/send', {
      method: 'POST',
      body: JSON.stringify({ jid, text, image_url: imageUrl }),
    }),
}
