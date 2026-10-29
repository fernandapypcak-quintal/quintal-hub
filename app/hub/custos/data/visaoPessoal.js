// Classificação gerencial da BU Pessoal. Prioriza categoria/tipo; usa descrição
// como fallback. Registros sem informação suficiente ficam em Todos, não são
// atribuídos silenciosamente a Pessoas ou RH.
const textoRegistro = r => [r?.categoria,r?.tipo,r?.subcategoria,r?.descricao,r?.historico,r?.fornecedor,r?.indicador,r?.conta,r?.centro_custo,r?.grupo].filter(Boolean).join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
export function classificarPessoalRH(r) {
  const t = textoRegistro(r)
  if (/trein|desenvolvimento|recrut|selecao|clima|engajamento|consultoria de rh|rh corporativo|departamento pessoal|medicina ocupacional|seguranca do trabalho/.test(t)) return 'RH'
  if (/folha|salario|salarios|beneficio|beneficios|encargo|inss|fgts|rescis|ferias|decimo terceiro|13o|vale transporte|vale refeicao|vale alimentacao|uniforme|pessoal|funcionario|colaborador|mao de obra/.test(t)) return 'Pessoas'
  return 'Não classificado'
}
export function filtrarVisaoPessoal(rows, visao) {
  if (!visao || visao === 'Todos') return rows || []
  return (rows || []).filter(r => classificarPessoalRH(r) === visao)
}
