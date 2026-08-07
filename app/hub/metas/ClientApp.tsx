'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { UnitId } from '@/lib/units'
import { MetasDataProvider } from './hooks/useMetasData'
import Home from './components/pages/Home'
import Admin from './components/pages/Admin'

function AppInner({ isAdmin }: { isAdmin: boolean }) {
  const [pagina, setPagina] = useState('home')

  return (
    <div className="min-h-screen bg-surface-base flex flex-col">
      <div className="flex items-center gap-3 px-4 py-2 bg-brand-black border-b border-zinc-800">
        <Link href="/hub" className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-white transition-colors">
          ← Voltar ao HUB
        </Link>
        <span className="text-zinc-700 text-xs">|</span>
        <span className="text-xs text-zinc-500">Metas</span>

        {isAdmin && (
          <div className="ml-auto flex gap-1">
            <button
              onClick={() => setPagina('home')}
              className={`text-xs px-2.5 py-1 rounded-md ${pagina === 'home' ? 'bg-white/10 text-white' : 'text-zinc-500'}`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setPagina('admin')}
              className={`text-xs px-2.5 py-1 rounded-md ${pagina === 'admin' ? 'bg-white/10 text-white' : 'text-zinc-500'}`}
            >
              Input Manual
            </button>
          </div>
        )}
      </div>

      <main className="flex-1 min-w-0 overflow-y-auto">
        {pagina === 'admin' && isAdmin ? <Admin /> : <Home />}
      </main>
    </div>
  )
}

export default function MetasClientApp({
  allowedLojas = '*',
  isAdmin = false,
}: {
  allowedLojas?: UnitId[] | '*'
  isAdmin?: boolean
}) {
  return (
    <MetasDataProvider allowedLojas={allowedLojas as any} isAdmin={isAdmin}>
      <AppInner isAdmin={isAdmin} />
    </MetasDataProvider>
  )
}
