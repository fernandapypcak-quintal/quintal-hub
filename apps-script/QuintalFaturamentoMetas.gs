// ═══════════════════════════════════════════════════════════════════════
// QuintalFaturamentoMetas.gs — grava METAS na planilha a partir do HUB:
//   • Faturamento: tela "Metas" do dashboard de Faturamento (aba "meta" da Quintal Dashboard)
//   • Comercial B2B e Reservas: metas mensais em faixas — ver bloco METAS MENSAIS EM FAIXAS
// Projeto no Apps Script: "Quintal Hub - Metas de Faturamento" (uma senha só para todos).
//
// A planilha continua sendo a fonte de verdade: o HUB só escreve aqui,
// e todo o resto (dashboards, Apps Scripts) segue lendo as abas como hoje.
//
// Faturamento — aba "meta" da Quintal Dashboard: Ano | Mes | Loja | Meta, e o
// script acrescenta no fim: Meta_Salao | Meta_Delivery | Atualizado_Por | Atualizado_Em
// (Meta = salão + delivery, então quem já lê "Meta" continua igual).
//
// ── INSTALAÇÃO (feita em 06/11/2026) ───────────────────────────────────
// Projeto SEPARADO no Apps Script (não mexe no script que já existe na planilha),
// implantado como App da Web: Executar como: Eu · Acesso: Qualquer pessoa.
// Propriedades do script:
//   API_KEY               = senha (a MESMA de FATURAMENTO_METAS_GAS_KEY na Vercel)
//   PLANILHA_ID           = ID da Quintal Dashboard
//   ABA_METAS             = meta
//   PLANILHA_COMERCIAL_ID = ID da Comercial & Marketing — Quintal HUB
//   ABA_METAS_COMERCIAL   = metas_b2b_mensal
//   PLANILHA_RESERVAS_ID  = ID da Comercial e Marketing - Reservas B2C
//   ABA_METAS_RESERVAS    = METAS
// Vercel: FATURAMENTO_METAS_GAS_URL (URL /exec) e FATURAMENTO_METAS_GAS_KEY.
// Ao mudar o código: Implantar > Gerenciar implantações > editar > Nova versão
// (mantém a mesma URL).
// ═══════════════════════════════════════════════════════════════════════

var COLS_BASE = ['Ano', 'Mes', 'Loja', 'Meta'];
var COLS_EXTRA = ['Meta_Salao', 'Meta_Delivery', 'Atualizado_Por', 'Atualizado_Em'];

function prop_(k) {
  return PropertiesService.getScriptProperties().getProperty(k) || '';
}

function resposta_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function aba_() {
  var id = prop_('PLANILHA_ID');
  var ss = id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
  var nome = prop_('ABA_METAS') || 'meta';
  var sh = ss.getSheetByName(nome);
  if (!sh) throw new Error('Aba "' + nome + '" não encontrada (confira a propriedade ABA_METAS)');
  return sh;
}

/** Mapa nome da coluna -> índice (0-based). Cria as colunas extras que faltarem. */
function colunas_(sh, criar) {
  var ultimaCol = Math.max(sh.getLastColumn(), 1);
  var cab = sh.getRange(1, 1, 1, ultimaCol).getValues()[0].map(function (c) { return String(c).trim(); });
  COLS_BASE.forEach(function (c) {
    if (cab.indexOf(c) < 0) throw new Error('Coluna "' + c + '" não encontrada no cabeçalho da aba');
  });
  if (criar) {
    COLS_EXTRA.forEach(function (c) {
      if (cab.indexOf(c) < 0) {
        cab.push(c);
        sh.getRange(1, cab.length).setValue(c);
      }
    });
  }
  var mapa = {};
  cab.forEach(function (c, i) { if (c) mapa[c] = i; });
  return mapa;
}

function num_(v) {
  if (v === '' || v === null || v === undefined) return null;
  var n = Number(v);
  return isNaN(n) ? null : n;
}

/** 'YYYY-MM' da linha: usa Ano + Mes (ou Ano_Mes, se a aba tiver essa coluna). */
function anoMesDaLinha_(l, c) {
  var ano = num_(l[c.Ano]);
  var mes = num_(l[c.Mes]);
  if (ano && mes) return ano + '-' + (mes < 10 ? '0' : '') + mes;
  if (c.Ano_Mes != null) {
    var v = l[c.Ano_Mes];
    if (v instanceof Date) return Utilities.formatDate(v, 'America/Sao_Paulo', 'yyyy-MM');
    return String(v || '').trim().slice(0, 7);
  }
  return '';
}

// ═══════════════════════════════════════════════════════════════════════
// METAS MENSAIS EM FAIXAS — uma linha por mês, com 3 faixas (e desafio opcional).
// Cada "alvo" aponta para uma planilha/aba. Chamado com ?alvo=<alvo> (GET)
// ou { alvo: '<alvo>' } (POST). Upsert por mês.
//   comercial → "Comercial & Marketing — Quintal HUB", aba metas_b2b_mensal
//               mes (DATA, dia 1) | faixa1 | faixa2 | faixa3   (R$)
//   reservas  → "Comercial e Marketing - Reservas B2C", aba METAS
//               mes (TEXTO AAAA-MM) | faixa_1 | faixa_2 | faixa_3 | desafio ("-" = sem)   (nº de reservas)
// ═══════════════════════════════════════════════════════════════════════
var ALVOS_FAIXAS = {
  comercial: {
    propPlanilha: 'PLANILHA_COMERCIAL_ID', propAba: 'ABA_METAS_COMERCIAL', abaPadrao: 'metas_b2b_mensal',
    colMes: 'mes', faixas: ['faixa1', 'faixa2', 'faixa3'], desafio: null, mesComoData: true,
  },
  reservas: {
    propPlanilha: 'PLANILHA_RESERVAS_ID', propAba: 'ABA_METAS_RESERVAS', abaPadrao: 'METAS',
    colMes: 'mes', faixas: ['faixa_1', 'faixa_2', 'faixa_3'], desafio: 'desafio', mesComoData: false,
  },
};

function cfgAlvo_(alvo) {
  var cfg = ALVOS_FAIXAS[alvo];
  if (!cfg) throw new Error('alvo desconhecido: ' + alvo);
  return cfg;
}

function abaAlvo_(cfg) {
  var id = prop_(cfg.propPlanilha);
  if (!id) throw new Error('Falta a propriedade ' + cfg.propPlanilha);
  var nome = prop_(cfg.propAba) || cfg.abaPadrao;
  var sh = SpreadsheetApp.openById(id).getSheetByName(nome);
  if (!sh) throw new Error('Aba "' + nome + '" não encontrada');
  return sh;
}

function colunasAlvo_(sh, cfg, criar) {
  var ultimaCol = Math.max(sh.getLastColumn(), 1);
  var cab = sh.getRange(1, 1, 1, ultimaCol).getValues()[0].map(function (c) { return String(c).trim(); });
  [cfg.colMes].concat(cfg.faixas).forEach(function (c) {
    if (cab.indexOf(c) < 0) throw new Error('Coluna "' + c + '" não encontrada no cabeçalho');
  });
  if (criar) {
    ['Atualizado_Por', 'Atualizado_Em'].forEach(function (c) {
      if (cab.indexOf(c) < 0) { cab.push(c); sh.getRange(1, cab.length).setValue(c); }
    });
  }
  var mapa = {};
  cab.forEach(function (c, i) { if (c) mapa[c] = i; });
  return mapa;
}

function mesTexto_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, 'America/Sao_Paulo', 'yyyy-MM');
  return String(v || '').trim().slice(0, 7);
}

function lerFaixas_(alvo, ano) {
  var cfg = cfgAlvo_(alvo);
  var sh = abaAlvo_(cfg);
  var c = colunasAlvo_(sh, cfg, false);
  var linhas = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues() : [];
  var out = [];
  linhas.forEach(function (l) {
    var mes = mesTexto_(l[c[cfg.colMes]]);
    if (!/^\d{4}-\d{2}$/.test(mes) || (ano && mes.slice(0, 4) !== ano)) return;
    var faixas = cfg.faixas.map(function (f) { return num_(l[c[f]]); });
    out.push({
      mes: mes,
      faixas: faixas,
      faixa1: faixas[0], faixa2: faixas[1], faixa3: faixas[2],
      desafio: cfg.desafio && c[cfg.desafio] != null ? num_(l[c[cfg.desafio]]) : null,
      Atualizado_Por: c.Atualizado_Por != null ? String(l[c.Atualizado_Por] || '') : '',
      Atualizado_Em: c.Atualizado_Em != null && l[c.Atualizado_Em] ? String(l[c.Atualizado_Em]) : '',
    });
  });
  return out;
}

// body.metas: [{ mes: '2026-12', faixa1, faixa2, faixa3, desafio? }]
function gravarFaixas_(alvo, body) {
  var cfg = cfgAlvo_(alvo);
  var sh = abaAlvo_(cfg);
  var c = colunasAlvo_(sh, cfg, true);
  var cMes = c[cfg.colMes];
  var nCols = sh.getLastColumn();
  var nLinhas = sh.getLastRow();
  var dados = nLinhas > 1 ? sh.getRange(2, 1, nLinhas - 1, nCols).getValues() : [];
  // formato da coluna do mês nas linhas existentes (pra linha nova ficar igual)
  var formatoMes = nLinhas > 1 ? sh.getRange(2, cMes + 1).getNumberFormat() : (cfg.mesComoData ? 'yyyy-mm' : '@');
  var agora = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'yyyy-MM-dd HH:mm');
  var gravadas = 0;

  body.metas.forEach(function (m) {
    var mes = String(m.mes || '');
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) return;
    var vals = [num_(m.faixa1), num_(m.faixa2), num_(m.faixa3)];
    if (vals.some(function (v) { return v == null; })) return;
    var idx = -1;
    for (var i = 0; i < dados.length; i++) {
      if (mesTexto_(dados[i][cMes]) === mes) { idx = i; break; }
    }
    var linha = idx >= 0 ? dados[idx] : new Array(nCols).fill('');
    if (idx < 0) linha[cMes] = cfg.mesComoData ? new Date(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)) - 1, 1) : mes;
    cfg.faixas.forEach(function (f, k) { linha[c[f]] = vals[k]; });
    if (cfg.desafio && c[cfg.desafio] != null) {
      var d = num_(m.desafio);
      linha[c[cfg.desafio]] = d == null ? '-' : d;
    }
    linha[c.Atualizado_Por] = String(body.usuario || '');
    linha[c.Atualizado_Em] = agora;
    if (idx >= 0) {
      sh.getRange(idx + 2, 1, 1, nCols).setValues([linha]);
    } else {
      var nova = sh.getLastRow() + 1;
      sh.getRange(nova, cMes + 1).setNumberFormat(formatoMes || (cfg.mesComoData ? 'yyyy-mm' : '@'));
      sh.getRange(nova, 1, 1, nCols).setValues([linha]);
      dados.push(linha);
    }
    gravadas++;
  });
  return gravadas;
}

// GET ?key=...&ano=2026  → { ok, metas: [{ Ano_Mes, Loja, Meta, Meta_Salao, Meta_Delivery, Atualizado_Por, Atualizado_Em }] }
// GET ?key=...&ano=2026&alvo=comercial|reservas → { ok, metas: [{ mes, faixas, faixa1..3, desafio, ... }] }
function doGet(e) {
  try {
    if (!e || !e.parameter || e.parameter.key !== prop_('API_KEY')) return resposta_({ ok: false, erro: 'chave inválida' });
    if (e.parameter.alvo) return resposta_({ ok: true, metas: lerFaixas_(String(e.parameter.alvo), String(e.parameter.ano || '')) });
    var ano = String(e.parameter.ano || '');
    var sh = aba_();
    var c = colunas_(sh, false);
    var linhas = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues() : [];
    var out = [];
    linhas.forEach(function (l) {
      var am = anoMesDaLinha_(l, c);
      if (!am || (ano && am.slice(0, 4) !== ano)) return;
      out.push({
        Ano_Mes: am,
        Loja: String(l[c.Loja] || '').trim(),
        Meta: num_(l[c.Meta]),
        Meta_Salao: c.Meta_Salao != null ? num_(l[c.Meta_Salao]) : null,
        Meta_Delivery: c.Meta_Delivery != null ? num_(l[c.Meta_Delivery]) : null,
        Atualizado_Por: c.Atualizado_Por != null ? String(l[c.Atualizado_Por] || '') : '',
        Atualizado_Em: c.Atualizado_Em != null && l[c.Atualizado_Em] ? String(l[c.Atualizado_Em]) : '',
      });
    });
    return resposta_({ ok: true, metas: out });
  } catch (err) {
    return resposta_({ ok: false, erro: String(err.message || err) });
  }
}

// POST { key, usuario, anoMes: '2026-12', metas: [{ loja: 'CARINAS', salao: 123, delivery: 45 }] }
// Upsert por (Ano, Mes, Loja). Meta = salão + delivery.
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    var body = JSON.parse(e.postData.contents || '{}');
    if (body.key !== prop_('API_KEY')) return resposta_({ ok: false, erro: 'chave inválida' });
    if (!body.metas || !body.metas.length) return resposta_({ ok: false, erro: 'nenhuma meta enviada' });
    if (body.alvo) {
      lock.waitLock(20000);
      return resposta_({ ok: true, gravadas: gravarFaixas_(String(body.alvo), body) });
    }
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(body.anoMes || '')) return resposta_({ ok: false, erro: 'anoMes inválido' });

    lock.waitLock(20000);
    var sh = aba_();
    var c = colunas_(sh, true);
    var nCols = sh.getLastColumn();
    var nLinhas = sh.getLastRow();
    var dados = nLinhas > 1 ? sh.getRange(2, 1, nLinhas - 1, nCols).getValues() : [];
    var ano = Number(body.anoMes.slice(0, 4));
    var mes = Number(body.anoMes.slice(5, 7));
    var agora = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'yyyy-MM-dd HH:mm');
    var gravadas = 0;

    body.metas.forEach(function (m) {
      var loja = String(m.loja || '').trim();
      if (!loja) return;
      var salao = num_(m.salao) || 0;
      var delivery = num_(m.delivery) || 0;
      var idx = -1;
      for (var i = 0; i < dados.length; i++) {
        if (anoMesDaLinha_(dados[i], c) === body.anoMes && String(dados[i][c.Loja]).trim() === loja) { idx = i; break; }
      }
      var linha = idx >= 0 ? dados[idx] : new Array(nCols).fill('');
      linha[c.Ano] = ano;
      linha[c.Mes] = mes;
      if (c.Ano_Mes != null && idx < 0) linha[c.Ano_Mes] = body.anoMes;
      linha[c.Loja] = loja;
      linha[c.Meta] = Math.round((salao + delivery) * 100) / 100;
      linha[c.Meta_Salao] = salao;
      linha[c.Meta_Delivery] = delivery;
      linha[c.Atualizado_Por] = String(body.usuario || '');
      linha[c.Atualizado_Em] = agora;
      if (idx >= 0) {
        sh.getRange(idx + 2, 1, 1, nCols).setValues([linha]);
      } else {
        var nova = sh.getLastRow() + 1;
        // se existir Ano_Mes, grava como TEXTO (senão o Sheets converte "2026-12" em data)
        if (c.Ano_Mes != null) sh.getRange(nova, c.Ano_Mes + 1).setNumberFormat('@');
        sh.getRange(nova, 1, 1, nCols).setValues([linha]);
        dados.push(linha);
      }
      gravadas++;
    });

    return resposta_({ ok: true, gravadas: gravadas });
  } catch (err) {
    return resposta_({ ok: false, erro: String(err.message || err) });
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}
