'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { DASHBOARDS } from '@/lib/dashboards'

// ── Types ─────────────────────────────────────────────────────
type User = {
  id: string
  email: string
  created_at: string
  last_sign_in: string | null
  permissao: string[] | '*'
  isAdmin: boolean
}

// ── Helpers ───────────────────────────────────────────────────
function fmtDate(s: string | null) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function PermBadge({ perm }: { perm: string[] | '*' }) {
  if (perm === '*') return (
    <span style={{ background: '#E8F5E9', color: '#1B5E20', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, border: '1px solid #A5D6A7' }}>
      ★ Todos
    </span>
  )
  if (!perm || perm.length === 0) return (
    <span style={{ background: '#FFF3E0', color: '#E65100', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, border: '1px solid #FFCC80' }}>
      Sem acesso
    </span>
  )
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {perm.map(p => {
        const dash = DASHBOARDS.find(d => d.id === p)
        return (
          <span key={p} style={{ background: `${dash?.color || '#97A624'}18`, color: dash?.color || '#97A624', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, border: `1px solid ${dash?.color || '#97A624'}40` }}>
            {dash?.name || p}
          </span>
        )
      })}
    </div>
  )
}

// ── Modal Novo Usuário ────────────────────────────────────────
function ModalNovoUsuario({ onClose, onSave }: { onClose: () => void; onSave: (email: string, senha: string, perm: string[] | '*') => Promise<void> }) {
  const [email,   setEmail]   = useState('')
  const [senha,   setSenha]   = useState('Quintal@2026')
  const [perm,    setPerm]    = useState<string[] | '*'>([])
  const [loading, setLoading] = useState(false)
  const [erro,    setErro]    = useState('')

  const toggleDash = (id: string) => {
    if (perm === '*') return
    setPerm(prev => {
      const arr = prev as string[]
      return arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id]
    })
  }

  const handleSave = async () => {
    if (!email) { setErro('Email obrigatório'); return }
    if (!email.includes('@quintaldoespeto.com.br')) { setErro('Email deve ser @quintaldoespeto.com.br'); return }
    if (!senha || senha.length < 8) { setErro('Senha mínima de 8 caracteres'); return }
    setLoading(true); setErro('')
    try { await onSave(email, senha, perm); onClose() }
    catch (e: any) { setErro(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: '#0D0D0D', margin: '0 0 20px', letterSpacing: '-0.3px' }}>Novo usuário</h2>

        {/* Email */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 6 }}>Email corporativo</label>
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="nome@quintaldoespeto.com.br"
            style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #E0E0DA', fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
        </div>

        {/* Senha */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 6 }}>Senha inicial</label>
          <input value={senha} onChange={e => setSenha(e.target.value)} type="text"
            style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #E0E0DA', fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
        </div>

        {/* Permissões */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 8 }}>Acesso aos dashboards</label>

          {/* Todos */}
          <button onClick={() => setPerm(perm === '*' ? [] : '*')}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: `2px solid ${perm === '*' ? '#97A624' : '#E0E0DA'}`, background: perm === '*' ? '#F5F8E8' : '#fff', marginBottom: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: perm === '*' ? '#4F6B14' : '#888', textAlign: 'left' }}>
            {perm === '*' ? '★' : '☆'} Acesso total (todos os dashboards)
          </button>

          {/* Individual */}
          {perm !== '*' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {DASHBOARDS.filter(d => d.internalPath).map(d => {
                const sel = (perm as string[]).includes(d.id)
                return (
                  <button key={d.id} onClick={() => toggleDash(d.id)}
                    style={{ padding: '7px 10px', borderRadius: 8, border: `2px solid ${sel ? d.color : '#E0E0DA'}`, background: sel ? `${d.color}12` : '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: sel ? d.color : '#888', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: sel ? d.color : '#CCC', flexShrink: 0 }} />
                    {d.name}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {erro && <p style={{ fontSize: 12, color: '#C62828', marginBottom: 12 }}>{erro}</p>}

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #E0E0DA', background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#888' }}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={loading}
            style={{ flex: 2, padding: '10px', borderRadius: 8, border: 'none', background: '#97A624', cursor: loading ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700, color: '#fff', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Criando...' : 'Criar usuário'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal Editar Permissões ───────────────────────────────────
function ModalEditarPermissoes({ user, onClose, onSave }: { user: User; onClose: () => void; onSave: (email: string, perm: string[] | '*', isAdmin: boolean) => Promise<void> }) {
  const [perm,        setPerm]       = useState<string[] | '*'>(user.permissao)
  const [isAdminUser, setIsAdminUser] = useState(user.isAdmin)
  const [loading,     setLoading]    = useState(false)
  const [erro,        setErro]       = useState('')

  const toggleDash = (id: string) => {
    if (perm === '*') return
    setPerm(prev => {
      const arr = prev as string[]
      return arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id]
    })
  }

  const handleSave = async () => {
    setLoading(true); setErro('')
    try { await onSave(user.email, perm, isAdminUser); onClose() }
    catch (e: any) { setErro(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: '#0D0D0D', margin: '0 0 4px', letterSpacing: '-0.3px' }}>Editar permissões</h2>
        <p style={{ fontSize: 13, color: '#888', margin: '0 0 20px' }}>{user.email}</p>

        {/* Todos */}
        <button onClick={() => setPerm(perm === '*' ? [] : '*')}
          style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: `2px solid ${perm === '*' ? '#97A624' : '#E0E0DA'}`, background: perm === '*' ? '#F5F8E8' : '#fff', marginBottom: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: perm === '*' ? '#4F6B14' : '#888', textAlign: 'left' }}>
          {perm === '*' ? '★' : '☆'} Acesso total (todos os dashboards)
        </button>

        {/* Toggle Admin */}
        <div style={{ marginBottom: 14 }}>
          <button onClick={() => setIsAdminUser(!isAdminUser)}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: `2px solid ${isAdminUser ? '#97A624' : '#E0E0DA'}`, background: isAdminUser ? '#F5F8E8' : '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: isAdminUser ? '#4F6B14' : '#888', textAlign: 'left' }}>
            {isAdminUser ? '⚙️ Admin — acesso ao painel de administração' : '○ Sem acesso ao painel de admin'}
          </button>
        </div>

        {perm !== '*' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 20 }}>
            {DASHBOARDS.filter(d => d.internalPath).map(d => {
              const sel = (perm as string[]).includes(d.id)
              return (
                <button key={d.id} onClick={() => toggleDash(d.id)}
                  style={{ padding: '7px 10px', borderRadius: 8, border: `2px solid ${sel ? d.color : '#E0E0DA'}`, background: sel ? `${d.color}12` : '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: sel ? d.color : '#888', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: sel ? d.color : '#CCC', flexShrink: 0 }} />
                  {d.name}
                </button>
              )
            })}
          </div>
        )}

        {erro && <p style={{ fontSize: 12, color: '#C62828', marginBottom: 12 }}>{erro}</p>}

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #E0E0DA', background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#888' }}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={loading}
            style={{ flex: 2, padding: '10px', borderRadius: 8, border: 'none', background: '#97A624', cursor: loading ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700, color: '#fff', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Salvando...' : 'Salvar permissões'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Página Admin ──────────────────────────────────────────────
export default function AdminPage() {
  const [users,   setUsers]   = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [erro,    setErro]    = useState('')
  const [toast,   setToast]   = useState('')
  const [modalNovo,   setModalNovo]   = useState(false)
  const [modalEditar, setModalEditar] = useState<User | null>(null)
  const [confirmDel,  setConfirmDel]  = useState<User | null>(null)
  const [expandido,   setExpandido]   = useState<string | null>(null)
  const [accessLogs,  setAccessLogs]  = useState<Record<string, {dashboard: string, accessed_at: string}[]>>({})

  // Permissões locais (editáveis sem deploy)
  const [permissoes, setPermissoes] = useState<Record<string, string[] | '*'>>({})

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const loadUsers = useCallback(async () => {
    setLoading(true)
    try {
      const [resUsers, resPerms, resLogs] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/admin/permissions'),
        fetch('/api/log-access'),
      ])
      const dataUsers = await resUsers.json()
      const dataPerms = await resPerms.json()
      const dataLogs  = await resLogs.json()

      // Agrupa logs por email — últimos 5 acessos por usuário
      const logsMap: Record<string, {dashboard: string, accessed_at: string}[]> = {}
      for (const log of (dataLogs.logs || [])) {
        if (!logsMap[log.email]) logsMap[log.email] = []
        if (logsMap[log.email].length < 5) logsMap[log.email].push(log)
      }
      setAccessLogs(logsMap)
      if (dataUsers.erro) throw new Error(dataUsers.erro)
      setPermissoes(dataPerms.permissions || {})
      // Merge permissões locais nos users
      const merged = (dataUsers.users as User[]).map(u => ({
        ...u,
        permissao: dataPerms.permissions?.[u.email] ?? [],
      }))
      setUsers(merged.sort((a, b) => a.email.localeCompare(b.email)))
    } catch (e: any) {
      setErro(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadUsers() }, [loadUsers])

  // Criar usuário
  const criarUsuario = async (email: string, senha: string, perm: string[] | '*') => {
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha }),
    })
    const data = await res.json()
    if (data.erro) throw new Error(data.erro)
    showToast(`✅ Usuário ${email} criado! Lembre de atualizar as permissões no código.`)
    await loadUsers()
  }

  // Resetar senha
  const resetarSenha = async (user: User) => {
    const novaSenha = prompt(`Nova senha para ${user.email}:`, 'Quintal@2026')
    if (!novaSenha) return
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, senha: novaSenha }),
    })
    const data = await res.json()
    if (data.erro) { alert('Erro: ' + data.erro); return }
    showToast(`✅ Senha de ${user.email} atualizada!`)
  }

  // Deletar usuário
  const deletarUsuario = async (user: User) => {
    const res = await fetch('/api/admin/users', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id }),
    })
    const data = await res.json()
    if (data.erro) { alert('Erro: ' + data.erro); return }
    showToast(`🗑️ Usuário ${user.email} removido!`)
    setConfirmDel(null)
    await loadUsers()
  }

  // Salvar permissões no Supabase
  const salvarPermissoes = async (email: string, perm: string[] | '*', isAdminUser?: boolean) => {
    const res = await fetch('/api/admin/permissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, permissao: perm, isAdmin: isAdminUser ?? false }),
    })
    const data = await res.json()
    if (data.erro) throw new Error(data.erro)
    // Atualiza localmente
    setUsers(prev => prev.map(u => u.email === email ? { ...u, permissao: perm } : u))
    showToast(`✅ Permissões de ${email} salvas!`)
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#FAFAF8', flexDirection: 'column' }}>

      {/* Barra superior */}
      <div className="flex items-center gap-3 px-4 py-2 bg-brand-black border-b border-zinc-800">
        <Link href="/hub" className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-white transition-colors">
          ← Voltar ao HUB
        </Link>
        <span className="text-zinc-700 text-xs">|</span>
        <span className="text-xs text-zinc-500">Admin</span>
      </div>

      {/* Header verde */}
      <div style={{ background: 'linear-gradient(135deg, #4F6B14 0%, #97A624 100%)', borderBottom: '1px solid #3d5210', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
            ⚙️
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', letterSpacing: '-0.3px' }}>Administração</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 1 }}>Quintal HUB · Gestão de usuários e acessos</div>
          </div>
        </div>
        <button onClick={() => setModalNovo(true)}
          style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, padding: '8px 16px', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          + Novo usuário
        </button>
      </div>

      {/* Conteúdo */}
      <div style={{ flex: 1, padding: '24px 16px', maxWidth: 900, margin: '0 auto', width: '100%' }}>



        {/* Erro */}
        {erro && (
          <div style={{ background: '#FFEBEE', border: '1px solid #EF9A9A', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#C62828' }}>
            {erro === 'Acesso negado' ? '🔒 Acesso restrito a administradores.' : `Erro: ${erro}`}
          </div>
        )}

        {/* Tabela */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#888', fontSize: 14 }}>Carregando usuários...</div>
        ) : (
          <div style={{ background: '#fff', border: '1px solid #E8E8E2', borderRadius: 12, overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 120px 120px', gap: 0, borderBottom: '1px solid #E8E8E2', padding: '10px 16px', background: '#F8F8F5' }}>
              {['Usuário', 'Último acesso', 'Acesso', 'Ações'].map(h => (
                <div key={h} style={{ fontSize: 10, fontWeight: 700, color: '#ABABAB', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</div>
              ))}
            </div>

            {/* Linhas */}
            {users.map((u, i) => (
              <div key={u.id} style={{ display: 'grid', gridTemplateColumns: '1fr 160px 120px 120px', gap: 0, padding: '12px 16px', borderBottom: i < users.length - 1 ? '1px solid #F0F0EC' : 'none', alignItems: 'center', background: i % 2 === 0 ? '#fff' : '#FAFAF8' }}>
                {/* Email */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0D0D0D' }}>{u.email}</div>
                    {u.isAdmin && <span style={{ fontSize: 10, fontWeight: 700, color: '#4F6B14', background: '#E8F5E9', padding: '1px 6px', borderRadius: 10, border: '1px solid #A5D6A7' }}>ADMIN</span>}
                  </div>
                  <div style={{ marginTop: 4 }}><PermBadge perm={u.permissao} /></div>
                </div>

                {/* Último acesso */}
                <div style={{ fontSize: 11, color: '#ABABAB', fontFamily: "'DM Mono', monospace" }}>
                  {fmtDate(u.last_sign_in)}
                </div>

                {/* Último dashboard */}
                <div>
                  {accessLogs[u.email]?.[0] ? (() => {
                    const log = accessLogs[u.email][0]
                    const dash = DASHBOARDS.find(d => d.id === log.dashboard)
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: dash?.color || '#CCC', flexShrink: 0 }} />
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#444' }}>{dash?.name || log.dashboard}</span>
                        </div>
                        <span style={{ fontSize: 10, color: '#CCCCCC', fontFamily: "'DM Mono', monospace", paddingLeft: 12 }}>
                          {fmtDate(log.accessed_at)}
                        </span>
                      </div>
                    )
                  })() : (
                    <span style={{ fontSize: 11, color: '#DDDDDD' }}>—</span>
                  )}
                </div>

                {/* Status */}
                <div>
                  {u.last_sign_in ? (
                    <span style={{ fontSize: 11, color: '#2E7D32', fontWeight: 600 }}>● Ativo</span>
                  ) : (
                    <span style={{ fontSize: 11, color: '#F57C00', fontWeight: 600 }}>○ Nunca acessou</span>
                  )}
                </div>

                {/* Ações */}
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => setModalEditar(u)} title="Editar permissões"
                    style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid #E0E0DA', background: '#fff', cursor: 'pointer', fontSize: 12 }}>
                    ✏️
                  </button>
                  <button onClick={() => resetarSenha(u)} title="Resetar senha"
                    style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid #E0E0DA', background: '#fff', cursor: 'pointer', fontSize: 12 }}>
                    🔑
                  </button>
                  <button onClick={() => setConfirmDel(u)} title="Remover usuário"
                    style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid #FFCDD2', background: '#FFF5F5', cursor: 'pointer', fontSize: 12 }}>
                    🗑️
                  </button>
                </div>
              </div>
            ))}

            {users.length === 0 && !loading && (
              <div style={{ padding: 40, textAlign: 'center', color: '#888', fontSize: 13 }}>Nenhum usuário encontrado</div>
            )}
          </div>
        )}

        <p style={{ fontSize: 11, color: '#CCCCCC', marginTop: 16, textAlign: 'center' }}>
          {users.length} usuários cadastrados · Quintal HUB Admin
        </p>
      </div>

      {/* Modais */}
      {modalNovo && <ModalNovoUsuario onClose={() => setModalNovo(false)} onSave={criarUsuario} />}
      {modalEditar && <ModalEditarPermissoes user={modalEditar} onClose={() => setModalEditar(null)} onSave={salvarPermissoes} />}

      {/* Confirmar delete */}
      {confirmDel && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, maxWidth: 380, width: '100%' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0D0D0D', margin: '0 0 8px' }}>Remover usuário?</h3>
            <p style={{ fontSize: 13, color: '#666', margin: '0 0 20px', lineHeight: 1.5 }}>
              <strong>{confirmDel.email}</strong> perderá o acesso imediatamente. Esta ação não pode ser desfeita.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setConfirmDel(null)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #E0E0DA', background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#888' }}>
                Cancelar
              </button>
              <button onClick={() => deletarUsuario(confirmDel)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: '#C62828', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#fff' }}>
                Remover
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#0D0D0D', color: '#fff', padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 500, zIndex: 200, maxWidth: '90vw', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
          {toast}
        </div>
      )}
    </div>
  )
}
