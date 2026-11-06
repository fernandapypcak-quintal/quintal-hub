// ═══════════════════════════════════════════════════════════════════════
// QuintalFaturamentoMetas.gs — grava as METAS DE FATURAMENTO na planilha,
// a partir da tela "Metas" do dashboard de Faturamento no HUB.
//
// A planilha continua sendo a fonte de verdade: o HUB só escreve aqui,
// e todo o resto (dashboards, Apps Scripts) segue lendo a aba como hoje.
//
// Formato da aba "meta" da planilha Quintal Dashboard (as 4 primeiras colunas
// já existem; as outras o script cria sozinho na primeira gravação, no fim
// da linha de cabeçalho, sem mexer nas existentes):
//   Ano | Mes | Loja | Meta | Meta_Salao | Meta_Delivery | Atualizado_Por | Atualizado_Em
//   Meta = Meta_Salao + Meta_Delivery (assim o que já lê "Meta" continua igual)
//   (Se a aba tiver uma coluna Ano_Mes, ela também é usada/preenchida.)
//
// ── COMO INSTALAR (uma vez) ────────────────────────────────────────────
// 1. Na planilha "Quintal Dashboard": Extensões > Apps Script > "+" > Script,
//    nome QuintalFaturamentoMetas, cole este arquivo. (Fica ao lado do script
//    que já existe, sem mexer nele.)
//    A cópia "Quintal Faturamento — Dados Publicados" (aba pub_metas) continua
//    sendo atualizada pela rotina que já existe; o HUB lê salão/delivery daqui.
// 2. ⚙️ Configurações do projeto > Propriedades do script > adicionar:
//      API_KEY    = uma senha longa qualquer (a MESMA vai na Vercel)
//      ABA_METAS  = meta
// 3. Implantar > Nova implantação > Tipo: App da Web
//      Executar como: Eu  ·  Quem pode acessar: Qualquer pessoa
//    Copie a URL /exec.
// 4. Na Vercel (quintal-hub > Settings > Environment Variables):
//      FATURAMENTO_METAS_GAS_URL = a URL /exec
//      FATURAMENTO_METAS_GAS_KEY = o mesmo API_KEY do passo 2
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

// GET ?key=...&ano=2026  → { ok, metas: [{ Ano_Mes, Loja, Meta, Meta_Salao, Meta_Delivery, Atualizado_Por, Atualizado_Em }] }
function doGet(e) {
  try {
    if (!e || !e.parameter || e.parameter.key !== prop_('API_KEY')) return resposta_({ ok: false, erro: 'chave inválida' });
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
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(body.anoMes || '')) return resposta_({ ok: false, erro: 'anoMes inválido' });
    if (!body.metas || !body.metas.length) return resposta_({ ok: false, erro: 'nenhuma meta enviada' });

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
