# FlowDesk — Documentação Técnica Completa (TCC)

> Documento gerado para apresentação de TCC. Cobre arquitetura, integrações, decisões técnicas, código implementado e roadmap.

---

## Sumário

1. [Visão Geral do Produto](#1-visão-geral-do-produto)
2. [Stack Tecnológico — Por quê cada escolha](#2-stack-tecnológico--por-quê-cada-escolha)
3. [Arquitetura do Sistema](#3-arquitetura-do-sistema)
4. [Banco de Dados — Supabase / PostgreSQL](#4-banco-de-dados--supabase--postgresql)
5. [Autenticação e Segurança](#5-autenticação-e-segurança)
6. [Row Level Security (RLS)](#6-row-level-security-rls)
7. [Realtime com Supabase](#7-realtime-com-supabase)
8. [Rotas API (Next.js)](#8-rotas-api-nextjs)
9. [Integração com Resend (E-mail)](#9-integração-com-resend-e-mail)
10. [Geração de PDF (Puppeteer + pdf-lib)](#10-geração-de-pdf-puppeteer--pdf-lib)
11. [Editor Rich Text — TipTap](#11-editor-rich-text--tiptap)
12. [Gráficos — Recharts](#12-gráficos--recharts)
13. [Sistema de Temas Dinâmicos](#13-sistema-de-temas-dinâmicos)
14. [Sistema de Queries (supabaseQueries)](#14-sistema-de-queries-supabasequeries)
15. [Sistema Financeiro — Splits de Colaborador](#15-sistema-financeiro--splits-de-colaborador)
16. [Sistema de Co-working (Convites)](#16-sistema-de-co-working-convites)
17. [Relatórios e Analytics](#17-relatórios-e-analytics)
18. [Propostas Comerciais](#18-propostas-comerciais)
19. [Time Tracker](#19-time-tracker)
20. [Briefings](#20-briefings)
21. [Estrutura de Componentes](#21-estrutura-de-componentes)
22. [Configurações (Next.js, TypeScript, Tailwind)](#22-configurações-nextjs-typescript-tailwind)
23. [O que está implementado vs o que falta](#23-o-que-está-implementado-vs-o-que-falta)
24. [Roadmap técnico das funcionalidades pendentes](#24-roadmap-técnico-das-funcionalidades-pendentes)
25. [Decisões Arquiteturais — Perguntas Esperadas](#25-decisões-arquiteturais--perguntas-esperadas)
26. [Node.js — Onde está hoje e onde vai crescer](#26-nodejs--onde-está-hoje-e-onde-vai-crescer)
27. [Portal do Cliente — Arquitetura e Comunicação Bidirecional em Tempo Real](#27-portal-do-cliente--arquitetura-e-comunicação-bidirecional-em-tempo-real)

---

## 1. Visão Geral do Produto

**FlowDesk** é um SaaS de gestão de projetos voltado para **freelancers e pequenos estúdios criativos**.

O produto centraliza em um único lugar:

- Clientes (CRM básico)
- Projetos com orçamento e status
- Tarefas e subtarefas (Kanban-like)
- Arquivos e links de projeto
- Briefings customizáveis
- Propostas comerciais com geração de PDF
- Pagamentos (receita por projeto)
- Time tracking por projeto e tarefa
- Colaboração entre freelancers (co-working)
- Split financeiro automático entre colaboradores
- Relatórios de performance e receita
- Sistema de temas (dark/light/custom)

**Modelo de negócio:** todos os usuários são freelancers. Não há separação de "tipo de conta". Um mesmo usuário pode criar projetos próprios (como owner) e colaborar em projetos de outros freelancers (como collaborator). Os papéis existem **por projeto**, não por conta.

**Domínio de produção:** `app.oflowdesk.com`

---

## 2. Stack Tecnológico — Por quê cada escolha

### Next.js 15 (Pages Router)

**Onde está:** `src/pages/` — todas as páginas e rotas API.

**Por quê foi escolhido:**
- Framework React com SSR e SSG nativos
- Sistema de rotas baseado em arquivos (sem configuração extra)
- API Routes integradas (`src/pages/api/`) — backend sem servidor separado
- Excelente integração com Vercel (deploy automático, edge network)
- Pages Router foi mantido (em vez do App Router) por ser mais maduro, previsível e compatível com as dependências do projeto

**Onde aparece no código:**
- `src/pages/_app.tsx` — provider global, carregamento de temas
- `src/pages/dashboard/` — todas as telas autenticadas
- `src/pages/api/` — backend server-side (16 endpoints)
- `src/pages/invite/[token].tsx` — rota dinâmica para aceite de convite

---

### React 18

**Onde está:** base de todos os componentes em `src/components/` e `src/pages/`.

**Por quê foi escolhido:**
- Biblioteca UI mais usada do mercado
- Hooks nativos (useState, useEffect, useContext, useCallback)
- Suporte a Concurrent Features (Suspense, transitions)
- Ecossistema enorme de bibliotecas compatíveis

**Patterns usados no código:**
- `useContext` → AuthContext para estado global de autenticação
- `useEffect` → carregamento de dados, realtime subscriptions
- `useState` → estado local de componentes
- Componentes funcionais em 100% do projeto

---

### TypeScript 5

**Onde está:** todos os arquivos `.tsx` e `.ts` do projeto.

**Por quê foi escolhido:**
- Tipagem estática previne erros em runtime
- Autocompletion nos IDEs acelera o desenvolvimento
- Contratos claros entre frontend e backend
- Indispensável em projetos com banco de dados relacional (mapeamento de tipos)

**Exemplos no código:**

```typescript
// src/lib/supabaseQueries/projetos.ts
export type Projeto = {
  id: string;
  titulo: string;
  valor: number;
  status: 'em_andamento' | 'concluído' | 'finalizado';
  user_id: string;
  cliente_id: string | null;
  prazo_entrega: string | null;
};
```

**Configuração especial:**
- Path alias `@/*` → `src/*` (evita `../../../` nos imports)
- Target: `ES2023`
- Strict mode ativado

---

### Tailwind CSS 3

**Onde está:** classes de estilo em todos os componentes.

**Por quê foi escolhido:**
- Utility-first CSS — velocidade de desenvolvimento
- Sem arquivos CSS separados por componente
- Purge automático em produção (bundle mínimo)
- Extensível com CSS variables para o sistema de temas

**Como foi integrado com o sistema de temas:**
- `tailwind.config.js` extende as cores usando CSS variables
- As variáveis (`--primary`, `--secondary`, etc.) mudam com o tema ativo
- Tailwind lê as variáveis em tempo de build, mas os valores mudam em runtime

```javascript
// tailwind.config.js (simplificado)
theme: {
  extend: {
    colors: {
      primary: {
        900: 'var(--primary-900)',
        800: 'var(--primary-800)',
        // ...
      }
    }
  }
}
```

---

### Supabase

**Onde está:**
- `src/lib/supabaseClient.ts` — cliente frontend
- `src/pages/api/` — cliente com service role no backend
- `supabase/migrations/` — SQL das tabelas, RLS e funções

**Por quê foi escolhido:**
- Backend-as-a-Service com PostgreSQL real
- Auth integrado com JWT (sem implementar autenticação do zero)
- Storage integrado (upload de avatares, imagens de proposta)
- Realtime nativo com WebSockets
- RLS (Row Level Security) — segurança diretamente no banco
- SDK JavaScript oficial com tipagem TypeScript
- Plano gratuito generoso para desenvolvimento

**O que o Supabase fornece no FlowDesk:**
1. Banco PostgreSQL com 15+ tabelas
2. Auth (JWT, email/senha, refresh tokens)
3. Storage (avatares, logos, thumbnails de proposta)
4. Realtime (atualizações ao vivo no dashboard)
5. RLS (cada usuário acessa apenas seus próprios dados)
6. Dashboard visual para gerenciar o banco

---

### Resend

**Onde está:** `src/pages/api/invites/create.ts`

**Por quê foi escolhido:**
- API de e-mail moderna e simples (REST)
- Excelente deliverability
- Suporte a HTML completo nos e-mails
- Integração em menos de 20 linhas de código
- Plano gratuito suficiente para o volume atual

**Como funciona:**
- Quando um owner convida um colaborador, o backend faz uma chamada HTTP direta para `api.resend.com/emails`
- O e-mail contém HTML customizado com dark theme, link de convite e validade

---

### Puppeteer + @sparticuz/chromium

**Onde está:** `src/pages/api/proposal-pdf/[id].ts`

**Por quê foi escolhido:**
- Permite renderizar HTML/CSS exato como o usuário vê e capturar como imagem
- Garante fidelidade visual perfeita do PDF (fontes, gradientes, sombras)
- Abordagem mais robusta que bibliotecas de PDF puras para layouts complexos
- `@sparticuz/chromium` resolve o problema de rodar Puppeteer em Lambda/Vercel (binário compactado e otimizado)

**Problema que resolveu:**
- PDFs com design rico (fontes customizadas, cores de tema, layout preciso) são muito difíceis de gerar com bibliotecas de PDF puras
- Puppeteer renderiza o HTML do template exatamente como o browser faz

---

### pdf-lib

**Onde está:** `src/pages/api/proposal-pdf/[id].ts` (junto com Puppeteer)

**Por quê foi escolhido:**
- Monta o arquivo PDF final a partir das screenshots PNG capturadas
- Permite controlar tamanho de página, inserção de imagens, metadados
- Complementa o Puppeteer: Puppeteer captura, pdf-lib monta o PDF

---

### @react-pdf/renderer

**Onde está:** `src/components/proposals/ProposalPDF.tsx`

**Por quê foi escolhido:**
- Permite declarar PDFs com sintaxe React (componentes JSX)
- Alternativa para previews de proposta no frontend
- Usado em conjunto com o sistema de templates de proposta

---

### TipTap

**Onde está:** componentes de edição de proposta em `src/pages/dashboard/propostas/`

**Por quê foi escolhido:**
- Editor rich text headless (sem CSS forçado)
- Extensível com plugins (heading, link, task-list, text-align, underline, highlight)
- Baseado em ProseMirror (robusto e maduro)
- Gera JSON estruturado (não HTML) → mais fácil de manipular e armazenar
- Compatível com React

---

### Recharts

**Onde está:** `src/components/reports/` — todos os componentes de gráfico.

**Por quê foi escolhido:**
- Biblioteca de gráficos construída sobre React + D3
- Componentes declarativos (sem manipulação de DOM)
- Responsivo por padrão
- Suporte a animações, tooltips, legendas
- TypeScript-friendly

**Gráficos implementados:**
- `FinanceDonut` → receita recebida vs pendente (donut chart)
- `RevenueChart` → receita mensal ao longo do tempo (line/bar chart)
- `ProjectStatusDonut` → distribuição de status dos projetos
- `ProjectTimeDonut` → distribuição de tempo por projeto
- `DistributionSection` → barras de distribuição de tarefas/tempo
- `PerformanceSection` → métricas de performance

---

### Lucide React

**Onde está:** importado em quase todos os componentes.

**Por quê foi escolhido:**
- Biblioteca de ícones SVG com excelente consistência visual
- Tree-shakeable (apenas os ícones usados vão para o bundle)
- TypeScript nativo
- Mais de 1.000 ícones

---

### canvas-confetti

**Onde está:** disparado em ações de celebração (ex: concluir projeto).

**Por quê foi escolhido:**
- Efeito visual simples para feedback positivo ao usuário
- Menos de 1KB gzip
- Sem dependências

---

### clsx

**Onde está:** em todos os componentes que combinam classes condicionalmente.

**Por quê foi escolhido:**
- Utilitário mínimo para concatenar classes CSS com condicionais
- Muito mais legível que template strings com ternários

```typescript
// Exemplo de uso
className={clsx('btn', { 'btn-primary': isPrimary, 'btn-disabled': disabled })}
```

---

## 3. Arquitetura do Sistema

```
┌─────────────────────────────────────────────────────┐
│                   USUÁRIO (Browser)                  │
│                  app.oflowdesk.com                   │
└──────────────────────┬──────────────────────────────┘
                       │ HTTPS
┌──────────────────────▼──────────────────────────────┐
│                  VERCEL (CDN + Edge)                 │
│                                                      │
│  ┌─────────────────────────────────────────────┐    │
│  │           Next.js 15 (Pages Router)          │    │
│  │                                              │    │
│  │  Frontend (React + TypeScript + Tailwind)    │    │
│  │  src/pages/dashboard/                        │    │
│  │                                              │    │
│  │  Backend (API Routes - Node.js)              │    │
│  │  src/pages/api/                              │    │
│  │                                              │    │
│  │  Puppeteer + pdf-lib (geração de PDF)        │    │
│  └──────┬───────────────────────────────────────┘   │
└─────────┼──────────────────────────────────────────┘
          │
    ┌─────▼──────────────────────────────────────┐
    │              SUPABASE                        │
    │                                              │
    │  ┌─────────────┐  ┌──────────┐  ┌────────┐ │
    │  │  PostgreSQL  │  │   Auth   │  │Storage │ │
    │  │  (15 tabelas)│  │  (JWT)   │  │(files) │ │
    │  │  + RLS       │  │          │  │        │ │
    │  └─────────────┘  └──────────┘  └────────┘ │
    │                                              │
    │  ┌──────────────────────────────────────┐   │
    │  │  Realtime (WebSockets)               │   │
    │  │  projetos, tasks, pagamentos, etc.   │   │
    │  └──────────────────────────────────────┘   │
    └─────────────────────────────────────────────┘
          │
    ┌─────▼──────────────┐
    │  RESEND (E-mail)   │
    │  Convites de       │
    │  co-working        │
    └────────────────────┘
```

### Dois clientes Supabase diferentes

**Cliente frontend (anon key):**
```typescript
// src/lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

**Cliente backend (service role):**
```typescript
// src/pages/api/ — usado apenas em rotas server-side
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // NUNCA exposto no frontend
)
```

A separação existe por segurança: a `anon key` respeita RLS; a `service role key` bypassa RLS e tem acesso total ao banco. Por isso é usada apenas no servidor.

---

## 4. Banco de Dados — Supabase / PostgreSQL

### Estrutura completa de tabelas

#### `projetos`
Principal tabela do sistema. Cada projeto pertence a um usuário (owner).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | PK |
| titulo | TEXT | Nome do projeto |
| descricao | TEXT | Descrição |
| valor | NUMERIC | Orçamento (campo real é `valor`, não `orcamento`) |
| status | TEXT | `em_andamento` \| `concluído` \| `finalizado` |
| forma_pagamento | TEXT | Forma de pagamento acordada |
| user_id | UUID | Owner do projeto (FK auth.users) |
| cliente_id | UUID | Cliente associado (FK clientes) |
| prazo_entrega | DATE | Data de entrega |
| data_inicio | DATE | Início do projeto |
| completed_at | TIMESTAMPTZ | Data de conclusão |
| created_at | TIMESTAMPTZ | Criação |
| updated_at | TIMESTAMPTZ | Última atualização |

#### `clientes`
CRM básico de clientes de cada freelancer.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | PK |
| nome | TEXT | Nome do cliente |
| email | TEXT | E-mail |
| telefone | TEXT | Telefone |
| empresa | TEXT | Empresa |
| foto_url | TEXT | URL do avatar (Supabase Storage) |
| user_id | UUID | Freelancer dono do cliente |

#### `tasks`
Tarefas vinculadas a projetos.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | PK |
| titulo | TEXT | Título |
| descricao | TEXT | Descrição |
| status | TEXT | `para_fazer` \| `em_andamento` \| `concluida` |
| projeto_id | UUID | FK projetos |
| user_id | UUID | Criador da tarefa |
| due_date | DATE | Prazo |
| concluida | BOOLEAN | Se está concluída |
| completed_at | TIMESTAMPTZ | Data de conclusão |

#### `subtasks`
Subtarefas vinculadas a uma tarefa.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | PK |
| task_id | UUID | FK tasks |
| titulo | TEXT | Título |
| concluida | BOOLEAN | Status |
| user_id | UUID | Criador |

#### `pagamentos`
Registros financeiros de receita do projeto (o dinheiro que o cliente paga).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | PK |
| projeto_id | UUID | FK projetos |
| user_id | UUID | Owner |
| valor | NUMERIC | Valor do pagamento |
| status | TEXT | `pendente` \| `pago` |
| data_pagamento | DATE | Data que foi pago |
| data_prevista | DATE | Data prevista |
| forma_pagamento | TEXT | `pix` \| `pix_2x` \| `cartao` |
| parcela | INTEGER | Número da parcela |
| total_parcelas | INTEGER | Total de parcelas |
| tipo | TEXT | Tipo de pagamento |

#### `project_members`
Relaciona usuários a projetos (owners e collaborators).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | PK |
| project_id | UUID | FK projetos |
| user_id | UUID | FK auth.users |
| role | TEXT | `owner` \| `collaborator` |
| nome | TEXT | Nome (denormalizado) |
| email | TEXT | E-mail (denormalizado) |
| avatar_url | TEXT | Avatar (denormalizado) |

#### `project_invites`
Convites de co-working gerados pelo owner.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | PK |
| project_id | UUID | FK projetos |
| invited_email | TEXT | E-mail convidado |
| invited_by | UUID | Owner que convidou |
| token | TEXT | Token criptográfico (32 bytes) |
| status | TEXT | `pending` \| `accepted` |
| split_type | TEXT | `percentage` \| `fixed` |
| split_value | NUMERIC | Valor do split |
| already_paid | BOOLEAN | Se já foi pago |
| expires_at | TIMESTAMPTZ | Expira em 7 dias |
| accepted_at | TIMESTAMPTZ | Data de aceite |

#### `project_member_splits`
Define o percentual ou valor fixo que cada colaborador recebe.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | PK |
| project_id | UUID | FK projetos |
| member_user_id | UUID | FK auth.users |
| split_type | TEXT | `percentage` \| `fixed` |
| split_value | NUMERIC | Valor (ex: 20 para 20% ou 200 para R$200) |
| payment_status | TEXT | `pending` \| `paid` |
| paid_at | TIMESTAMPTZ | Data do pagamento |
| payment_requested_at | TIMESTAMPTZ | Data da solicitação do colaborador |

#### `collaborator_payment_splits`
Cálculo de quanto o colaborador recebe por **cada pagamento específico** do projeto.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | PK |
| project_id | UUID | FK projetos |
| member_user_id | UUID | FK auth.users |
| pagamento_id | UUID | FK pagamentos |
| amount | NUMERIC | Valor calculado (split aplicado ao pagamento) |
| status | TEXT | `pendente` \| `pago` |
| paid_at | TIMESTAMPTZ | Data do pagamento |

#### `time_entries`
Sessões de time tracking.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | PK |
| user_id | UUID | Usuário |
| project_id | UUID | Projeto rastreado |
| task_id | UUID | Tarefa rastreada (opcional) |
| started_at | TIMESTAMPTZ | Início da sessão |
| ended_at | TIMESTAMPTZ | Fim da sessão |
| duration_seconds | INTEGER | Duração calculada |

#### Outras tabelas
- `arquivos_projeto` — arquivos anexados ao projeto
- `links_projeto` — links úteis do projeto
- `atividades` — log de atividades do projeto
- `briefings_templates` — templates de briefing
- `briefings_campos` — campos/perguntas do briefing
- `briefings_envios` — envios de briefing para clientes
- `briefings_respostas` — respostas dos briefings
- `proposals` — propostas comerciais
- `proposal_sections` — seções/blocos de uma proposta
- `users` — perfis de usuário (separado de `auth.users`)

---

## 5. Autenticação e Segurança

### Como a autenticação funciona

O Supabase Auth usa JWT (JSON Web Tokens). Quando o usuário faz login:

1. Supabase retorna um `access_token` (JWT) e um `refresh_token`
2. O SDK armazena os tokens no `localStorage`
3. Cada requisição ao banco inclui automaticamente o `Authorization: Bearer <token>`
4. O PostgreSQL usa o token para identificar o usuário via `auth.uid()`

### AuthContext

```typescript
// src/contexts/AuthContext.tsx
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);

  useEffect(() => {
    // Escuta mudanças de sessão
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  return <AuthContext.Provider value={{ user, session }}>{children}</AuthContext.Provider>;
};
```

### Proteção de rotas

`src/components/ProtectedRoute.tsx` e `src/components/withAuth.tsx` garantem que páginas do dashboard só são acessíveis para usuários autenticados. Redirecionam para `/login` se não houver sessão.

### Autenticação em API Routes

Todo endpoint de API valida o token antes de executar qualquer operação:

```typescript
// Padrão usado em TODOS os endpoints de API
const accessToken = req.headers.authorization?.startsWith("Bearer ")
  ? req.headers.authorization.slice(7)
  : null;

if (!accessToken) {
  return res.status(401).json({ error: "Não autenticado." });
}

// Cria cliente Supabase com o token do usuário
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
);

const { data: { user }, error } = await supabase.auth.getUser();
if (error || !user) {
  return res.status(401).json({ error: "Token inválido." });
}
```

### Tokens de Impressão (HMAC-SHA256)

Para geração de PDF, é necessário abrir uma página no headless browser. Essa página precisa ser pública temporariamente, mas protegida. A solução foi criar tokens de curta duração:

```typescript
// src/lib/printToken.ts
import crypto from 'crypto';

const SECRET = process.env.PRINT_TOKEN_SECRET || 'fallback-secret';

export function createPrintToken(proposalId: string): string {
  const timestamp = Date.now();
  const payload = `${proposalId}:${timestamp}`;
  const hmac = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
  return Buffer.from(`${payload}:${hmac}`).toString('base64');
}

export function validatePrintToken(token: string, proposalId: string): boolean {
  const decoded = Buffer.from(token, 'base64').toString('utf-8');
  const [id, timestamp, hmac] = decoded.split(':');
  
  // Valida proposalId
  if (id !== proposalId) return false;
  
  // Valida expiração (120 segundos)
  if (Date.now() - parseInt(timestamp) > 120_000) return false;
  
  // Valida assinatura HMAC
  const expected = crypto.createHmac('sha256', SECRET)
    .update(`${id}:${timestamp}`)
    .digest('hex');
  
  return hmac === expected;
}
```

---

## 6. Row Level Security (RLS)

O RLS é a principal camada de segurança dos dados. Está ativo em todas as tabelas com dados de usuário.

### O que é RLS

RLS é uma funcionalidade do PostgreSQL que permite definir **regras de acesso diretamente no banco**. Mesmo que alguém tente fazer uma query fora da aplicação (via API direta), o banco recusa se a policy não autorizar.

### Funções auxiliares criadas

```sql
-- Verifica se o usuário autenticado é owner do projeto
CREATE OR REPLACE FUNCTION is_project_owner(p_project_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM projetos
    WHERE id = p_project_id AND user_id = auth.uid()
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- Verifica se o usuário é membro do projeto (owner ou collaborator)
CREATE OR REPLACE FUNCTION is_project_member(p_project_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = p_project_id AND user_id = auth.uid()
  );
$$ LANGUAGE SQL SECURITY DEFINER;
```

Essas funções evitam **recursão infinita** nas policies: sem elas, uma policy em `projetos` que consulta `project_members` poderia disparar a policy de `project_members` que consulta `projetos`, causando loop.

### Exemplo de policies

```sql
-- Projetos: usuário vê seus próprios E projetos onde é membro
CREATE POLICY "User sees own projects and member projects" ON projetos
  FOR SELECT USING (
    auth.uid() = user_id
    OR is_project_member(id)
  );

-- project_member_splits: owner gerencia, collaborator lê seu próprio
CREATE POLICY "Owner manages splits" ON project_member_splits
  FOR ALL USING (is_project_owner(project_id));

CREATE POLICY "Collaborator reads own split" ON project_member_splits
  FOR SELECT USING (member_user_id = auth.uid());

-- collaborator_payment_splits: mesma lógica
CREATE POLICY "Owner manages collab payment splits" ON collaborator_payment_splits
  FOR ALL USING (is_project_owner(project_id));

CREATE POLICY "Collaborator reads own payment splits" ON collaborator_payment_splits
  FOR SELECT USING (member_user_id = auth.uid());
```

### Por que isso é importante

Sem RLS, qualquer usuário autenticado poderia consultar dados de qualquer outro usuário simplesmente fazendo:
```javascript
supabase.from('projetos').select('*') // retornaria TODOS os projetos de TODOS os usuários
```

Com RLS, o banco automaticamente filtra para retornar apenas o que o usuário tem direito de ver.

---

## 7. Realtime com Supabase

### O que é e onde está ativado

Realtime usa WebSockets para notificar o frontend de mudanças no banco em tempo real.

**Tabelas com Realtime ativo:**
- `projetos`
- `tasks`
- `subtasks`
- `pagamentos`
- `arquivos_projeto`
- `links_projeto`
- `project_members`
- `project_member_splits`
- `collaborator_payment_splits`
- `project_invites`

### Como foi configurado no banco

```sql
-- Habilita replica identity FULL (envia row completo antes e depois da mudança)
ALTER TABLE public.projetos REPLICA IDENTITY FULL;
ALTER TABLE public.tasks REPLICA IDENTITY FULL;
-- ... repete para todas as tabelas

-- Adiciona tabelas à publicação do Supabase Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.projetos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
-- ...
```

Sem `REPLICA IDENTITY FULL`, o PostgreSQL só envia o ID da linha mudada, não os dados. Com `FULL`, envia o objeto completo, o que permite atualizar a UI sem precisar buscar os dados novamente.

### Como é usado no frontend

```typescript
// Exemplo de subscription em projeto
useEffect(() => {
  const channel = supabase
    .channel('projeto-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'tasks', filter: `projeto_id=eq.${projectId}` },
      (payload) => {
        if (payload.eventType === 'INSERT') {
          setTasks(prev => [...prev, payload.new]);
        }
        if (payload.eventType === 'UPDATE') {
          setTasks(prev => prev.map(t => t.id === payload.new.id ? payload.new : t));
        }
        if (payload.eventType === 'DELETE') {
          setTasks(prev => prev.filter(t => t.id !== payload.old.id));
        }
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}, [projectId]);
```

---

## 8. Rotas API (Next.js)

As rotas de API (`src/pages/api/`) são funções Node.js que rodam server-side na Vercel. Elas permitem executar lógica que não pode ficar no frontend (segredos, operações admin, Puppeteer).

### Mapa completo de endpoints

#### Autenticação
| Método | Rota | Função |
|--------|------|--------|
| POST | `/api/auth/check-email` | Verifica se e-mail já está cadastrado |

#### Convites de Co-working
| Método | Rota | Função |
|--------|------|--------|
| POST | `/api/invites/create` | Cria convite e envia e-mail |
| POST | `/api/invites/accept` | Aceita convite, cria membership e splits |
| GET | `/api/invites/validate` | Valida token sem aceitar |

#### Colaboradores
| Método | Rota | Função |
|--------|------|--------|
| POST | `/api/collaborators/set-split` | Define split financeiro |
| POST | `/api/collaborators/mark-paid` | Marca todos os splits como pagos |
| POST | `/api/collaborators/mark-split-paid` | Marca um split específico como pago |
| POST | `/api/collaborators/remove` | Remove colaborador do projeto |
| POST | `/api/collaborators/request-payment` | Colaborador solicita pagamento |

#### Pagamentos
| Método | Rota | Função |
|--------|------|--------|
| POST | `/api/payments/sync-splits` | Resincroniza todos os splits do projeto |

#### Relatórios
| Método | Rota | Função |
|--------|------|--------|
| GET | `/api/reports/overview` | KPIs gerais |
| GET | `/api/reports/performance` | Performance de projetos |
| GET | `/api/reports/productivity` | Horas e produtividade |
| GET | `/api/reports/revenue` | Receita mensal com splits |
| GET | `/api/reports/projects-comparison` | Comparação entre projetos |

#### PDF
| Método | Rota | Função |
|--------|------|--------|
| GET | `/api/proposal-pdf/[id]` | Gera PDF da proposta via Puppeteer |

### Por que usar API Routes em vez de chamar Supabase direto

Algumas operações precisam de lógica mais complexa ou permissões de admin:
- **Convites**: gerar token criptográfico + enviar e-mail + criar múltiplos registros em transação
- **Splits**: recalcular todos os `collaborator_payment_splits` após mudança de split
- **PDF**: Puppeteer só roda server-side (não tem DOM no browser para renderizar)
- **Service role**: operações que precisam bypassar RLS (aceitar convite de outro usuário)

---

## 9. Integração com Resend (E-mail)

### Onde está no código

`src/pages/api/invites/create.ts`

### Como funciona

```typescript
async function sendInviteEmail(to: string, inviterName: string, projectName: string, inviteLink: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false; // E-mail opcional se não configurado

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL || "FlowDesk <noreply@flowdesk.app>",
      to: [to],
      subject: `${inviterName} convidou você para colaborar em "${projectName}"`,
      html: `
        <div style="background:#1a1a2e; color:#e0e0e0; font-family:Arial,sans-serif; padding:40px; border-radius:12px;">
          <h1 style="color:#8b5cf6;">Convite de Colaboração</h1>
          <p><strong>${inviterName}</strong> convidou você para colaborar no projeto <strong>"${projectName}"</strong> no FlowDesk.</p>
          <a href="${inviteLink}" style="background:#8b5cf6; color:white; padding:14px 28px; border-radius:8px; text-decoration:none; display:inline-block; margin:20px 0;">
            Aceitar Convite
          </a>
          <p style="color:#888; font-size:12px;">Este convite expira em 7 dias. Link: ${inviteLink}</p>
        </div>
      `,
    }),
  });

  return res.ok;
}
```

### Por que não usar Supabase para e-mails

O Supabase tem e-mails nativos para auth (confirmação, reset de senha), mas **não para e-mails de negócio customizados**. O Resend foi escolhido por:
- API REST simples (sem SDK necessário, só um `fetch`)
- Suporte a HTML completo
- Deliverability superior
- Dashboard de tracking de e-mails

---

## 10. Geração de PDF (Puppeteer + pdf-lib)

### O problema

Gerar PDFs com design rico (gradientes, fontes customizadas, imagens, temas) é muito difícil com bibliotecas puras. O resultado costuma ser feio e desalinhado.

### A solução

**Capturar o HTML já renderizado como imagem e montar um PDF com as imagens.**

### Fluxo completo

```
1. Frontend: usuário clica em "Gerar PDF"
   ↓
2. Frontend: chama GET /api/proposal-pdf/[id] com Bearer token
   ↓
3. API: valida autenticação + propriedade da proposta
   ↓
4. API: gera print token (HMAC-SHA256, válido 120s)
   ↓
5. API: inicia Puppeteer (headless Chromium)
   ↓
6. Puppeteer: navega para /propostas/print/[id]?token=[token]
   ↓
7. Puppeteer: aguarda networkidle0 + carregamento de imagens
   ↓
8. Puppeteer: encontra todos os elementos .pdf-section
   ↓
9. Puppeteer: captura cada seção como PNG (deviceScaleFactor=2 para alta res)
   ↓
10. pdf-lib: cria documento PDF
    ↓
11. pdf-lib: insere cada PNG como página no PDF
    ↓
12. API: retorna PDF como binary attachment
    ↓
13. Frontend: navegador baixa o arquivo
```

### Código simplificado da API

```typescript
// src/pages/api/proposal-pdf/[id].ts

// Detecta ambiente: local usa Puppeteer, Vercel usa chromium
let browser;
if (process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.VERCEL) {
  const chromium = await import('@sparticuz/chromium');
  const puppeteer = await import('puppeteer-core');
  browser = await puppeteer.default.launch({
    args: chromium.default.args,
    executablePath: await chromium.default.executablePath(),
    headless: true,
  });
} else {
  const puppeteer = await import('puppeteer');
  browser = await puppeteer.default.launch({ headless: true });
}

const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 2 });
await page.goto(`${baseUrl}/propostas/print/${id}?token=${printToken}`, {
  waitUntil: 'networkidle0',
});

// Captura cada seção como screenshot
const sections = await page.$$('.pdf-section');
const images = [];
for (const section of sections) {
  const screenshot = await section.screenshot({ type: 'png' });
  images.push(screenshot);
}

// Monta o PDF com pdf-lib
const pdfDoc = await PDFDocument.create();
for (const imgBuffer of images) {
  const img = await pdfDoc.embedPng(imgBuffer);
  const page = pdfDoc.addPage([img.width / 2, img.height / 2]);
  page.drawImage(img, { x: 0, y: 0, width: img.width / 2, height: img.height / 2 });
}

const pdfBytes = await pdfDoc.save();
res.setHeader('Content-Type', 'application/pdf');
res.setHeader('Content-Disposition', `attachment; filename="proposta-${id}.pdf"`);
res.send(Buffer.from(pdfBytes));
```

### Por que @sparticuz/chromium na Vercel

O Puppeteer padrão baixa um Chromium de ~170MB. A Vercel (e AWS Lambda) tem limite de 50MB para funções. O `@sparticuz/chromium` é uma versão compactada e otimizada do Chromium que cabe nesse limite.

---

## 11. Editor Rich Text — TipTap

### Onde está

`src/pages/dashboard/propostas/[id].tsx` e componentes de template em `src/components/proposals/`

### Por que TipTap

- **Headless**: não impõe estilos, o FlowDesk controla 100% do visual
- **Extensível**: cada funcionalidade (negrito, link, lista de tarefas) é um plugin separado
- **Baseado em ProseMirror**: robusto, battle-tested
- **Gera JSON** (não HTML): mais seguro, mais fácil de transformar para PDF, banco de dados e APIs

### Extensões instaladas

```typescript
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import TaskItem from '@tiptap/extension-task-item'
import TaskList from '@tiptap/extension-task-list'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import Highlight from '@tiptap/extension-highlight'
```

### Fluxo de dados

```
Editor TipTap (JSON) → armazenado no campo content do proposal_sections
     ↓
Renderização: JSON → componentes React (Template1/2/3)
     ↓
PDF: componentes React → Puppeteer captura HTML renderizado → pdf-lib monta PDF
```

---

## 12. Gráficos — Recharts

### Onde está

`src/components/reports/` — 6 componentes de gráfico.

### Gráficos implementados e o que mostram

| Componente | Tipo | Dados |
|------------|------|-------|
| `FinanceDonut` | Donut chart | Receita recebida vs pendente vs repasses |
| `RevenueChart` | Line/Bar chart | Receita mensal ao longo do tempo |
| `ProjectStatusDonut` | Donut chart | Projetos em andamento / concluídos / finalizados |
| `ProjectTimeDonut` | Donut chart | Distribuição de horas por projeto |
| `DistributionSection` | Bar chart | Distribuição de tarefas e tempo |
| `PerformanceSection` | Mixed chart | Métricas de performance |

### Por que Recharts

- Componentes React puros (declarativo, sem manipulação de DOM)
- Responsivo por padrão (`<ResponsiveContainer>`)
- Tooltips e legendas customizáveis
- Suporte a animações
- TypeScript nativo
- Mantido ativamente

---

## 13. Sistema de Temas Dinâmicos

### Arquitetura

O sistema usa três camadas:

**1. CSS Variables (`src/styles/variables.css`)**
Define os tokens de design (cores, bordas) como variáveis CSS:
```css
:root {
  --primary-900: #1a1a2e;
  --primary-800: #16213e;
  --secondary-500: #8b5cf6;
  /* ... */
}
```

**2. Temas em CSS (`/public/styles/themes/*.css`)**
Cada tema sobrescreve os valores das variáveis:
```css
/* /public/styles/themes/dracula.css */
:root {
  --primary-900: #282a36;
  --primary-800: #1e1f29;
  --secondary-500: #ff79c6;
  /* ... */
}
```

**3. ThemeLoader (`src/lib/themeLoader.ts`)**
Carrega o CSS do tema dinamicamente:
```typescript
export function applyTheme(themeName: string) {
  // Remove tema anterior
  const existing = document.getElementById('flowdesk-theme');
  if (existing) existing.remove();

  if (themeName === 'default') return; // Tema padrão não precisa de CSS extra

  // Cria nova tag <link> com o CSS do tema
  const link = document.createElement('link');
  link.id = 'flowdesk-theme';
  link.rel = 'stylesheet';
  link.href = `/public/styles/themes/${themeName}.css`;
  document.head.appendChild(link);

  // Persiste no localStorage
  localStorage.setItem('flowdesk_theme', themeName);
}
```

**4. `_app.tsx` carrega o tema salvo:**
```typescript
useEffect(() => {
  const savedTheme = localStorage.getItem('flowdesk_theme') || 'default';
  applyTheme(savedTheme);
}, []);
```

### 10 Temas Disponíveis

| Nome | Estilo |
|------|--------|
| default | Padrão FlowDesk (roxo escuro) |
| claro | Light mode |
| lucy | Roxo vibrante |
| black | Escuro puro |
| material | Google Material Design |
| dracula | Dracula (rosa/roxo) |
| solarized | Solarized Dark |
| tokyo | Tokyo Night |
| ayu | Ayu Dark |
| one | Atom One Dark |

---

## 14. Sistema de Queries (supabaseQueries)

### Localização

`src/lib/supabaseQueries/` — uma pasta por entidade.

### Por que essa camada existe

Em vez de fazer queries do Supabase diretamente nas páginas, todas as operações de banco passam por funções centralizadas. Isso garante:
- Reutilização (mesma query em múltiplas páginas)
- Consistência (tipagem, tratamento de erro)
- Facilidade de manutenção
- Separação de concerns (UI separada de acesso a dados)

### Padrão de nomenclatura

```typescript
// Leitura
export async function getClientes() { ... }
export async function getProjetoById(id: string) { ... }

// Criação
export async function addCliente(cliente: Omit<Cliente, 'id' | 'created_at'>) { ... }

// Atualização
export async function updateCliente(id: string, updates: Partial<Cliente>) { ... }

// Remoção
export async function deleteCliente(id: string) { ... }
```

### Arquivos existentes

| Arquivo | Entidade |
|---------|----------|
| `clientes.ts` | CRUD de clientes |
| `projetos.ts` | CRUD de projetos |
| `tasks.ts` | CRUD de tarefas |
| `subtasks.ts` | CRUD de subtarefas |
| `pagamentos.ts` | CRUD de pagamentos |
| `proposals.ts` | CRUD de propostas |
| `proposalTemplates.ts` | CRUD de templates |
| `proposalSections.ts` | CRUD de seções de proposta |
| `uploadAvatar.ts` | Upload para Supabase Storage |

---

## 15. Sistema Financeiro — Splits de Colaborador

### A separação fundamental

O sistema financeiro tem **dois fluxos completamente separados**:

```
DINHEIRO QUE ENTRA:
  Cliente paga → tabela `pagamentos` → receita do projeto

REPASSE INTERNO:
  Owner repassa para colaborador → tabelas:
    project_member_splits (definição do split)
    collaborator_payment_splits (cálculo por pagamento)
```

Essa separação existe porque **cliente pagar não significa colaborador ter sido pago**. O owner pode receber R$ 1.000 do cliente e ainda não ter repassado os R$ 200 do colaborador.

### Fluxo completo com cálculo automático

**Cenário:** Projeto de R$ 1.000, dividido em 2 parcelas, com colaborador tendo 20%.

```
1. Owner define split: 20% para o colaborador
   → POST /api/collaborators/set-split
   → Cria project_member_splits { split_type: 'percentage', split_value: 20 }
   → Chama syncCollaboratorPaymentSplits()
   
2. syncCollaboratorPaymentSplits() busca todos os pagamentos do projeto e calcula:
   Parcela 1 (R$ 500): colaborador recebe R$ 500 × 20% = R$ 100
   → Cria collaborator_payment_splits { pagamento_id: p1, amount: 100, status: 'pendente' }
   
   Parcela 2 (R$ 500): colaborador recebe R$ 500 × 20% = R$ 100
   → Cria collaborator_payment_splits { pagamento_id: p2, amount: 100, status: 'pendente' }

3. Cliente paga parcela 1:
   → Owner marca pagamento como pago (status: 'pago')
   → Automaticamente sincroniza (syncCollaboratorPaymentSplits re-executa)

4. Colaborador vê R$ 100 disponível, solicita pagamento:
   → POST /api/collaborators/request-payment
   → Atualiza payment_requested_at

5. Owner paga o colaborador:
   → POST /api/collaborators/mark-paid (tudo) ou mark-split-paid (específico)
   → Atualiza status de collaborator_payment_splits para 'pago'
   → Atualiza payment_status em project_member_splits
```

### Por que por pagamento (e não por projeto)

Um projeto pode ter múltiplos pagamentos em datas diferentes. O sistema calcula o split **por pagamento** para:
- Rastrear exatamente quanto vem de cada parcela
- Permitir pagamento parcial ao colaborador
- Ter histórico granular de transferências

---

## 16. Sistema de Co-working (Convites)

### Fluxo completo

```
1. Owner acessa projeto → aba de colaboração
   ↓
2. Owner preenche: e-mail, split (% ou R$), se já pagou
   ↓
3. Frontend: POST /api/invites/create { project_id, invited_email, split_type, split_value }
   ↓
4. Backend:
   - Verifica autenticação + ownership do projeto
   - Gera token: crypto.randomBytes(32).toString('hex')
   - Expira em 7 dias: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
   - Salva em project_invites
   - Envia e-mail via Resend com link: https://app.oflowdesk.com/invite/[token]
   ↓
5. Colaborador recebe e-mail, clica no link
   ↓
6. Abre /invite/[token]
   - Se não logado: redireciona para /login?redirect=/invite/[token]
   - Após login: valida token via GET /api/invites/validate
   ↓
7. Página mostra estado do convite:
   - Válido → botão "Aceitar"
   - Expirado → mensagem de erro
   - Já aceito → redireciona para o projeto
   - E-mail diferente → alerta (convite é para outro e-mail)
   ↓
8. Colaborador clica "Aceitar" → POST /api/invites/accept
   ↓
9. Backend:
   - Valida token + expiração + email match
   - Cria project_members { project_id, user_id, role: 'collaborator' }
   - Se split definido: cria project_member_splits
   - Sincroniza collaborator_payment_splits para cada pagamento existente
   - Se already_paid: marca payment_status como 'paid'
   - Atualiza project_invites.status = 'accepted'
   - Retorna { project_id }
   ↓
10. Frontend redireciona para /dashboard/projetos/[project_id]
```

### Segurança do sistema de convites

- Token: 32 bytes aleatórios = 64 caracteres hex = `2^256` combinações (inquebrável na prática)
- Expiração: 7 dias
- E-mail validado: o token é para um e-mail específico, não pode ser usado por outro
- Single-use: aceito uma vez, token fica como `accepted`
- Usa `SUPABASE_SERVICE_ROLE_KEY` apenas no backend para criar registros em nome de outro usuário

---

## 17. Relatórios e Analytics

### Arquitetura dos Relatórios

```
Frontend (src/pages/dashboard/relatorios/)
  ↓ GET /api/reports/[tipo]?period=30d
Backend (src/pages/api/reports/)
  ↓ Queries complexas no PostgreSQL
  ↓ Cálculos em JavaScript (Node.js)
  → JSON com métricas calculadas
  ↓
Frontend
  → Recharts (gráficos) + Cards de KPI
```

### 5 Relatórios Implementados

#### 1. Overview (`/api/reports/overview`)
Visão geral do negócio no período:
- Total recebido, pendente, repasses de colaboradores
- Faturamento bruto (recebido) e líquido (recebido - repasses)
- Projetos ativos, finalizados, total
- Ciclo médio de projeto (dias do início até conclusão)
- Tempo médio de execução (horas rastreadas)

#### 2. Performance (`/api/reports/performance`)
Análise de eficiência:
- Top 5 projetos com maior ciclo (mais tempo para fechar)
- Top 5 projetos com mais horas de execução
- Médias de ciclo e execução
- Projetos com e sem time tracking

#### 3. Produtividade (`/api/reports/productivity`)
Análise de horas trabalhadas:
- Total de horas rastreadas no período
- Distribuição por projeto (% do tempo total)
- Evolução mensal (gráfico de linha)
- Top 6 meses mais produtivos
- Insights: projeto com mais horas, mês mais produtivo

#### 4. Receita (`/api/reports/revenue`)
Análise financeira:
- Receita mensal dos últimos N meses
- Separação: valor recebido vs pendente vs repasses
- Faturamento bruto e líquido por mês
- Totalizadores

#### 5. Comparação de Projetos (`/api/reports/projects-comparison`)
Comparação lado a lado:
- Orçamento vs valor recebido
- Ciclo de cada projeto
- Horas de execução
- Contagem de tarefas (total/concluídas)

### Utilitários de Período

```typescript
// src/lib/reportUtils.ts
export function getPeriodWindowStart(period: string): string | null {
  if (period === 'all') return null;
  const days = { '30d': 30, '90d': 90, '180d': 180, '365d': 365 }[period];
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}
```

---

## 18. Propostas Comerciais

### O que é

Um sistema completo de criação de propostas comerciais com:
- Editor de blocos (TipTap)
- 3 templates visuais
- Geração de PDF

### 3 Templates de Proposta

Cada template é um componente React que renderiza a proposta com um visual diferente:

- **Template 1** (`src/components/proposals/Template1.tsx`) — design moderno minimalista
- **Template 2** (`src/components/proposals/Template2.tsx`) — design com gradientes e cores marcantes
- **Template 3** (`src/components/proposals/Template3.tsx`) — design corporativo clean

### Tipos de Seção

Cada proposta é composta por blocos (`proposal_sections`):

| Tipo | Descrição |
|------|-----------|
| `title` | Título principal da proposta |
| `paragraph` | Parágrafo de texto (TipTap) |
| `info_group` | Grupo de informações (ex: prazo, valor) |
| `deliverables` | Lista de entregáveis |
| `price` | Bloco de precificação |
| `banner` | Imagem de destaque |
| `logo` | Logo do freelancer ou cliente |
| `divider` | Separador visual |

### Status de Proposta

`analisando` → `negociando` → `aceita` (ou `recusada` ou `em_espera`)

---

## 19. Time Tracker

### O que é

Sistema de cronômetro integrado ao projeto e à tarefa.

### Como funciona

1. Usuário acessa `/dashboard/cronometro` ou o cronômetro inline no projeto
2. Seleciona o projeto (e opcionalmente a tarefa)
3. Clica em "Iniciar" → registra `started_at`
4. Clica em "Parar" → registra `ended_at` e calcula `duration_seconds`
5. Sessão salva em `time_entries`

### Onde os dados são usados

- Dashboard principal: horas trabalhadas esta semana
- Relatórios de produtividade: horas por projeto e evolução mensal
- Comparação de projetos: tempo de execução por projeto

### Por que rastrear em segundos

`duration_seconds` é armazenado como inteiro (segundos), não como timestamp. Isso facilita:
- Somas simples (`SUM(duration_seconds)`)
- Conversão para horas/minutos sem parsear timestamps
- Cálculos de médias

---

## 20. Briefings

### O que é

Sistema de formulários dinâmicos para coleta de informações de projeto.

### Estrutura em 4 tabelas

```
briefings_templates (template pai)
  └── briefings_campos (campos/perguntas do template)

briefings_envios (envio de um template para um cliente/projeto)
  └── briefings_respostas (respostas do cliente para cada campo)
```

### Tipos de campo disponíveis

`texto`, `textarea`, `numero`, `data`, `selecao`, `multipla_escolha`, `arquivo`

### Fluxo de uso

1. Freelancer cria template com campos customizados
2. Vincula template a um projeto
3. (Futuro) Envia para o cliente responder
4. Respostas ficam salvas em `briefings_respostas`

---

## 21. Estrutura de Componentes

```
src/components/
├── auth/
│   ├── AuthCard.tsx          — Card container das páginas de auth
│   ├── AuthInput.tsx         — Input customizado
│   └── AuthBackground.tsx    — Background animado
│
├── proposals/
│   ├── Template1.tsx         — Template de proposta 1
│   ├── Template2.tsx         — Template de proposta 2
│   ├── Template3.tsx         — Template de proposta 3
│   └── ProposalPDF.tsx       — Renderização para PDF
│
├── reports/
│   ├── OverviewCards.tsx     — Cards de KPIs
│   ├── FinanceDonut.tsx      — Gráfico donut financeiro
│   ├── RevenueChart.tsx      — Gráfico de receita
│   ├── ProjectStatusDonut.tsx — Donut de status de projetos
│   ├── ProjectTimeDonut.tsx  — Donut de tempo por projeto
│   ├── DistributionSection.tsx — Barras de distribuição
│   └── PerformanceSection.tsx — Seção de performance
│
├── ui/
│   ├── Toast.tsx             — Notificações toast
│   ├── ConfirmModal.tsx      — Modal de confirmação
│   └── ImageConverterModal.tsx — Modal de otimização de imagem
│
├── modals/
│   └── CreateClientModal.tsx — Modal de criação de cliente inline
│
├── Sidebar.tsx               — Navegação principal
├── HeaderProfile.tsx         — Header com perfil
├── ThemeModal.tsx            — Seletor de tema
├── DatePicker.tsx            — Seletor de data customizado
├── UrgenciaIndicator.tsx     — Indicador visual de urgência
├── ProtectedRoute.tsx        — Guard de rotas autenticadas
├── withAuth.tsx              — HOC para autenticação
├── LogoFlowDeskFull.tsx      — Logo completo
├── LogoFlowDeskIcon.tsx      — Ícone do logo
└── Skeleton.tsx              — Loading skeletons
```

---

## 22. Configurações (Next.js, TypeScript, Tailwind)

### `next.config.js`

```javascript
const nextConfig = {
  reactStrictMode: true,
  compress: true,                              // Gzip em produção
  transpilePackages: ["@react-pdf/renderer"], // Transpila ESM para CJS
  images: {
    minimumCacheTTL: 3600,
    remotePatterns: [{
      protocol: "https",
      hostname: "hcnssdxsajfdwvbcfxkq.supabase.co",
      pathname: "/storage/v1/object/public/**",
    }],
  },
};
```

**Por que `transpilePackages`:** O `@react-pdf/renderer` usa ESM nativo, mas Next.js Pages Router usa CJS. Sem isso, o import falha.

### `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "strict": true,
    "paths": { "@/*": ["./src/*"] },
    "moduleResolution": "bundler"
  }
}
```

**Por que `moduleResolution: bundler`:** Resolve imports da forma que bundlers modernos (Webpack, Turbopack) entendem — necessário para compatibilidade com Next.js 15.

### `tailwind.config.js`

```javascript
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          900: 'var(--primary-900)',
          // ...9 tons
        },
        secondary: { ... },
        third: { ... },
        gray: { ... },
        error: { ... },
        alert: { ... },
        success: { ... },
      }
    }
  }
}
```

---

## 23. O que está implementado vs o que falta

### ✅ Implementado e funcional

| Funcionalidade | Onde está no código |
|----------------|---------------------|
| Autenticação completa | `src/pages/login, signup, forgot-password, reset-password` + `src/contexts/AuthContext.tsx` |
| CRUD de Clientes | `src/pages/dashboard/clientes/` + `src/lib/supabaseQueries/clientes.ts` |
| CRUD de Projetos | `src/pages/dashboard/projetos/` + `src/lib/supabaseQueries/projetos.ts` |
| CRUD de Tarefas e Subtarefas | `src/pages/dashboard/projetos/[id].tsx` + queries de tasks/subtasks |
| Arquivos de projeto | `src/pages/dashboard/projetos/[id].tsx` |
| Links de projeto | `src/pages/dashboard/projetos/[id].tsx` |
| Briefings | `src/pages/dashboard/briefings/` |
| Propostas + 3 templates | `src/pages/dashboard/propostas/` + `src/components/proposals/` |
| Geração de PDF | `src/pages/api/proposal-pdf/[id].ts` (Puppeteer) |
| Pagamentos (receita) | `src/pages/dashboard/pagamentos/` + `src/lib/supabaseQueries/pagamentos.ts` |
| Time Tracker | `src/pages/dashboard/cronometro/` |
| Convites de co-working | `src/pages/api/invites/` + `src/pages/invite/[token].tsx` |
| E-mail de convite | `src/pages/api/invites/create.ts` (Resend) |
| Split financeiro | `src/pages/api/collaborators/` |
| Dashboard do colaborador | `src/pages/dashboard/projetos/[id].tsx` (view condicional) |
| Relatórios | `src/pages/dashboard/relatorios/` + `src/pages/api/reports/` |
| Sistema de temas | `src/lib/themeLoader.ts` + `/public/styles/themes/` |
| Realtime | Supabase subscriptions nas páginas de projeto |
| RLS | `supabase/migrations/` |

### 🔲 Planejado / Não implementado

| Funcionalidade | Status | Por onde começar |
|----------------|--------|------------------|
| Portal do cliente | 🔲 | Nova seção `src/pages/client/` com acesso limitado por token |
| Aprovação de entregáveis | 🔲 | Tabela `entregaveis` + status de aprovação + portal do cliente |
| Notificações de cobrança | 🔲 | Cron job + Resend + tabela de notificações |
| Faturamento do colaborador | 🔲 | Expandir tela de co-working com emissão de boleto/PIX |
| Bloqueio de conclusão do projeto | 🔲 | Validações: todos os pagamentos pagos, tarefas concluídas |
| Pagamentos a receber (visão consolidada) | 🔲 | Nova página aggregando `pagamentos` com status `pendente` |
| Emissão de notas fiscais | 🔲 | Integração com API de NF-e |

---

## 24. Roadmap técnico das funcionalidades pendentes

### Portal do Cliente

**O que é:** Interface simplificada para o cliente final acompanhar o projeto sem acesso ao financeiro interno.

**Como implementar:**
1. Criar tabela `client_tokens` (token de acesso por projeto + cliente)
2. Owner gera link de acesso para o cliente
3. Criar rotas `src/pages/client/[token]/` (sem autenticação Supabase normal)
4. Backend valida o token e retorna dados do projeto filtrados (sem financeiro, sem colaboradores)
5. RLS: policy especial para tokens de cliente

**Tabela necessária:**
```sql
CREATE TABLE client_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projetos(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clientes(id),
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

### Pagamentos a Receber (Visão Consolidada)

**O que é:** Uma tela que mostra todos os pagamentos pendentes de todos os projetos do freelancer.

**Como implementar:**
1. Nova página `src/pages/dashboard/pagamentos/a-receber.tsx`
2. Query: busca todos os `pagamentos` onde `status = 'pendente'` do usuário, agrupados por projeto
3. Exibe total pendente, data prevista, forma de pagamento
4. Ação rápida: marcar como recebido

**Sem necessidade de nova tabela** — apenas uma nova view/query sobre `pagamentos`.

---

### Bloqueio de Conclusão do Projeto

**O que é:** Sistema de validações que impede fechar um projeto com pendências.

**Validações planejadas:**
- Todos os pagamentos do projeto estão pagos?
- Todas as tarefas estão concluídas?
- Todos os colaboradores foram pagos?

**Como implementar:**
1. Adicionar verificação na ação de alterar `status` para `finalizado`
2. Backend (`/api/projects/finalize`) retorna lista de bloqueios se houver pendências
3. Frontend exibe modal com checklist do que falta

---

### Notificações de Cobrança

**O que é:** Lembretes automáticos quando um pagamento está próximo do vencimento.

**Como implementar:**
1. Cron job (Vercel Cron ou externo) que roda diariamente
2. Busca pagamentos com `status = 'pendente'` e `data_prevista` nos próximos 3 dias
3. Para cada um: envia e-mail via Resend para o owner
4. Rastrear envios em tabela `notification_logs` (evitar duplicatas)

---

## 25. Decisões Arquiteturais — Perguntas Esperadas

### Por que Next.js e não Express separado?

O Next.js unifica frontend e backend em um único repositório e deploy. As API Routes têm tudo que precisamos (Node.js, acesso a variáveis de ambiente, execução server-side). Para o porte atual do projeto, uma separação frontend/backend adicionaria complexidade sem benefício.

### Por que Supabase e não Firebase?

O Supabase usa **PostgreSQL real**, que permite:
- Joins complexos (essenciais para os relatórios)
- RLS (segurança no banco, não só na aplicação)
- Funções SQL customizadas
- Transações ACID
- Migrações SQL versionadas

O Firebase usa Firestore, um banco NoSQL orientado a documentos, que tem limitações em queries relacionais e não tem RLS equivalente.

### Por que Pages Router e não App Router?

O App Router (Next.js 13+) é mais novo e poderoso, mas:
- Teve breaking changes frequentes nos primeiros meses
- Algumas dependências (como `@react-pdf/renderer`) têm problemas com Server Components
- O Pages Router é mais estável, previsível e compatível com o ecossistema atual do projeto
- Migração futura é possível, mas não prioritária

### Por que Puppeteer para PDF e não uma biblioteca de PDF pura?

Bibliotecas de PDF puras (como jsPDF ou pdfmake) precisam que o desenvolvedor descreva o layout do PDF programaticamente. Para um sistema com templates ricos (gradientes, fontes customizadas, imagens, temas), isso seria inviável de manter.

O Puppeteer renderiza o HTML exatamente como o browser faz — o resultado é pixel-perfect com o que o usuário vê na tela. A troca é o custo em tempo de execução (~3-5 segundos por PDF) e o tamanho do binário do Chromium.

### Por que RLS e não validação só na API?

Validar apenas na API cria uma superfície de ataque maior. Se a API tem um bug, o banco fica exposto. Com RLS, mesmo que a aplicação tenha uma falha, o banco garante que o usuário A nunca vê dados do usuário B. É **defense in depth** — múltiplas camadas de segurança.

### Por que usar HMAC para tokens de convite e de PDF?

- **Convites**: poderiam usar UUID simples, mas HMAC adiciona uma camada (o token não é só aleatório, é assinado)
- **PDF/print tokens**: precisam ser assinados porque um UUID aleatório não tem como ser validado sem consultar o banco. Com HMAC, a validação é puramente computacional (sem query de banco), o que é mais rápido e seguro

### Por que separar `collaborator_payment_splits` de `project_member_splits`?

`project_member_splits` define a **regra** (colaborador X recebe 20% do projeto Y).

`collaborator_payment_splits` registra o **cálculo aplicado** (colaborador X recebe R$ 100 do pagamento #123).

A separação permite:
- Rastrear exatamente de qual pagamento veio cada repasse
- Pagar colaboradores por partes (pagamento a pagamento)
- Histórico financeiro detalhado
- Renegociar o split sem perder histórico anterior

---

## 26. Node.js — Onde está hoje e onde vai crescer

### Node.js já está em uso

Node.js **já é o runtime de todas as API Routes** do projeto (`src/pages/api/`). Quando a Vercel faz o deploy, cada arquivo dentro de `src/pages/api/` vira uma função serverless Node.js independente.

Hoje existem **16 endpoints Node.js** em produção:

```
src/pages/api/
├── auth/
│   └── check-email.ts          ← Node.js
├── invites/
│   ├── create.ts               ← Node.js + Resend
│   ├── accept.ts               ← Node.js + Supabase Admin
│   └── validate.ts             ← Node.js
├── collaborators/
│   ├── set-split.ts            ← Node.js (lógica financeira)
│   ├── mark-paid.ts            ← Node.js
│   ├── mark-split-paid.ts      ← Node.js
│   ├── remove.ts               ← Node.js
│   └── request-payment.ts      ← Node.js
├── payments/
│   └── sync-splits.ts          ← Node.js (recalculo de splits)
├── reports/
│   ├── overview.ts             ← Node.js (queries agregadas)
│   ├── performance.ts          ← Node.js
│   ├── productivity.ts         ← Node.js
│   ├── revenue.ts              ← Node.js
│   └── projects-comparison.ts  ← Node.js
└── proposal-pdf/
    └── [id].ts                 ← Node.js + Puppeteer + pdf-lib
```

### Por que Node.js e não outra linguagem

- A stack inteira já é JavaScript/TypeScript — manter Node.js evita context-switch entre linguagens
- O Supabase tem SDK oficial para JavaScript
- Next.js já executa Node.js nativamente — sem servidor separado
- Puppeteer só existe para Node.js (não há alternativa igual em Python ou Go)

### Onde o Node.js vai crescer

As funcionalidades pendentes são exatamente onde Node.js se justifica mais:

#### 1. Portal do Cliente — validação de token server-side

O cliente não usa Supabase Auth. A sessão dele é validada via token no servidor:

```typescript
// src/pages/api/client/validate-token.ts (será criado)
export default async function handler(req, res) {
  const { token } = req.query;

  const supabaseAdmin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const { data: clientToken } = await supabaseAdmin
    .from('client_tokens')
    .select('*, projetos(*), clientes(*)')
    .eq('token', token)
    .single();

  if (!clientToken) return res.status(401).json({ error: 'Token inválido' });
  if (clientToken.expires_at && new Date(clientToken.expires_at) < new Date()) {
    return res.status(401).json({ error: 'Token expirado' });
  }

  return res.status(200).json({ project: clientToken.projetos, client: clientToken.clientes });
}
```

#### 2. Aprovação / Feedback de Entregáveis

```typescript
// src/pages/api/client/feedback.ts (será criado)
// Cliente envia aprovação ou feedback
export default async function handler(req, res) {
  const { token, entregavel_id, tipo, mensagem } = req.body;
  // 1. Valida token do cliente
  // 2. Cria registro em client_feedback
  // 3. Cria registro em atividades (para o freelancer ver)
  // 4. Supabase Realtime notifica o freelancer automaticamente
  // 5. Envia e-mail via Resend para o freelancer (Resend já integrado)
}
```

#### 3. Notificações de Cobrança — Cron Job

```typescript
// src/pages/api/cron/payment-reminders.ts (será criado)
// Rodará via Vercel Cron Jobs (vercel.json)
export default async function handler(req, res) {
  // Verifica secret para garantir que só a Vercel chama
  if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).end();
  }

  // Busca pagamentos com data_prevista nos próximos 3 dias e status = 'pendente'
  // Para cada um: envia e-mail via Resend para o owner
  // Registra em notification_logs para não enviar duplicata
}
```

#### 4. Webhooks de Gateway de Pagamento (futuro)

```typescript
// src/pages/api/webhooks/payment-gateway.ts (será criado)
// Recebe notificação do gateway (Stripe, Pagar.me, etc.)
export default async function handler(req, res) {
  // 1. Valida assinatura do webhook (HMAC do gateway)
  // 2. Identifica evento: payment.confirmed
  // 3. Atualiza pagamentos.status = 'pago' no banco
  // 4. Dispara sync-splits automaticamente
  // 5. Notifica freelancer via Realtime
}
```

#### 5. Emissão de Nota Fiscal

```typescript
// src/pages/api/invoices/generate.ts (será criado)
// Integra com API de NF-e (ex: Focus NFe, eNotas)
export default async function handler(req, res) {
  // 1. Valida dados do projeto e cliente
  // 2. Chama API da NF-e com os dados do serviço
  // 3. Armazena URL/número da NF no banco
  // 4. Retorna PDF da nota para o freelancer
}
```

### Resumo do crescimento Node.js

| Situação | Endpoints hoje | Endpoints futuros |
|----------|---------------|-------------------|
| Auth | 1 | +2 (token cliente, logout cliente) |
| Convites/Co-working | 3 | mantém |
| Colaboradores | 5 | mantém |
| Pagamentos | 1 | +3 (webhooks gateway, cron lembretes, visão consolidada) |
| Portal do Cliente | 0 | +5 (validate-token, feedback, arquivos, entregáveis, briefings) |
| Relatórios | 5 | +2 (relatório do cliente, export CSV) |
| Notas Fiscais | 0 | +1 (generate) |
| PDF | 1 | mantém |

Node.js continua sendo o **único runtime de backend** do projeto — não há plano de adicionar outra linguagem.

---

## 27. Portal do Cliente — Arquitetura e Comunicação Bidirecional em Tempo Real

### O problema de design

Existem dois tipos de usuário com necessidades completamente diferentes:

**Freelancer:**
- Vê financeiro, colaboradores, splits, métricas
- Gerencia tarefas, prazos, briefings
- Tem conta Supabase Auth completa

**Cliente:**
- Só precisa ver o andamento do projeto
- Ver arquivos enviados pelo freelancer
- Aprovar ou dar feedback em entregáveis
- Responder briefings
- **Não pode ver** financeiro, colaboradores, orçamento real

### Decisão arquitetural: cliente NÃO usa Supabase Auth

O cliente não cria uma conta no sistema. Ele recebe um **link de acesso único** do freelancer. Isso resolve vários problemas:

- Não obriga o cliente a criar e lembrar senha
- Não mistura clientes com freelancers em `auth.users`
- O acesso pode ser revogado pelo freelancer a qualquer momento
- O link pode ter prazo de expiração
- Mais simples para o cliente ("só clica no link")

### Nova tabela: `client_tokens`

```sql
CREATE TABLE client_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
  client_id  UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  token      TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMPTZ,   -- NULL = sem expiração
  revoked    BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: apenas o owner do projeto pode criar/revogar tokens
CREATE POLICY "Owner manages client tokens" ON client_tokens
  FOR ALL USING (
    EXISTS (SELECT 1 FROM projetos WHERE id = project_id AND user_id = auth.uid())
  );
```

### Novas tabelas para o portal

#### `entregaveis`
Etapas/entregas que o freelancer marca como concluídas e o cliente pode aprovar.

```sql
CREATE TABLE entregaveis (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
  titulo      TEXT NOT NULL,
  descricao   TEXT,
  status      TEXT NOT NULL DEFAULT 'pendente'
              CHECK (status IN ('pendente', 'enviado', 'aprovado', 'reprovado')),
  enviado_em  TIMESTAMPTZ,
  user_id     UUID NOT NULL REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ DEFAULT now()
);
```

#### `client_feedback`
Aprovações, reprovações e comentários do cliente.

```sql
CREATE TABLE client_feedback (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     UUID NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
  entregavel_id  UUID REFERENCES entregaveis(id) ON DELETE SET NULL,
  arquivo_id     UUID REFERENCES arquivos_projeto(id) ON DELETE SET NULL,
  tipo           TEXT NOT NULL CHECK (tipo IN ('aprovacao', 'reprovacao', 'comentario')),
  mensagem       TEXT,
  client_id      UUID NOT NULL REFERENCES clientes(id),
  created_at     TIMESTAMPTZ DEFAULT now()
);
```

#### `notifications`
Notificações internas do sistema (freelancer e cliente).

```sql
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
  para_user   UUID REFERENCES auth.users(id),  -- se for para freelancer
  para_client UUID REFERENCES clientes(id),    -- se for para cliente
  tipo        TEXT NOT NULL,
  titulo      TEXT NOT NULL,
  mensagem    TEXT,
  lida        BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Realtime
ALTER TABLE notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER TABLE entregaveis REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE entregaveis;
ALTER TABLE client_feedback REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE client_feedback;
```

### Como as duas interfaces funcionam juntas

```
FREELANCER (app.oflowdesk.com)           CLIENTE (app.oflowdesk.com/client/[token])
         │                                              │
         │  Supabase Auth (JWT)                         │  Token-based (sem conta)
         │                                              │
         ▼                                              ▼
  Dashboard completo                         Portal simplificado
  Tarefas, financeiro,                       Status do projeto,
  colaboradores, métricas                    arquivos, entregáveis,
                                             formulário de feedback
```

### Fluxo 1: Freelancer envia arquivo → Cliente vê em tempo real

```
1. Freelancer faz upload de arquivo no projeto
   (src/pages/dashboard/projetos/[id].tsx)
   ↓
2. Arquivo salvo em arquivos_projeto (tabela já existe)
   ↓
3. API cria notificação para o cliente:
   POST /api/client/notify
   → INSERT INTO notifications { para_client: client_id, tipo: 'novo_arquivo', ... }
   ↓
4. Supabase Realtime emite evento para o canal do projeto
   (notifications com filter: project_id=eq.[id])
   ↓
5. Portal do cliente está escutando esse canal:
   supabase.channel('client-notifications')
     .on('postgres_changes', { table: 'notifications', filter: `project_id=eq.${projectId}` }, ...)
   ↓
6. Badge/toast aparece no portal: "Novo arquivo enviado: mockup-v2.png"
   ↓
7. (Opcional) E-mail automático via Resend para o cliente
```

### Fluxo 2: Freelancer conclui etapa → Cliente aprova ou reprova

```
1. Freelancer marca entregável como "enviado"
   PUT /api/entregaveis/[id] { status: 'enviado', enviado_em: now() }
   ↓
2. API cria notificação:
   INSERT INTO notifications { para_client: ..., tipo: 'entregavel_enviado', titulo: 'Nova etapa para revisão' }
   ↓
3. Realtime notifica o portal do cliente imediatamente
   ↓
4. Cliente abre o portal, vê a etapa com status "Aguardando revisão"
   ↓
5. Cliente clica "Aprovar" ou "Reprovar + comentário"
   POST /api/client/feedback { token, entregavel_id, tipo: 'aprovacao', mensagem: '...' }
   ↓
6. API (Node.js):
   - Valida token do cliente
   - INSERT INTO client_feedback { ... }
   - UPDATE entregaveis SET status = 'aprovado' WHERE id = ...
   - INSERT INTO notifications { para_user: freelancer_id, tipo: 'entregavel_aprovado' }
   - INSERT INTO atividades { tipo: 'feedback_cliente', descricao: 'Cliente aprovou: Identidade Visual' }
   ↓
7. Realtime notifica o dashboard do freelancer:
   supabase.channel('freelancer-notifications')
     .on('postgres_changes', { table: 'notifications', filter: `para_user=eq.${userId}` }, ...)
   ↓
8. Badge/toast aparece para o freelancer: "Cliente aprovou: Identidade Visual"
```

### Fluxo 3: Cliente dá feedback negativo → Freelancer corrige e reenvia

```
1. Cliente reprova: POST /api/client/feedback { tipo: 'reprovacao', mensagem: 'Alterar a cor para azul' }
   ↓
2. API:
   - UPDATE entregaveis SET status = 'reprovado'
   - INSERT INTO notifications { para_user: freelancer_id, tipo: 'entregavel_reprovado',
       mensagem: 'Alterar a cor para azul' }
   ↓
3. Freelancer vê notificação + comentário no dashboard
   ↓
4. Freelancer corrige, faz novo upload de arquivo
   ↓
5. Freelancer marca entregável como "enviado" novamente
   → Volta para o Fluxo 2
```

### Diagrama completo da comunicação bidirecional

```
FREELANCER DASHBOARD              BANCO (Supabase)              PORTAL DO CLIENTE
       │                                │                               │
       │ ── envia arquivo ──────────►  arquivos_projeto                │
       │                               │                               │
       │ ── cria notif ─────────────►  notifications ──── Realtime ──► │ badge "Novo arquivo"
       │                               │                               │
       │                               │    ◄──── client_feedback ──── │ aprova/reprova
       │                               │                               │
       │ ◄── Realtime ─────────────── notifications                    │
       │ badge "Cliente aprovou"        │                               │
       │                               │                               │
       │ ── marca entregável ────────►  entregaveis ───── Realtime ──► │ "Nova etapa para revisão"
       │                               │                               │
       │                               │    ◄──── notifications ─────── │ após feedback
       │ ◄── Realtime ─────────────── notifications                    │
       │ "Cliente pediu revisão: ..."   │                               │
```

### Isolamento de dados entre cliente e freelancer

**O cliente nunca enxerga:**

| Dado sensível | Como é bloqueado |
|---------------|-----------------|
| Valor real do orçamento | Query da API do portal não inclui `projetos.valor` |
| Colaboradores e splits | Portal não tem acesso às tabelas `project_members` e `*_splits` |
| Pagamentos recebidos | Tabela `pagamentos` não é exposta pela API do portal |
| Outros clientes do freelancer | Token é específico do projeto, não do freelancer |

**Como é implementado o bloqueio:**

O portal do cliente **nunca usa o Supabase client diretamente no frontend**. Todas as queries passam pela API Node.js:

```typescript
// Portal do cliente: NUNCA faz isso
const { data } = await supabase.from('projetos').select('*') // BLOQUEADO — sem auth

// Portal do cliente: SEMPRE faz isso
const res = await fetch(`/api/client/project?token=${token}`)
// A API decide EXATAMENTE quais campos retornar:
return res.json({
  titulo: projeto.titulo,
  status: projeto.status,
  prazo_entrega: projeto.prazo_entrega,
  // valor: projeto.valor ← NUNCA incluído
  // user_id: projeto.user_id ← NUNCA incluído
})
```

### Estrutura de rotas do portal

```
src/pages/client/[token]/
├── index.tsx          — visão geral do projeto (sem financeiro)
├── arquivos.tsx       — arquivos enviados pelo freelancer
├── entregaveis.tsx    — etapas para aprovar/reprovar
└── briefing.tsx       — briefing para o cliente responder

src/pages/api/client/
├── validate-token.ts  — valida token e retorna dados básicos
├── project.ts         — dados filtrados do projeto
├── files.ts           — arquivos do projeto
├── deliverables.ts    — entregáveis + ações de aprovação
├── feedback.ts        — recebe aprovação/reprovação/comentário
└── briefing.ts        — recebe resposta do briefing
```

### Por que Realtime e não polling

**Polling** (checar o banco a cada N segundos) tem problemas:
- Delay: se o intervalo é 10s, o cliente pode esperar até 10s para ver uma atualização
- Custo: queries desnecessárias quando não há mudanças

**Realtime** (WebSockets):
- Notificação instantânea no momento da mudança
- Sem queries desnecessárias
- Já está implementado no projeto via Supabase
- Infraestrutura zero: Supabase gerencia os WebSockets

A adição do portal do cliente apenas adiciona **novos canais de escuta** à mesma infraestrutura de Realtime que já existe.

### Como o freelancer gera o link do cliente

```
1. Freelancer acessa aba "Portal do Cliente" no projeto
   ↓
2. Clica em "Gerar link de acesso"
   → POST /api/client/generate-token { project_id, client_id, expires_at? }
   ↓
3. API (Node.js):
   - Verifica que o usuário é owner do projeto
   - INSERT INTO client_tokens { project_id, client_id, token: randomBytes(32).toString('hex') }
   ↓
4. Frontend exibe o link: https://app.oflowdesk.com/client/[token]
   ↓
5. Freelancer copia e envia para o cliente (WhatsApp, e-mail, etc.)
   OU clica em "Enviar por e-mail" → Resend envia automaticamente
```

### Diferença entre os três papéis — resumo

| Aspecto | Owner (Freelancer) | Collaborator (Freelancer) | Cliente |
|---------|-------------------|--------------------------|---------|
| Autenticação | Supabase Auth (JWT) | Supabase Auth (JWT) | Token de projeto |
| Conta no sistema | Sim | Sim | Não |
| Vê financeiro do projeto | Sim (completo) | Sim (apenas seu split) | Não |
| Vê colaboradores | Sim | Não | Não |
| Vê tarefas | Sim (todas) | Sim (as suas) | Não |
| Vê arquivos | Sim | Sim | Sim |
| Aprova entregáveis | Não (ele envia) | Não | Sim |
| Edita estrutura do projeto | Sim | Não | Não |
| Convida colaboradores | Sim | Não | Não |
| Acessa via URL | /dashboard/... | /dashboard/... | /client/[token] |

---

## Variáveis de Ambiente

```bash
# Obrigatórias
NEXT_PUBLIC_SUPABASE_URL=          # URL do projeto Supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=     # Chave anon (pode ir para o frontend)
SUPABASE_SERVICE_ROLE_KEY=         # Chave admin (NUNCA para o frontend)

# Opcionais (e-mail)
RESEND_API_KEY=                    # Chave da API Resend
RESEND_FROM_EMAIL=                 # Remetente dos e-mails

# PDF
PRINT_TOKEN_SECRET=                # Segredo para assinar tokens de impressão

# Ambiente
NEXT_PUBLIC_APP_URL=               # URL base (https://app.oflowdesk.com em produção)
```

---

## Resumo para apresentação

O **FlowDesk** demonstra na prática:

1. **Arquitetura full-stack moderna** — Next.js unificando frontend e backend
2. **Segurança em camadas** — JWT + RLS + validação server-side + HMAC
3. **Integrações reais** — Supabase, Resend, Puppeteer, pdf-lib
4. **Realtime** — WebSockets via Supabase para atualizações ao vivo
5. **Sistema financeiro granular** — splits automáticos por pagamento
6. **UX avançada** — temas dinâmicos, editor rich text, gráficos interativos
7. **Produto em produção** — rodando em `app.oflowdesk.com` no Vercel

---

*Gerado em 2026-04-15 para apresentação de TCC.*
