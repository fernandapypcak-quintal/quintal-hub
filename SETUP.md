# 🌿 Quintal HUB — Guia de Configuração

## Visão Geral

O Quintal HUB é uma central de dashboards com autenticação por email/senha via Supabase.
Cada usuário só vê os dashboards que você autorizar.

---

## PASSO 1 — Criar projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e crie uma conta gratuita
2. Clique em **"New project"**
3. Preencha:
   - **Name:** `quintal-hub`
   - **Database Password:** crie uma senha forte e guarde
   - **Region:** escolha `South America (São Paulo)`
4. Aguarde ~2 minutos para o projeto ser criado

---

## PASSO 2 — Pegar as chaves do Supabase

1. No painel do projeto, vá em **Settings → API**
2. Copie:
   - **Project URL** → `https://xxxx.supabase.co`
   - **anon public** key → começa com `eyJ...`

---

## PASSO 3 — Criar usuários no Supabase

1. Vá em **Authentication → Users**
2. Clique em **"Add user" → "Create new user"**
3. Informe email e senha para cada pessoa do time
4. Repita para todos os usuários

> ⚠️ Desative o "Confirm email" se quiser que os usuários já consigam logar imediatamente:
> **Authentication → Providers → Email → desative "Confirm email"**

---

## PASSO 4 — Configurar permissões

Abra o arquivo `lib/dashboards.ts` e edite o objeto `USER_PERMISSIONS`:

```ts
export const USER_PERMISSIONS: Record<string, string[] | '*'> = {
  // Acesso total (todos os dashboards):
  'admin@quintal.com': '*',

  // Acesso a dashboards específicos:
  'gerente@quintal.com': ['faturamento', 'custos', 'cmv'],
  'operador@quintal.com': ['cmv'],

  // IDs disponíveis: 'faturamento' | 'custos' | 'cmv'
}

// Permissão padrão para quem não está na lista:
export const DEFAULT_PERMISSION: string[] | '*' = []
// Use [] para nenhum acesso, ou '*' para acesso total
```

---

## PASSO 5 — Subir para o GitHub

```bash
git init
git add .
git commit -m "feat: quintal hub inicial"
git branch -M main
git remote add origin https://github.com/seu-usuario/quintal-hub.git
git push -u origin main
```

---

## PASSO 6 — Deploy na Vercel

1. Acesse [vercel.com](https://vercel.com) e clique em **"Add New Project"**
2. Importe o repositório `quintal-hub` do GitHub
3. Na tela de configuração, expanda **"Environment Variables"** e adicione:

| Nome | Valor |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` |
| `NEXT_PUBLIC_SITE_URL` | `https://quintal-hub.vercel.app` |

4. Clique em **"Deploy"** — pronto! 🎉

---

## PASSO 7 — Configurar URL de redirect no Supabase

Após o deploy, volte ao Supabase:

1. Vá em **Authentication → URL Configuration**
2. Em **"Site URL"**, coloque: `https://quintal-hub.vercel.app`
3. Em **"Redirect URLs"**, adicione: `https://quintal-hub.vercel.app/auth/callback`

---

## Adicionando novos dashboards

Edite o array `DASHBOARDS` em `lib/dashboards.ts`:

```ts
{
  id: 'novo-dashboard',       // identificador único (sem espaços)
  name: 'Meu Dashboard',      // nome exibido no hub
  description: 'Descrição',   // subtítulo do card
  url: 'https://meu-dash.vercel.app',
  color: '#8b5cf6',           // cor do card (hex)
  icon: '📊',                 // emoji do card
},
```

Depois, adicione o ID nas permissões dos usuários que precisam acessar.

---

## Gerenciando usuários depois

- **Adicionar usuário:** Supabase → Authentication → Users → Add user
- **Remover usuário:** Supabase → Authentication → Users → Delete
- **Mudar permissões:** edite `lib/dashboards.ts` → `USER_PERMISSIONS` → novo commit

---

## Estrutura do projeto

```
quintal-hub/
├── app/
│   ├── login/          # Tela de login
│   ├── hub/            # Hub principal (protegido)
│   └── auth/callback/  # Callback do Supabase
├── lib/
│   ├── dashboards.ts   # ← EDITE AQUI: dashboards e permissões
│   └── supabase/       # Clientes Supabase (não mexa)
└── middleware.ts        # Proteção de rotas (não mexa)
```
