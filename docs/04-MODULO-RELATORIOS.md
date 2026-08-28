# 04 — Módulo Relatórios e Exportação — Kraga Desktop

## Objetivo deste documento
Implementar relatórios consolidados sobre o sistema e uma função de exportação
genérica (Excel/PDF), reutilizando o que já existe dos módulos anteriores.

Pré-requisito: módulos 00, 01 (Cargas/Contactos), 02 (Contentores) e
03 (Faturação) já implementados.

---

## 1. Contexto de negócio (resumo)

O utilizador pediu "todos os relatórios possíveis". Nesta fase, entregar os
relatórios de maior valor prático imediato, com uma arquitetura que permita
adicionar mais relatórios facilmente depois (não hardcode tudo numa única tela).

---

## 2. Relatórios a implementar nesta fase

### 2.1 Cargas por Período
- Filtro por intervalo de datas (`created_at` da carga)
- Agrupamento opcional: por dia, semana ou mês
- Colunas: nº de cargas, peso total, m³ total, valor total, valor pago, valor devido

### 2.2 Cargas por Contentor
- Lista de contentores no período selecionado, com totais (reutiliza dados já
  calculados no módulo 02)

### 2.3 Cargas por Cliente
- Reutiliza a mesma agregação do módulo de Faturação (03), mas sem o foco em
  dívida — aqui é visão histórica geral (nº de cargas ao longo do tempo, valor
  total movimentado por cliente)

### 2.4 Cargas Pendentes / Em Aberto
- Cargas com `estado` diferente de `entregue`/`arquivada`
- Útil para operação diária: "o que ainda está em curso"

### 2.5 Resumo Financeiro
- Total pago vs. total devido, no período selecionado
- Pode reutilizar diretamente a agregação do módulo 03

---

## 3. Interface

- Página "Relatórios" na sidebar, com lista de relatórios disponíveis (cards ou lista
  simples), cada um abrindo a respetiva visualização.
- Cada relatório tem:
  - Filtros no topo (datas, e outros filtros específicos do relatório)
  - Tabela de resultados (reutilizar componente de tabela virtualizada já criado
    no módulo 01)
  - Botão "Exportar" (ver secção 4)

## 4. Exportação genérica

Criar um serviço reutilizável de exportação, usado por todos os relatórios
(e reaproveitável também pelos módulos anteriores no futuro):

- `src/lib/exportService.ts` com duas funções principais:
  - `exportToExcel(data: object[], columns: ColumnDef[], filename: string)`
  - `exportToPdf(data: object[], columns: ColumnDef[], filename: string, options?)`
- Usar biblioteca compatível (ex: `exceljs` ou `xlsx` para Excel; reaproveitar o
  serviço de PDF já criado nos módulos 02/03).
- Cada relatório passa os seus próprios dados e definição de colunas — o serviço
  não conhece a lógica de negócio de cada relatório, só formata e exporta.

---

## 5. IPC / Repository

- Não precisa de tabelas novas — todos os relatórios são queries de agregação
  sobre `cargas`, `contentores`, `contactos` já existentes.
- Canais IPC: `relatorios:cargasPorPeriodo`, `relatorios:cargasPorContentor`,
  `relatorios:cargasPorCliente`, `relatorios:cargasPendentes`,
  `relatorios:resumoFinanceiro`

---

## 6. Critério de "pronto" para este módulo

- [ ] Os 5 relatórios listados funcionam e mostram dados corretos
- [ ] Filtro de datas funcional em todos os relatórios que o usam
- [ ] Exportação para Excel funcional em pelo menos 2 relatórios
- [ ] Exportação para PDF funcional em pelo menos 2 relatórios
- [ ] Serviço de exportação é genérico e reutilizável (não duplicado por relatório)

---

## Fora de escopo nesta fase (não implementar ainda)

- Dashboards com gráficos (podem vir depois, é "nice to have", não crítico)
- Relatórios agendados/automáticos por email
- Comparações ano-a-ano ou análises preditivas
