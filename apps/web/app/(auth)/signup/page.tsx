'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createAuthClient } from 'better-auth/react'

const { signUp } = createAuthClient()

export default function SignupPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signUp.email({ name, email, password, callbackURL: '/ofertas' })
      router.push('/ofertas')
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-sm bg-white rounded-xl shadow p-8">
        <h1 className="text-2xl font-bold mb-1 text-center">Criar conta</h1>
        <p className="text-sm text-gray-500 text-center mb-6">Apenas o primeiro usuário pode se cadastrar.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nome</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Senha</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50"
          >
            {loading ? 'Criando…' : 'Criar conta'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-500">
          <a href="/login" className="text-blue-600 hover:underline">Voltar ao login</a>
        </p>
      </div>
    </div>
  )
}
