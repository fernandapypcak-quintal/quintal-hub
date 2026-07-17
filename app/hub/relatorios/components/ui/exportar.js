// Converte um array de objetos em CSV e dispara o download no navegador.
// Usa as chaves do primeiro objeto como cabeçalho (nessa ordem).
export function exportarCSV(nomeArquivo, linhas) {
  if (!linhas || linhas.length === 0) {
    alert('Sem dados pra exportar no período/filtro atual.')
    return
  }

  const colunas = Object.keys(linhas[0])

  const escapar = (valor) => {
    const s = valor === null || valor === undefined ? '' : String(valor)
    if (s.includes(';') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`
    }
    return s
  }

  const linhasCSV = [
    colunas.join(';'),
    ...linhas.map(l => colunas.map(c => escapar(l[c])).join(';')),
  ]

  // BOM pra Excel abrir acentos certinho
  const conteudo = '\uFEFF' + linhasCSV.join('\r\n')
  const blob = new Blob([conteudo], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = `${nomeArquivo}_${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
