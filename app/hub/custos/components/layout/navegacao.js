// v27 — páginas do dashboard de custos (Sidebar, BottomNav e ClientApp leem daqui)
// grupo: 'nf' = notas + pagamentos por BU (visão do grupo, sem filtro de loja)
//        'casa' = custos por loja (pagamentos)
// restrita: só aparece pra quem vê todas as lojas
export const PAGINAS = [
  { id: 'home',         icon: '🏠', label: 'Visão geral',    curto: 'Geral',    grupo: 'casa', titulo: 'Visão geral',          sub: 'Resumo do mês' },
  { id: 'porbu',        icon: '🧩', label: 'Por BU',         curto: 'Por BU',   grupo: 'nf',   titulo: 'Custos por BU',        sub: 'Notas que entraram, o que foi pago e o que falta pagar', restrita: true },
  { id: 'apagar',       icon: '📆', label: 'A pagar',        curto: 'A pagar',  grupo: 'nf',   titulo: 'A pagar',              sub: 'Notas em aberto e quando devem sair do caixa', restrita: true },
  { id: 'fornecedores', icon: '🚚', label: 'Fornecedores',   curto: 'Fornec.',  grupo: 'nf',   titulo: 'Fornecedores',         sub: 'Prazo real de pagamento e volume de notas', restrita: true },
  { id: 'conciliacao',  icon: '🔗', label: 'Conciliação',    curto: 'Concil.',  grupo: 'nf',   titulo: 'Conciliação',          sub: 'Notas sem pagamento, pagamentos sem nota e divergências', restrita: true, soDesktop: true },
  { id: 'custos',       icon: '📌', label: 'Custo fixo',     curto: 'Fixo',     grupo: 'casa', titulo: 'Custo fixo',           sub: 'Por casa' },
  { id: 'variavel',     icon: '🔄', label: 'Custo variável', curto: 'Variável', grupo: 'casa', titulo: 'Custo variável',       sub: 'Por casa' },
  { id: 'evolucao',     icon: '📈', label: 'Evolução',       curto: 'Evolução', grupo: 'casa', titulo: 'Evolução histórica',   sub: 'Por casa' },
]

export function paginasVisiveis(podeVerNF) {
  return PAGINAS.filter(p => !p.restrita || podeVerNF)
}
