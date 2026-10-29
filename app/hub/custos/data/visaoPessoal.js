// Classificação gerencial da BU Pessoal.
// Regra acordada: Pessoas = folha, encargos, benefícios, gorjeta e rescisão.
// RH = treinamento, saúde ocupacional, uniforme, lavanderia, sistemas e estrutura/time de RH.
// Como a BU Pessoal também contém despesas de RH que não vêm com descrição padronizada,
// o fallback é RH (e não descartar o custo da visão filtrada).
const normalizar = v => String(v ?? '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

const textoRegistro = r => normalizar([
  r?.categoria, r?.tipo, r?.subcategoria, r?.descricao, r?.historico,
  r?.fornecedor, r?.indicador, r?.conta, r?.item_principal, r?.centro_custo, r?.grupo
].filter(Boolean).join(' '))

export function classificarPessoalRH(r) {
  const t = textoRegistro(r)

  // RH tem prioridade para despesas típicas da estrutura de recursos humanos.
  if (/trein|desenvolvimento|recrut|selecao|clima organizacional|engajamento|consultoria de rh|recursos humanos|departamento pessoal|medicina ocupacional|saude ocupacional|seguranca do trabalho|uniforme|lavanderia|sistema de rh|software de rh|folha de ponto|relogio de ponto|beneficio flexivel|plataforma de rh/.test(t)) {
    return 'RH'
  }

  if (/folha|salario|salarios|pro labore|beneficio|beneficios|encargo|inss|fgts|rescis|ferias|decimo terceiro|13o|gorjeta|colaborador|funcionario|mao de obra|adicional noturno|hora extra|vale transporte|vale refeicao|vale alimentacao|plano de saude|plano odontologico|seguro de vida/.test(t)) {
    return 'Pessoas'
  }

  // A regra de negócio define que os demais custos que estavam na BU Pessoal
  // passam para RH. Assim, o filtro não some com despesas sem descrição perfeita.
  return 'RH'
}

export function filtrarVisaoPessoal(rows, visao) {
  if (!visao || visao === 'Todos') return rows || []
  return (rows || []).filter(r => classificarPessoalRH(r) === visao)
}
