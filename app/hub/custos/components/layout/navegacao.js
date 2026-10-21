// v27.2 — páginas do dashboard de custos (Sidebar, BottomNav e ClientApp leem daqui)
// grupo: 'gestao'     = report do CEO e páginas por área (cada página tem os próprios filtros)
//        'casa'       = custos por loja (pagamentos)
//        'bastidores' = detalhe das notas, prazos e pendências (manutenção do dado)
// restrita: só aparece pra quem vê todas as lojas
// v27.6: a Visão geral saiu — o dashboard abre no Report do mês
export const GRUPOS = [
  { id: 'gestao',     label: 'Gestão' },
  { id: 'casa',       label: 'Por casa' },
  { id: 'bastidores', label: 'Bastidores' },
]

export const PAGINAS = [
  { id: 'report',       icon: '📊', label: 'Report do mês',        curto: 'Report',   grupo: 'gestao',     titulo: 'Report do mês',           sub: 'Custos do grupo por área, pro CEO', restrita: true },
  { id: 'dre',          icon: '📑', label: 'DRE de custos',        curto: 'DRE',      grupo: 'gestao',     titulo: 'DRE de custos',           sub: 'Área, tipo de gasto e fornecedor: últimos meses e o mês atual', restrita: true },
  { id: 'area',         icon: '🧩', label: 'Por área',             curto: 'Áreas',    grupo: 'gestao',     titulo: 'Por área',                sub: 'O que cada gestor vê na página dele', restrita: true },
  { id: 'custos',       icon: '📌', label: 'Custo fixo',           curto: 'Fixo',     grupo: 'casa',       titulo: 'Custo fixo',              sub: 'Por casa' },
  { id: 'variavel',     icon: '🔄', label: 'Custo variável',       curto: 'Variável', grupo: 'casa',       titulo: 'Custo variável',          sub: 'Por casa' },
  { id: 'evolucao',     icon: '📈', label: 'Evolução',             curto: 'Evolução', grupo: 'casa',       titulo: 'Evolução histórica',      sub: 'Por casa' },
  { id: 'porbu',        icon: '🗂️', label: 'Todas as áreas',       curto: 'Áreas+',   grupo: 'bastidores', titulo: 'Todas as áreas',          sub: 'Notas, pagamentos e aberto por área', restrita: true, soDesktop: true },
  { id: 'apagar',       icon: '📆', label: 'A pagar',              curto: 'A pagar',  grupo: 'bastidores', titulo: 'A pagar',                 sub: 'Notas em aberto e quando devem sair do caixa', restrita: true, soDesktop: true },
  { id: 'fornecedores', icon: '🚚', label: 'Fornecedores',         curto: 'Fornec.',  grupo: 'bastidores', titulo: 'Fornecedores',            sub: 'Prazo real de pagamento e volume de notas', restrita: true, soDesktop: true },
  { id: 'conciliacao',  icon: '🔗', label: 'Pendências',           curto: 'Pend.',    grupo: 'bastidores', titulo: 'Pendências',              sub: 'Notas sem pagamento, pagamentos sem nota e divergências', restrita: true, soDesktop: true },
]

// v27.7: Bastidores (manutenção do dado) só pra admin do HUB
export function paginasVisiveis(podeVerNF, isAdmin = false) {
  return PAGINAS.filter(p => (!p.restrita || podeVerNF) && (p.grupo !== 'bastidores' || isAdmin))
}
