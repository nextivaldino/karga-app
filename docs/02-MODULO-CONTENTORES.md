# 02 — Módulo Contentores — Kraga Desktop

## Objetivo deste documento
Implementar o módulo de Contentores: criação, gestão, associação de cargas, fecho
e geração de listas de exportação (porto/alfândega).

Pré-requisito: módulos 00 (estrutura base) e 01 (Cargas/Contactos) já implementados
e validados.

---

## 1. Contexto de negócio (resumo)

Um Contentor agrupa várias cargas recolhidas ao longo de vários dias. Quando está
completo, o Admin fecha-o, o sistema gera uma lista/manifesto (inglês/francês para o
porto de saída, e depois português para Cabo Verde), e o contentor segue viagem.

---

## 2. Entidade: Contentores

### Schema

```sql
CREATE TABLE contentores (
  id TEXT PRIMARY KEY,                      -- UUID v4
  nome TEXT NOT NULL,                       -- nome do contentor
  codigo TEXT NOT NULL UNIQUE,              -- ex: "CONT-2026-045" ou nº oficial do contentor marítimo
  mes_referencia TEXT NOT NULL,             -- formato "YYYY-MM", permite vários contentores/mês
  categoria TEXT,                            -- opcional
  data_partida TEXT,                         -- ISO 8601, opcional até ser definida
  data_chegada_prevista TEXT,                -- ISO 8601, opcional
  estado TEXT NOT NULL DEFAULT 'aberto'
    CHECK (estado IN ('aberto', 'fechado', 'em_transito', 'entregue', 'bloqueado')),
  peso_total_kg REAL NOT NULL DEFAULT 0,     -- recalculado automaticamente
  m3_total REAL NOT NULL DEFAULT 0,          -- recalculado automaticamente
  valor_total REAL NOT NULL DEFAULT 0,       -- recalculado automaticamente
  custo_frete REAL,                          -- campo disponível, sem lógica automática (conforme decidido)
  notas TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'local'
);
```

### Relação com Cargas
- Usar a coluna `contentor_id` já existente na tabela `cargas` (módulo 01) — associar
  uma carga a um contentor é simplesmente definir esse campo.
- Uma carga só pode pertencer a **um** contentor de cada vez.
- Uma carga só pode ser adicionada/removida de um contentor enquanto o contentor
  estiver no estado `aberto`.

### Regra de bloqueio ao fechar
- Quando o Admin marca o contentor como `fechado`:
  - **Bloquear automaticamente** a adição/remoção de cargas (conforme decisão:
    "quando fechado, bloquear adição de novas cargas" = SIM).
  - Recalcular e gravar `peso_total_kg`, `m3_total`, `valor_total` no momento do fecho
    (soma de todas as cargas associadas).
  - Mudar o `estado` de todas as cargas associadas de `em_deposito`/`recebida` para
    `em_contentor` (se ainda não estiverem).

### Regra do código do contentor
- Similar ao código de carga: prefixo configurável + numeração, mas o Admin pode
  também inserir manualmente um número oficial de contentor marítimo (ex: formato
  `CMAU 123456-7`), conforme decidido nas conversas anteriores.
- Validação de unicidade.

---

## 3. Interface — Lista de Contentores

- Tabela (mesmo padrão visual da lista de Cargas): **Código | Nome | Mês Ref. | Estado |
  Nº Cargas | Peso Total | m³ Total | Valor Total | Data Partida**
- Filtro rápido: por estado, por mês de referência.
- Botão "+ Novo Contentor" no topo.
- Ações por linha: Editar, Bloquear/Desbloquear, Fechar, Eliminar (só se `aberto` e
  sem cargas associadas — senão, arquivar em vez de eliminar).

## 4. Interface — Detalhe do Contentor (tela ou painel expandido)

Ao abrir um contentor, mostrar:
- Dados do contentor (editáveis se `aberto`)
- Lista de cargas associadas (reutilizar componente de tabela de Cargas, filtrado por
  `contentor_id`), com:
  - Botão para **adicionar carga existente** ao contentor (busca cargas sem contentor
    associado, ou permite criar uma nova carga já associada diretamente a este contentor)
  - Botão para **remover carga** do contentor (volta a `contentor_id = NULL`)
- Totais calculados em tempo real (peso, m³, valor) enquanto `aberto`
- Botão "Fechar Contentor" (com confirmação, já que bloqueia edição depois)
- Botão "Exportar Lista" (ver secção 5)

## 5. Exportação de Lista do Contentor (funcionalidade crítica)

Gerar documento (PDF, e idealmente também Excel) com:
- Cabeçalho: dados da empresa de origem (nome, morada, contacto — vem de Configurações,
  pode ficar com placeholder nesta fase se Configurações ainda não existir)
- Dados do contentor: código, nome, datas
- Tabela de cargas: Nome | Dimensões (C×A×L) | Peso | m³ | Valor | Emissor | Destinatário(s)
- Linha de totais no fim (soma peso, m³, valor)
- **Idioma selecionável** no momento de exportar: Inglês, Francês, Português
  (nesta fase, pode ser só a estrutura de tradução dos rótulos da tabela — não precisa
  de tradução de conteúdo dinâmico, só dos cabeçalhos/labels fixos)
- Visual profissional: logotipo (placeholder), tipografia limpa, adequado para
  apresentar a portos/alfândega

Usar biblioteca de geração de PDF já compatível com Electron (ex: `pdfmake` ou
gerar via HTML para PDF). Manter a lógica de geração isolada num serviço
(`src/modules/contentores/exportContentorPdf.ts`) para poder reutilizar noutros
módulos depois (ex: faturação).

---

## 6. IPC / Repository

- `electron/models/repositories/contentorRepository.ts`
- Canais IPC: `contentores:list`, `contentores:create`, `contentores:update`,
  `contentores:fechar`, `contentores:adicionarCarga`, `contentores:removerCarga`,
  `contentores:exportarLista`

---

## 7. Critério de "pronto" para este módulo

- [ ] CRUD completo de Contentores
- [ ] Associar/desassociar cargas a um contentor aberto
- [ ] Totais (peso, m³, valor) calculados corretamente e em tempo real
- [ ] Fechar contentor bloqueia novas associações e trava os totais
- [ ] Estado das cargas atualiza corretamente ao entrar/sair de um contentor
- [ ] Exportação de lista em PDF funcional, com pelo menos um idioma (inglês)
      e layout profissional
- [ ] Validação de código único do contentor

---

## Fora de escopo nesta fase (não implementar ainda)

- Tradução completa multi-idioma automática de conteúdo (só labels fixos)
- Exportação em Excel (pode ficar para o módulo de Relatórios)
- Cálculo/gestão de custo de frete (campo existe, sem lógica)
- Dados reais da empresa no cabeçalho do PDF (usar placeholder até o módulo
  de Configurações existir)
