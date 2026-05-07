'use client'

import { useEffect, useState } from 'react'

interface Categoria { id: string; nome: string; url: string; ativa: boolean; ultimaColeta: string | null }

export default function CategoriasPage() {
  const [cats, setCats] = useState<Categoria[]>([])
  const [nome, setNome] = useState('')
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)

  async function load() {
    const res = await fetch('/api/categorias')
    if (res.ok) setCats(await res.json())
  }

  useEffect(() => { load() }, [])

  async function create(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await fetch('/api/categorias', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, url }),
    })
    setNome('')
    setUrl('')
    setLoading(false)
    load()
  }

  async function toggle(id: string, ativa: boolean) {
    await fetch(`/api/categorias/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ativa: !ativa }),
    })
    load()
  }

  async function remove(id: string) {
    if (!confirm('Remover categoria?')) return
    await fetch(`/api/categorias/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Categorias</h1>

      <form onSubmit={create} className="bg-white rounded-xl border p-4 mb-6 flex gap-3 items-end">
        <div className="flex-1">
          <label className="block text-xs font-medium mb-1">Nome</label>
          <input
            required
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ofertas do Dia"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex-[2]">
          <label className="block text-xs font-medium mb-1">URL</label>
          <input
            required
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.mercadolivre.com.br/ofertas"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium shrink-0 disabled:opacity-50"
        >
          Adicionar
        </button>
      </form>

      {cats.length === 0 ? (
        <p className="text-gray-400 text-sm">Nenhuma categoria cadastrada.</p>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Nome</th>
                <th className="text-left px-4 py-3 font-medium">URL</th>
                <th className="text-left px-4 py-3 font-medium">Última coleta</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {cats.map((c) => (
                <tr key={c.id} className={c.ativa ? '' : 'opacity-50'}>
                  <td className="px-4 py-3 font-medium">{c.nome}</td>
                  <td className="px-4 py-3">
                    <a href={c.url} target="_blank" rel="noopener" className="text-blue-500 hover:underline truncate block max-w-xs">
                      {c.url}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {c.ultimaColeta ? new Date(c.ultimaColeta).toLocaleString('pt-BR') : '—'}
                  </td>
                  <td className="px-4 py-3 flex gap-2 justify-end">
                    <button
                      onClick={() => toggle(c.id, c.ativa)}
                      className="text-xs px-2 py-1 rounded border hover:bg-gray-50"
                    >
                      {c.ativa ? 'Desativar' : 'Ativar'}
                    </button>
                    <button
                      onClick={() => remove(c.id)}
                      className="text-xs px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50"
                    >
                      Remover
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
