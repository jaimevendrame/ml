'use client'

import { useEffect, useState } from 'react'

interface Session { id: string; tagAfiliado: string; ativa: boolean; ultimoUso: string | null; ultimoErro: string | null; criadoEm: string }

export default function LinkBuilderPage() {
  const [session, setSession] = useState<Session | null>(null)
  const [cookie, setCookie] = useState('')
  const [tag, setTag] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  async function load() {
    const res = await fetch('/api/link-builder/cookie')
    if (res.ok) {
      const d = await res.json()
      setSession(d.session ?? null)
      if (d.session) setTag(d.session.tagAfiliado)
    }
  }

  useEffect(() => { load() }, [])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    const res = await fetch('/api/link-builder/cookie', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cookieRaw: cookie, tagAfiliado: tag }),
    })
    const d = await res.json()
    setMessage(res.ok ? '✅ Cookie salvo' : `❌ ${d.error}`)
    setCookie('')
    setSaving(false)
    load()
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Link Builder</h1>
      <p className="text-sm text-gray-500 mb-6">
        Configure o cookie de sessão para geração de links de afiliado.{' '}
        <a href="/docs/COOKIE_RENEWAL.md" className="text-blue-500 hover:underline">
          Como obter o cookie ↗
        </a>
      </p>

      {/* Status atual */}
      {session && (
        <div className={`rounded-xl border p-4 mb-6 ${session.ativa ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-center gap-2 mb-2">
            <span className={`w-2.5 h-2.5 rounded-full ${session.ativa ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="font-medium text-sm">{session.ativa ? 'Cookie ativo' : 'Cookie expirado'}</span>
          </div>
          <div className="text-xs text-gray-600 space-y-1">
            <p>Tag: <span className="font-mono">{session.tagAfiliado}</span></p>
            <p>Último uso: {session.ultimoUso ? new Date(session.ultimoUso).toLocaleString('pt-BR') : '—'}</p>
            {session.ultimoErro && <p className="text-red-600">Erro: {session.ultimoErro}</p>}
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={save} className="bg-white rounded-xl border p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Tag de afiliado</label>
          <input
            required
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            placeholder="minha-tag-123"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Cookie de sessão</label>
          <textarea
            required
            value={cookie}
            onChange={(e) => setCookie(e.target.value)}
            rows={5}
            placeholder="Cole aqui o conteúdo do header Cookie copiado do DevTools..."
            className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          <p className="text-xs text-gray-400 mt-1">
            ⚠️ O cookie é armazenado em texto plano. Não compartilhe este acesso.
          </p>
        </div>
        {message && <p className="text-sm">{message}</p>}
        <button
          type="submit"
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {saving ? 'Salvando…' : 'Salvar cookie'}
        </button>
      </form>
    </div>
  )
}
