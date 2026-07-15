'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

type Mode = 'login' | 'reset'

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()

  async function handleLogin() {
    if (!email || !password) { setError('Preencha email e senha.'); return }
    setLoading(true); setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError('Email ou senha incorretos.'); setLoading(false) }
    else { router.push('/hub'); router.refresh() }
  }

  async function handleReset() {
    if (!email) { setError('Digite seu email para redefinir a senha.'); return }
    setLoading(true); setError(''); setSuccess('')
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/hub/reset-password`,
    })
    setLoading(false)
    if (error) setError('Não foi possível enviar o email. Tente novamente.')
    else setSuccess('Email enviado! Verifique sua caixa de entrada.')
  }

  const inputStyle: React.CSSProperties = {
    background: '#FFFFFF',
    border: '1.5px solid #E0E0D8',
    color: '#0D0D0D',
    borderRadius: '8px',
    padding: '12px 16px',
    width: '100%',
    fontSize: '14px',
    fontFamily: 'var(--font-dm-sans)',
    outline: 'none',
    transition: 'border-color 0.15s',
    boxSizing: 'border-box',
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAFAF8' }}>
      {/* Subtle pattern */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.4,
        backgroundImage: `radial-gradient(circle at 1px 1px, #97A62422 1px, transparent 0)`,
        backgroundSize: '32px 32px'
      }} />

      <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '420px', padding: '0 24px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '80px', height: '80px', borderRadius: '20px', overflow: 'hidden', background: '#FFFFFF', border: '2px solid #E8EDD4', marginBottom: '16px', boxShadow: '0 4px 20px rgba(151,166,36,0.15)' }}>
            <Image src="/quintal-tree.jpg" alt="Quintal" width={80} height={80} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#0D0D0D', margin: '0 0 4px', letterSpacing: '-0.5px' }}>Quintal HUB</h1>
          <p style={{ fontSize: '13px', color: '#888880', margin: 0 }}>Central de dashboards</p>
        </div>

        {/* Card */}
        <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '32px', border: '1px solid #E8E8E0', boxShadow: '0 2px 24px rgba(0,0,0,0.06)' }}>
          {mode === 'login' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#97A624', marginBottom: '8px' }}>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  placeholder="seu@email.com" style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#97A624'}
                  onBlur={e => e.target.style.borderColor = '#E0E0D8'}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#97A624', marginBottom: '8px' }}>Senha</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  placeholder="••••••••" style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#97A624'}
                  onBlur={e => e.target.style.borderColor = '#E0E0D8'}
                />
              </div>

              {error && <div style={{ padding: '12px 16px', borderRadius: '8px', fontSize: '13px', background: '#FDF2F2', border: '1px solid #F5C6C6', color: '#8C1414' }}>{error}</div>}

              <button onClick={handleLogin} disabled={loading} style={{
                width: '100%', padding: '13px', borderRadius: '8px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                background: loading ? '#C5D06E' : '#97A624', color: '#FFFFFF',
                fontSize: '14px', fontWeight: '600', fontFamily: 'var(--font-dm-sans)', letterSpacing: '0.02em', transition: 'all 0.15s'
              }}>
                {loading ? 'Entrando...' : 'Entrar'}
              </button>

              <button onClick={() => { setMode('reset'); setError(''); setSuccess('') }} style={{
                background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#AAAAAA', textAlign: 'center', fontFamily: 'var(--font-dm-sans)'
              }}
                onMouseEnter={e => (e.target as HTMLElement).style.color = '#97A624'}
                onMouseLeave={e => (e.target as HTMLElement).style.color = '#AAAAAA'}>
                Esqueci minha senha
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontWeight: '600', color: '#0D0D0D', margin: '0 0 4px' }}>Redefinir senha</p>
                <p style={{ fontSize: '13px', color: '#888880', margin: 0 }}>Enviaremos um link para o seu email</p>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#97A624', marginBottom: '8px' }}>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleReset()}
                  placeholder="seu@email.com" style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#97A624'}
                  onBlur={e => e.target.style.borderColor = '#E0E0D8'}
                />
              </div>

              {error && <div style={{ padding: '12px 16px', borderRadius: '8px', fontSize: '13px', background: '#FDF2F2', border: '1px solid #F5C6C6', color: '#8C1414' }}>{error}</div>}
              {success && <div style={{ padding: '12px 16px', borderRadius: '8px', fontSize: '13px', background: '#F5F8E8', border: '1px solid #C8D870', color: '#5C6A00' }}>{success}</div>}

              <button onClick={handleReset} disabled={loading} style={{
                width: '100%', padding: '13px', borderRadius: '8px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                background: loading ? '#C5D06E' : '#97A624', color: '#FFFFFF',
                fontSize: '14px', fontWeight: '600', fontFamily: 'var(--font-dm-sans)', transition: 'all 0.15s'
              }}>
                {loading ? 'Enviando...' : 'Enviar link de redefinição'}
              </button>

              <button onClick={() => { setMode('login'); setError(''); setSuccess('') }} style={{
                background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#AAAAAA', textAlign: 'center', fontFamily: 'var(--font-dm-sans)'
              }}
                onMouseEnter={e => (e.target as HTMLElement).style.color = '#97A624'}
                onMouseLeave={e => (e.target as HTMLElement).style.color = '#AAAAAA'}>
                ← Voltar ao login
              </button>
            </div>
          )}
        </div>

        <p style={{ textAlign: 'center', fontSize: '12px', color: '#CCCCCC', marginTop: '24px' }}>
          Acesso restrito — apenas usuários autorizados
        </p>
      </div>
    </div>
  )
}
