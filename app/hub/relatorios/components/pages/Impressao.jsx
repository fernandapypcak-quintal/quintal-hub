import React, { useMemo, useState } from 'react'
import { Printer } from 'lucide-react'
import { useRelatorios, paretoPorChave, contarDistintos, somar } from '../../hooks/useRelatorios.jsx'
import { formatarReais, formatarData } from '../ui/Tabela.jsx'
import ParetoTabela from '../ui/ParetoTabela.jsx'
import ParetoChart from '../ui/ParetoChart.jsx'

// Configuração de cada tipo de relatório que pode ser impresso: de onde vem
// o valor, quem é o "responsável" (funcionário) e qual o "motivo" (já
// combinado com a categoria/justificativa).
const CONFIG = {
  descontos: {
    titulo: 'Descontos',
    labelResponsavel: 'Quem deu desconto',
    campoResponsavel: d => d.funcionario,
    campoValor: d => d.valor,
    campoMotivo: d => d.motivoCompleto || '(sem motivo)',
    corResponsavel: '#EA580C',
    corMotivo: '#B45309',
  },
  estornos: {
    titulo: 'Estornos',
    labelResponsavel: 'Quem estornou',
    campoResponsavel: e => e.estornadoPor,
    campoValor: e => e.valorUnitario * (e.quantidade || 1),
    campoMotivo: e => e.motivoCompleto || '(sem motivo)',
    corResponsavel: '#8C1414',
    corMotivo: '#B45309',
  },
  desperdicio: {
    titulo: 'Desperdício',
    labelResponsavel: 'Quem lançou',
    campoResponsavel: d => d.responsavel,
    campoValor: d => d.valor,
    campoMotivo: d => d.motivoCompleto || d.motivo || '(sem motivo)',
    corResponsavel: '#B45309',
    corMotivo: '#8C1414',
  },
}

const sectionTitle = {
  fontSize: 13, fontWeight: 700, color: '#1a1a1a', margin: '0 0 10px',
  textTransform: 'uppercase', letterSpacing: '0.03em',
}

function KpiImpressao({ label, valor }) {
  return (
    <div style={{ border: '1px solid #EBEBEB', borderRadius: 8, padding: '10px 14px' }}>
      <div style={{ fontSize: 10.5, color: '#999', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a', marginTop: 2 }}>{valor}</div>
    </div>
  )
}

function FiltrosResumo() {
  const {
    unidadeFiltro, setUnidadeFiltro, unidadesDisponiveis,
    dataInicio, setDataInicio, dataFim, setDataFim,
  } = useRelatorios()

  const campo = {
    padding: '0 10px', height: 32, border: '1px solid #E8E8E8',
    borderRadius: 99, fontSize: 12.5, color: '#333',
    background: '#fff', outline: 'none', fontFamily: 'inherit',
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 12, color: '#999' }}>Período:</span>
      <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} style={campo} />
      <span style={{ fontSize: 12, color: '#BBB' }}>até</span>
      <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} style={campo} />
      {(dataInicio || dataFim) && (
        <button
          onClick={() => { setDataInicio(''); setDataFim('') }}
          style={{ border: 'none', background: 'none', color: '#999', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}
        >
          limpar
        </button>
      )}
      <span style={{ fontSize: 12, color: '#999', marginLeft: 8 }}>Unidade:</span>
      <select value={unidadeFiltro} onChange={e => setUnidadeFiltro(e.target.value)} style={campo}>
        {unidadesDisponiveis.map(u => (
          <option key={u} value={u}>{u === 'Todas' ? 'Todas as unidades' : u}</option>
        ))}
      </select>
    </div>
  )
}

export default function Impressao() {
  const { descontos, estornos, desperdicio, unidadeFiltro, dataInicio, dataFim } = useRelatorios()
  const [tipo, setTipo] = useState('descontos')

  const dadosPorTipo = { descontos, estornos, desperdicio }
  const cfg = CONFIG[tipo]
  const linhas = dadosPorTipo[tipo]

  const totalValor = useMemo(() => somar(linhas, cfg.campoValor), [linhas, tipo])
  const totalQtd = linhas.length
  const qtdResponsaveis = useMemo(() => contarDistintos(linhas, cfg.campoResponsavel), [linhas, tipo])
  const ticketMedio = totalQtd > 0 ? totalValor / totalQtd : 0

  const paretoResponsaveis = useMemo(
    () => paretoPorChave(linhas, cfg.campoResponsavel, cfg.campoValor),
    [linhas, tipo]
  )
  const paretoMotivos = useMemo(
    () => paretoPorChave(linhas, cfg.campoMotivo, cfg.campoValor),
    [linhas, tipo]
  )

  const periodoTexto = (dataInicio || dataFim)
    ? `${dataInicio ? formatarData(dataInicio) : '...'} até ${dataFim ? formatarData(dataFim) : '...'}`
    : 'Todo o período disponível'

  return (
    <>
      {/* Barra de controle -- some na impressão */}
      <div className="no-print" style={{
        background: '#fff', borderBottom: '1px solid #F0F0F0', padding: '12px 28px',
        position: 'sticky', top: 0, zIndex: 20,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
      }}>
        <div>
          <h1 style={{ fontSize: 19, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>Resumo para Impressão</h1>
          <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
            Escolha o relatório e o período, depois clica em Imprimir (ou salva como PDF)
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {Object.entries(CONFIG).map(([id, c]) => (
            <button key={id} onClick={() => setTipo(id)} style={{
              padding: '0 14px', height: 32, borderRadius: 99,
              border: tipo === id ? '1px solid #1a1a1a' : '1px solid #E8E8E8',
              background: '#fff', color: tipo === id ? '#1a1a1a' : '#666',
              fontWeight: tipo === id ? 600 : 400, fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit',
            }}>
              {c.titulo}
            </button>
          ))}
          <button onClick={() => window.print()} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            height: 32, padding: '0 16px', borderRadius: 99, border: 'none',
            background: '#1a1a1a', color: '#fff', fontSize: 12.5, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            <Printer size={13} /> Imprimir
          </button>
        </div>
      </div>

      {/* Filtros de data/unidade -- some na impressão */}
      <div className="no-print" style={{ padding: '10px 28px', borderBottom: '1px solid #F7F7F7' }}>
        <FiltrosResumo />
      </div>

      {/* Área que efetivamente vai pra impressão */}
      <div id="area-impressao" style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '2px solid #1a1a1a', paddingBottom: 10 }}>
          <div>
            <div style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quintal do Espeto</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: '2px 0 0' }}>Resumo de {cfg.titulo}</h2>
          </div>
          <div style={{ textAlign: 'right', fontSize: 12, color: '#666' }}>
            <div><strong>Período:</strong> {periodoTexto}</div>
            <div><strong>Unidade:</strong> {unidadeFiltro}</div>
            <div style={{ color: '#BBB' }}>Gerado em {new Date().toLocaleString('pt-BR')}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          <KpiImpressao label="Total de Lançamentos" valor={totalQtd.toLocaleString('pt-BR')} />
          <KpiImpressao label="Valor Total" valor={formatarReais(totalValor)} />
          <KpiImpressao label="Ticket Médio" valor={formatarReais(ticketMedio)} />
          <KpiImpressao label="Responsáveis Envolvidos" valor={qtdResponsaveis} />
        </div>

        <section style={{ breakInside: 'avoid' }}>
          <h3 style={sectionTitle}>{cfg.labelResponsavel}</h3>
          <ParetoTabela dados={paretoResponsaveis} tituloItem="Funcionário" limite={30} />
        </section>

        <section style={{ breakInside: 'avoid' }}>
          <h3 style={sectionTitle}>Por Categoria / Justificativa</h3>
          <ParetoTabela dados={paretoMotivos} tituloItem="Motivo" limite={30} />
        </section>

        <section style={{ breakInside: 'avoid' }}>
          <h3 style={sectionTitle}>Gráfico de Pareto — Motivos</h3>
          <ParetoChart dados={paretoMotivos} cor={cfg.corMotivo} altura={280} limite={10} />
        </section>

        <section style={{ breakInside: 'avoid' }}>
          <h3 style={sectionTitle}>Gráfico de Pareto — {cfg.labelResponsavel}</h3>
          <ParetoChart dados={paretoResponsaveis} cor={cfg.corResponsavel} altura={280} limite={10} />
        </section>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #area-impressao, #area-impressao * { visibility: visible; }
          #area-impressao { position: absolute; left: 0; top: 0; width: 100%; padding: 0 !important; }
          .no-print { display: none !important; }
          @page { size: A4 landscape; margin: 14mm; }
        }
      `}</style>
    </>
  )
}
