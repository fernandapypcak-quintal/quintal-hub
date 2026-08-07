// ═══════════════════════════════════════════════════════════════════════
// QUINTAL DO ESPETO — METAS (CMV, Custo Folha, Custo Freela, NPS, Bandas)
// Preenchimento manual (Fernanda), lido pelo dashboard de Metas do HUB.
// Faturamento (Meta/Real) NÃO passa por aqui — o dashboard de Metas
// reaproveita a fonte que já alimenta o dashboard de Faturamento.
//
// CONFIGURAÇÃO:
// 1. Cria (ou reaproveita) uma planilha Google só pra isso, com uma aba
//    chamada "Metas_Manual" e cabeçalho na linha 1:
//      Mes_Ref | Unidade | Indicador | Meta | Real | Trimestre_Congelado | Observacao
//    Mes_Ref no formato AAAA-MM-01 (ex: 2026-08-01).
//    Unidade = id canônico de lib/units.ts (ex: carinas, santo_andre).
//    Indicador = cmv | custo_folha | custo_freela | nps |
//                bandas_custo_artista | bandas_arrecadacao
// 2. Extensões > Apps Script, cola este arquivo.
// 3. Implantar > Nova implantação > App da Web > Executar como "Eu" >
//    Quem pode acessar "Qualquer pessoa" > copia a URL /exec e cola em
//    app/api/metas/route.ts (GAS_URL).
// ═══════════════════════════════════════════════════════════════════════

const ABA_METAS = 'Metas_Manual';
const COLUNAS_METAS = ['Mes_Ref', 'Unidade', 'Indicador', 'Meta', 'Real', 'Trimestre_Congelado', 'Observacao'];

function doGet(e) {
  var out = ContentService.createTextOutput();
  out.setMimeType(ContentService.MimeType.JSON);

  var tipo = e && e.parameter && e.parameter.tipo;

  try {
    if (tipo === 'ping') {
      out.setContent(JSON.stringify({ ok: true, ts: new Date().toISOString() }));
      return out;
    }

    if (tipo !== 'metas') {
      out.setContent(JSON.stringify({ erro: 'tipo desconhecido: ' + tipo + '. Use: metas' }));
      return out;
    }

    var mesRef = e.parameter.mes_ref; // opcional — filtra por mês se vier
    var linhas = _lerMetasManual();

    if (mesRef) {
      linhas = linhas.filter(function (l) { return l.mes_ref === mesRef; });
    }

    out.setContent(JSON.stringify({ metas: linhas }));
  } catch (err) {
    out.setContent(JSON.stringify({ erro: err.message }));
  }

  return out;
}

// Salva (upsert) um indicador manual — chamado pela tela admin do HUB.
// Body esperado (JSON): { mes_ref, unidade, indicador, meta, real, trimestre_congelado, observacao }
function doPost(e) {
  var out = ContentService.createTextOutput();
  out.setMimeType(ContentService.MimeType.JSON);

  try {
    var body = JSON.parse(e.postData.contents);
    _upsertMetaManual(body);
    out.setContent(JSON.stringify({ ok: true }));
  } catch (err) {
    out.setContent(JSON.stringify({ erro: err.message }));
  }

  return out;
}

function _getAba() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(ABA_METAS);
  if (!sheet) {
    sheet = ss.insertSheet(ABA_METAS);
    sheet.appendRow(COLUNAS_METAS);
  }
  return sheet;
}

function _lerMetasManual() {
  var sheet = _getAba();
  if (sheet.getLastRow() < 2) return [];

  var dados = sheet.getDataRange().getValues();
  var headers = dados[0];
  var linhas = [];

  for (var i = 1; i < dados.length; i++) {
    var row = dados[i];
    if (!row[0] && !row[1]) continue; // pula linha vazia

    linhas.push({
      mes_ref: _formatarData(row[0]),
      unidade: String(row[1] || '').trim(),
      indicador: String(row[2] || '').trim(),
      meta: row[3] === '' ? null : Number(row[3]),
      real: row[4] === '' ? null : Number(row[4]),
      trimestre_congelado: row[5] || null,
      observacao: row[6] || null,
      _linha: i + 1, // útil pra debug
    });
  }

  return linhas;
}

// Upsert por (Mes_Ref, Unidade, Indicador) — atualiza a linha se já existir,
// senão adiciona uma nova.
function _upsertMetaManual(body) {
  if (!body.mes_ref || !body.unidade || !body.indicador) {
    throw new Error('mes_ref, unidade e indicador são obrigatórios');
  }

  var sheet = _getAba();
  var dados = sheet.getDataRange().getValues();
  var mesRefFormatado = _formatarData(body.mes_ref);

  for (var i = 1; i < dados.length; i++) {
    var row = dados[i];
    var mesLinha = _formatarData(row[0]);
    if (mesLinha === mesRefFormatado && row[1] === body.unidade && row[2] === body.indicador) {
      sheet.getRange(i + 1, 4).setValue(body.meta != null ? body.meta : '');
      sheet.getRange(i + 1, 5).setValue(body.real != null ? body.real : '');
      sheet.getRange(i + 1, 6).setValue(body.trimestre_congelado || '');
      sheet.getRange(i + 1, 7).setValue(body.observacao || '');
      return;
    }
  }

  // não achou -> adiciona linha nova
  sheet.appendRow([
    mesRefFormatado,
    body.unidade,
    body.indicador,
    body.meta != null ? body.meta : '',
    body.real != null ? body.real : '',
    body.trimestre_congelado || '',
    body.observacao || '',
  ]);
}

function _formatarData(valor) {
  if (valor instanceof Date) {
    return Utilities.formatDate(valor, 'America/Sao_Paulo', 'yyyy-MM-dd');
  }
  return String(valor || '').trim();
}
