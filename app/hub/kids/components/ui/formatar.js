// Formata em Real com 1 casa decimal após a vírgula em valores grandes
// (ex: R$ 21,2k / R$ 1,5M), seguindo o padrão já usado nos decks do HUB.
export function formatarReais(v) {
  const n = Number(v || 0)
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1).replace('.', ',')}M`
  if (abs >= 1_000) return `R$ ${(n / 1_000).toFixed(1).replace('.', ',')}k`
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function formatarData(iso) {
  if (!iso) return ''
  const [ano, mes, dia] = String(iso).slice(0, 10).split('-')
  if (!ano || !mes || !dia) return iso
  return `${dia}/${mes}/${ano}`
}
