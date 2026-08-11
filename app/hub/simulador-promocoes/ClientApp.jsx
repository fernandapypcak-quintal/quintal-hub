'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Minus, Trash2, Search, Save, X, Flame, TrendingDown, TrendingUp, ChefHat, Upload, FileSpreadsheet, History, PenLine, BookOpen, Check } from 'lucide-react'
import * as XLSX from 'xlsx'
import { URL_PROMOCOES_PACOTES } from '@/lib/promocoesConfig'

import PRODUTOS_FALLBACK from '@/lib/catalogoFallback.json'


function normalizar(str) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function formatR$(v) {
  if (!isFinite(v)) return "R$ 0,0";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function formatPct(v) {
  if (!isFinite(v)) return "0,0%";
  return (v * 100).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%";
}

// Cardápios fixos — pacotes "à vontade" com lista de itens pronta (baseado
// no material de marketing recebido). Preço sugerido é opcional; a
// quantidade de cada item entra como 1 por padrão, editável ao carregar.
const CARDAPIOS_PADRAO = [
  {
    id: "festival-cerveja-e-churrasco",
    nome: "Festival Cerveja e Churrasco à Vontade",
    precoSugerido: 99.99,
    itens: [
      "BOVINO", "CALABRESA S/ PIMENTA", "CALABRESA C/ PIMENTA", "CORACAO", "FRANGO", "KAFTA",
      "PAO DE ALHO", "SALSICHAO", "PANCETA",
      "ORIGINAL 600", "CERVEJA SPATEN", "BUDWEISER ZERO", "STELLA 550",
      "AGUA S/ GAS", "AGUA C/ GAS", "GUARANA", "GUARANA ANTARTICA  ZERO", "PEPSI", "PEPSI ZERO BLACK",
      "SODA LIMONADA", "SODA LIMONADA DIET", "SUKITA", "AGUA TONICA", "AGUA TONICA DIET",
      "ARROZ", "ARROZ BIRO BIRO", "ANEIS DE CEBOLA PRÉ-FORMADA", "FRITAS", "MANDIOCA FRITA P",
      "VINAGRETE", "FAROFA  DA CASA", "POLENTA FRITA",
      "QUEIJO COALHO C/ MELACO", "MINI CHURROS C/ DOCE DE LEITE",
      "BOLINHO QUEIJO", "ESPETO DADINHO DE TAPIOCA C/ GELEIA DE PIMENTA", "KIBE", "PORÇÃO DE PASTÉIS", "STICKS DE MUSSARELA",
    ],
  },
  {
    id: "rodizio-espetos-classicos",
    nome: "Rodízio de Espetos Clássicos",
    precoSugerido: null,
    itens: [
      "BOVINO", "CALABRESA C/ PIMENTA", "CALABRESA S/ PIMENTA", "CORACAO", "FRANGO", "KAFTA",
      "PANCETA", "SALSICHAO", "PAO DE ALHO",
      "MUSSARELA BUFALA C/  RUCULA E TOMATE GRAPE", "QUEIJO COALHO C/ MELACO",
      "ABOBRINHA", "BERINJELA", "BATATA BOLINHA",
      "ARROZ", "ARROZ BIRO BIRO", "ANEIS DE CEBOLA PRÉ-FORMADA", "FRITAS", "VINAGRETE", "FAROFA  DA CASA", "POLENTA FRITA", "MANDIOCA FRITA P",
      "BOLINHO QUEIJO", "KIBE", "PORÇÃO DE PASTÉIS", "STICKS DE MUSSARELA", "COXINHA FRANGO C/ REQUEIJÃO", "ESPETO DADINHO DE TAPIOCA C/ GELEIA DE PIMENTA",
    ],
  },
];

const CHAVE_CARDAPIOS_CUSTOM = "quintal_cardapios_custom_v1";

// Grupos de itens reaproveitados entre os cardápios corporativos
const CLASSICOS_QUINTAL = ["BOVINO", "FRANGO", "KAFTA", "CORACAO", "CALABRESA S/ PIMENTA", "CALABRESA C/ PIMENTA", "PANCETA", "SALSICHAO", "PAO DE ALHO"];
const DIRETO_FAZENDA = ["QUEIJO COALHO C/ MELACO", "MUSSARELA BUFALA C/  RUCULA E TOMATE GRAPE"];
const VEGGIE_CORP = ["ABOBRINHA", "BATATA BOLINHA", "BERINJELA", "PUPUNHA C/ TOMATE SECO E RUCULA", "PUPUNHA NA BRASA"];
const ACOMPANHAMENTOS_CORP = ["ARROZ", "ARROZ BIRO BIRO", "FRITAS", "FAROFA  DA CASA", "MANDIOCA FRITA P", "POLENTA FRITA", "VINAGRETE", "ANEIS DE CEBOLA PRÉ-FORMADA"];
const SOBREMESAS_CORP = ["ABACAXI C/ CHOCOLATE", "BANANA C/ CHOCOLATE", "BRIGADEIRO", "MINI CHURROS C/ DOCE DE LEITE", "MORANGO C/ CHOCOLATE", "UVA C/ CHOCOLATE"];
const BOTECO_SIMPLES = ["STICKS DE MUSSARELA"];
const BOTECO_COMPLETO = ["BOLINHO BACALHAU", "COXINHA FRANGO C/ REQUEIJÃO", "ESPETO DADINHO DE TAPIOCA C/ GELEIA DE PIMENTA", "KIBE", "PORÇÃO DE PASTÉIS", "STICKS DE MUSSARELA"];
const BEBIDAS_SEM_ALCOOL = ["AGUA S/ GAS", "AGUA C/ GAS", "AGUA TONICA", "AGUA TONICA DIET", "GUARANA", "PEPSI", "SUKITA", "SODA LIMONADA", "SODA LIMONADA DIET"];
const CERVEJAS_CORP = ["BECKS LONG NECK", "BUDWEISER ZERO", "ORIGINAL 600", "CERVEJA SPATEN", "STELLA 550", "STELLA PURE GOLD 600"];
const DRINKS_Q2 = ["CAIPIRINHA CACHACA NACIONAL", "CAIPIRINHA VODKA NACIONAL", "GIN TÔNICA PINK", "GIN TÔNICA CLÁSSICO"];
const DRINKS_Q3 = [...DRINKS_Q2, "CAIPIRINHA DO QUINTAL MEL E LIMÃO"];
const SELECAO_PREMIUM = ["CAMARAO BRASA", "CARRE DE CORDEIRO", "COSTELA BOVINA", "FILE MIGNON BOVINO", "PICANHA", "SALSICHAO C/ PROVOLONE", "SHIMEJI", "TULIPA DE FRANGO"];

// Cardápios corporativos (eventos fechados) — preço é o valor de tabela por
// pessoa, ANTES da taxa de serviço de +10% que aparece nos materiais de
// marketing. Some itens dos folhetos (ex: Linguiça Cuiabana, sabores
// específicos de caipirinha/caipiroska) não têm equivalente exato no
// catálogo e ficaram fora — dá pra adicionar na mão ao carregar.
const CARDAPIOS_CORPORATIVOS = [
  { id: "corp-quintal1-padrao", nome: "Corporativo Quintal 1 (padrão)", precoSugerido: 229.99,
    itens: [...CLASSICOS_QUINTAL, ...DIRETO_FAZENDA, ...BOTECO_SIMPLES, ...VEGGIE_CORP, ...ACOMPANHAMENTOS_CORP, ...SOBREMESAS_CORP, ...BEBIDAS_SEM_ALCOOL, ...CERVEJAS_CORP] },
  { id: "corp-quintal2-padrao", nome: "Corporativo Quintal 2 (padrão)", precoSugerido: 265.99,
    itens: [...CLASSICOS_QUINTAL, ...DIRETO_FAZENDA, ...BOTECO_COMPLETO, ...VEGGIE_CORP, ...ACOMPANHAMENTOS_CORP, ...SOBREMESAS_CORP, ...BEBIDAS_SEM_ALCOOL, ...CERVEJAS_CORP, ...DRINKS_Q2] },
  { id: "corp-quintal3-padrao", nome: "Corporativo Quintal 3 (padrão)", precoSugerido: 284.99,
    itens: [...CLASSICOS_QUINTAL, ...SELECAO_PREMIUM, ...DIRETO_FAZENDA, ...BOTECO_COMPLETO, ...VEGGIE_CORP, ...ACOMPANHAMENTOS_CORP, ...SOBREMESAS_CORP, ...BEBIDAS_SEM_ALCOOL, ...CERVEJAS_CORP, ...DRINKS_Q3] },
  { id: "corp-quintal1-fimdeano", nome: "Corporativo Quintal 1 (Fim de Ano 2026)", precoSugerido: 252.99,
    itens: [...CLASSICOS_QUINTAL, ...DIRETO_FAZENDA, ...BOTECO_SIMPLES, ...VEGGIE_CORP, ...ACOMPANHAMENTOS_CORP, ...SOBREMESAS_CORP, ...BEBIDAS_SEM_ALCOOL, ...CERVEJAS_CORP] },
  { id: "corp-quintal2-fimdeano", nome: "Corporativo Quintal 2 (Fim de Ano 2026)", precoSugerido: 292.99,
    itens: [...CLASSICOS_QUINTAL, ...DIRETO_FAZENDA, ...BOTECO_COMPLETO, ...VEGGIE_CORP, ...ACOMPANHAMENTOS_CORP, ...SOBREMESAS_CORP, ...BEBIDAS_SEM_ALCOOL, ...CERVEJAS_CORP, ...DRINKS_Q2] },
  { id: "corp-quintal3-fimdeano", nome: "Corporativo Quintal 3 (Fim de Ano 2026)", precoSugerido: 313.99,
    itens: [...CLASSICOS_QUINTAL, ...SELECAO_PREMIUM, ...DIRETO_FAZENDA, ...BOTECO_COMPLETO, ...VEGGIE_CORP, ...ACOMPANHAMENTOS_CORP, ...SOBREMESAS_CORP, ...BEBIDAS_SEM_ALCOOL, ...CERVEJAS_CORP, ...DRINKS_Q3] },
  { id: "corp-quintal4-fimdeano", nome: "Corporativo Quintal 4 — sem álcool (Fim de Ano 2026)", precoSugerido: 179.99,
    itens: [...CLASSICOS_QUINTAL, ...DIRETO_FAZENDA, ...BOTECO_SIMPLES, ...VEGGIE_CORP, ...ACOMPANHAMENTOS_CORP, ...SOBREMESAS_CORP, ...BEBIDAS_SEM_ALCOOL] },
];

function statusCmv(cmvPct) {
  if (!isFinite(cmvPct)) return { label: "—", cor: "#71717a", bg: "#F4F4F0", border: "#E8E8E2" };
  if (cmvPct >= 0.8) return { label: "CRÍTICO", cor: "#8C1414", bg: "#FEF2F2", border: "#FEE2E2" };
  if (cmvPct >= 0.35) return { label: "ATENÇÃO", cor: "#B45309", bg: "#FFFBEB", border: "#FEF3C7" };
  return { label: "OK", cor: "#97A624", bg: "#F0FDF4", border: "#DCFCE7" };
}

// Catálogo de custo/preço é único para toda a rede (validado nas planilhas
// de CMV de Maio/Junho 2026 — mesmos valores em todas as lojas), então este
// simulador não precisa de filtro por loja. allowedLojas fica disponível
// caso um dia o catálogo passe a variar por unidade.
export default function SimuladorPromocoesClientApp({ allowedLojas = '*', mostrarBarraVoltar = true }) {
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("TODAS");
  const [carrinho, setCarrinho] = useState([]);
  const [nomePromo, setNomePromo] = useState("");
  const [modoPreco, setModoPreco] = useState("fixo");
  const [precoFixo, setPrecoFixo] = useState("");
  const [percDesconto, setPercDesconto] = useState("");
  const [cenarios, setCenarios] = useState([]);
  const [pessoas, setPessoas] = useState("1");

  // ---------- Catálogo ao vivo (puxa da mesma ficha técnica do módulo CMV) ----------
  const [produtos, setProdutos] = useState(PRODUTOS_FALLBACK);
  const [origemCatalogo, setOrigemCatalogo] = useState("embutido"); // 'embutido' | 'ao-vivo' | 'erro'
  const [carregandoCatalogo, setCarregandoCatalogo] = useState(true);
  const [atualizadoEm, setAtualizadoEm] = useState(null);

  async function carregarCatalogoAoVivo() {
    setCarregandoCatalogo(true);
    try {
      const res = await fetch(`${URL_PROMOCOES_PACOTES}?tipo=ficha_tecnica`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const linhas = await res.json();

      const novoCatalogo = (Array.isArray(linhas) ? linhas : [])
        .map((r) => ({
          produto: String(r.produto || "").trim(),
          categoria: String(r.categoria || "OUTROS").trim() || "OUTROS",
          custo: parseFloat(String(r.custo_unitario_r ?? "0").replace(",", ".")) || 0,
          preco: parseFloat(String(r.preco_de_venda_r ?? "0").replace(",", ".")) || 0,
        }))
        .filter((p) => p.produto);

      if (novoCatalogo.length > 0) {
        setProdutos(novoCatalogo);
        setOrigemCatalogo("ao-vivo");
        setAtualizadoEm(new Date());
      } else {
        throw new Error("Ficha técnica veio vazia");
      }
    } catch (e) {
      // Mantém o catálogo embutido (snapshot) como rede de segurança
      setOrigemCatalogo("erro");
    } finally {
      setCarregandoCatalogo(false);
    }
  }

  useEffect(() => {
    carregarCatalogoAoVivo();
  }, []);

  const CATEGORIAS = useMemo(
    () => ["TODAS", ...Array.from(new Set(produtos.map((p) => p.categoria))).sort()],
    [produtos]
  );

  const [modoOrigem, setModoOrigem] = useState("manual"); // 'manual' | 'historico'
  const [arquivos, setArquivos] = useState([]); // [{nome, loja, periodo}]
  const [linhasHistorico, setLinhasHistorico] = useState([]); // dados brutos agregados
  const [palavrasExcluir, setPalavrasExcluir] = useState(
    "FUNCIONARIO, SOCIO, HOLDING, SUPERVISAO, DIRETORIA, COLABORADOR"
  );
  const [promoSelecionada, setPromoSelecionada] = useState(null);
  const [usosReferencia, setUsosReferencia] = useState("1");
  const [erroImportacao, setErroImportacao] = useState(null);
  const [carregandoArquivo, setCarregandoArquivo] = useState(false);

  // ---------- Cardápios fixos ----------
  const [cardapiosCustom, setCardapiosCustom] = useState([]);
  const [criandoCardapio, setCriandoCardapio] = useState(false);
  const [novoCardapioNome, setNovoCardapioNome] = useState("");
  const [novoCardapioPreco, setNovoCardapioPreco] = useState("");
  const [novoCardapioItens, setNovoCardapioItens] = useState([]); // array de nomes de produto
  const [buscaCardapio, setBuscaCardapio] = useState("");

  useEffect(() => {
    try {
      const salvos = window.localStorage.getItem(CHAVE_CARDAPIOS_CUSTOM);
      if (salvos) setCardapiosCustom(JSON.parse(salvos));
    } catch (e) {
      // localStorage indisponível — sem problema, só não persiste
    }
  }, []);

  function salvarCardapiosCustom(lista) {
    setCardapiosCustom(lista);
    try {
      window.localStorage.setItem(CHAVE_CARDAPIOS_CUSTOM, JSON.stringify(lista));
    } catch (e) {
      // ignora se não conseguir persistir
    }
  }

  const produtosFiltrados = useMemo(() => {
    const termo = normalizar(busca);
    return produtos.filter((p) => {
      const matchBusca = termo === "" || normalizar(p.produto).includes(termo);
      const matchCat = categoria === "TODAS" || p.categoria === categoria;
      return matchBusca && matchCat;
    }).slice(0, 60);
  }, [busca, categoria]);

  function adicionarItem(produto) {
    setCarrinho((prev) => {
      const existe = prev.find((i) => i.produto === produto.produto);
      if (existe) {
        return prev.map((i) => (i.produto === produto.produto ? { ...i, qtd: i.qtd + 1 } : i));
      }
      return [...prev, { ...produto, qtd: 1, custoOverride: null, precoOverride: null }];
    });
  }

  function alterarQtd(produto, delta) {
    setCarrinho((prev) =>
      prev
        .map((i) =>
          i.produto === produto
            ? { ...i, qtd: Math.max(0.1, +(i.qtd + delta).toFixed(2)), qtdTexto: undefined }
            : i
        )
        .filter((i) => i.qtd > 0)
    );
  }

  function definirQtd(produto, valor) {
    const num = parseFloat((valor || "0").replace(",", "."));
    setCarrinho((prev) =>
      prev.map((i) => (i.produto === produto ? { ...i, qtdTexto: valor, qtd: isFinite(num) && num > 0 ? num : i.qtd } : i))
    );
  }

  function definirCusto(produto, valor) {
    const num = parseFloat((valor || "0").replace(",", "."));
    setCarrinho((prev) =>
      prev.map((i) => (i.produto === produto ? { ...i, custoOverride: valor, custo: isFinite(num) ? num : i.custo } : i))
    );
  }

  function definirPreco(produto, valor) {
    const num = parseFloat((valor || "0").replace(",", "."));
    setCarrinho((prev) =>
      prev.map((i) => (i.produto === produto ? { ...i, precoOverride: valor, preco: isFinite(num) ? num : i.preco } : i))
    );
  }

  function removerItem(produto) {
    setCarrinho((prev) => prev.filter((i) => i.produto !== produto));
  }

  const multiplicador = (() => {
    const n = parseFloat((pessoas || "1").replace(",", "."));
    return isFinite(n) && n > 0 ? n : 1;
  })();

  const custoTotal = carrinho.reduce((acc, i) => acc + i.custo * i.qtd, 0) * multiplicador;
  const valorCardapio = carrinho.reduce((acc, i) => acc + i.preco * i.qtd, 0) * multiplicador;

  // ---------- Importação do relatório "Promoções utilizadas" da ZIG ----------
  async function handleArquivos(fileList) {
    setErroImportacao(null);
    setCarregandoArquivo(true);
    const novosArquivos = [];
    const linhasNovas = [];
    try {
      for (const file of Array.from(fileList)) {
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: "array" });
        let lojaPeriodo = { loja: "", periodo: "" };

        for (const sheetName of wb.SheetNames) {
          const ws = wb.Sheets[sheetName];
          const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

          // tenta achar o título pra extrair loja/período (linha 0, coluna B geralmente)
          for (const linha of raw.slice(0, 4)) {
            const texto = (linha || []).find((c) => typeof c === "string" && c.includes("Promoções utilizadas de"));
            if (texto) {
              const m = texto.match(/Promoções utilizadas de (.+?) entre (\d{2}\/\d{2}\/\d{4}) e (\d{2}\/\d{2}\/\d{4})/);
              if (m) lojaPeriodo = { loja: m[1], periodo: `${m[2]} a ${m[3]}` };
            }
          }

          // acha a linha de cabeçalho (Produto / Promoção / Categoria / Quantidade de usos / Desconto total)
          const idxHeader = raw.findIndex(
            (linha) => linha && typeof linha[0] === "string" && linha[0].trim() === "Produto" && typeof linha[1] === "string" && linha[1].trim() === "Promoção"
          );
          if (idxHeader === -1) continue;

          for (let i = idxHeader + 1; i < raw.length; i++) {
            const linha = raw[i];
            if (!linha || !linha[0] || !linha[1]) continue;
            linhasNovas.push({
              produto: String(linha[0]).trim(),
              promocao: String(linha[1]).trim(),
              categoria: linha[2] ? String(linha[2]).trim() : "",
              usos: Number(linha[3]) || 0,
              desconto: Number(linha[4]) || 0,
            });
          }
        }
        novosArquivos.push({ nome: file.name, ...lojaPeriodo });
      }

      if (linhasNovas.length === 0) {
        setErroImportacao("Não encontrei o formato esperado (colunas Produto / Promoção / Categoria / Quantidade de usos / Desconto total). Confere se é o export direto da ZIG.");
      } else {
        setArquivos((prev) => [...prev, ...novosArquivos]);
        setLinhasHistorico((prev) => [...prev, ...linhasNovas]);
      }
    } catch (e) {
      setErroImportacao("Não consegui ler esse arquivo. Confere se é um .xlsx válido exportado da ZIG.");
    } finally {
      setCarregandoArquivo(false);
    }
  }

  function limparHistorico() {
    setArquivos([]);
    setLinhasHistorico([]);
    setPromoSelecionada(null);
    setErroImportacao(null);
  }

  // Agrupa as linhas brutas por Promoção, somando usos/desconto por produto
  const gruposHistorico = useMemo(() => {
    const grupos = {};
    for (const l of linhasHistorico) {
      if (!grupos[l.promocao]) grupos[l.promocao] = { nome: l.promocao, produtos: {}, totalDesconto: 0, maxUsos: 0 };
      const g = grupos[l.promocao];
      if (!g.produtos[l.produto]) g.produtos[l.produto] = { produto: l.produto, categoria: l.categoria, usos: 0, desconto: 0 };
      g.produtos[l.produto].usos += l.usos;
      g.produtos[l.produto].desconto += l.desconto;
      g.totalDesconto += l.desconto;
    }
    for (const g of Object.values(grupos)) {
      g.maxUsos = Math.max(1, ...Object.values(g.produtos).map((p) => p.usos));
      g.listaProdutos = Object.values(g.produtos).sort((a, b) => b.usos - a.usos);
    }
    return grupos;
  }, [linhasHistorico]);

  // Remove promoções que batem com as palavras-chave de exclusão (funcionário, sócio, holding...)
  const gruposFiltrados = useMemo(() => {
    const keywords = palavrasExcluir
      .split(",")
      .map((k) => normalizar(k.trim()))
      .filter(Boolean);
    return Object.values(gruposHistorico)
      .filter((g) => !keywords.some((kw) => kw && normalizar(g.nome).includes(kw)))
      .sort((a, b) => b.totalDesconto - a.totalDesconto);
  }, [gruposHistorico, palavrasExcluir]);

  function abrirPreviewPromo(nome) {
    setPromoSelecionada(nome);
    setUsosReferencia(String(gruposHistorico[nome]?.maxUsos ?? 1));
  }

  function carregarPromoNoSimulador() {
    const grupo = gruposHistorico[promoSelecionada];
    if (!grupo) return;
    const ref = parseFloat((usosReferencia || "1").replace(",", ".")) || 1;
    let naoEncontrados = 0;

    const novoCarrinho = grupo.listaProdutos.map((p) => {
      const doCatalogo = produtos.find((c) => normalizar(c.produto) === normalizar(p.produto));
      if (!doCatalogo) naoEncontrados += 1;
      const qtdMedia = +(p.usos / ref).toFixed(3);
      return {
        produto: p.produto,
        categoria: doCatalogo?.categoria || p.categoria || "OUTROS",
        custo: doCatalogo?.custo ?? 0,
        preco: doCatalogo?.preco ?? 0,
        qtd: qtdMedia > 0 ? qtdMedia : 0.1,
        custoOverride: null,
        precoOverride: null,
      };
    });

    setCarrinho(novoCarrinho);
    setNomePromo(grupo.nome);
    setPessoas("1");
    setErroImportacao(
      naoEncontrados > 0
        ? `Carregado. ${naoEncontrados} produto(s) não bateram com o catálogo atual e entraram com custo/venda em R$ 0 — confere e ajusta na lista à direita.`
        : null
    );
  }
  // ---------------------------------------------------------------------

  // ---------- Cardápios fixos: carregar / criar / salvar ----------
  function carregarCardapio(cardapio) {
    let naoEncontrados = 0;
    const novoCarrinho = cardapio.itens.map((nomeProduto) => {
      const doCatalogo = produtos.find((c) => normalizar(c.produto) === normalizar(nomeProduto));
      if (!doCatalogo) naoEncontrados += 1;
      return {
        produto: doCatalogo ? doCatalogo.produto : nomeProduto,
        categoria: doCatalogo?.categoria || "OUTROS",
        custo: doCatalogo?.custo ?? 0,
        preco: doCatalogo?.preco ?? 0,
        qtd: 1,
        custoOverride: null,
        precoOverride: null,
      };
    });

    setCarrinho(novoCarrinho);
    setNomePromo(cardapio.nome);
    setPessoas("1");
    if (cardapio.precoSugerido != null) {
      setModoPreco("fixo");
      setPrecoFixo(String(cardapio.precoSugerido).replace(".", ","));
    }
    setErroImportacao(
      naoEncontrados > 0
        ? `Carregado. ${naoEncontrados} produto(s) não bateram com o catálogo atual e entraram com custo/venda em R$ 0 — confere e ajusta na lista à direita.`
        : null
    );
  }

  function alternarItemNovoCardapio(nomeProduto) {
    setNovoCardapioItens((prev) =>
      prev.includes(nomeProduto) ? prev.filter((p) => p !== nomeProduto) : [...prev, nomeProduto]
    );
  }

  function salvarNovoCardapio() {
    if (!novoCardapioNome.trim() || novoCardapioItens.length === 0) return;
    const precoNum = parseFloat((novoCardapioPreco || "").replace(",", "."));
    const novo = {
      id: "custom-" + Date.now(),
      nome: novoCardapioNome.trim(),
      precoSugerido: isFinite(precoNum) && precoNum > 0 ? precoNum : null,
      itens: [...novoCardapioItens],
    };
    salvarCardapiosCustom([...cardapiosCustom, novo]);
    setCriandoCardapio(false);
    setNovoCardapioNome("");
    setNovoCardapioPreco("");
    setNovoCardapioItens([]);
    setBuscaCardapio("");
  }

  function removerCardapioCustom(id) {
    salvarCardapiosCustom(cardapiosCustom.filter((c) => c.id !== id));
  }

  const precoPromoNum =
    modoPreco === "fixo"
      ? parseFloat((precoFixo || "0").replace(",", ".")) * multiplicador
      : valorCardapio * (1 - parseFloat((percDesconto || "0").replace(",", ".")) / 100);

  const precoPromo = isFinite(precoPromoNum) ? precoPromoNum : 0;
  const descontoRS = valorCardapio - precoPromo;
  const descontoPct = valorCardapio > 0 ? descontoRS / valorCardapio : 0;
  const cmvPct = precoPromo > 0 ? custoTotal / precoPromo : Infinity;
  const mcRS = precoPromo - custoTotal;
  const mcPct = precoPromo > 0 ? mcRS / precoPromo : 0;
  const markup = custoTotal > 0 ? precoPromo / custoTotal : 0;
  const status = statusCmv(cmvPct);

  const temItens = carrinho.length > 0 && precoPromo > 0;

  function salvarCenario() {
    if (!temItens) return;
    setCenarios((prev) => [
      ...prev,
      {
        id: Date.now(),
        nome: nomePromo || "Sem nome",
        itens: carrinho.length,
        precoPromo,
        custoTotal,
        cmvPct,
        mcRS,
        status,
      },
    ]);
  }

  function removerCenario(id) {
    setCenarios((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "#FAFAF8", fontFamily: "'DM Sans', sans-serif", color: "#0D0D0D" }}>
      <style>{`
        * { box-sizing: border-box; }
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-thumb { background: #E8E8E2; border-radius: 8px; }
      `}</style>

      {/* Voltar ao HUB */}
      {mostrarBarraVoltar && (
      <div className="flex items-center gap-3 px-4 py-2 bg-brand-black border-b border-zinc-800">
        <Link href="/hub" className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-white transition-colors">
          ← Voltar ao HUB
        </Link>
        <span className="text-zinc-700 text-xs">|</span>
        <span className="text-xs text-zinc-500">Simulador de Promoções</span>
      </div>
      )}

      <div style={{ maxWidth: 1180, width: "100%", margin: "0 auto", padding: "28px 20px 60px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: "#8C1414", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Flame size={22} color="#fff" strokeWidth={2.2} />
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.3 }}>Simulador de CMV de Promoção</div>
            <div style={{ fontSize: 13, color: "#71717a" }}>Monte um pacote, defina o preço e veja se vale a pena antes de lançar</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <button
            onClick={() => setModoOrigem("manual")}
            style={{ ...tab, flex: "0 0 auto", padding: "8px 16px", ...(modoOrigem === "manual" ? tabAtiva : {}) }}
          >
            <PenLine size={13} style={{ marginRight: 6, verticalAlign: -2 }} /> Montar do zero
          </button>
          <button
            onClick={() => setModoOrigem("historico")}
            style={{ ...tab, flex: "0 0 auto", padding: "8px 16px", ...(modoOrigem === "historico" ? tabAtiva : {}) }}
          >
            <History size={13} style={{ marginRight: 6, verticalAlign: -2 }} /> Carregar histórico (ZIG)
          </button>
          <button
            onClick={() => setModoOrigem("cardapios")}
            style={{ ...tab, flex: "0 0 auto", padding: "8px 16px", ...(modoOrigem === "cardapios" ? tabAtiva : {}) }}
          >
            <BookOpen size={13} style={{ marginRight: 6, verticalAlign: -2 }} /> Cardápios fixos
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.05fr", gap: 20 }}>
          {/* Catálogo */}
          {modoOrigem === "manual" && (
          <div style={{ background: "#fff", border: "1px solid #E8E8E2", borderRadius: 14, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.4, color: "#71717a", textTransform: "uppercase" }}>
                Catálogo ({produtos.length} itens)
              </div>
              <button
                onClick={carregarCatalogoAoVivo}
                disabled={carregandoCatalogo}
                style={{ display: "flex", alignItems: "center", gap: 5, border: "none", background: "none", cursor: carregandoCatalogo ? "default" : "pointer", padding: 0 }}
                title="Recarregar custo/preço da ficha técnica"
              >
                <span
                  style={{
                    width: 7, height: 7, borderRadius: 999,
                    background: carregandoCatalogo ? "#D9B504" : origemCatalogo === "ao-vivo" ? "#97A624" : origemCatalogo === "erro" ? "#8C1414" : "#9ca3af",
                  }}
                />
                <span style={{ fontSize: 11, color: "#9ca3af" }}>
                  {carregandoCatalogo
                    ? "atualizando..."
                    : origemCatalogo === "ao-vivo"
                    ? `ficha técnica ao vivo${atualizadoEm ? " · " + atualizadoEm.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : ""}`
                    : origemCatalogo === "erro"
                    ? "sem conexão — usando snapshot"
                    : "snapshot embutido"}
                </span>
              </button>
            </div>
            <div style={{ position: "relative", marginBottom: 8 }}>
              <Search size={15} style={{ position: "absolute", left: 10, top: 10, color: "#9ca3af" }} />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar produto..."
                style={{ width: "100%", padding: "8px 10px 8px 32px", borderRadius: 8, border: "1px solid #E8E8E2", fontSize: 13.5, outline: "none" }}
              />
            </div>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              style={{ width: "100%", padding: "7px 8px", borderRadius: 8, border: "1px solid #E8E8E2", fontSize: 13, marginBottom: 10, color: "#3f3f46", background: "#fff" }}
            >
              {CATEGORIAS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <div style={{ maxHeight: 480, overflowY: "auto", borderTop: "1px solid #F0F0F0" }}>
              {produtosFiltrados.length === 0 && (
                <div style={{ padding: "20px 4px", color: "#9ca3af", fontSize: 13 }}>Nenhum produto encontrado.</div>
              )}
              {produtosFiltrados.map((p) => (
                <div
                  key={p.produto}
                  onClick={() => adicionarItem(p)}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "9px 4px",
                    borderBottom: "1px solid #F4F4F0",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#F4F4F0")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.produto}</div>
                    <div style={{ fontSize: 11, color: "#9ca3af" }}>{p.categoria}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                    <div className="font-mono" style={{ fontSize: 12, textAlign: "right", color: "#3f3f46" }}>
                      <div>custo {formatR$(p.custo)}</div>
                      <div style={{ color: "#9ca3af" }}>cardápio {formatR$(p.preco)}</div>
                    </div>
                    <div style={{ width: 26, height: 26, borderRadius: 7, background: "#0D0D0D", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Plus size={14} color="#fff" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          )}

          {/* Histórico ZIG */}
          {modoOrigem === "historico" && (
          <div style={{ background: "#fff", border: "1px solid #E8E8E2", borderRadius: 14, padding: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.4, color: "#71717a", marginBottom: 10, textTransform: "uppercase" }}>
              Histórico de promoções (relatório ZIG)
            </div>
            <div style={{ fontSize: 12, color: "#71717a", marginBottom: 12, lineHeight: 1.5 }}>
              Exporta o relatório <strong>"Promoções utilizadas"</strong> da ZIG (um ou mais meses/lojas) e sobe aqui. A gente soma o consumo real de cada produto por promoção e calcula a média por uso — sem precisar escolher produto na mão.
            </div>

            <label
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                border: "1.5px dashed #E8E8E2", borderRadius: 10, padding: "18px 12px",
                cursor: "pointer", marginBottom: 12, color: "#71717a", fontSize: 13, fontWeight: 500,
                background: "#FAFAF8",
              }}
            >
              <Upload size={16} />
              {carregandoArquivo ? "Lendo arquivo..." : "Selecionar .xlsx da ZIG (pode ser mais de um)"}
              <input
                type="file"
                accept=".xlsx,.xls"
                multiple
                onChange={(e) => e.target.files && handleArquivos(e.target.files)}
                style={{ display: "none" }}
              />
            </label>

            {erroImportacao && (
              <div style={{ fontSize: 12, color: "#B45309", background: "#FFFBEB", border: "1px solid #FEF3C7", borderRadius: 8, padding: "8px 10px", marginBottom: 12 }}>
                {erroImportacao}
              </div>
            )}

            {arquivos.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.3 }}>Arquivos carregados</span>
                  <button onClick={limparHistorico} style={{ fontSize: 11, color: "#8C1414", background: "none", border: "none", cursor: "pointer" }}>
                    limpar tudo
                  </button>
                </div>
                {arquivos.map((a, idx) => (
                  <div key={idx} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#3f3f46", padding: "4px 0" }}>
                    <FileSpreadsheet size={13} color="#9ca3af" />
                    <span style={{ fontWeight: 500 }}>{a.loja || a.nome}</span>
                    {a.periodo && <span style={{ color: "#9ca3af" }}>· {a.periodo}</span>}
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginBottom: 14 }}>
              <label style={label}>Excluir promoções que contenham (separado por vírgula)</label>
              <input
                value={palavrasExcluir}
                onChange={(e) => setPalavrasExcluir(e.target.value)}
                style={{ ...inputMini, padding: "8px 10px", fontFamily: "inherit" }}
              />
              <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>
                Essas costumam ser desconto de time (funcionário, sócio, holding, supervisão etc.), não promoção pro cliente.
              </div>
            </div>

            {linhasHistorico.length > 0 && (
              <div style={{ maxHeight: 320, overflowY: "auto", borderTop: "1px solid #F0F0F0" }}>
                {gruposFiltrados.length === 0 && (
                  <div style={{ padding: "16px 4px", color: "#9ca3af", fontSize: 13 }}>
                    Nenhuma promoção sobrou depois do filtro — revê as palavras-chave acima.
                  </div>
                )}
                {gruposFiltrados.map((g) => (
                  <div key={g.nome}>
                    <div
                      onClick={() => abrirPreviewPromo(g.nome)}
                      style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "10px 4px", borderBottom: "1px solid #F4F4F0", cursor: "pointer",
                        background: promoSelecionada === g.nome ? "#FAFAF8" : "transparent",
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 600 }}>{g.nome}</div>
                        <div style={{ fontSize: 11, color: "#9ca3af" }}>{g.listaProdutos.length} produtos distintos</div>
                      </div>
                      <div className="font-mono" style={{ fontSize: 12, color: "#3f3f46", textAlign: "right" }}>
                        <div>{formatR$(g.totalDesconto)} desconto</div>
                        <div style={{ color: "#9ca3af" }}>até {g.maxUsos} usos</div>
                      </div>
                    </div>

                    {promoSelecionada === g.nome && (
                      <div style={{ background: "#FAFAF8", borderRadius: 10, padding: 12, margin: "8px 0" }}>
                        <div style={{ marginBottom: 10 }}>
                          <label style={label}>Usos de referência (nº de vezes que a promoção foi usada)</label>
                          <input
                            value={usosReferencia}
                            onChange={(e) => setUsosReferencia(e.target.value)}
                            style={{ ...inputMini, width: 100, padding: "7px 9px" }}
                          />
                          <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: 8 }}>
                            padrão = maior nº de usos entre os produtos ({g.maxUsos}). Ajusta se souber o nº real de pacotes vendidos.
                          </span>
                        </div>
                        <div style={{ marginBottom: 10 }}>
                          {g.listaProdutos.slice(0, 8).map((p) => {
                            const ref = parseFloat((usosReferencia || "1").replace(",", ".")) || 1;
                            return (
                              <div key={p.produto} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "3px 0", color: "#3f3f46" }}>
                                <span>{p.produto}</span>
                                <span className="font-mono" style={{ color: "#9ca3af" }}>{(p.usos / ref).toFixed(2)} / uso</span>
                              </div>
                            );
                          })}
                          {g.listaProdutos.length > 8 && (
                            <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>+ {g.listaProdutos.length - 8} produto(s)</div>
                          )}
                        </div>
                        <button
                          onClick={carregarPromoNoSimulador}
                          style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "none", background: "#0D0D0D", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                        >
                          Carregar essa promoção no simulador →
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          )}

          {/* Cardápios fixos */}
          {modoOrigem === "cardapios" && (
          <div style={{ background: "#fff", border: "1px solid #E8E8E2", borderRadius: 14, padding: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.4, color: "#71717a", marginBottom: 10, textTransform: "uppercase" }}>
              Cardápios fixos
            </div>
            <div style={{ fontSize: 12, color: "#71717a", marginBottom: 12, lineHeight: 1.5 }}>
              Pacotes "à vontade" com lista de itens pronta. Clica pra carregar no simulador (quantidade entra como 1 por item, editável) ou cadastra um novo.
            </div>

            {!criandoCardapio && (
              <div style={{ maxHeight: 420, overflowY: "auto", borderTop: "1px solid #F0F0F0", marginBottom: 12 }}>
                {[
                  { titulo: "À vontade / Rodízio", lista: CARDAPIOS_PADRAO },
                  { titulo: "Corporativo — eventos fechados", lista: CARDAPIOS_CORPORATIVOS },
                  ...(cardapiosCustom.length ? [{ titulo: "Cadastrados por vocês", lista: cardapiosCustom }] : []),
                ].map((grupo) => (
                  <div key={grupo.titulo}>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.3, padding: "10px 4px 4px" }}>
                      {grupo.titulo}
                    </div>
                    {grupo.lista.map((c) => (
                      <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 4px", borderBottom: "1px solid #F4F4F0" }}>
                        <div>
                          <div style={{ fontSize: 13.5, fontWeight: 600 }}>{c.nome}</div>
                          <div style={{ fontSize: 11, color: "#9ca3af" }}>
                            {c.itens.length} itens{c.precoSugerido != null ? ` · sugestão ${formatR$(c.precoSugerido)}/pessoa` : ""}
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <button
                            onClick={() => carregarCardapio(c)}
                            style={{ padding: "7px 12px", borderRadius: 8, border: "none", background: "#0D0D0D", color: "#fff", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
                          >
                            Carregar →
                          </button>
                          {c.id.startsWith("custom-") && (
                            <button onClick={() => removerCardapioCustom(c.id)} style={{ ...btnCirc, color: "#8C1414" }}>
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {!criandoCardapio ? (
              <button
                onClick={() => setCriandoCardapio(true)}
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px dashed #E8E8E2", background: "#FAFAF8", color: "#3f3f46", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              >
                + Cadastrar novo cardápio
              </button>
            ) : (
              <div>
                <input
                  value={novoCardapioNome}
                  onChange={(e) => setNovoCardapioNome(e.target.value)}
                  placeholder="Nome do cardápio (ex: Feijoada do Quintal)"
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #E8E8E2", fontSize: 13.5, marginBottom: 8, outline: "none" }}
                />
                <input
                  value={novoCardapioPreco}
                  onChange={(e) => setNovoCardapioPreco(e.target.value)}
                  placeholder="Preço sugerido por pessoa (opcional, ex: 89,90)"
                  inputMode="decimal"
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #E8E8E2", fontSize: 13.5, marginBottom: 10, outline: "none" }}
                />

                <div style={{ position: "relative", marginBottom: 8 }}>
                  <Search size={15} style={{ position: "absolute", left: 10, top: 10, color: "#9ca3af" }} />
                  <input
                    value={buscaCardapio}
                    onChange={(e) => setBuscaCardapio(e.target.value)}
                    placeholder="Buscar produto pra adicionar..."
                    style={{ width: "100%", padding: "8px 10px 8px 32px", borderRadius: 8, border: "1px solid #E8E8E2", fontSize: 13.5, outline: "none" }}
                  />
                </div>

                <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 6 }}>
                  {novoCardapioItens.length} item(ns) selecionado(s)
                </div>

                <div style={{ maxHeight: 220, overflowY: "auto", border: "1px solid #F0F0F0", borderRadius: 8, marginBottom: 12 }}>
                  {produtos.filter((p) => normalizar(p.produto).includes(normalizar(buscaCardapio))).slice(0, 60).map((p) => {
                    const selecionado = novoCardapioItens.includes(p.produto);
                    return (
                      <div
                        key={p.produto}
                        onClick={() => alternarItemNovoCardapio(p.produto)}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          padding: "7px 10px", borderBottom: "1px solid #F4F4F0", cursor: "pointer",
                          background: selecionado ? "#F0FDF4" : "transparent",
                        }}
                      >
                        <span style={{ fontSize: 13 }}>{p.produto}</span>
                        {selecionado && <Check size={14} color="#97A624" />}
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => { setCriandoCardapio(false); setNovoCardapioNome(""); setNovoCardapioPreco(""); setNovoCardapioItens([]); setBuscaCardapio(""); }}
                    style={{ flex: 1, padding: "9px 12px", borderRadius: 8, border: "1px solid #E8E8E2", background: "#fff", color: "#3f3f46", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={salvarNovoCardapio}
                    disabled={!novoCardapioNome.trim() || novoCardapioItens.length === 0}
                    style={{
                      flex: 1, padding: "9px 12px", borderRadius: 8, border: "none",
                      background: (!novoCardapioNome.trim() || novoCardapioItens.length === 0) ? "#E8E8E2" : "#0D0D0D",
                      color: (!novoCardapioNome.trim() || novoCardapioItens.length === 0) ? "#9ca3af" : "#fff",
                      fontSize: 13, fontWeight: 600, cursor: (!novoCardapioNome.trim() || novoCardapioItens.length === 0) ? "not-allowed" : "pointer",
                    }}
                  >
                    <Save size={13} style={{ marginRight: 6, verticalAlign: -2 }} /> Salvar cardápio
                  </button>
                </div>
              </div>
            )}
          </div>
          )}

          {/* Montagem do pacote */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: "#fff", border: "1px solid #E8E8E2", borderRadius: 14, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.4, color: "#71717a", marginBottom: 10, textTransform: "uppercase" }}>
                Pacote / Promoção
              </div>
              <input
                value={nomePromo}
                onChange={(e) => setNomePromo(e.target.value)}
                placeholder="Nome da promoção (ex: Pacote 04 - Sexta do Espeto)"
                style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #E8E8E2", fontSize: 13.5, marginBottom: 12, outline: "none" }}
              />

              {carrinho.length === 0 && (
                <div style={{ padding: "24px 8px", textAlign: "center", color: "#9ca3af", fontSize: 13, border: "1px dashed #E8E8E2", borderRadius: 10 }}>
                  Clique nos produtos ao lado para montar o pacote
                </div>
              )}

              {carrinho.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1.6fr 0.8fr 0.8fr 0.9fr auto", gap: 6, padding: "0 4px", fontSize: 10.5, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.3 }}>
                    <div>Produto</div>
                    <div>Qtd.</div>
                    <div>Custo un.</div>
                    <div>Cardápio un.</div>
                    <div></div>
                  </div>
                  {carrinho.map((i) => {
                    const itemCmv = i.preco > 0 ? i.custo / i.preco : 0;
                    const itemStatus = statusCmv(itemCmv);
                    return (
                      <div key={i.produto} style={{ display: "grid", gridTemplateColumns: "1.6fr 0.8fr 0.8fr 0.9fr auto", gap: 6, alignItems: "center", padding: "7px 8px", background: "#FAFAF8", borderRadius: 8 }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{i.produto}</div>
                          <span style={{ fontSize: 10, fontWeight: 700, color: itemStatus.cor, background: itemStatus.bg, border: `1px solid ${itemStatus.border}`, padding: "1px 6px", borderRadius: 999 }}>
                            CMV item {formatPct(itemCmv)}
                          </span>
                        </div>
                        <input
                          value={i.qtdTexto !== undefined ? i.qtdTexto : i.qtd}
                          onChange={(e) => definirQtd(i.produto, e.target.value)}
                          inputMode="decimal"
                          style={inputMini}
                        />
                        <input
                          value={i.custoOverride !== null ? i.custoOverride : i.custo}
                          onChange={(e) => definirCusto(i.produto, e.target.value)}
                          inputMode="decimal"
                          style={inputMini}
                        />
                        <input
                          value={i.precoOverride !== null ? i.precoOverride : i.preco}
                          onChange={(e) => definirPreco(i.produto, e.target.value)}
                          inputMode="decimal"
                          style={inputMini}
                        />
                        <div style={{ display: "flex", gap: 2 }}>
                          <button onClick={() => alterarQtd(i.produto, -1)} style={btnCirc}>
                            <Minus size={12} />
                          </button>
                          <button onClick={() => alterarQtd(i.produto, 1)} style={btnCirc}>
                            <Plus size={12} />
                          </button>
                          <button onClick={() => removerItem(i.produto)} style={{ ...btnCirc, color: "#b3261e" }}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
                    Custo e cardápio vêm do catálogo da rede, mas dá pra sobrescrever aqui pra testar valores diferentes — não altera o catálogo original.
                  </div>
                </div>
              )}

              <div style={{ marginBottom: 12 }}>
                <label style={label}>Nº de pessoas / multiplicador de consumo (opcional)</label>
                <input
                  value={pessoas}
                  onChange={(e) => setPessoas(e.target.value)}
                  placeholder="1"
                  inputMode="decimal"
                  style={{ ...inputMini, width: 100, padding: "8px 10px" }}
                />
                <span style={{ fontSize: 11.5, color: "#9ca3af", marginLeft: 8 }}>
                  Multiplica custo E preço (no modo "preço fixo") pelo nº de pessoas — deixa em 1 pra ver o valor por pessoa, ou aumenta pra projetar o evento inteiro.
                </span>
              </div>

              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <button
                  onClick={() => setModoPreco("fixo")}
                  style={{ ...tab, ...(modoPreco === "fixo" ? tabAtiva : {}) }}
                >
                  Preço fixo do pacote
                </button>
                <button
                  onClick={() => setModoPreco("desconto")}
                  style={{ ...tab, ...(modoPreco === "desconto" ? tabAtiva : {}) }}
                >
                  % de desconto s/ cardápio
                </button>
              </div>

              {modoPreco === "fixo" ? (
                <div>
                  <label style={label}>Preço por pessoa (R$)</label>
                  <input
                    value={precoFixo}
                    onChange={(e) => setPrecoFixo(e.target.value)}
                    placeholder="ex: 49,90"
                    inputMode="decimal"
                    style={inputBig}
                  />
                  {parseFloat((pessoas || "1").replace(",", ".")) > 1 && (
                    <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>
                      Total pro evento ({pessoas} pessoas): {formatR$((parseFloat((precoFixo || "0").replace(",", ".")) || 0) * (parseFloat((pessoas || "1").replace(",", ".")) || 1))}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <label style={label}>Desconto sobre o valor de cardápio (%)</label>
                  <input
                    value={percDesconto}
                    onChange={(e) => setPercDesconto(e.target.value)}
                    placeholder="ex: 20"
                    inputMode="decimal"
                    style={inputBig}
                  />
                  <div className="font-mono" style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>
                    Valor de cardápio somado: {formatR$(valorCardapio)} → preço calculado: {formatR$(precoPromo)}
                  </div>
                </div>
              )}
            </div>

            {/* Resultado */}
            <div style={{ background: "#fff", border: "1px solid #E8E8E2", borderRadius: 14, padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.4, color: "#71717a", textTransform: "uppercase" }}>Resultado da simulação</div>
                <div style={{ padding: "4px 12px", borderRadius: 999, background: status.bg, color: status.cor, border: `1px solid ${status.border}`, fontSize: 12, fontWeight: 700, letterSpacing: 0.3 }}>
                  {status.label}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <Metrica label="Custo total" valor={formatR$(custoTotal)} />
                <Metrica label="Preço da promoção" valor={formatR$(precoPromo)} />
                <Metrica label="Valor de cardápio" valor={formatR$(valorCardapio)} />
                <Metrica label="Desconto concedido" valor={`${formatR$(descontoRS)} · ${formatPct(descontoPct)}`} />
                <Metrica destaque label="% CMV" valor={formatPct(isFinite(cmvPct) ? cmvPct : 0)} cor={status.cor} />
                <Metrica destaque label="Margem de contribuição" valor={`${formatR$(mcRS)} · ${formatPct(mcPct)}`} />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "#71717a", marginBottom: 14 }}>
                {mcRS >= 0 ? <TrendingUp size={14} color="#1f7a4d" /> : <TrendingDown size={14} color="#b3261e" />}
                Mark-up de {markup.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}x sobre o custo · Meta de CMV da rede: 35%
              </div>

              <button
                onClick={salvarCenario}
                disabled={!temItens}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "none",
                  background: temItens ? "#0D0D0D" : "#E8E8E2",
                  color: temItens ? "#fff" : "#9ca3af",
                  fontSize: 13.5,
                  fontWeight: 600,
                  cursor: temItens ? "pointer" : "not-allowed",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <Save size={15} /> Salvar cenário para comparar
              </button>
            </div>
          </div>
        </div>

        {/* Comparação de cenários */}
        {cenarios.length > 0 && (
          <div style={{ marginTop: 20, background: "#fff", border: "1px solid #E8E8E2", borderRadius: 14, padding: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.4, color: "#71717a", marginBottom: 12, textTransform: "uppercase", display: "flex", alignItems: "center", gap: 6 }}>
              <ChefHat size={14} /> Cenários salvos para comparação
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: "left", color: "#9ca3af", fontSize: 11.5, textTransform: "uppercase", letterSpacing: 0.3 }}>
                    <th style={th}>Promoção</th>
                    <th style={th}>Itens</th>
                    <th style={th}>Preço</th>
                    <th style={th}>Custo</th>
                    <th style={th}>% CMV</th>
                    <th style={th}>Margem R$</th>
                    <th style={th}>Status</th>
                    <th style={th}></th>
                  </tr>
                </thead>
                <tbody>
                  {cenarios.map((c) => (
                    <tr key={c.id} style={{ borderTop: "1px solid #F0F0F0" }}>
                      <td style={{ ...td, fontWeight: 600 }}>{c.nome}</td>
                      <td style={td}>{c.itens}</td>
                      <td className="font-mono" style={td}>{formatR$(c.precoPromo)}</td>
                      <td className="font-mono" style={td}>{formatR$(c.custoTotal)}</td>
                      <td className="font-mono" style={td}>{formatPct(c.cmvPct)}</td>
                      <td className="font-mono" style={td}>{formatR$(c.mcRS)}</td>
                      <td style={td}>
                        <span style={{ padding: "3px 9px", borderRadius: 999, background: c.status.bg, color: c.status.cor, border: `1px solid ${c.status.border}`, fontSize: 11, fontWeight: 700 }}>
                          {c.status.label}
                        </span>
                      </td>
                      <td style={td}>
                        <button onClick={() => removerCenario(c.id)} style={{ ...btnCirc, color: "#b3261e" }}>
                          <X size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Metrica({ label, valor, destaque, cor }) {
  return (
    <div style={{ padding: "10px 12px", background: destaque ? "#FAFAF8" : "transparent", borderRadius: 10, border: destaque ? "1px solid #E8E8E2" : "none" }}>
      <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 2 }}>{label}</div>
      <div className="font-mono" style={{ fontSize: destaque ? 18 : 15, fontWeight: 700, color: cor || "#0D0D0D" }}>
        {valor}
      </div>
    </div>
  );
}

const btnCirc = {
  width: 24,
  height: 24,
  borderRadius: 7,
  border: "1px solid #E8E8E2",
  background: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};

const tab = {
  flex: 1,
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid #E8E8E2",
  background: "#fff",
  color: "#71717a",
  fontSize: 12.5,
  fontWeight: 600,
  cursor: "pointer",
};

const tabAtiva = {
  background: "#0D0D0D",
  color: "#fff",
  border: "1px solid #0D0D0D",
};

const label = {
  display: "block",
  fontSize: 11.5,
  color: "#9ca3af",
  marginBottom: 4,
};

const inputMini = {
  width: "100%",
  padding: "6px 7px",
  borderRadius: 6,
  border: "1px solid #E8E8E2",
  fontSize: 12.5,
  outline: "none",
  fontFamily: "'DM Mono', ui-monospace, monospace",
};

const inputBig = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #E8E8E2",
  fontSize: 16,
  fontWeight: 600,
  outline: "none",
};

const th = { padding: "6px 10px" };
const td = { padding: "8px 10px" };
