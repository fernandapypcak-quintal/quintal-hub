// ═══════════════════════════════════════════════════════════════════════
// QUINTAL DO ESPETO — RELATÓRIOS ZIG (API interna enterprise-postgres)
// Descontos + Produtos Estornados + Contas em Aberto + Bônus (concedido/utilizado)
// Autenticação via "dispositivo confiável" (login uma vez, reusa o mesmo
// DEVICE_ID em todas as chamadas seguintes).
//
// CONFIGURAÇÃO NECESSÁRIA (uma vez só):
// 1. Extensões > Apps Script > ⚙️ Configurações do projeto > Propriedades
//    do script > adicionar:
//      ZIG_USERNAME = apr
//      ZIG_PASSWORD = (a senha do painel ZIG)
// 2. No editor, ao lado de "Serviços" clique em "+" e adicione "Drive API"
//    (necessária só pra ler o xlsx de Contas em Aberto).
// 3. Ajuste SINCE_DATE / UNTIL_DATE abaixo.
// ═══════════════════════════════════════════════════════════════════════

// ---------------- CONFIG ----------------
const ORG_USERNAME = 'quintaldoespeto';
const ZIG_ENTERPRISE_BASE = 'https://api.zigcore.com.br/enterprise-postgres';
const DEVICE_ID = 'quintal-hub-relatorios-script-001';

// Período a puxar (formato: 'AAAA-MM-DDT03:00:00.000')
const SINCE_DATE = '2026-05-01T03:00:00.000';
// Para Descontos: deixe '' vazio pra usar "agora" automaticamente.
// Para os outros 3 relatórios: preencha também (ex: '2026-08-01T02:59:59.999').
const UNTIL_DATE = '';

const ABA_DESCONTOS = 'Descontos_Detalhe';
const ABA_ESTORNOS = 'Estornos_Detalhe';
const ABA_CONTAS_ABERTO = 'Contas_Em_Aberto';
const ABA_BONUS_CONCEDIDO = 'Bonus_Concedido';
const ABA_BONUS_UTILIZADO = 'Bonus_Utilizado';


// ═══════════════════════════════════════════════════════════════════════
// AUTENTICAÇÃO (compartilhada por todos os relatórios)
// ═══════════════════════════════════════════════════════════════════════
function getCredenciais() {
  var props = PropertiesService.getScriptProperties();
  var username = props.getProperty('ZIG_USERNAME');
  var password = props.getProperty('ZIG_PASSWORD');
  if (!username || !password) {
    throw new Error('ZIG_USERNAME / ZIG_PASSWORD não configurados em Propriedades do script.');
  }
  return { username: username, password: password };
}

function novoRequestId() {
  return Utilities.getUuid().replace(/-/g, '').slice(0, 32);
}

function deviceInfoPadrao() {
  return {
    id: DEVICE_ID,
    language: 'pt-BR',
    platform: { name: 'web', os: 'AppsScript' }
  };
}

function sdkgenCall(nomeMetodo, args) {
  var body = {
    args: args,
    deviceInfo: deviceInfoPadrao(),
    extra: { tz: 'America/Sao_Paulo', lng: 'pt-BR' },
    name: nomeMetodo,
    requestId: novoRequestId(),
    version: 3
  };

  var res = UrlFetchApp.fetch(ZIG_ENTERPRISE_BASE + '/' + nomeMetodo, {
    method: 'POST',
    contentType: 'application/sdkgen',
    payload: JSON.stringify(body),
    muteHttpExceptions: true
  });

  var code = res.getResponseCode();
  var texto = res.getContentText();
  if (code !== 200) {
    Logger.log('Erro ' + code + ' em ' + nomeMetodo + ': ' + texto.slice(0, 500));
    return null;
  }

  var parsed = JSON.parse(texto);
  if (parsed.error) {
    Logger.log('Erro retornado por ' + nomeMetodo + ': ' + JSON.stringify(parsed.error));
    return null;
  }
  return parsed.result;
}

// Loga e "confia" no DEVICE_ID pra essa conta. Retorna os dados do usuário
// (incluindo a lista de lojas em .places) ou null se falhar.
function zigLogin() {
  var cred = getCredenciais();
  var result = sdkgenCall('logIn', {
    username: cred.username,
    password: cred.password,
    organizationUsername: ORG_USERNAME
  });
  if (!result) {
    Logger.log('🚨 Login falhou — confira ZIG_USERNAME/ZIG_PASSWORD em Propriedades do script.');
    return null;
  }
  Logger.log('✓ Login OK como ' + result.name + ' (' + result.username + ') — ' + (result.places || []).length + ' lojas.');
  return result;
}


// Devolve UNTIL_DATE se preenchido, senao "agora" formatado no padrao que a API espera.
// Todos os relatorios usam isso em vez de UNTIL_DATE direto, pra nunca mandar string vazia.
function getUntilPadrao() {
  return UNTIL_DATE || Utilities.formatDate(new Date(), 'America/Sao_Paulo', "yyyy-MM-dd'T'HH:mm:ss.SSS");
}


// ═══════════════════════════════════════════════════════════════════════
// NORMALIZAÇÃO DE UNIDADE (junta "Delivery X" + "Quintal do Espeto X" em "X")
// ═══════════════════════════════════════════════════════════════════════
function normalizarUnidade(nome) {
  if (!nome) return '';
  var n = nome.toUpperCase().trim();
  n = n.replace('QUINTAL DO ESPETO ', '').replace('QUINTAL ', '');
  n = n.replace('DELIVERY ', '');
  n = n.trim();
  n = n.replace('TATUAPE', 'TATUAPÉ');
  n = n.replace('SANTO ANDRE', 'SANTO ANDRÉ');
  n = n.replace('CARINÃS', 'CARINAS');
  n = n.replace('V. MARIANA', 'VILA MARIANA');
  n = n.replace('V MARIANA', 'VILA MARIANA');
  n = n.replace('V. MADALENA', 'VILA MADALENA');
  n = n.replace('CHAC. STO ANTONIO', 'CHACARA STO ANTONIO');
  n = n.replace('CHAC STO ANTONIO', 'CHACARA STO ANTONIO');
  return n.trim();
}

function canalDaLoja(nome) {
  return String(nome || '').toUpperCase().trim().indexOf('DELIVERY') === 0 ? 'DELIVERY' : 'CASA';
}


// ═══════════════════════════════════════════════════════════════════════
// HELPER: baixa um xlsx de uma URL e devolve as linhas (usa Drive API v3)
// ═══════════════════════════════════════════════════════════════════════
function baixarXlsxERetornarLinhas(url) {
  if (!url) return [];

  var blob = UrlFetchApp.fetch(url, { muteHttpExceptions: true }).getBlob();

  var arquivoTemp = Drive.Files.create(
    { name: 'zig_temp_import_' + Utilities.getUuid(), mimeType: MimeType.GOOGLE_SHEETS },
    blob
  );

  try {
    var ssTemp = SpreadsheetApp.openById(arquivoTemp.id);
    var sheet = ssTemp.getSheets()[0];
    return sheet.getDataRange().getValues();
  } finally {
    Drive.Files.remove(arquivoTemp.id);
  }
}


// ═══════════════════════════════════════════════════════════════════════
// 1) DESCONTOS
// ═══════════════════════════════════════════════════════════════════════
function getDescontosDaLoja(placeId, since, until) {
  return sdkgenCall('getDiscountsAtPlaceByEmployee', {
    placeId: placeId,
    since: since,
    until: until || Utilities.formatDate(new Date(), 'America/Sao_Paulo', "yyyy-MM-dd'T'HH:mm:ss.SSS")
  });
}

function atualizarDescontos() {
  var login = zigLogin();
  if (!login) return;

  var lojas = login.places || [];
  Logger.log('Lojas a processar (descontos): ' + lojas.length);

  var linhas = [];
  var falhas = 0;

  for (var i = 0; i < lojas.length; i++) {
    var loja = lojas[i];
    var nomeLoja = String(loja.name || '').trim();

    var data = getDescontosDaLoja(loja.id, SINCE_DATE, UNTIL_DATE);
    if (data === null) { falhas++; Logger.log('⚠️ Falha ao buscar descontos de ' + nomeLoja); continue; }

    data.forEach(function(funcionario) {
      var nomeFuncionario = funcionario.name || funcionario.username || '(desconhecido)';
      (funcionario.discounts || []).forEach(function(d) {
        var clientes = (d.users || []).map(function(u) { return u.name; }).join(', ');
        var produtos = (d.products || []).join(', ');
        var categoria = d.discountCategory ? d.discountCategory.name : '';
        var valor = (d.value || 0) / 100;
        var pct = d.percentual || 0;

        linhas.push([
          String(d.date || '').slice(0, 10),
          nomeLoja,
          normalizarUnidade(nomeLoja),
          canalDaLoja(nomeLoja),
          nomeFuncionario,
          clientes,
          d.reason || '',
          categoria,
          produtos,
          pct,
          valor
        ]);
      });
    });

    Logger.log('✓ ' + nomeLoja + ' — acumulado: ' + linhas.length + ' descontos');
    Utilities.sleep(300);
  }

  linhas.sort(function(a, b) { return String(a[0]).localeCompare(String(b[0])); });

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(ABA_DESCONTOS);
  if (!sheet) sheet = ss.insertSheet(ABA_DESCONTOS);

  var headers = ['Data', 'Loja', 'Unidade', 'Canal', 'Funcionário', 'Cliente(s)', 'Justificativa', 'Categoria', 'Produtos', 'Percentual', 'Valor (R$)'];
  sheet.clearContents();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers])
    .setBackground('#1F3D2E').setFontColor('#FFFFFF').setFontWeight('bold');

  if (linhas.length) {
    sheet.getRange(2, 1, linhas.length, headers.length).setValues(linhas);
    sheet.getRange(2, 10, linhas.length, 1).setNumberFormat('0.0%');
    sheet.getRange(2, 11, linhas.length, 1).setNumberFormat('R$ #,##0.00');
  }
  sheet.setFrozenRows(1);

  Logger.log('✅ Concluído! ' + linhas.length + ' descontos gravados. Falhas: ' + falhas);
}


// ═══════════════════════════════════════════════════════════════════════
// 2) PRODUTOS ESTORNADOS
// ═══════════════════════════════════════════════════════════════════════
function buscarEstornadosDaLoja(placeId, since, until) {
  return sdkgenCall('getRefundedProductsAtPlace', {
    placeId: placeId,
    since: since,
    until: until
  });
}

function atualizarEstornados() {
  var login = zigLogin();
  if (!login) return;

  var lojas = login.places || [];
  Logger.log('Lojas a processar (estornos): ' + lojas.length);

  var linhas = [];
  var falhas = 0;

  for (var i = 0; i < lojas.length; i++) {
    var loja = lojas[i];
    var nomeLoja = String(loja.name || '').trim();

    var itens = buscarEstornadosDaLoja(loja.id, SINCE_DATE, getUntilPadrao());
    if (itens === null) { falhas++; Logger.log('⚠️ Falha ao buscar estornos de ' + nomeLoja); continue; }

    itens.forEach(function(it) {
      linhas.push([
        String(it.refundedAt || '').slice(0, 10),
        nomeLoja,
        normalizarUnidade(nomeLoja),
        canalDaLoja(nomeLoja),
        it.name || '',
        it.category || '',
        it.isCanceled ? 'Cancelado' : 'Estornado',
        it.refundedBy ? it.refundedBy.name : '',
        it.soldBy ? it.soldBy.name : '',
        it.refundObs || '',
        (it.buyers || []).join(', '),
        it.operationType || '',
        it.count || 0,
        (it.unitValue || 0) / 100
      ]);
    });

    Logger.log('✓ ' + nomeLoja + ' — acumulado: ' + linhas.length + ' estornos');
    Utilities.sleep(300);
  }

  linhas.sort(function(a, b) { return String(a[0]).localeCompare(String(b[0])); });

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(ABA_ESTORNOS);
  if (!sheet) sheet = ss.insertSheet(ABA_ESTORNOS);

  var headers = ['Data', 'Loja', 'Unidade', 'Canal', 'Produto', 'Categoria', 'Tipo', 'Estornado Por', 'Vendido Por', 'Motivo', 'Clientes', 'Operação', 'Quantidade', 'Valor (R$)'];
  sheet.clearContents();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers])
    .setBackground('#1F3D2E').setFontColor('#FFFFFF').setFontWeight('bold');

  if (linhas.length) {
    sheet.getRange(2, 1, linhas.length, headers.length).setValues(linhas);
    sheet.getRange(2, 14, linhas.length, 1).setNumberFormat('R$ #,##0.00');
  }
  sheet.setFrozenRows(1);

  Logger.log('✅ Concluído! ' + linhas.length + ' estornos gravados. Falhas: ' + falhas);
}


// ═══════════════════════════════════════════════════════════════════════
// 3) CONTAS EM ABERTO (via download de xlsx)
// ═══════════════════════════════════════════════════════════════════════
function buscarContasAbertoDaLoja(placeId, since, until) {
  return sdkgenCall('getDebtorsXls', {
    input: {
      scope: {
        event: null,
        place: { id: placeId, period: { since: since, until: until } }
      },
      filters: { status: null, userName: null, userDocument: null }
    }
  });
}

function atualizarContasEmAberto() {
  var login = zigLogin();
  if (!login) return;

  var lojas = login.places || [];
  Logger.log('Lojas a processar (contas em aberto): ' + lojas.length);

  var linhas = [];
  var falhas = 0;

  for (var i = 0; i < lojas.length; i++) {
    var loja = lojas[i];
    var nomeLoja = String(loja.name || '').trim();

    var url = buscarContasAbertoDaLoja(loja.id, SINCE_DATE, getUntilPadrao());
    if (!url) { falhas++; Logger.log('⚠️ Falha ao gerar relatório de contas em aberto de ' + nomeLoja); continue; }

    var dados = baixarXlsxERetornarLinhas(url);
    for (var r = 1; r < dados.length; r++) {
      var linha = dados[r];
      if (!linha[0]) continue;
      linhas.push([nomeLoja, normalizarUnidade(nomeLoja), canalDaLoja(nomeLoja)].concat(linha));
    }

    Logger.log('✓ ' + nomeLoja + ' — acumulado: ' + linhas.length + ' contas em aberto');
    Utilities.sleep(300);
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(ABA_CONTAS_ABERTO);
  if (!sheet) sheet = ss.insertSheet(ABA_CONTAS_ABERTO);

  var headers = ['Loja', 'Unidade', 'Canal', 'Nome', 'CPF', 'Telefone', 'Aberto em Conta', 'Aberto em Serviço', 'Total em Aberto', 'Pago Após Evento', 'Ainda em Aberto'];
  sheet.clearContents();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers])
    .setBackground('#1F3D2E').setFontColor('#FFFFFF').setFontWeight('bold');

  if (linhas.length) {
    sheet.getRange(2, 1, linhas.length, headers.length).setValues(linhas);
  }
  sheet.setFrozenRows(1);

  Logger.log('✅ Concluído! ' + linhas.length + ' contas em aberto gravadas. Falhas: ' + falhas);
}


// ═══════════════════════════════════════════════════════════════════════
// 4a) BÔNUS CONCEDIDO
// ═══════════════════════════════════════════════════════════════════════
function buscarBonusConcedido(placeId, since, until) {
  var todos = [];
  var page = 1;
  var lastPage = 1;

  do {
    var resultado = sdkgenCall('getBonusReportForPlace', {
      input: {
        placeId: placeId,
        filters: { bonusCategoryIds: null, employeesIds: null, since: since, until: until },
        pagination: { currentPage: page, perPage: 100 }
      }
    });
    if (!resultado) return null;
    todos = todos.concat(resultado.data || []);
    lastPage = resultado.pagination ? resultado.pagination.lastPage : 1;
    page++;
  } while (page <= lastPage);

  return todos;
}

function atualizarBonusConcedido() {
  var login = zigLogin();
  if (!login) return;

  var lojas = login.places || [];
  Logger.log('Lojas a processar (bônus concedido): ' + lojas.length);

  var linhas = [];
  var falhas = 0;

  for (var i = 0; i < lojas.length; i++) {
    var loja = lojas[i];
    var nomeLoja = String(loja.name || '').trim();

    var itens = buscarBonusConcedido(loja.id, SINCE_DATE, getUntilPadrao());
    if (itens === null) { falhas++; Logger.log('⚠️ Falha ao buscar bônus concedido de ' + nomeLoja); continue; }

    itens.forEach(function(it) {
      linhas.push([
        nomeLoja,
        normalizarUnidade(nomeLoja),
        canalDaLoja(nomeLoja),
        it.name || '',
        String(it.date || '').slice(0, 10),
        it.givenBy ? it.givenBy.name : '',
        it.reason || '',
        it.bonusCategoryName || '',
        (it.receivedValue || 0) / 100,
        (it.spentValue || 0) / 100,
        (it.spentInOtherEvent || 0) / 100
      ]);
    });

    Logger.log('✓ ' + nomeLoja + ' — acumulado: ' + linhas.length + ' bônus concedidos');
    Utilities.sleep(300);
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(ABA_BONUS_CONCEDIDO);
  if (!sheet) sheet = ss.insertSheet(ABA_BONUS_CONCEDIDO);

  var headers = ['Loja', 'Unidade', 'Canal', 'Cliente', 'Data Concessão', 'Concedido Por', 'Motivo', 'Categoria', 'Valor Recebido (R$)', 'Valor Gasto no Período (R$)', 'Valor Gasto em Outro Período (R$)'];
  sheet.clearContents();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers])
    .setBackground('#1F3D2E').setFontColor('#FFFFFF').setFontWeight('bold');

  if (linhas.length) {
    sheet.getRange(2, 1, linhas.length, headers.length).setValues(linhas);
  }
  sheet.setFrozenRows(1);

  Logger.log('✅ Concluído! ' + linhas.length + ' bônus concedidos gravados. Falhas: ' + falhas);
}


// ═══════════════════════════════════════════════════════════════════════
// 4b) BÔNUS UTILIZADO (com data exata de cada uso)
// ═══════════════════════════════════════════════════════════════════════
function buscarBonusUtilizado(placeId, since, until) {
  return sdkgenCall('getUsedBonusReportForPlace', {
    placeId: placeId,
    since: since,
    until: until
  });
}

function atualizarBonusUtilizado() {
  var login = zigLogin();
  if (!login) return;

  var lojas = login.places || [];
  Logger.log('Lojas a processar (bônus utilizado): ' + lojas.length);

  var linhas = [];
  var falhas = 0;

  for (var i = 0; i < lojas.length; i++) {
    var loja = lojas[i];
    var nomeLoja = String(loja.name || '').trim();

    var itens = buscarBonusUtilizado(loja.id, SINCE_DATE, getUntilPadrao());
    if (itens === null) { falhas++; Logger.log('⚠️ Falha ao buscar bônus utilizado de ' + nomeLoja); continue; }

    itens.forEach(function(it) {
      linhas.push([
        nomeLoja,
        normalizarUnidade(nomeLoja),
        canalDaLoja(nomeLoja),
        it.user ? it.user.name : '',
        String(it.givenAt || '').slice(0, 10),
        String(it.consumedAt || '').slice(0, 10),
        it.givenBy ? it.givenBy.name : '',
        it.reason || '',
        (it.spentValue || 0) / 100
      ]);
    });

    Logger.log('✓ ' + nomeLoja + ' — acumulado: ' + linhas.length + ' usos de bônus');
    Utilities.sleep(300);
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(ABA_BONUS_UTILIZADO);
  if (!sheet) sheet = ss.insertSheet(ABA_BONUS_UTILIZADO);

  var headers = ['Loja', 'Unidade', 'Canal', 'Cliente', 'Concedido Em', 'Utilizado Em', 'Concedido Por', 'Motivo', 'Valor Utilizado (R$)'];
  sheet.clearContents();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers])
    .setBackground('#1F3D2E').setFontColor('#FFFFFF').setFontWeight('bold');

  if (linhas.length) {
    sheet.getRange(2, 1, linhas.length, headers.length).setValues(linhas);
  }
  sheet.setFrozenRows(1);

  Logger.log('✅ Concluído! ' + linhas.length + ' usos de bônus gravados. Falhas: ' + falhas);
}


// ═══════════════════════════════════════════════════════════════════════
// RODAR TUDO DE UMA VEZ
// ═══════════════════════════════════════════════════════════════════════
function atualizarTudo() {
  atualizarDescontos();
  atualizarEstornados();
  atualizarContasEmAberto();
  atualizarBonusConcedido();
  atualizarBonusUtilizado();
}

// Instala um trigger diário
function instalarTriggerTudo() {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'atualizarTudo') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('atualizarTudo').timeBased().everyDays(1).atHour(6).create();
  Logger.log('✓ Trigger diário instalado (6h da manhã)');
}


// ═══════════════════════════════════════════════════════════════════════
// WEB APP (doGet) — expõe as abas como JSON pro HUB consumir
// Deploy: Implantar > Nova implantação > Aplicativo da web
//   Executar como: Eu (fernanda)
//   Quem tem acesso: Qualquer pessoa (ou "Qualquer pessoa com Google" se
//   preferir mais restrito, mas aí a rota de API do Next.js precisa de OAuth)
// Depois de implantar, pega a URL (.../exec) e usa como ZIG_HUB_APPS_SCRIPT_URL
// nas variáveis de ambiente do Next.js.
//
// Uso: {URL}?tipo=descontos | estornos | contas_aberto | bonus_concedido | bonus_utilizado
// ═══════════════════════════════════════════════════════════════════════
var MAPA_ABAS_API = {
  descontos: ABA_DESCONTOS,
  estornos: ABA_ESTORNOS,
  contas_aberto: ABA_CONTAS_ABERTO,
  bonus_concedido: ABA_BONUS_CONCEDIDO,
  bonus_utilizado: ABA_BONUS_UTILIZADO
};

function doGet(e) {
  var out = ContentService.createTextOutput();
  out.setMimeType(ContentService.MimeType.JSON);

  var tipo = e && e.parameter && e.parameter.tipo;

  try {
    if (tipo === 'ping') {
      out.setContent(JSON.stringify({ ok: true, ts: new Date().toISOString() }));
      return out;
    }

    var nomeAba = MAPA_ABAS_API[tipo];
    if (!nomeAba) {
      out.setContent(JSON.stringify({ erro: 'tipo desconhecido: ' + tipo + '. Use: ' + Object.keys(MAPA_ABAS_API).join(', ') }));
      return out;
    }

    var dados = _sheetToJson(nomeAba);
    // Devolve o array puro (nao embrulhado) -- o loader.js do HUB checa
    // Array.isArray(data) direto, igual o padrao do dashboard de Custos.
    out.setContent(JSON.stringify(dados));
  } catch (err) {
    out.setContent(JSON.stringify({ erro: err.message }));
  }

  return out;
}

// Converte uma aba (header na linha 1 + dados a partir da linha 2) em array de objetos.
// Chaves viram snake_case sem acento, a partir do texto do cabeçalho.
function _sheetToJson(nomeAba) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(nomeAba);
  if (!sheet || sheet.getLastRow() < 2) return [];

  var dados = sheet.getDataRange().getValues();
  var headers = dados[0].map(_chaveNormalizada);

  var linhas = [];
  for (var i = 1; i < dados.length; i++) {
    var row = dados[i];
    if (!row[0] && !row[1]) continue; // pula linha totalmente vazia
    var obj = {};
    for (var c = 0; c < headers.length; c++) {
      var valor = row[c];
      // Datas viram string ISO (yyyy-MM-dd) pra serializar limpo em JSON
      if (valor instanceof Date) {
        valor = Utilities.formatDate(valor, 'America/Sao_Paulo', 'yyyy-MM-dd');
      }
      obj[headers[c]] = valor;
    }
    linhas.push(obj);
  }
  return linhas;
}

function _chaveNormalizada(texto) {
  var t = String(texto || '').trim().toLowerCase();
  t = t.replace(/[áàâã]/g, 'a').replace(/[éê]/g, 'e').replace(/í/g, 'i')
       .replace(/[óôõ]/g, 'o').replace(/ú/g, 'u').replace(/ç/g, 'c');
  t = t.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return t;
}
