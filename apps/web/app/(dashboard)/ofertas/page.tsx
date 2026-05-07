'use client'

import { useEffect, useState, useCallback } from 'react'

type Status = 'pendente' | 'pronto' | 'enviada' | 'rejeitada' | 'expirada'

interface Oferta {
  id: string
  mlItemId: string
  titulo: string
  precoAtual: string
  precoOriginal: string | null
  descontoPct: number | null
  imagemUrl: string | null
  permalink: string
  linkAfiliado: string | null
  status: Status
  coletadoEm: string
}

interface Grupo { id: string; nome: string; jid: string }

const STATUS_COLOR: Record<Status, string> = {
  pendente: 'bg-yellow-100 text-yellow-800',
  pronto: 'bg-green-100 text-green-800',
  enviada: 'bg-blue-100 text-blue-800',
  rejeitada: 'bg-red-100 text-red-800',
  expirada: 'bg-gray-100 text-gray-600',
}

export default function OfertasPage() {
  const [ofertas, setOfertas] = useState<Oferta[]>([])
  const [grupos, setGrupos] = useState<Grupo[]>([])
  const [filter, setFilter] = useState<Status | 'todas'>('todas')
  const [loading, setLoading] = useState(false)
  const [collecting, setCollecting] = useState(false)
  const [publishModal, setPublishModal] = useState<Oferta | null>(null)
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const url = filter === 'todas' ? '/api/ofertas' : `/api/ofertas?status=${filter}`
    const res = await fetch(url)
    if (res.ok) setOfertas(await res.json())
    setLoading(false)
  }, [filter])

  useEffect(() => { load() }, [load])

  async function coletar() {
    setCollecting(true)
    setMessage('')
    const res = await fetch('/api/ofertas/coletar', { method: 'POST' })
    const data = await res.json()
    setMessage(res.ok ? `✅ ${data.novas} novas, ${data.coletadas} coletadas` : `❌ ${data.error}`)
    setCollecting(false)
    load()
  }

  async function publicar(ofertaId: string, grupoId: string) {
    const res = await fetch(`/api/ofertas/${ofertaId}/publicar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grupoId }),
    })
    const data = await res.json()
    setMessage(res.ok ? '✅ Publicada!' : `❌ ${data.error}`)
    setPublishModal(null)
    load()
  }

  async function openPublishModal(oferta: Oferta) {
    if (!grupos.length) {
      const res = await fetch('/api/grupos')
      if (res.ok) setGrupos(await res.json())
    }
    setPublishModal(oferta)
  }

  const visible = ofertas
  const statuses: Array<Status | 'todas'> = ['todas', 'pendente', 'pronto', 'enviada', 'rejeitada', 'expirada']

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold flex-1">Ofertas</h1>
        <button
          onClick={coletar}
          disabled={collecting}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {collecting ? 'Coletando…' : '⚡ Coletar agora'}
        </button>
      </div>
      {message && <p className="mb-4 text-sm">{message}</p>}

      {/* Filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {statuses.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium border ${filter === s ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-500">Carregando…</p>
      ) : visible.length === 0 ? (
        <p className="text-gray-400 text-sm">Nenhuma oferta. Clique em "Coletar agora".</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {visible.map((o) => (
            <div key={o.id} className="bg-white rounded-xl border p-4 flex flex-col gap-2">
              <div className="flex gap-3">
                {o.imagemUrl && (
                  <img src={o.imagemUrl} alt="" className="w-16 h-16 object-contain rounded" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium line-clamp-2">{o.titulo}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-blue-600 font-bold text-sm">R$ {o.precoAtual}</span>
                    {o.precoOriginal && (
                      <span className="text-gray-400 line-through text-xs">R$ {o.precoOriginal}</span>
                    )}
                    {o.descontoPct && (
                      <span className="bg-red-100 text-red-700 text-xs px-1.5 py-0.5 rounded-full font-medium">
                        -{o.descontoPct}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-auto pt-2 border-t">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[o.status]}`}>
                  {o.status}
                </span>
                <a
                  href={o.permalink}
                  target="_blank"
                  rel="noopener"
                  className="text-xs text-blue-500 hover:underline ml-auto"
                >
                  ML ↗
                </a>
                {o.status === 'pronto' && (
                  <button
                    onClick={() => openPublishModal(o)}
                    className="text-xs bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded"
                  >
                    Publicar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Publish modal */}
      {publishModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-96">
            <h2 className="font-bold mb-1">Publicar oferta</h2>
            <p className="text-sm text-gray-500 mb-4 line-clamp-1">{publishModal.titulo}</p>
            <p className="text-sm font-medium mb-2">Selecionar grupo:</p>
            {grupos.length === 0 ? (
              <p className="text-sm text-gray-400">Nenhum grupo ativo. Configure em Grupos.</p>
            ) : (
              <ul className="space-y-2 mb-4">
                {grupos.map((g) => (
                  <li key={g.id}>
                    <button
                      onClick={() => publicar(publishModal.id, g.id)}
                      className="w-full text-left px-3 py-2 rounded-lg border hover:bg-gray-50 text-sm"
                    >
                      {g.nome}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button
              onClick={() => setPublishModal(null)}
              className="w-full text-sm text-gray-500 hover:text-gray-700 mt-2"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
