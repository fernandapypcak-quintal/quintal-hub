'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FinanceiroProvider, useFinanceiro } from './hooks/useFinanceiro'
import Sidebar from './components/layout/Sidebar'
import BottomNav from './components/layout/BottomNav'
import { PAGINAS, paginasVisiveis } from './components/layout/navegacao.js'
import { TIPO_OPCOES } from './components/layout/Header.jsx'
import CustoFixo from './components/pages/CustoFixo'
import CustoVariavel from './components/pages/CustoVariavel'
import Evolucao from './components/pages/Evolucao'
import PorBUNF from './components/pages/PorBUNF'
import APagar from './components/pages/APagar'
import Fornecedores from './components/pages/Fornecedores'
import Conciliacao from './components/pages/Conciliacao'
import GestorArea from './components/pages/GestorArea'
import ReportCEO from './components/pages/ReportCEO'
import DRECustos from './components/ui/DRECustos'
import { mesISOLabel, fmtData } from './utils.js'

// v27 — layout no padrão do HUB (igual ao Comercial): topbar preta,
// cabeçalho verde com os filtros em selects, sidebar e bottom nav.
const PAGES: Record<string, React.ComponentType<any>> = {
  report: ReportCEO,
  dre: () => <DRECustos comSeletor />,
  area: GestorArea,
  porbu: PorBUNF,
  apagar: APagar,
  fornecedores: Fornecedores,
  conciliacao: Conciliacao,
  custos: CustoFixo,
  variavel: CustoVariavel,
  evolucao: Evolucao,
}

const selectStyle = {
  padding: '5px 10px', borderRadius: 8, border: 'none',
  fontSize: 12, background: 'rgba(255,255,255,0.15)',
  color: '#fff', cursor: 'pointer', fontFamily: 'inherit',
}
const opt = { color: '#0D0F14' }

function LoadingScreen() {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 60 }}>
      <div style={{ width: 28, height: 28, border: '2px solid #E8E8E8', borderTopColor: '#97A624', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      <div style={{ fontSize: 13, color: '#5a5c5f' }}>Carregando custos…</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

function ErrorScreen({ error }: { error: string }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40 }}>
      <div style={{ fontSize: 15, fontWeight: 600 }}>Não deu pra carregar os custos</div>
      <div style={{ fontSize: 13, color: '#8C1414', background: '#FEF2F2', padding: '10px 16px', borderRadius: 8, maxWidth: 480, textAlign: 'center' }}>{error}</div>
      <div style={{ fontSize: 12, color: '#5a5c5f' }}>Recarregue a página. Se continuar, confira se o Apps Script está publicado.</div>
    </div>
  )
}

function AppInner({ podeVerNF, isAdmin }: { podeVerNF: boolean; isAdmin: boolean }) {
  const [pageRaw, setPageRaw] = useState(podeVerNF ? 'report' : 'custos')
  const f: any = useFinanceiro()
  const { loading, error } = f

  const visiveis = paginasVisiveis(podeVerNF, isAdmin)
  const page = visiveis.some(p => p.id === pageRaw) ? pageRaw : visiveis[0].id
  function setPage(p: string) { if (visiveis.some(v => v.id === p)) setPageRaw(p) }

  const info = PAGINAS.find(p => p.id === page) || PAGINAS[0]
  const PageComponent = PAGES[page] || PAGES[visiveis[0].id]
  const ehNF = info.grupo === 'bastidores'
  const semFiltros = info.grupo === 'gestao'   // report e por área têm os próprios filtros

  const mesesNF: { mes: string; mes_label: string }[] = (f.nfResumo?.meses || []).slice().sort((a: any, b: any) => b.mes.localeCompare(a.mes))
  const lojas: string[] = f.lojasDisponiveis || ['Todas']
  const umaLoja = Array.isArray(f.lojasPermitidas) && f.lojasPermitidas.length === 1

  return (
    <div className="flex h-screen overflow-hidden bg-surface-base">
      <div className="hidden lg:flex no-print">
        <Sidebar page={page} setPage={setPage} podeVerNF={podeVerNF} isAdmin={isAdmin} />
      </div>

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Topbar HUB */}
        <div className="no-print flex items-center gap-3 px-4 py-2 bg-brand-black border-b border-zinc-800">
          <Link href="/hub" className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-white transition-colors">
            ← Voltar ao HUB
          </Link>
          <span className="text-zinc-700 text-xs">|</span>
          <span className="text-xs text-zinc-500">Custos</span>
        </div>

        {/* Header verde */}
        <div className="no-print" style={{ background: 'linear-gradient(135deg, #4F6B14 0%, #97A624 100%)', borderBottom: '1px solid #3d5210', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }} aria-hidden="true">{info.icon}</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{info.titulo}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>
                {info.sub}
                {ehNF && f.nfResumo?.baixas_ate ? ` — pagamentos arquivados até ${fmtData(f.nfResumo.baixas_ate)}` : ''}
              </div>
            </div>
          </div>

          {!loading && !error && !semFiltros && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {ehNF ? (
                <>
                  {page !== 'apagar' && (
                    <select aria-label="Mês" value={f.mesNF} onChange={e => f.setMesNF(e.target.value)} style={selectStyle}>
                      {page === 'conciliacao' && <option value="" style={opt}>Todos os meses</option>}
                      {mesesNF.map(m => <option key={m.mes} value={m.mes} style={opt}>{m.mes_label || mesISOLabel(m.mes)}</option>)}
                    </select>
                  )}
                  <select aria-label="BU" value={f.buFiltro} onChange={e => f.setBuFiltro(e.target.value)} style={selectStyle}>
                    {f.busDisponiveis.map((b: string) => <option key={b} value={b} style={opt}>{b === 'Todas' ? 'Todas as BUs' : b}</option>)}
                  </select>
                </>
              ) : (
                <>
                  <select aria-label="Escopo" value={f.tipoFiltro} onChange={e => f.setTipoFiltro(e.target.value)} style={selectStyle}>
                    {TIPO_OPCOES.map((o: any) => <option key={o.value} value={o.value} style={opt}>{o.label} ({o.desc})</option>)}
                  </select>
                  <select aria-label="Loja" value={f.lojaFiltro} onChange={e => f.setLojaFiltro(e.target.value)} style={selectStyle}>
                    {lojas.filter(l => !(umaLoja && l === 'Todas')).map(l => <option key={l} value={l} style={opt}>{l === 'Todas' ? 'Todas as lojas' : l}</option>)}
                  </select>
                  <select aria-label="BU" value={f.buFiltro} onChange={e => f.setBuFiltro(e.target.value)} style={selectStyle}>
                    {f.busDisponiveis.map((b: string) => <option key={b} value={b} style={opt}>{b === 'Todas' ? 'Todas as BUs' : b}</option>)}
                  </select>
                </>
              )}
            </div>
          )}
        </div>

        <main className="flex-1 overflow-y-auto pb-20 lg:pb-0" style={{ display: 'flex', flexDirection: 'column' }}>
          {loading ? <LoadingScreen /> : error ? <ErrorScreen error={error} /> : <PageComponent irPara={setPage} podeVerNF={podeVerNF} />}
        </main>
      </div>

      <div className="lg:hidden no-print">
        <BottomNav activePage={page} onPageChange={setPage} podeVerNF={podeVerNF} isAdmin={isAdmin} />
      </div>
    </div>
  )
}

// v27.2 — gestor de área: só a página "Minha área", das áreas dele.
// Não carrega o dashboard completo (o proxy /api/custos também bloqueia).
function GestorShell({ areas }: { areas: string[] }) {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-surface-base">
      <div className="flex items-center gap-3 px-4 py-2 bg-brand-black border-b border-zinc-800">
        <Link href="/hub" className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-white transition-colors">
          ← Voltar ao HUB
        </Link>
        <span className="text-zinc-700 text-xs">|</span>
        <span className="text-xs text-zinc-500">Custos</span>
      </div>
      <div style={{ background: 'linear-gradient(135deg, #4F6B14 0%, #97A624 100%)', borderBottom: '1px solid #3d5210', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <div style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }} aria-hidden="true">🧩</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{areas.length === 1 ? `Minha área: ${areas[0]}` : 'Minhas áreas'}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>Notas, contas pagas, custo fixo e variável</div>
        </div>
      </div>
      <main className="flex-1 overflow-y-auto" style={{ display: 'flex', flexDirection: 'column' }}>
        <GestorArea areas={areas} />
      </main>
    </div>
  )
}

export default function CustosClientApp({ allowedLojas = '*', allowedBus = '*', isAdmin = false }: { allowedLojas?: string[] | '*'; allowedBus?: string[] | '*'; isAdmin?: boolean }) {
  if (allowedBus !== '*') return <GestorShell areas={allowedBus} />

  // Report, Por área e Bastidores mostram o grupo inteiro (a visão de NF é
  // por área, não por casa) — por isso só pra quem vê todas as lojas.
  const podeVerNF = allowedLojas === '*'
  return (
    <FinanceiroProvider allowedLojas={allowedLojas as any}>
      <AppInner podeVerNF={podeVerNF} isAdmin={isAdmin} />
    </FinanceiroProvider>
  )
}
