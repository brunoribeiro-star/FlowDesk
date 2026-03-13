# FlowDesk — Contexto Permanente do Projeto

Este arquivo define o contexto completo do projeto FlowDesk.

Antes de realizar qualquer alteração neste repositório, leia este documento inteiro.

Este projeto já possui arquitetura definida, banco estruturado e partes já implementadas.  
O objetivo é **evoluir o sistema existente**, nunca reconstruí-lo do zero.

Mudanças devem ser **incrementais, seguras e compatíveis com o código atual**.

---

# 1. VISÃO GERAL DO PRODUTO

FlowDesk é um SaaS de gestão de projetos focado em freelancers e pequenos estúdios.

O sistema centraliza:

- clientes
- projetos
- tarefas
- subtarefas
- arquivos
- links
- briefings
- propostas
- pagamentos
- time tracking
- colaboração entre freelancers
- relatórios de desempenho

O produto mistura conceitos de:

- Trello
- ClickUp
- Notion
- Harvest
- CRM simples

Mas focado no fluxo real de trabalho de freelancers.

---

# 2. MODELO DE USUÁRIOS

## Regra estrutural importante

Existe apenas **um tipo real de conta no sistema**.

Todos os usuários são freelancers.

Não existe tipo de usuário "colaborador".

Um mesmo usuário pode:

- criar projetos próprios
- colaborar em projetos de outros freelancers

---

# 3. PAPÉIS DENTRO DOS PROJETOS

Os papéis são definidos **por projeto**, não por conta.

Tabela responsável:

`project_members`

Papéis existentes:

### Owner
Usuário que criou o projeto.

Possui controle administrativo completo.

Pode:

- editar projeto
- definir orçamento
- definir cliente
- criar tarefas
- gerenciar pagamentos
- convidar colaboradores
- definir splits financeiros
- finalizar projeto

Cada projeto possui apenas **um owner**.

---

### Collaborator

Colaborador é apenas um **papel dentro de um projeto específico**.

Um usuário pode ser:

- owner em seus projetos
- collaborator em projetos de outros freelancers

O colaborador pode:

- visualizar tarefas do projeto
- criar ou editar tarefas permitidas
- enviar arquivos
- enviar links
- acompanhar seu split financeiro
- visualizar pagamentos relacionados à sua participação
- solicitar pagamento ao owner

O colaborador não pode:

- alterar orçamento do projeto
- alterar cliente
- alterar estrutura administrativa do projeto
- alterar outros colaboradores
- alterar configurações do owner

---

# 4. CLIENTE (FUNCIONALIDADE FUTURA)

A parte do cliente **ainda não foi implementada no sistema**.

No futuro existirá um portal do cliente com:

- dashboard simplificada
- visualização do projeto
- visualização de arquivos e links
- aprovação ou reprovação com feedback
- resposta de briefings
- notificações de cobrança

O cliente não poderá:

- ver financeiro interno do freelancer
- ver colaboradores
- editar estrutura do projeto

---

# 5. ARQUITETURA DO SISTEMA

Frontend:

- Next.js
- React
- TypeScript

Arquitetura atual:

Next.js **Pages Router**

Backend principal:

- Supabase

Supabase fornece:

- PostgreSQL
- Auth
- RLS
- Storage

Backend complementar:

- Node.js em rotas API do Next.js

Hospedagem:

- Vercel

Versionamento:

- GitHub

Domínio da aplicação:

app.oflowdesk.com

---

# 6. PAPEL DE CADA TECNOLOGIA

## Supabase

Responsável por:

- banco de dados
- autenticação
- storage
- regras com RLS

---

## Node.js server-side

Usado para fluxos que precisam de lógica mais complexa ou permissões administrativas.

Exemplos:

- aceite de convite
- co-working
- sincronização financeira
- notificações
- relatórios
- integrações externas
- futura emissão de notas fiscais

Nunca expor `SUPABASE_SERVICE_ROLE_KEY` no frontend.

---

# 7. ESTADO ATUAL DO PROJETO

Funcionalidades já existentes ou parcialmente implementadas:

- autenticação
- dashboard
- clientes
- projetos
- tarefas
- subtarefas
- arquivos de projeto
- links de projeto
- briefings
- propostas
- pagamentos
- time tracker
- sistema de convites de co-working
- aceite de convite
- split financeiro
- dashboard do colaborador

Ainda não existe:

- portal do cliente
- aprovação de entregáveis
- notificações de cobrança
- relatórios completos

---

# 8. PRINCÍPIOS DE DESENVOLVIMENTO

Sempre seguir:

- não quebrar funcionalidades existentes
- evoluir incrementalmente
- evitar refatorações gigantes
- priorizar segurança
- priorizar simplicidade
- não criar tabelas duplicadas
- não criar lógica financeira paralela

Separar claramente:

- owner
- collaborator
- cliente (futuro)

Separar claramente:

- pagamento do cliente
- pagamento do colaborador

---

# 9. REGRA FINANCEIRA FUNDAMENTAL

É obrigatório separar:

### pagamento do cliente

dinheiro que entra no projeto.

### pagamento do colaborador

repasse interno feito pelo owner.

Exemplo válido:

cliente pagou → colaborador ainda não recebeu.

Projeto pago **não significa colaborador pago**.

---

# 10. ESTRUTURA DO BANCO

## projetos

Campos:

- id
- titulo
- orcamento
- status
- forma_pagamento
- user_id
- cliente_id
- created_at

---

## clientes

Campos:

- id
- nome
- email
- telefone
- empresa
- foto_url
- user_id
- created_at
- updated_at

---

## tasks

Campos:

- id
- titulo
- descricao
- status
- projeto_id
- user_id
- created_at
- updated_at

---

## subtasks

Campos:

- id
- task_id
- titulo
- descricao
- concluida
- user_id
- created_at
- updated_at

---

## arquivos_projeto

Campos:

- id
- projeto_id
- user_id
- nome
- url
- status
- created_at

---

## links_projeto

Campos:

- id
- projeto_id
- user_id
- titulo
- url
- created_at

---

## atividades

Campos:

- id
- projeto_id
- user_id
- tipo
- descricao
- created_at

---

## pagamentos

Campos:

- id
- projeto_id
- valor
- status
- data_pagamento
- data_prevista
- forma_pagamento
- parcela
- total_parcelas
- created_at

---

## briefings_templates

Campos:

- id
- titulo
- descricao
- user_id
- created_at
- updated_at

---

## briefings_campos

Campos:

- id
- template_id
- titulo_pergunta
- descricao_pergunta
- tipo
- obrigatorio
- opcoes
- placeholder
- ordem
- user_id
- created_at
- updated_at

---

## briefings_envios

Campos:

- id
- template_id
- projeto_id
- cliente_id
- user_id
- status
- enviado_em
- respondido_em
- prazo_resposta
- created_at

---

## briefings_respostas

Campos:

- id
- envio_id
- projeto_id
- pergunta
- resposta
- user_id
- created_at

---

## proposals

Campos:

- id
- client_id
- title
- description
- value
- status
- user_id
- created_at

---

## proposal_sections

Campos:

- id
- proposal_id
- type
- content
- page
- order
- editable
- created_at

---

## time_entries

Campos:

- id
- user_id
- project_id
- task_id
- started_at
- ended_at
- duration_seconds
- created_at

---

## users

Tabela de perfil da aplicação.

Separada de `auth.users`.

Campos:

- id
- nome
- avatar_url
- role
- created_at

---

## project_members

Relaciona usuários aos projetos.

Campos:

- id
- project_id
- user_id
- role
- nome
- email
- avatar_url
- created_at

Papéis:

- owner
- collaborator

---

## project_invites

Sistema de convites.

Campos:

- id
- project_id
- invited_email
- invited_by
- token
- status
- split_type
- split_value
- expires_at
- accepted_at
- created_at

---

## project_member_splits

Define participação financeira.

Campos:

- id
- project_id
- member_user_id
- split_type
- split_value
- created_at
- updated_at

Tipos:

- percentage
- fixed

---

## collaborator_payment_splits

Define quanto o colaborador recebe por pagamento do projeto.

Campos:

- id
- project_id
- member_user_id
- pagamento_id
- amount
- status
- paid_at
- created_at

Status:

- pendente
- pago

---

# 11. RLS E SEGURANÇA

O projeto utiliza RLS intensivamente.

Funções auxiliares importantes:

- is_project_owner(...)
- is_project_member(...)
- can_accept_project_invite(...)

Essas funções evitam recursão infinita em policies.

Nunca remover ou alterar sem necessidade.

---

# 12. FLUXO DE CO-WORKING

Fluxo atual:

1. owner cria convite
2. convite gera token
3. colaborador acessa `/invite/[token]`
4. login
5. aceita convite

API server-side:

- valida token
- cria project_members
- cria project_member_splits
- sincroniza collaborator_payment_splits

Usa `SUPABASE_SERVICE_ROLE_KEY` apenas no backend.

---

# 13. PRIORIDADES ATUAIS DO DESENVOLVIMENTO

1. pagamento do colaborador
2. solicitação de pagamento
3. faturamento do colaborador
4. pagamentos a receber
5. bloqueio de conclusão do projeto
6. portal do cliente
7. aprovação de entregáveis
8. relatórios de desempenho

---

# 14. COMO FAZER ALTERAÇÕES NO PROJETO

Sempre seguir este processo mental:

1. entender o que já existe
2. verificar impacto
3. preservar funcionalidades atuais
4. evitar refatorações grandes
5. alterar banco apenas quando necessário

Se alterar banco:

- gerar SQL claro
- preservar dados existentes

Se alterar backend:

- verificar autenticação
- verificar RLS

Se alterar frontend:

- manter estrutura atual
- não quebrar tipagens

---

# 15. O QUE EVITAR

Nunca:

- reescrever módulos inteiros
- trocar arquitetura base
- migrar para App Router sem solicitação
- duplicar lógica financeira
- expor service role
- remover RLS
- alterar estrutura crítica sem análise

---

# 16. ORIENTAÇÃO FINAL

Este projeto já possui base funcional.

O objetivo neste repositório é **evoluir o sistema existente com segurança**, não reconstruí-lo.

Sempre priorizar:

- compatibilidade
- incrementalismo
- segurança
- clareza de impacto

---

# 17. REGRAS DE UI E DESIGN

Regras obrigatórias para qualquer alteração visual no projeto:

1. Nunca alterar a UI sem solicitação explícita do usuário.
2. Se a tarefa for backend, lógica, banco, API, queries, RLS ou correção estrutural, não mexer em layout, estilos, espaçamentos, componentes visuais ou aparência.
3. Qualquer ajuste de UI só pode ser feito quando o usuário pedir explicitamente.
4. Quando houver alteração de UI autorizada:
   - seguir o padrão visual já existente no projeto
   - reutilizar os componentes já existentes
   - manter consistência com as demais páginas
   - respeitar as variáveis de tema já criadas
   - respeitar as cores dos temas dark/light já definidos
   - não inventar nova linguagem visual sem necessidade
   - não trocar cores arbitrariamente
   - não criar estilos inline desnecessários se o projeto já possui padrão estabelecido
5. Sempre priorizar:
   - consistência visual
   - reaproveitamento
   - compatibilidade com o sistema atual
6. Se uma implementação exigir alguma pequena alteração visual técnica e isso não tiver sido pedido explicitamente, primeiro informar antes de aplicar.

Resumo:
Sem pedido explícito, não alterar UI.
Se alterar UI com autorização, seguir rigorosamente os estilos, tokens, variáveis e padrões já existentes no projeto.