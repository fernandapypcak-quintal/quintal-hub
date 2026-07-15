# Dashboard de Relatórios ZIG — Integração no repo real

Testei a estrutura contra o `quintal-hub-master.zip` que você mandou. Segue
exatamente o padrão dos outros dashboards (Custos, CMV, etc): pasta própria
em `app/hub/relatorios/`, sem componentes compartilhados entre dashboards,
navegação interna por estado (Sidebar/BottomNav), API própria em `/api/relatorios`
com a URL do Apps Script hardcoded no arquivo (igual `/api/custos`).

## 1. Copiar os arquivos

Do zip, copia mantendo a estrutura de pastas:

```
app/api/relatorios/route.ts        → cole em app/api/relatorios/route.ts
app/hub/relatorios/*               → cole em app/hub/relatorios/ (pasta nova inteira)
lib/dashboards.ts                  → SUBSTITUA o seu (só adicionei uma linha no
                                      array DASHBOARDS, o resto tá idêntico ao original)
```

## 2. Deploy do Apps Script

`QuintalRelatoriosZig.gs` (na raiz do zip) é a versão atualizada do script —
o `doGet` agora devolve o array puro por `tipo` (igual o padrão do Custos),
não mais o objeto `{dados, total, ...}` de antes.

1. Cola o conteúdo inteiro no lugar do `Code.gs` atual (mesmo projeto que já
   roda `atualizarTudo`)
2. **Implantar → Nova implantação → Aplicativo da web**
   - Executar como: **Eu**
   - Quem tem acesso: **Qualquer pessoa**
3. Copia a URL (`.../exec`)

## 3. Colar a URL no route.ts

Abre `app/api/relatorios/route.ts` e troca:

```ts
const GAS_URL = 'https://script.google.com/macros/s/COLE_AQUI_A_URL_DO_SEU_DEPLOY/exec'
```

pela URL de verdade que você copiou no passo 2 — **mesmo padrão do
`api/custos/route.ts`**, que também tem a URL direto no código (não usa
variável de ambiente).

## 4. Permissões de acesso

Adicionei o dashboard em `lib/dashboards.ts`:

```ts
{ id: 'relatorios', name: 'Relatórios ZIG', description: 'Descontos, estornos, contas em aberto e bônus', url: '', internalPath: '/hub/relatorios', color: '#EA580C', icon: '🧾' },
```

Quem já tem `'*'` em `USER_PERMISSIONS` (você, Pedro, Rogério, Isabella,
Amanda) já enxerga automaticamente. Se quiser liberar pra mais alguém
específico, adiciona `'relatorios'` no array de permissões da pessoa.

## 5. Dependências

Nenhuma nova — `recharts` já está no `package.json` do seu repo.

## 6. O que tem em cada página

Mesma navegação por Sidebar (desktop) / BottomNav (mobile) que o Custos usa,
com um filtro de **Unidade** no Header (funciona pros 5 relatórios ao mesmo
tempo, já que os dados vêm todos com o campo `unidade` normalizado):

- **Visão Geral**: 5 KPIs de topo (um por relatório)
- **Descontos**: total/valor/ticket médio, funcionários envolvidos, gráfico
  por unidade, ranking de funcionários, detalhe por funcionário, cruzamento
  Justificativa × Categoria, últimos lançamentos
- **Estornos**: mesma estrutura + Cancelado × Estornado
- **Contas em Aberto**: total ainda em aberto, por unidade, lista de
  clientes por maior pendência
- **Bônus Concedido**: total concedido, saldo não usado, ranking de quem
  concedeu, motivo × categoria
- **Bônus Utilizado**: total utilizado, tempo médio até o uso, ranking de
  quem concedeu o bônus original, histórico de usos individuais

## 7. Pontos de atenção

- O filtro de Unidade no Header é **global pros 5 relatórios** dentro desse
  dashboard (troca de página mantém o filtro) — diferente do Custos, que
  tem filtro de loja + BU + período + tipo separados. Se quiser filtro de
  período também (não só unidade), me avisa que adiciono — não coloquei
  porque os dados já vêm de um período fixo definido no `SINCE_DATE`/
  `UNTIL_DATE` do Apps Script.
- `Contas em Aberto` não tem ranking por funcionário (é relatório de
  cliente/débito, não de operação feita por alguém).
