'use client'

import { useEffect, useState, useRef } from 'react'

interface WaGroup { jid: string; name: string }
interface Grupo { id: string; nome: string; jid: string; ativo: boolean; janelaInicio: number; janelaFim: number; intervaloMinMinutos: number }

export default function GruposPage() {
  const [status, setStatus] = useState<string>('unknown')
  const [qr, setQr] = useState<string | null>(null)
  const [waGroups, setWaGroups] = useState<WaGroup[]>([])
  const [grupos, setGrupos] = useState<Grupo[]>([])
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  async function pollStatus() {
    try {
      const res = await fetch('/api/whatsapp/status')
      if (res.ok) {
        const d = await res.json()
        setStatus(d.status)
        if (d.status === 'connected') {
          setQr(null)
          // Load WA groups when connected
          const gr = await fetch('/api/whatsapp/qr')
          if (gr.ok) {
            const qd = await gr.json()
            if (qd.groups) setWaGroups(qd.groups)
          }
        }
      }
    } catch {}
  }

  async function loadQR() {
    const res = await fetch('/api/whatsapp/qr')
    if (res.ok) {
      const d = await res.json()
      setQr(d.qr)
      setStatus(d.status)
    }
  }

  async function loadGrupos() {
    const res = await fetch('/api/grupos')
    if (res.ok) setGrupos(await res.json())
  }

  useEffect(() => {
    loadQR()
    loadGrupos()
    pollRef.current = setInterval(pollStatus, 5_000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  async function toggleGrupo(id: string, ativo: boolean) {
    await fetch(`/api/grupos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ativo: !ativo }),
    })
    loadGrupos()
  }

  async function addGrupo(jid: string, nome: string) {
    await fetch('/api/grupos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jid, nome }),
    })
    loadGrupos()
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Grupos WhatsApp</h1>

      {/* Connection status */}
      <div className="bg-white rounded-xl border p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <span className={`w-3 h-3 rounded-full ${status === 'connected' ? 'bg-green-500' : status === 'waiting_qr' ? 'bg-yellow-500 animate-pulse' : 'bg-gray-300'}`} />
          <span className="font-medium capitalize">{status.replace('_', ' ')}</span>
        </div>

        {qr && status === 'waiting_qr' && (
          <div>
            <p className="text-sm text-gray-500 mb-3">Escaneie o QR code com o WhatsApp:</p>
            {/* Render QR as text — frontend can use a QR lib if needed */}
            <div className="bg-gray-50 rounded-lg p-4 font-mono text-xs break-all text-gray-700 max-w-sm">
              {qr}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Use um app como qr-creator para renderizar ou instale a lib qrcode no frontend.
            </p>
          </div>
        )}

        {status === 'connected' && (
          <p className="text-sm text-green-600">✓ WhatsApp conectado</p>
        )}
      </div>

      {/* WA groups from whatsmeow */}
      {waGroups.length > 0 && (
        <div className="bg-white rounded-xl border p-6 mb-6">
          <h2 className="font-semibold mb-3">Grupos detectados ({waGroups.length})</h2>
          <ul className="space-y-2">
            {waGroups.map((g) => {
              const alreadyAdded = grupos.some((gr) => gr.jid === g.jid)
              return (
                <li key={g.jid} className="flex items-center gap-3">
                  <span className="text-sm flex-1">{g.name}</span>
                  <span className="text-xs text-gray-400 font-mono">{g.jid}</span>
                  {!alreadyAdded && (
                    <button
                      onClick={() => addGrupo(g.jid, g.name)}
                      className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                    >
                      Adicionar
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* Configured grupos */}
      {grupos.length > 0 && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Nome</th>
                <th className="text-left px-4 py-3 font-medium">Janela</th>
                <th className="text-left px-4 py-3 font-medium">Intervalo</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {grupos.map((g) => (
                <tr key={g.id} className={g.ativo ? '' : 'opacity-50'}>
                  <td className="px-4 py-3 font-medium">{g.nome}</td>
                  <td className="px-4 py-3 text-gray-500">{g.janelaInicio}h – {g.janelaFim}h</td>
                  <td className="px-4 py-3 text-gray-500">{g.intervaloMinMinutos} min</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => toggleGrupo(g.id, g.ativo)}
                      className="text-xs px-2 py-1 rounded border hover:bg-gray-50"
                    >
                      {g.ativo ? 'Desativar' : 'Ativar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
