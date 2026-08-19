import React, { useEffect, useState } from 'react'
import { Download, RefreshCw } from 'lucide-react'
import { useRelatorios } from '../../hooks/useRelatorios.jsx'
import { exportarCSV } from '../ui/exportar.js'

const CHAVE_COOLDOWN = 'quintalHub_ultimoPedidoAtualizacao'
const COOLDOWN_MS = 5 * 60 * 1000 // 5 min -- mesmo tempo do cooldown no Apps Script

export default function Header({ title, subtitle, dadosExport, nomeArquivoExport }) {
  const {
    unidadeFiltro, setUnidadeFiltro, unidadesDisponiveis,
    dataInicio, setDataInicio, dataFim, setDataFim,
    avisoDadosDesatualizados,
  } = useRelatorios()

  const [atualizando, setAtualizando] = useState(false)
  const [mensagemAtualizacao, setMensagemAtualizacao] = useState('')
  const [emCooldown, setEmCooldown] = useState(false)

  // Ao carregar a página, confere se já pedimos uma atualização há pouco
  // tempo (persistido no navegador) -- assim, mesmo recarregando a página,
  // o botão continua bloqueado até o cooldown acabar, evitando empilhar
  // vários pedidos de atualização em cima de uma que ainda está rodando.
  useEffect(() => {
    const verificarCooldown = () => {
      const ultimo = Number(localStorage.getItem(CHAVE_COOLDOWN) || 0)
      const restante = COOLDOWN_MS - (Date.now() - ultimo)
      setEmCooldown(restante > 0)
      return restante
    }
    const restante = verificarCooldown()
    if (restante > 0) {
      const timer = setTimeout(() => setEmCooldown(false), restante)
      return () => clearTimeout(timer)
    }
  }, [])

  async function handleAtualizar() {
    setAtualizando(true)
    setMensagemAtualizacao('')

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 15000)

    try {
      const res = await fetch('/api/relatorios?tipo=atualizar', { signal: controller.signal })
      clearTimeout(timer)

      if (!res.ok) {
        setMensagemAtualizacao(`O Apps Script não respondeu a tempo (erro ${res.status}). Provavelmente já tem uma atualização rodando -- espera uns minutos e tenta de novo.`)
        return
      }

      let data
      try {
        data = await res.json()
      } catch {
        setMensagemAtualizacao('O Apps Script não devolveu uma resposta válida -- provavelmente está ocupado rodando uma atualização anterior. Espera uns minutos e tenta de novo.')
        return
      }

      setMensagemAtualizacao(
        data.mensagem || (data.ok ? 'Atualização iniciada — recarregue a página em alguns minutos.' : 'Não foi possível atualizar agora.')
      )

      // Só entra em cooldown se o pedido foi de fato aceito (ok: true) --
      // se veio erro (ex: cooldown do próprio servidor), não precisa
      // bloquear de novo aqui.
      if (data.ok) {
        localStorage.setItem(CHAVE_COOLDOWN, String(Date.now()))
        setEmCooldown(true)
        setTimeout(() => setEmCooldown(false), COOLDOWN_MS)
      }
    } catch (e) {
      clearTimeout(timer)
      setMensagemAtualizacao('Não deu pra falar com o Apps Script agora (demorou demais pra responder). Provavelmente já tem uma atualização rodando -- espera uns minutos.')
    } finally {
      setAtualizando(false)
      setTimeout(() => setMensagemAtualizacao(''), 15000)
    }
  }

  const sel = (ativo) => ({
    appearance: 'none', WebkitAppearance: 'none',
    padding: '0 28px 0 12px', height: 32,
    border: ativo ? '1px solid #1a1a1a' : '1px solid #E8E8E8',
    borderRadius: 99, fontSize: 12.5,
    color: ativo ? '#1a1a1a' : '#666',
    background: '#fff', cursor: 'pointer', outline: 'none',
    fontFamily: 'inherit', fontWeight: ativo ? 600 : 400,
  })

  const dateInput = (ativo) => ({
    padding: '0 10px', height: 32,
    border: ativo ? '1px solid #1a1a1a' : '1px solid #E8E8E8',
    borderRadius: 99, fontSize: 12.5,
    color: ativo ? '#1a1a1a' : '#666',
    background: '#fff', outline: 'none',
    fontFamily: 'inherit', fontWeight: ativo ? 600 : 400,
  })

  return (
    <>
    <header style={{
      background: '#fff', borderBottom: '1px solid #F0F0F0',
      padding: '12px 28px',
      position: 'sticky', top: 0, zIndex: 20,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
      flexWrap: 'wrap',
    }}>
      <div>
        <h1 style={{ fontSize: 19, fontWeight: 700, color: '#1a1a1a', margin: 0, lineHeight: 1.2 }}>{title}</h1>
        {subtitle && <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>{subtitle}</div>}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <input
          type="date"
          value={dataInicio}
          onChange={e => setDataInicio(e.target.value)}
          style={dateInput(!!dataInicio)}
          title="Data início"
        />
        <span style={{ fontSize: 12, color: '#BBB' }}>até</span>
        <input
          type="date"
          value={dataFim}
          onChange={e => setDataFim(e.target.value)}
          style={dateInput(!!dataFim)}
          title="Data fim"
        />
        {(dataInicio || dataFim) && (
          <button
            onClick={() => { setDataInicio(''); setDataFim('') }}
            style={{ border: 'none', background: 'none', color: '#999', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}
          >
            limpar
          </button>
        )}

        <div style={{ position: 'relative' }}>
          <select
            value={unidadeFiltro}
            onChange={e => setUnidadeFiltro(e.target.value)}
            style={sel(unidadeFiltro !== 'Todas')}
          >
            {unidadesDisponiveis.map(u => (
              <option key={u} value={u}>{u === 'Todas' ? 'Todas as unidades' : u}</option>
            ))}
          </select>
        </div>

        {dadosExport && (
          <button
            onClick={() => exportarCSV(nomeArquivoExport || 'exportacao', dadosExport)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              height: 32, padding: '0 14px', borderRadius: 99,
              border: '1px solid #E8E8E8', background: '#fff',
              color: '#333', fontSize: 12.5, fontWeight: 500,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
            title="Exportar dados filtrados em CSV"
          >
            <Download size={13} /> Exportar
          </button>
        )}

        <button
          onClick={handleAtualizar}
          disabled={atualizando || emCooldown}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            height: 32, padding: '0 14px', borderRadius: 99,
            border: '1px solid #E8E8E8', background: '#fff',
            color: '#333', fontSize: 12.5, fontWeight: 500,
            cursor: (atualizando || emCooldown) ? 'default' : 'pointer', fontFamily: 'inherit',
            opacity: (atualizando || emCooldown) ? 0.6 : 1,
          }}
          title={emCooldown ? 'Já foi pedida uma atualização há pouco -- aguarde alguns minutos' : 'Busca os dados mais recentes do ZIG (leva alguns minutos)'}
        >
          <RefreshCw size={13} style={atualizando ? { animation: 'girar 1s linear infinite' } : undefined} />
          {atualizando ? 'Pedindo atualização...' : emCooldown ? 'Atualização recente...' : 'Atualizar Dados'}
        </button>

        {mensagemAtualizacao && (
          <span style={{ fontSize: 11.5, color: '#B45309', maxWidth: 260 }}>{mensagemAtualizacao}</span>
        )}
      </div>

      <style>{`
        @keyframes girar { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </header>

    {avisoDadosDesatualizados && (
      <div style={{
        background: '#FFF7ED', borderBottom: '1px solid #FDE0B8',
        padding: '8px 28px', fontSize: 12.5, color: '#B45309',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        ⚠️ {avisoDadosDesatualizados}
      </div>
    )}
    </>
  )
}
