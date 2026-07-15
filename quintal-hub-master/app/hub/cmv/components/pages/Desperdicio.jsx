import { useCMV } from '../../hooks/useCMV';
import { LOJAS_GRANDES, LOJAS_MENORES } from '../../data/config';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const brlK = v => v >= 1000 ? `R$ ${(v/1000).toFixed(1)}k` : `R$ ${(v||0).toFixed(0)}`;
const brl  = v => `R$ ${(v||0).toFixed(2)}`;

// Cores por loja dentro de cada grupo
const CORES_GRANDES = ['#8C1414','#c0392b','#e74c3c','#f1948a'];
const CORES_MENORES = ['#97A624','#2ecc71','#27ae60','#1e8449','#a9cce3','#2980b9'];

function GrupoSection({ titulo, lojas, coresBar, desperdicioFiltrado = [], desperdicioAll = [] }) {
  // Filtra só as lojas deste grupo
  const dadosGrupo = (lojas || []).map(loja => {
    const rows = desperdicioFiltrado.filter(r => r.unidade === loja);
    const total     = rows.reduce((s,r) => s+r.custoTotal, 0);
    const registros = rows.length;
    const mediaPorLanc = registros > 0 ? total / registros : 0;

    // Por classificação
    const porClassif = {};
    rows.forEach(r => {
      const k = r.classificacao || 'Sem classificação';
      porClassif[k] = (porClassif[k]||0) + r.custoTotal;
    });
    const topClassif = Object.entries(porClassif)
      .sort((a,b) => b[1]-a[1])
      .slice(0,1)
      .map(([k]) => k)[0] || '—';

    return { loja, total, registros, mediaPorLanc, topClassif };
  }).filter(r => r.total > 0).sort((a,b) => b.total - a.total);

  if (dadosGrupo.length === 0) return null;

  const totalGrupo = dadosGrupo.reduce((s,r) => s+r.total, 0);
  const mediaGrupo = dadosGrupo.length > 0 ? totalGrupo / dadosGrupo.length : 0;

  const barData = dadosGrupo.map(r => ({
    nome: r.loja.split(' ').at(-1),
    total: parseFloat(r.total.toFixed(0)),
    media: parseFloat(r.mediaPorLanc.toFixed(2)),
  }));

  return (
    <div className="bg-white border border-surface-border rounded-xl overflow-hidden">
      {/* Header do grupo */}
      <div className="px-5 py-4 border-b border-surface-border flex items-center justify-between">
        <div>
          <p className="font-bold text-brand-black text-[15px]">{titulo}</p>
          <p className="text-xs text-zinc-400 mt-0.5">
            {dadosGrupo.length} lojas · total: <strong>{brlK(totalGrupo)}</strong> · média por loja: <strong>{brlK(mediaGrupo)}</strong>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-surface-border">

        {/* Gráfico total */}
        <div className="p-5">
          <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide mb-3">Custo Total de Desperdício</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={barData} margin={{top:4,right:8,left:-10,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false}/>
              <XAxis dataKey="nome" tick={{fontSize:11,fill:'#999'}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fontSize:10,fill:'#999'}} tickFormatter={v=>brlK(v)} axisLine={false} tickLine={false}/>
              <Tooltip formatter={v=>[brlK(v),'Total']}
                contentStyle={{background:'#fff',border:'1px solid #e8e8e2',borderRadius:8,fontSize:12}}/>
              <Bar dataKey="total" radius={[4,4,0,0]}>
                {barData.map((_,i) => <Cell key={i} fill={coresBar[i%coresBar.length]}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico média por lançamento */}
        <div className="p-5">
          <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide mb-3">Desperdício Médio por Lançamento</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={barData} margin={{top:4,right:8,left:-10,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false}/>
              <XAxis dataKey="nome" tick={{fontSize:11,fill:'#999'}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fontSize:10,fill:'#999'}} tickFormatter={v=>brl(v)} axisLine={false} tickLine={false}/>
              <Tooltip formatter={v=>[brl(v),'Média/lançamento']}
                contentStyle={{background:'#fff',border:'1px solid #e8e8e2',borderRadius:8,fontSize:12}}/>
              <Bar dataKey="media" radius={[4,4,0,0]}>
                {barData.map((_,i) => <Cell key={i} fill={coresBar[i%coresBar.length]} fillOpacity={0.7}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabela do grupo */}
      <div className="border-t border-surface-border overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-surface-border bg-surface-muted">
              {['Loja','Total','Lançamentos','Média/Lançamento','Principal Motivo','vs Média do Grupo'].map(h => (
                <th key={h} className="px-4 py-2 text-[10px] font-semibold text-zinc-400 uppercase tracking-wide text-right first:text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dadosGrupo.map((row, i) => {
              const vs = mediaGrupo > 0 ? ((row.total - mediaGrupo) / mediaGrupo * 100) : 0;
              const acima = vs > 0;
              return (
                <tr key={row.loja} className={`border-b border-surface-border hover:bg-surface-muted ${i%2===0?'':'bg-surface-base'}`}>
                  <td className="px-4 py-2.5 font-medium text-brand-black flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{background: coresBar[i%coresBar.length]}}/>
                    {row.loja}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono font-semibold text-brand-black">{brlK(row.total)}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-zinc-500">{row.registros}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-zinc-600">{brl(row.mediaPorLanc)}</td>
                  <td className="px-4 py-2.5 text-right">
                    <span className="text-[11px] bg-surface-muted px-2 py-0.5 rounded-full text-zinc-500 capitalize">
                      {row.topClassif.toLowerCase()}
                    </span>
                  </td>
                  <td className={`px-4 py-2.5 text-right font-mono font-semibold text-[12px] ${acima?'text-brand-crimson':'text-brand-olive'}`}>
                    {acima?'+':''}{vs.toFixed(1)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Desperdicio() {
  const { desperdicioRaw = [], desperdicio = [], desperdicioFiltrado = [], desperdicioByClassificacao = [], filtroLoja, filtroMes } = useCMV();
  // Aplica filtros de loja e mês nos dados brutos
  const dadosDesp = (desperdicioRaw.length > 0 ? desperdicioRaw : desperdicio).filter(r =>
    (filtroLoja === 'Todas' || r.unidade === filtroLoja) &&
    (filtroMes  === 'Todos' || r.mes === filtroMes)
  );

  const grandTotal    = dadosDesp.reduce((s,r) => s+r.custoTotal, 0);
  const totalGrandes  = dadosDesp.filter(r=>LOJAS_GRANDES.includes(r.unidade)).reduce((s,r)=>s+r.custoTotal,0);
  const totalMenores  = dadosDesp.filter(r=>LOJAS_MENORES.includes(r.unidade)).reduce((s,r)=>s+r.custoTotal,0);

  // Última atualização = data mais recente nos lançamentos
  const ultimaAtualizacao = (() => {
    const fonte = (desperdicioRaw?.length > 0 ? desperdicioRaw : desperdicio) ?? []
    if (fonte.length === 0) return null

    const datas = fonte.map(r => {
      // data já vem como objeto Date do JavaScript
      if (r.data instanceof Date && !isNaN(r.data.getTime())) return r.data
      // Tenta parsear se vier como string
      if (r.data && typeof r.data === 'string') {
        const d = r.data.trim()
        const m1 = d.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
        if (m1) return new Date(parseInt(m1[3]), parseInt(m1[2])-1, parseInt(m1[1]))
        const m2 = d.match(/^(\d{4})-(\d{2})-(\d{2})/)
        if (m2) return new Date(parseInt(m2[1]), parseInt(m2[2])-1, parseInt(m2[3]))
        const d2 = new Date(d)
        if (!isNaN(d2.getTime())) return d2
      }
      return null
    }).filter(Boolean)

    if (datas.length === 0) return null
    const max = new Date(Math.max(...datas.map(d => d.getTime())))
    return max.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  })();

  return (
    <div className="p-5 space-y-4">

      {/* Última atualização */}
      {ultimaAtualizacao && (
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-olive inline-block" />
          Último lançamento registrado: <strong className="text-zinc-600">{ultimaAtualizacao}</strong>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-surface-border rounded-xl p-4">
          <p className="text-[10.5px] font-semibold text-zinc-400 uppercase tracking-wide mb-2">Total Geral</p>
          <p className="text-[26px] font-bold text-brand-black leading-none">{brlK(grandTotal)}</p>
          <p className="text-[12px] text-zinc-400 mt-1">{desperdicioFiltrado.length} lançamentos</p>
        </div>
        <div className="bg-white border border-surface-border rounded-xl p-4">
          <p className="text-[10.5px] font-semibold text-zinc-400 uppercase tracking-wide mb-2">Lojas Grandes</p>
          <p className="text-[26px] font-bold text-brand-crimson leading-none">{brlK(totalGrandes)}</p>
          <p className="text-[12px] text-zinc-400 mt-1">Tatuapé · Carinás · Sto André · Santana</p>
        </div>
        <div className="bg-white border border-surface-border rounded-xl p-4">
          <p className="text-[10.5px] font-semibold text-zinc-400 uppercase tracking-wide mb-2">Lojas Menores</p>
          <p className="text-[26px] font-bold text-brand-olive leading-none">{brlK(totalMenores)}</p>
          <p className="text-[12px] text-zinc-400 mt-1">V. Mariana · Pavão · Madalena · Lapa · Perdizes · Chácara</p>
        </div>
      </div>

      {/* Por motivo */}
      <div className="bg-white border border-surface-border rounded-xl">
        <div className="px-5 py-3.5 border-b border-surface-border">
          <p className="font-semibold text-brand-black text-sm">Por motivo — todas as lojas</p>
        </div>
        <div className="p-4 space-y-2.5 max-h-[220px] overflow-y-auto">
          {desperdicioByClassificacao.map((item, i) => {
            const share = grandTotal > 0 ? item.total/grandTotal*100 : 0;
            return (
              <div key={item.classificacao}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[12px] text-brand-black font-medium capitalize">{item.classificacao.toLowerCase()}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-zinc-400">{share.toFixed(1)}%</span>
                    <span className="text-[11px] font-mono text-zinc-600">{brlK(item.total)}</span>
                  </div>
                </div>
                <div className="h-1.5 bg-surface-muted rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{width:`${share.toFixed(0)}%`, background: i===0?'#8C1414':i===1?'#D9B504':'#97A624'}}/>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Seção Lojas Grandes */}
      <GrupoSection
        titulo="🔴 Lojas Grandes"
        lojas={LOJAS_GRANDES}
        coresBar={CORES_GRANDES}
        desperdicioFiltrado={dadosDesp}
        desperdicioAll={dadosDesp}
      />

      {/* Seção Lojas Menores */}
      <GrupoSection
        titulo="🟢 Lojas Menores"
        lojas={LOJAS_MENORES}
        coresBar={CORES_MENORES}
        desperdicioFiltrado={dadosDesp}
        desperdicioAll={dadosDesp}
      />

      {/* Lançamentos detalhados */}
      <div className="bg-white border border-surface-border rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-surface-border">
          <p className="font-semibold text-brand-black text-sm">Lançamentos detalhados</p>
          <p className="text-xs text-zinc-400 mt-0.5">{dadosDesp.length} registros no período</p>
        </div>
        <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
          <table className="w-full text-[12px]">
            <thead className="sticky top-0 bg-white border-b border-surface-border">
              <tr>
                {['Data','Loja','Produto','Qtd','Custo Total','Motivo'].map(h => (
                  <th key={h} className="px-4 py-2 text-[10px] font-semibold text-zinc-400 uppercase tracking-wide text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dadosDesp.slice(0, 300).map((r, i) => (
                <tr key={i} className={`border-b border-surface-border hover:bg-surface-muted ${i%2===0?'':'bg-surface-base'}`}>
                  <td className="px-4 py-2 text-zinc-400 whitespace-nowrap">{r.data}</td>
                  <td className="px-4 py-2 font-medium text-brand-black">
                    <span className={`inline-flex items-center gap-1`}>
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${LOJAS_GRANDES.includes(r.unidade)?'bg-brand-crimson':'bg-brand-olive'}`}/>
                      {r.unidade}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-zinc-700">{r.produto}</td>
                  <td className="px-4 py-2 font-mono text-zinc-500">{r.quantidade}</td>
                  <td className="px-4 py-2 font-mono text-zinc-600">{brlK(r.custoTotal)}</td>
                  <td className="px-4 py-2">
                    <span className="text-[10px] bg-surface-muted px-2 py-0.5 rounded-full text-zinc-500 capitalize">
                      {(r.classificacao||'').toLowerCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
