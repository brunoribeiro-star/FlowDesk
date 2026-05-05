# FlowDesk — Documentação Completa do Sistema

> Documentação técnica completa do sistema FlowDesk.
> Descreve todas as funcionalidades implementadas, arquitetura, banco de dados e decisões técnicas do sistema.

---

## Sumário

1. [Visão Geral do Produto](#1-visão-geral-do-produto)
2. [Problema Resolvido](#2-problema-resolvido)
3. [Arquitetura Técnica](#3-arquitetura-técnica)
4. [Tecnologias e Bibliotecas](#4-tecnologias-e-bibliotecas)
5. [Modelo de Usuários e Papéis](#5-modelo-de-usuários-e-papéis)
6. [Funcionalidades Implementadas](#6-funcionalidades-implementadas)
7. [Portal do Cliente](#7-portal-do-cliente)
8. [Sistema de Planos e Limites](#8-sistema-de-planos-e-limites)
9. [Gerenciamento de Armazenamento](#9-gerenciamento-de-armazenamento)
10. [Banco de Dados](#10-banco-de-dados)
11. [Segurança e RLS](#11-segurança-e-rls)
12. [Rotas de API](#12-rotas-de-api)
13. [Realtime](#13-realtime)
14. [Sistema de Temas](#14-sistema-de-temas)
15. [Hospedagem e Infraestrutura](#15-hospedagem-e-infraestrutura)

---

## 1. Visão Geral do Produto

**FlowDesk** é um SaaS (Software as a Service) de gestão de projetos desenvolvido para freelancers e pequenos estúdios criativos. O sistema centraliza em uma única plataforma todas as etapas do fluxo de trabalho de um profissional autônomo: da prospecção ao recebimento.

O produto foi concebido como uma alternativa integrada às ferramentas fragmentadas que freelancers costumam usar (planilhas, aplicativos de gestão genéricos, ferramentas de cobrança separadas). O FlowDesk une em um só lugar:

- Gestão de clientes
- Gestão de projetos e tarefas
- Briefings e coleta de informações do cliente
- Propostas comerciais com geração de PDF
- Controle financeiro e cobranças
- Rastreamento de tempo
- Colaboração com outros freelancers
- Portal exclusivo para o cliente acompanhar o projeto
- Relatórios de desempenho e receita

**Domínio de produção:** [app.oflowdesk.com](https://app.oflowdesk.com)

---

## 2. Problema Resolvido

Freelancers e pequenos estúdios criativos enfrentam desafios recorrentes na gestão do próprio trabalho:

- **Fragmentação de ferramentas:** uso simultâneo de planilhas, Trello, Google Drive, WhatsApp e aplicativos de cobrança separados
- **Falta de rastreabilidade financeira:** dificuldade em saber o que foi pago, o que está pendente e quanto cada projeto gerou
- **Ausência de processo padronizado:** cada projeto começa do zero, sem templates de briefing, proposta ou fluxo definido
- **Dificuldade na colaboração:** sem ferramentas para dividir projetos com outros freelancers e controlar splits financeiros
- **Falta de visibilidade para o cliente:** o cliente não tem acesso organizado ao andamento do projeto sem que o freelancer precise reportar manualmente

O FlowDesk resolve todos esses pontos em uma única plataforma web.

---

## 3. Arquitetura Técnica

```
┌─────────────────────────────────────────────┐
│              Usuário (Browser)              │
└──────────────────────┬──────────────────────┘
                       │
┌──────────────────────▼──────────────────────┐
│          Next.js 15 — Pages Router          │
│     Frontend React + API Routes Node.js     │
│              Hospedado na Vercel            │
└────────┬─────────────────────┬──────────────┘
         │                     │
┌────────▼────────┐   ┌────────▼────────┐
│   Supabase      │   │     Resend      │
│  - PostgreSQL   │   │  (envio e-mail) │
│  - Auth (JWT)   │   └─────────────────┘
│  - RLS          │
│  - Storage      │
│  - Realtime     │
└─────────────────┘
```

### Decisões de arquitetura

**Next.js Pages Router** foi adotado em vez do App Router por oferecer maior maturidade e estabilidade, além de suporte nativo às API Routes que compõem o backend complementar da aplicação.

**Supabase** foi escolhido como backend principal por combinar banco de dados PostgreSQL, autenticação JWT, controle de acesso por Row Level Security (RLS), armazenamento de arquivos e comunicação em tempo real (Realtime) em uma única plataforma gerenciada.

**Vercel** é a plataforma de hospedagem, com integração nativa ao GitHub para deploys automáticos e suporte a Cron Jobs configurados via `vercel.json`.

---

## 4. Tecnologias e Bibliotecas

### Core

| Tecnologia | Versão | Finalidade |
|---|---|---|
| Next.js | 15 | Framework principal, Pages Router |
| React | 18 | Biblioteca de UI |
| TypeScript | 5 | Tipagem estática |

### Estilo e Design

| Biblioteca | Finalidade |
|---|---|
| Tailwind CSS 3 | Utilitários de estilo |
| CSS Variables | Tokens de cor em `src/styles/variables.css` |
| Lucide React | Biblioteca de ícones |

O sistema de temas é composto por **10 temas visuais** (default, claro, dark, lucy, black, material, dracula, solarized, tokyo, ayu, one), carregados dinamicamente via `localStorage` sem recarregar a página.

### Banco e Backend

| Biblioteca | Finalidade |
|---|---|
| @supabase/supabase-js | Cliente Supabase (Auth, DB, Storage, Realtime) |
| Resend | Envio de e-mails transacionais |
| Stripe | Plataforma de pagamentos e gestão de planos |

### Editor e Documentos

| Biblioteca | Finalidade |
|---|---|
| TipTap | Editor rich text para propostas |
| @react-pdf/renderer | Geração de PDF com componentes React |
| jsPDF | Geração de PDF |
| html2pdf.js + html2canvas | Conversão de HTML para PDF/imagem |
| pdf-lib | Manipulação de PDFs |
| Puppeteer | Headless browser para geração de PDF server-side |

### Gráficos e Utilitários

| Biblioteca | Finalidade |
|---|---|
| Recharts | Gráficos nos relatórios |
| clsx | Classes CSS condicionais |
| react-phone-input-2 | Campo de telefone com máscara internacional |
| canvas-confetti | Efeito de celebração na conclusão de projetos |

---

## 5. Modelo de Usuários e Papéis

### Tipo único de conta

Existe apenas **um tipo de conta** no sistema. Todos os usuários são freelancers. Não existe uma conta separada do tipo "colaborador" — a colaboração é um papel assumido dentro de projetos específicos.

Um mesmo usuário pode:
- Ser **owner** dos próprios projetos
- Ser **collaborator** em projetos de outros freelancers

### Papéis dentro de um projeto

Os papéis são definidos **por projeto**, não por conta, na tabela `project_members`.

#### Owner
- Criador do projeto
- Controle administrativo completo
- Define orçamento, cliente, tarefas, pagamentos
- Convida colaboradores e define splits financeiros
- Pode finalizar o projeto
- Cada projeto tem apenas um owner

#### Collaborator
- Papel assumido em projetos de terceiros
- Pode: visualizar e criar tarefas, enviar arquivos e links, acompanhar o próprio split financeiro, solicitar pagamento ao owner
- Não pode: alterar orçamento, cliente, estrutura administrativa ou configurações do owner

---

## 6. Funcionalidades Implementadas

### 6.1 Autenticação

Fluxo completo de autenticação via Supabase Auth com JWT:

- **Cadastro** com validação de e-mail (verificação de duplicidade via API)
- **Login** com e-mail e senha
- **Esqueci minha senha** — envio de e-mail de redefinição via Supabase
- **Redefinição de senha** — página dedicada com token de recuperação
- **Onboarding** — fluxo inicial após primeiro login (nome, avatar, configurações iniciais)
- **Proteção de rotas** — todas as páginas do dashboard verificam sessão ativa

### 6.2 Dashboard Principal

Tela inicial após o login com visão geral do negócio:

- **Card de receita do mês** — soma de pagamentos recebidos no mês corrente
- **Card de pagamentos a receber** — soma de pagamentos pendentes em todos os projetos (incluindo projetos finalizados)
- **Card de projetos ativos** — contagem de projetos em andamento
- **Card de armazenamento** — barra de progresso com uso atual vs limite do plano (com cache de 5 minutos para carregamento instantâneo)
- **Lista de projetos recentes** — projetos com atualização mais recente
- **Feed de atividades** — histórico de ações recentes no sistema

### 6.3 Clientes

CRUD completo para gestão da carteira de clientes:

- Cadastro com nome, e-mail, telefone, empresa e foto
- Edição e exclusão
- Upload e compressão automática de foto do cliente (WebP, máx. 48 KB)
- Listagem com busca e filtros
- Vinculação automática a projetos

### 6.4 Projetos

Módulo central do sistema com CRUD completo:

- Criação com título, descrição, cliente, valor, prazo de entrega, data de início e forma de pagamento
- Upload de capa do projeto (redimensionada para 640×360 px, convertida para WebP, máx. 120 KB)
- Kanban visual com colunas de status (Em andamento, Concluído, Finalizado)
- Filtros por status, cliente e período
- Página de detalhes do projeto com todas as sub-funcionalidades integradas
- **Bloqueio de conclusão:** o sistema verifica se há tarefas incompletas, briefings sem resposta, entregáveis pendentes de aprovação e pagamentos pendentes antes de permitir a finalização

**Status de projeto:**
- `em_andamento` — projeto ativo
- `concluído` — trabalho concluído, pagamentos podem estar pendentes
- `finalizado` — ciclo completo encerrado

### 6.5 Tarefas

Sistema completo de gestão de tarefas por projeto:

- Criação com título, descrição, status, responsável e prazo (`due_date`)
- **Status:** `para_fazer`, `em_andamento`, `concluida`
- Subtarefas vinculadas a cada tarefa
- Marcação individual de subtarefas como concluídas
- Visão global de todas as tarefas em `/dashboard/tarefas` com filtros
- Edição e exclusão de tarefas
- Página dedicada de detalhes da tarefa

### 6.6 Arquivos de Projeto

- Upload de múltiplos arquivos por projeto
- Armazenamento no Supabase Storage (bucket `projetos`)
- Verificação de limite de armazenamento antes do upload
- Listagem com nome, data e link de download
- Exclusão com remoção física do bucket

### 6.7 Links de Projeto

- Cadastro de links externos relevantes ao projeto (Figma, Google Drive, etc.)
- Título e URL
- Listagem e exclusão

### 6.8 Briefings

Sistema completo de coleta de informações do cliente antes do início do projeto:

- **Templates:** criação de modelos reutilizáveis de briefing com múltiplos campos
- **Tipos de campo:** texto curto, texto longo, múltipla escolha, seleção única, caixa de seleção, data, número, cor (ColorPicker customizado), telefone, e-mail, URL
- **Envio ao cliente:** o freelancer envia o briefing para o cliente com prazo de resposta
- **Resposta do cliente:** o cliente acessa um link público para responder sem precisar de conta
- **Visualização de respostas:** interface redesenhada para leitura clara das respostas por campo
- **Status de envio:** pendente, respondido, expirado

### 6.9 Propostas Comerciais

Editor completo de propostas com geração de PDF:

- **3 templates pré-configurados** como ponto de partida
- **Editor rich text** (TipTap) com formatação completa: negrito, itálico, sublinhado, títulos, listas, alinhamento, links, destaques
- **Blocos por seção:** título, parágrafo, grupo de informações, entregáveis, preço, banner, logo, divisor
- **Paginação:** proposta dividida em páginas editáveis
- **Geração de PDF** via Puppeteer (server-side) com layout fiel ao editor
- **Página de impressão** em rota separada (`/propostas/print/[id]`)

### 6.10 Pagamentos

Controle financeiro completo do projeto:

- Registro de pagamentos com valor, status, data prevista, data de pagamento, forma de pagamento e parcelas
- **Formas de pagamento:** PIX, PIX em 2x, Cartão
- **Status:** pendente / pago
- Múltiplos pagamentos por projeto (ex: entrada + parcelas)
- Cobrança ao cliente via e-mail com chave PIX incluída
- Registro de `notificado_em` para controle do último envio de cobrança
- Visão consolidada em `/dashboard/pagamentos` com filtros por status e período
- Card de "Pagamentos a receber" na dashboard inclui projetos de qualquer status com pagamento pendente

### 6.11 Time Tracker

Sistema de rastreamento de tempo trabalhado:

- **Cronômetro global** em `/dashboard/cronometro` — vinculado a qualquer projeto
- **Cronômetro por projeto** — direto na página do projeto
- **Cronômetro por tarefa** — direto na página da tarefa
- Sessões com `started_at`, `ended_at` e `duration_seconds`
- Histórico de sessões por projeto
- Visualização do tempo total por projeto nos relatórios

### 6.12 Co-working (Colaboração entre Freelancers)

Sistema completo de colaboração em projetos:

**Fluxo de convite:**
1. Owner cria convite para um colaborador via e-mail
2. Sistema gera token criptográfico com expiração de 7 dias
3. E-mail enviado via Resend com link de aceitação
4. Colaborador acessa `/invite/[token]`, faz login (ou cria conta) e aceita
5. API server-side cria `project_members`, `project_member_splits` e sincroniza `collaborator_payment_splits`

**Split financeiro:**
- **Percentual:** colaborador recebe X% de cada pagamento do projeto
- **Fixo:** colaborador recebe valor fixo independente dos pagamentos
- Split calculado automaticamente para cada novo pagamento registrado
- Owner marca pagamento do colaborador como realizado

**Fluxo do colaborador:**
- Dashboard com visão dos projetos em que participa
- Visualização do próprio split e status de pagamento
- Solicitação de pagamento ao owner (com notificação por e-mail ao owner via Resend)

### 6.13 Relatórios

Módulo completo de análise de desempenho com 5 relatórios:

- **Overview:** receita total, projetos concluídos, horas trabalhadas, ticket médio — inclui ganhos como colaborador em projetos de terceiros
- **Performance:** comparação de metas vs realizado por período
- **Produtividade:** tarefas concluídas, tempo médio por tarefa, projetos por período
- **Comparação de Projetos:** análise lado a lado de múltiplos projetos
- **Receita:** breakdown de receita por projeto, cliente e período — inclui ganhos como colaborador

Todos os relatórios possuem filtros por período e são renderizados com gráficos Recharts.

### 6.14 Configurações

Página de configurações em `/dashboard/configuracoes` com abas:

- **Perfil:** nome, avatar (comprimido para WebP 256×256 px, máx. 48 KB)
- **Aparência:** seleção do tema visual (10 opções)
- **Segurança:** alteração de senha
- **Plano:** visualização do plano atual e limites
- **Armazenamento:** gerenciamento de arquivos (detalhado na seção 9)

---

## 7. Portal do Cliente

O portal do cliente é um ambiente separado e exclusivo, acessível via link com token de acesso único gerado pelo freelancer. O cliente não precisa criar uma conta na plataforma.

### Fluxo de acesso

1. Freelancer convida o cliente a partir da página do projeto
2. Sistema gera um token criptográfico único e envia e-mail ao cliente via Resend com o link de acesso
3. Cliente acessa `/portal/[token]`, realiza login simples (e-mail + token) em `/portal/login`
4. A partir do login, o cliente navega livremente pelo portal

**APIs de acesso ao portal:**
- `POST /api/client-invites/create` — cria o convite e envia e-mail ao cliente
- `POST /api/client-invites/validate` — valida o token do link de acesso
- `POST /api/client-invites/accept` — autentica o cliente no portal

### Funcionalidades do portal

#### Dashboard do cliente (`/portal/dashboard`)
- Visão geral dos projetos vinculados ao cliente
- Status de cada projeto
- Notificações de cobranças pendentes

#### Projetos (`/portal/projetos` e `/portal/projeto/[id]`)
- Lista de todos os projetos do cliente com status atualizado
- Página de detalhes de cada projeto com arquivos e links

#### Aprovação de entregáveis (`/portal/aprovacoes`)
- Freelancer submete arquivos marcados para aprovação
- Cliente visualiza cada entregável com preview
- Cliente aprova ou reprova com comentário/feedback
- Status de aprovação refletido em tempo real no dashboard do freelancer

#### Briefings (`/portal/briefings`)
- Cliente responde briefings diretamente pelo portal
- Histórico de briefings respondidos e pendentes

#### Pagamentos (`/portal/pagamentos`)
- Cliente visualiza cobranças pendentes com chave PIX incluída
- Cliente pode marcar pagamento como realizado

---

## 8. Sistema de Planos e Limites

O FlowDesk opera com modelo de assinatura SaaS com três planos:

### Planos disponíveis

| Recurso | Trial (7 dias) | Essencial | Profissional |
|---|---|---|---|
| Projetos | Ilimitado | 10 | Ilimitado |
| Clientes | Ilimitado | 10 | Ilimitado |
| Colaboradores por projeto | 5 | 1 | 5 |
| Armazenamento | 20 GB | 5 GB | 20 GB |
| Portal do cliente | Completo | Básico | Completo |

### Funcionamento dos limites

O sistema verifica os limites em tempo real antes de cada ação:

- **Novos projetos:** bloqueia criação ao atingir o limite
- **Novos clientes:** bloqueia criação ao atingir o limite
- **Convite de colaboradores:** bloqueia ao atingir o limite por projeto
- **Upload de arquivos:** verifica o espaço disponível antes de cada upload via API (`/api/subscription/storage-usage`)

### Modal de upgrade

Quando o usuário atinge um limite, um modal centralizado é exibido com:
- Ícone e título específicos para o tipo de limite atingido
- Descrição do benefício do upgrade para aquele recurso
- CTA (Call to Action) para fazer upgrade do plano

O modal é disparado por um evento customizado (`flowdesk:limit-reached`) propagado por qualquer parte da aplicação, e o componente `UpgradeModal` montado globalmente em `_app.tsx` o captura e exibe.

### Integração com Stripe

A plataforma de pagamentos Stripe gerencia:
- Assinaturas dos planos Essencial e Profissional com cobrança recorrente
- Add-ons de armazenamento extra (incrementos de 10 GB)
- Período de trial de 7 dias automático para novas contas
- Portal de gerenciamento de assinatura (cancelamento, troca de plano, histórico de cobranças) via Stripe Customer Portal

---

## 9. Gerenciamento de Armazenamento

### Card na dashboard

A dashboard exibe um card de armazenamento com:
- Barra de progresso colorida (verde → amarelo → vermelho conforme o uso)
- Espaço usado em MB ou GB
- Limite total do plano
- Carregamento instantâneo via cache em `localStorage` (TTL de 5 minutos), atualizado em background

### Aba de armazenamento nas configurações

A página de configurações inclui uma aba dedicada ao gerenciamento de armazenamento:

**Barra de uso com legenda:**
- Indicador visual de uso total
- Legenda explicativa: projetos ativos (não gerenciáveis aqui) vs projetos finalizados/arquivados (podem ser excluídos)

**Lista de arquivos gerenciáveis:**
- Exibe apenas arquivos de projetos com status `finalizado`, `concluído` ou `arquivado`
- Agrupados por projeto com badge de status (Finalizado / Concluído / Arquivado)
- Countdown de dias restantes para exclusão automática
- Exclusão manual arquivo a arquivo com confirmação
- Alerta visual (amarelo/vermelho) quando o prazo de exclusão automática está próximo

### Exclusão automática (Cron Job)

Um Cron Job configurado via Vercel executa diariamente às 3h:
- Rota: `GET /api/storage/cleanup`
- Protegida por `CRON_SECRET` injetado automaticamente pela Vercel
- Localiza projetos com status não ativo e `completed_at` há mais de 30 dias
- Remove os arquivos do bucket no Supabase Storage
- Remove os registros da tabela `arquivos_projeto`
- Remove as capas dos projetos do bucket `project-covers`

### Compressão e conversão de imagens

Todo upload de imagem no sistema passa por um pipeline de otimização:

1. **Validação:** formato (JPEG, PNG ou WebP) e tamanho máximo por contexto
2. **Converter modal:** se a imagem não atende aos critérios, abre um editor com:
   - Preview com crop interativo (proporcão travada no aspect ratio alvo)
   - Handles de redimensionamento nos quatro cantos
   - Conversão para WebP via Canvas API
   - Compressão por busca binária (14 iterações) para atingir o tamanho máximo sem perder qualidade desnecessária
3. **Especificações por contexto:**

| Contexto | Dimensões | Máximo |
|---|---|---|
| Avatar / Foto de perfil | 256 × 256 px | 48 KB |
| Logo | 300 × 150 px | 80 KB |
| Capa do projeto | 640 × 360 px (16:9) | 120 KB |
| Thumbnail | 600 × 400 px | 120 KB |
| Banner / Preview | 1200 × 600 px | 400 KB |

---

## 10. Banco de Dados

O banco de dados é PostgreSQL gerenciado pelo Supabase. Todas as tabelas possuem RLS (Row Level Security) ativo.

### Tabelas

#### `users`
Perfil da aplicação (separado de `auth.users`).

| Campo | Tipo |
|---|---|
| id | uuid (FK auth.users) |
| nome | text |
| avatar_url | text |
| role | text |
| created_at | timestamptz |

---

#### `projetos`
Tabela central do sistema.

| Campo | Tipo | Observação |
|---|---|---|
| id | uuid | |
| titulo | text | |
| descricao | text | |
| valor | numeric | Nome real no banco (não "orcamento") |
| status | text | `em_andamento` \| `concluído` \| `finalizado` |
| forma_pagamento | text | |
| user_id | uuid | FK auth.users (owner) |
| cliente_id | uuid | FK clientes |
| prazo_entrega | date | |
| data_inicio | date | |
| cover_url | text | URL da capa no bucket project-covers |
| completed_at | timestamptz | Preenchido ao finalizar |
| created_at | timestamptz | |
| updated_at | timestamptz | |

---

#### `clientes`

| Campo | Tipo |
|---|---|
| id | uuid |
| nome | text |
| email | text |
| telefone | text |
| empresa | text |
| foto_url | text |
| user_id | uuid |
| created_at | timestamptz |
| updated_at | timestamptz |

---

#### `tasks`

| Campo | Tipo | Observação |
|---|---|---|
| id | uuid | |
| titulo | text | |
| descricao | text | |
| status | text | `para_fazer` \| `em_andamento` \| `concluida` |
| projeto_id | uuid | |
| user_id | uuid | |
| due_date | date | Prazo da tarefa |
| concluida | boolean | |
| completed_at | timestamptz | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

---

#### `subtasks`

| Campo | Tipo |
|---|---|
| id | uuid |
| task_id | uuid |
| titulo | text |
| descricao | text |
| concluida | boolean |
| user_id | uuid |
| created_at | timestamptz |
| updated_at | timestamptz |

---

#### `arquivos_projeto`

| Campo | Tipo |
|---|---|
| id | uuid |
| projeto_id | uuid |
| user_id | uuid |
| nome | text |
| url | text |
| status | text |
| created_at | timestamptz |

---

#### `links_projeto`

| Campo | Tipo |
|---|---|
| id | uuid |
| projeto_id | uuid |
| user_id | uuid |
| titulo | text |
| url | text |
| created_at | timestamptz |

---

#### `pagamentos`

| Campo | Tipo | Observação |
|---|---|---|
| id | uuid | |
| projeto_id | uuid | |
| user_id | uuid | |
| valor | numeric | |
| status | text | `pendente` \| `pago` |
| data_pagamento | date | Data em que foi pago |
| data_prevista | date | Data prevista de pagamento |
| forma_pagamento | text | `pix` \| `pix_2x` \| `cartao` |
| parcela | integer | |
| total_parcelas | integer | |
| tipo | text | |
| pix_chave | text | Chave PIX para cobrança ao cliente |
| notificado_em | timestamptz | Último envio de cobrança |
| created_at | timestamptz | |

---

#### `atividades`

| Campo | Tipo |
|---|---|
| id | uuid |
| projeto_id | uuid |
| user_id | uuid |
| tipo | text |
| descricao | text |
| created_at | timestamptz |

---

#### `briefings_templates`

| Campo | Tipo |
|---|---|
| id | uuid |
| titulo | text |
| descricao | text |
| user_id | uuid |
| created_at | timestamptz |
| updated_at | timestamptz |

---

#### `briefings_campos`

| Campo | Tipo | Observação |
|---|---|---|
| id | uuid | |
| template_id | uuid | |
| titulo_pergunta | text | |
| descricao_pergunta | text | |
| tipo | text | text, textarea, select, radio, checkbox, date, number, color, phone, email, url |
| obrigatorio | boolean | |
| opcoes | jsonb | Para campos de seleção |
| placeholder | text | |
| ordem | integer | |
| user_id | uuid | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

---

#### `briefings_envios`

| Campo | Tipo | Observação |
|---|---|---|
| id | uuid | |
| template_id | uuid | |
| projeto_id | uuid | |
| cliente_id | uuid | |
| user_id | uuid | |
| status | text | pendente \| respondido \| expirado |
| enviado_em | timestamptz | |
| respondido_em | timestamptz | |
| prazo_resposta | date | |
| created_at | timestamptz | |

---

#### `briefings_respostas`

| Campo | Tipo |
|---|---|
| id | uuid |
| envio_id | uuid |
| projeto_id | uuid |
| pergunta | text |
| resposta | text |
| user_id | uuid |
| created_at | timestamptz |

---

#### `proposals`

| Campo | Tipo |
|---|---|
| id | uuid |
| client_id | uuid |
| title | text |
| description | text |
| value | numeric |
| status | text |
| user_id | uuid |
| created_at | timestamptz |

---

#### `proposal_sections`

Blocos de conteúdo que compõem cada proposta.

| Campo | Tipo | Observação |
|---|---|---|
| id | uuid | |
| proposal_id | uuid | |
| type | text | `title` \| `paragraph` \| `info_group` \| `deliverables` \| `price` \| `banner` \| `logo` \| `divider` |
| content | jsonb | Conteúdo do bloco |
| page | integer | Página da proposta |
| order | integer | Ordem na página |
| editable | boolean | |
| created_at | timestamptz | |

---

#### `time_entries`

| Campo | Tipo |
|---|---|
| id | uuid |
| user_id | uuid |
| project_id | uuid |
| task_id | uuid (nullable) |
| started_at | timestamptz |
| ended_at | timestamptz |
| duration_seconds | integer |
| created_at | timestamptz |

---

#### `project_members`

Relaciona freelancers a projetos com seus papéis.

| Campo | Tipo | Observação |
|---|---|---|
| id | uuid | |
| project_id | uuid | |
| user_id | uuid | |
| role | text | `owner` \| `collaborator` |
| nome | text | Snapshot do nome |
| email | text | Snapshot do e-mail |
| avatar_url | text | |
| created_at | timestamptz | |

---

#### `project_invites`

Sistema de convites de co-working.

| Campo | Tipo | Observação |
|---|---|---|
| id | uuid | |
| project_id | uuid | |
| invited_email | text | |
| invited_by | uuid | |
| token | text | Token criptográfico (crypto.randomUUID) |
| status | text | `pending` \| `accepted` |
| split_type | text | `percentage` \| `fixed` |
| split_value | numeric | |
| already_paid | boolean | |
| expires_at | timestamptz | 7 dias após criação |
| accepted_at | timestamptz | |
| created_at | timestamptz | |

---

#### `project_member_splits`

Participação financeira total do colaborador no projeto.

| Campo | Tipo | Observação |
|---|---|---|
| id | uuid | |
| project_id | uuid | |
| member_user_id | uuid | |
| split_type | text | `percentage` \| `fixed` |
| split_value | numeric | |
| payment_status | text | `pending` \| `paid` |
| paid_at | timestamptz | |
| payment_requested_at | timestamptz | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

---

#### `collaborator_payment_splits`

Valor que o colaborador recebe por cada pagamento individual do projeto.

| Campo | Tipo | Observação |
|---|---|---|
| id | uuid | |
| project_id | uuid | |
| member_user_id | uuid | |
| pagamento_id | uuid | FK pagamentos |
| amount | numeric | Valor calculado |
| status | text | `pendente` \| `pago` |
| paid_at | timestamptz | |
| created_at | timestamptz | |

---

#### `subscriptions`

Plano e situação de assinatura do usuário.

| Campo | Tipo | Observação |
|---|---|---|
| id | uuid | |
| user_id | uuid | |
| plan | text | `essencial` \| `profissional` |
| trial_used | boolean | |
| extra_storage_addons | integer | Quantidade de add-ons de 10 GB |
| stripe_customer_id | text | |
| stripe_subscription_id | text | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

---

## 11. Segurança e RLS

### Row Level Security (RLS)

Todas as tabelas do banco possuem RLS ativo. As políticas garantem que cada usuário acessa apenas seus próprios dados ou dados de projetos em que é membro.

#### Funções auxiliares de RLS

Para evitar recursão infinita nas policies, foram criadas funções auxiliares no PostgreSQL:

```sql
is_project_owner(project_id uuid) → boolean
is_project_member(project_id uuid) → boolean
can_accept_project_invite(token text) → boolean
```

Essas funções encapsulam as verificações de permissão e são chamadas pelas policies das tabelas relacionadas.

### Separação frontend / backend

- O `SUPABASE_SERVICE_ROLE_KEY` (chave administrativa) é usado **exclusivamente** nas rotas de API (`src/pages/api/`) — nunca exposto ao frontend
- O frontend usa apenas a `SUPABASE_ANON_KEY` com RLS respeitado
- Operações que requerem permissões elevadas (aceite de convite, limpeza de storage, sincronização de splits) são executadas server-side

### Proteção de rotas de API

- Rotas que exigem autenticação validam o JWT do usuário via `supabase.auth.getUser(token)` antes de qualquer operação
- O Cron Job de limpeza de armazenamento é protegido pelo header `Authorization: Bearer <CRON_SECRET>`

---

## 12. Rotas de API

Todas as rotas de API estão em `src/pages/api/` e são executadas server-side no ambiente Node.js da Vercel.

### Autenticação
| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/auth/check-email` | Valida e-mail no cadastro |

### Convites de Co-working
| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/invites/create` | Cria convite e envia e-mail via Resend |
| POST | `/api/invites/accept` | Aceita convite, cria membros e sincroniza splits |
| POST | `/api/invites/validate` | Valida token do convite |

### Colaboradores
| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/collaborators/set-split` | Define split financeiro do colaborador |
| POST | `/api/collaborators/mark-paid` | Marca colaborador como pago |
| POST | `/api/collaborators/mark-split-paid` | Marca split individual como pago |
| POST | `/api/collaborators/remove` | Remove colaborador do projeto |
| POST | `/api/collaborators/request-payment` | Colaborador solicita pagamento ao owner |

### Pagamentos
| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/payments/sync-splits` | Sincroniza splits de todos os colaboradores |
| POST | `/api/payments/notify-client` | Owner envia cobrança ao cliente por e-mail |
| POST | `/api/payments/client-mark-paid` | Cliente marca pagamento como pago |

### Relatórios
| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/reports/overview` | Métricas gerais com ganhos como colaborador |
| GET | `/api/reports/performance` | Dados de performance por período |
| GET | `/api/reports/productivity` | Dados de produtividade |
| GET | `/api/reports/projects-comparison` | Comparação entre projetos |
| GET | `/api/reports/revenue` | Receita com ganhos como colaborador |

### Briefings
| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/briefings/get-public` | Retorna briefing público para resposta via link |
| POST | `/api/briefings/send-email` | Envia briefing ao cliente por e-mail |
| POST | `/api/briefings/submit-public` | Cliente submete respostas via link público |
| POST | `/api/briefings/submit-portal` | Cliente submete respostas via portal |

### Propostas
| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/proposal-pdf/[id]` | Gera PDF da proposta via Puppeteer |

### Armazenamento
| Método | Rota | Descrição |
|---|---|---|
| DELETE | `/api/storage/delete-file` | Exclui arquivo do bucket e do banco |
| GET | `/api/storage/cleanup` | Cron diário: exclui arquivos de projetos finalizados há mais de 30 dias |
| GET | `/api/subscription/storage-usage` | Retorna uso atual de armazenamento do usuário |
| GET | `/api/subscription/status` | Retorna plano ativo, limites e status de trial do usuário |

### Portal do Cliente
| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/client-invites/create` | Cria convite de portal e envia e-mail ao cliente |
| POST | `/api/client-invites/validate` | Valida token do link de acesso ao portal |
| POST | `/api/client-invites/accept` | Autentica cliente no portal |
| GET | `/api/portal/owner-plan` | Retorna plano do freelancer (para controlar funcionalidades do portal) |

### Stripe / Assinaturas
| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/stripe/checkout` | Cria sessão de checkout para assinatura de plano |
| POST | `/api/stripe/add-storage` | Cria checkout para add-on de armazenamento extra |
| POST | `/api/stripe/portal` | Abre o Stripe Customer Portal (gerenciamento de assinatura) |
| POST | `/api/stripe/webhook` | Recebe e processa eventos do Stripe (ativa plano, renova, cancela) |

---

## 13. Realtime

O Supabase Realtime está ativo nas tabelas críticas com `REPLICA IDENTITY FULL`, permitindo que o frontend receba atualizações em tempo real sem necessidade de polling.

### Tabelas com Realtime ativo

| Tabela | Uso |
|---|---|
| `projetos` | Atualização de status em tempo real |
| `tasks` | Sincronização de tarefas entre membros |
| `subtasks` | Sincronização de subtarefas |
| `pagamentos` | Atualização de status de pagamentos |
| `arquivos_projeto` | Aparecimento de novos arquivos |
| `links_projeto` | Aparecimento de novos links |
| `project_members` | Atualização de membros do projeto |
| `project_member_splits` | Atualização de splits financeiros |
| `collaborator_payment_splits` | Atualização de splits por pagamento |
| `project_invites` | Status dos convites |

---

## 14. Sistema de Temas

O FlowDesk suporta **10 temas visuais** completos, alternáveis sem recarregamento de página.

### Temas disponíveis

| ID | Nome |
|---|---|
| `default` | FlowDesk (padrão) |
| `claro` | Claro |
| `dark` | Dark |
| `lucy` | Lucy |
| `black` | Black |
| `material` | Material |
| `dracula` | Dracula |
| `solarized` | Solarized |
| `tokyo` | Tokyo Night |
| `ayu` | Ayu |
| `one` | One Dark |

### Implementação

- Cada tema é um arquivo CSS em `/public/styles/themes/[nome].css` com variáveis CSS customizadas
- As variáveis de cor (`--color-primary`, etc.) são definidas em `src/styles/variables.css`
- O tema ativo é salvo em `localStorage` e carregado dinamicamente via `<link>` no `<head>`
- Toda a UI consome exclusivamente as variáveis de tema — não há cores hardcoded nos componentes

---

## 15. Hospedagem e Infraestrutura

### Vercel

O FlowDesk é hospedado na Vercel com:
- **Deploy contínuo** a partir do repositório GitHub (`main` branch)
- **Variáveis de ambiente** configuradas no painel da Vercel (nunca versionadas)
- **Cron Job** configurado via `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/storage/cleanup",
      "schedule": "0 3 * * *"
    }
  ]
}
```

O cron executa diariamente às 3h (UTC) para limpeza automática de arquivos.

### Variáveis de ambiente necessárias

| Variável | Uso |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase (frontend + backend) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave pública do Supabase (frontend) |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave administrativa do Supabase (apenas backend) |
| `RESEND_API_KEY` | Chave da API Resend para envio de e-mails |
| `RESEND_FROM_EMAIL` | E-mail remetente para envios via Resend |
| `STRIPE_SECRET_KEY` | Chave secreta do Stripe (apenas backend) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Chave pública do Stripe (frontend) |
| `CRON_SECRET` | Segredo para autenticação dos cron jobs |

### GitHub

Repositório privado com histórico de commits e branches de desenvolvimento.

### Supabase

- **Plano:** Pro (necessário para RLS avançado e Realtime em produção)
- **Região:** South America (São Paulo) — menor latência para usuários brasileiros
- **Storage buckets:**
  - `projetos` — arquivos enviados nos projetos
  - `project-covers` — capas dos projetos
  - `clientes` — fotos dos clientes
  - `avatars` — fotos de perfil dos freelancers

---

*Documento gerado em maio de 2026 — FlowDesk v1.0*
