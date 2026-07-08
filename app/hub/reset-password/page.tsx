'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()

  async function handleReset() {
    if (!password || !confirm) { setError('Preencha os dois campos.'); return }
    if (password !== confirm) { setError('As senhas não coincidem.'); return }
    if (password.length < 6) { setError('A senha deve ter pelo menos 6 caracteres.'); return }
    setLoading(true); setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) setError('Não foi possível atualizar a senha. Tente novamente.')
    else { setSuccess('Senha atualizada com sucesso!'); setTimeout(() => router.push('/hub'), 2000) }
  }

  const inputStyle: React.CSSProperties = {
    background: '#FFFFFF', border: '1.5px solid #E0E0D8', color: '#0D0D0D',
    borderRadius: '8px', padding: '12px 16px', width: '100%', fontSize: '14px',
    fontFamily: 'var(--font-dm-sans)', outline: 'none', transition: 'border-color 0.15s', boxSizing: 'border-box',
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAFAF8' }}>
      <div style={{ position: 'absolute', inset: 0, opacity: 0.4, backgroundImage: `radial-gradient(circle at 1px 1px, #97A62422 1px, transparent 0)`, backgroundSize: '32px 32px' }} />
      <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '420px', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '80px', height: '80px', borderRadius: '20px', overflow: 'hidden', background: '#FFFFFF', border: '2px solid #E8EDD4', marginBottom: '16px', boxShadow: '0 4px 20px rgba(151,166,36,0.15)' }}>
            <Image src="/quintal-tree.jpg" alt="Quintal" width={80} height={80} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#0D0D0D', margin: '0 0 4px' }}>Quintal HUB</h1>
          <p style={{ fontSize: '13px', color: '#888880', margin: 0 }}>Redefinição de senha</p>
        </div>
        <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '32px', border: '1px solid #E8E8E0', boxShadow: '0 2px 24px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#97A624', marginBottom: '8px' }}>Nova senha</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#97A624'} onBlur={e => e.target.style.borderColor = '#E0E0D8'} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#97A624', marginBottom: '8px' }}>Confirmar nova senha</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleReset()} placeholder="••••••••" style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#97A624'} onBlur={e => e.target.style.borderColor = '#E0E0D8'} />
            </div>
            {error && <div style={{ padding: '12px 16px', borderRadius: '8px', fontSize: '13px', background: '#FDF2F2', border: '1px solid #F5C6C6', color: '#8C1414' }}>{error}</div>}
            {success && <div style={{ padding: '12px 16px', borderRadius: '8px', fontSize: '13px', background: '#F5F8E8', border: '1px solid #C8D870', color: '#5C6A00' }}>{success}</div>}
            <button onClick={handleReset} disabled={loading} style={{
              width: '100%', padding: '13px', borderRadius: '8px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
              background: loading ? '#C5D06E' : '#97A624', color: '#FFFFFF', fontSize: '14px', fontWeight: '600', fontFamily: 'var(--font-dm-sans)'
            }}>
              {loading ? 'Salvando...' : 'Salvar nova senha'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
