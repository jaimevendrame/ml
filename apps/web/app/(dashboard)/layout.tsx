import Link from 'next/link'
import { SignOutButton } from '@/components/SignOutButton'

const NAV = [
  { href: '/ofertas', label: '🏷️ Ofertas' },
  { href: '/categorias', label: '📂 Categorias' },
  { href: '/grupos', label: '💬 Grupos' },
  { href: '/configuracoes/link-builder', label: '🔗 Link Builder' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-56 bg-white border-r flex flex-col p-4 gap-1 shrink-0">
        <p className="font-bold text-lg px-2 mb-4">OfertaML</p>
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className="px-3 py-2 rounded-lg text-sm hover:bg-gray-100 transition-colors"
          >
            {n.label}
          </Link>
        ))}
        <div className="mt-auto">
          <SignOutButton />
        </div>
      </aside>
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  )
}
