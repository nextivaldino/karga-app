# 01 — Módulo Cargas — Kraga Desktop

## Objetivo deste documento
Implementar o módulo central de negócio: registo, listagem, edição e gestão de Cargas,
incluindo a base de Contactos (Clientes) que as cargas reutilizam.

Pré-requisito: módulo 00 (estrutura base) já implementado e validado.

---

## 1. Contexto de negócio (resumo)

O Kraga Desktop gere cargas recolhidas na Europa e enviadas para Cabo Verde. Cada carga
pertence a um cliente (emissor) e tem um ou mais destinatários (receptores). As cargas
têm um código único, dimensões, peso, valor e estado de pagamento. Nesta fase, as cargas
ainda **não** precisam de pertencer a um Contentor (isso é o próximo módulo) — podem
existir "soltas" por agora, prontas a serem associadas a um contentor depois.

---

## 2. Entidade: Contactos (Clientes) — implementar primeiro

Base de dados independente e reutilizável. Não depende de cargas para existir.

### Schema

```sql
CREATE TABLE contactos (
  id TEXT PRIMARY KEY,                 -- UUID v4
  nome TEXT NOT NULL,
  telefone TEXT,                       -- opcional
  email TEXT,                          -- opcional
  morada TEXT,                         -- opcional
  nif TEXT,                            -- opcional, identificador fiscal (NIF/BI/Passport)
  notas TEXT,                          -- opcional
  ativo INTEGER NOT NULL DEFAULT 1,    -- soft delete
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'local'
);
```

### Comportamento
- CRUD completo (criar, editar, listar, arquivar — nunca apagar fisicamente).
- Pesquisa/autocomplete por nome (usado depois no formulário de Cargas).
- Um contacto pode ser reutilizado como emissor em várias cargas e como destinatário
  em várias cargas — são papéis (roles), não tipos fixos de registo.
- Um contacto sobrevive mesmo que todas as suas cargas sejam arquivadas.

---

## 3. Entidade: Cargas

### Schema

```sql
CREATE TABLE cargas (
  id TEXT PRIMARY KEY,                     -- UUID v4 (chave técnica)
  codigo TEXT NOT NULL UNIQUE,             -- ex: "TF 001" (campo de negócio, editável)
  nome TEXT NOT NULL,                      -- nome/descrição da carga
  comprimento_cm REAL,
  largura_cm REAL,
  altura_cm REAL,
  m3 REAL,                                 -- calculado automaticamente (ver regra abaixo)
  peso_kg REAL,
  valor REAL,
  moeda TEXT NOT NULL,                     -- ex: "EUR" — vem da config da empresa de origem
  estado_pagamento TEXT NOT NULL DEFAULT 'devido' CHECK (estado_pagamento IN ('pago', 'devido')),
  tipo_embalagem TEXT,                     -- tambor, caixa, palete, volume solto, veículo, etc.
  notas TEXT,
  estado TEXT NOT NULL DEFAULT 'recebida'
    CHECK (estado IN ('recebida', 'em_deposito', 'em_contentor', 'em_transito', 'entregue', 'arquivada')),
  contentor_id TEXT,                       -- NULL nesta fase (preparar coluna, sem lógica ainda)
  emissor_id TEXT NOT NULL REFERENCES contactos(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'local'
);

CREATE TABLE carga_destinatarios (
  id TEXT PRIMARY KEY,
  carga_id TEXT NOT NULL REFERENCES cargas(id),
  contacto_id TEXT NOT NULL REFERENCES contactos(id),
  created_at TEXT NOT NULL
);
```

**Nota sobre destinatários:** uma carga pode ter **múltiplos destinatários** (tabela
associativa `carga_destinatarios`), útil para levantamentos parciais em Cabo Verde.
O emissor é único por carga (`emissor_id` direto na tabela `cargas`).

### Regra de cálculo automático de m³

```
m3 = (comprimento_cm × largura_cm × altura_cm) / 1_000_000
```//
Recalcular sempre que uma das três dimensões mudar (no formulário, em tempo real).

### Regra do código único (sistema de códigos)

- Configuração global (por agora, guardar num ficheiro/tabela simples de settings):
  `prefixo_codigo` (ex: `"TF"`), `proximo_numero` (ex: `1`).
- Ao criar uma nova carga, o sistema **sugere automaticamente** o próximo código
  (`TF 001`, depois `TF 002`, ...), mas o campo é **editável manualmente** antes de gravar.
- Validação: o código tem de ser único em toda a tabela `cargas` — bloquear gravação
  com mensagem clara se já existir.
- Um cliente pode ter vários códigos (várias cargas) — a unicidade é por carga, não por cliente.

### Regra da moeda

- A moeda da carga vem de uma configuração simples (ex: `settings.moeda_origem`, default `"EUR"`).
- Não implementar conversão de câmbio nesta fase — é só um campo de exibição/registo.

---

## 4. Interface — Lista de Cargas (estilo Excel)

- Tabela densa, linhas e colunas, ocupando a área principal da página "Cargas".
- Colunas por defeito, nesta ordem: **Código | Nome | Emissor | Estado | m³ | Peso | Valor | Pagamento | Data**
- Colunas de contacto (telefone, morada, email, NIF) **não aparecem por defeito** —
  ficam disponíveis mas ocultas (preparar a estrutura para toggle de colunas, mesmo que
  o painel de configuração completo só venha no módulo de Configurações).
- Filtro rápido no topo: por texto livre (nome/código/emissor) e por estado de pagamento
  (Pago / Devido / Todos).
- Usar virtualização de lista desde já (ex: `@tanstack/react-virtual`) — conforme
  regra do CLAUDE.md, não deixar para depois.
- Seleção de linha → abre detalhe/edição.
- Botão "+ Nova Carga" visível no topo da tabela.

## 5. Interface — Formulário de Nova Carga / Edição

Formulário popup (modal), com os campos:

- **Nome da Carga** (obrigatório)
- **Código** (sugerido automaticamente, editável)
- **Comprimento / Largura / Altura** (cm) — com **m³ calculado e mostrado em tempo real**
- **Peso** (kg)
- **Valor** + **Estado de Pagamento** (toggle Pago/Devido)
- **Tipo de embalagem** (select simples: tambor, caixa, palete, volume solto, veículo, outro)
- **Notas** (campo de texto livre)
- **Emissor** — campo de autocomplete que pesquisa em `contactos`; se não existir,
  permite criar um novo contacto sem sair do formulário (inline)
- **Destinatário(s)** — mesmo padrão de autocomplete, suporta adicionar múltiplos
- Campos de contacto adicionais (telefone, morada, email, NIF) do emissor/destinatário
  ficam **minimizados/colapsados** por padrão — um link "mostrar mais campos" expande

### Comportamento inteligente
- Autocomplete reconhece nomes já existentes em `contactos` e preenche automaticamente
  os dados ao selecionar.
- Se o nome digitado for parecido com um contacto existente, sugerir antes de criar duplicado.
- Validação de código único antes de permitir gravar.

---

## 6. IPC / Repository

Seguir o mesmo padrão do módulo 00:

- `electron/models/repositories/contactoRepository.ts`
- `electron/models/repositories/cargaRepository.ts`
- Canais IPC: `contactos:list`, `contactos:create`, `contactos:update`, `contactos:search`,
  `cargas:list`, `cargas:create`, `cargas:update`, `cargas:nextCodigo`

---

## 7. Critério de "pronto" para este módulo

- [ ] CRUD completo de Contactos, com pesquisa/autocomplete funcional
- [ ] CRUD completo de Cargas (criar, editar, listar)
- [ ] Cálculo automático de m³ em tempo real no formulário
- [ ] Sugestão automática de código, editável, com validação de unicidade
- [ ] Suporte a múltiplos destinatários por carga
- [ ] Lista de Cargas em formato tabela, com filtro rápido e virtualização
- [ ] Emissor/destinatário reutilizam contactos existentes via autocomplete
- [ ] Campos de contacto minimizados por defeito no formulário
- [ ] Nenhum dado é apagado fisicamente (soft delete/arquivo)

---

## Fora de escopo nesta fase (não implementar ainda)

- Contentores (a coluna `contentor_id` existe no schema, mas fica sempre NULL por agora)
- Faturação / exportação PDF / WhatsApp
- Relatórios
- Painel de configuração de colunas (só preparar a estrutura, não a UI completa)
