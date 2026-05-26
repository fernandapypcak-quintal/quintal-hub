'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleLogin() {
    if (!email || !password) {
      setError('Preencha email e senha.')
      return
    }
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Email ou senha incorretos.')
      setLoading(false)
    } else {
      router.push('/hub')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0f1c0f 0%, #1a2e1a 50%, #0f1c0f 100%)' }}>
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: `radial-gradient(circle at 25px 25px, #4ade80 2px, transparent 0)`,
        backgroundSize: '50px 50px'
      }} />

      <div className="relative z-10 w-full max-w-md px-8">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ background: 'linear-gradient(135deg, #16a34a, #4ade80)' }}>
            <span className="text-2xl">🌿</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Quintal HUB</h1>
          <p className="text-sm mt-2" style={{ color: '#6b9e6b' }}>Central de dashboards</p>
        </div>

        <div className="rounded-2xl p-8" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(74,222,128,0.15)', backdropFilter: 'blur(20px)' }}>
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-semibold mb-2 uppercase tracking-widest" style={{ color: '#4ade80' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="seu@email.com"
                className="w-full px-4 py-3 rounded-xl text-white placeholder-gray-600 outline-none transition-all"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(74,222,128,0.2)' }}
                onFocus={e => e.target.style.borderColor = 'rgba(74,222,128,0.6)'}
                onBlur={e => e.target.style.borderColor = 'rgba(74,222,128,0.2)'}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-2 uppercase tracking-widest" style={{ color: '#4ade80' }}>
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl text-white placeholder-gray-600 outline-none transition-all"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(74,222,128,0.2)' }}
                onFocus={e => e.target.style.borderColor = 'rgba(74,222,128,0.6)'}
                onBlur={e => e.target.style.borderColor = 'rgba(74,222,128,0.2)'}
              />
            </div>

            {error && (
              <div className="px-4 py-3 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
                {error}
              </div>
            )}

            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-sm tracking-wide transition-all duration-200 disabled:opacity-60"
              style={{ background: loading ? 'rgba(74,222,128,0.3)' : 'linear-gradient(135deg, #16a34a, #4ade80)', color: loading ? '#4ade80' : '#0f1c0f' }}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </div>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: '#374e37' }}>
          Acesso restrito — apenas usuários autorizados
        </p>
      </div>
    </div>
  )
}
