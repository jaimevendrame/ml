'use client'

import { createAuthClient } from 'better-auth/react'
import { useRouter } from 'next/navigation'

const { signOut } = createAuthClient()

export function SignOutButton() {
  const router = useRouter()
  return (
    <button
      onClick={async () => {
        await signOut()
        router.push('/login')
      }}
      className="px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100 text-left w-full"
    >
      Sair
    </button>
  )
}
