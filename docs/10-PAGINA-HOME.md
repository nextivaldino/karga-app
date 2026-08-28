# 10 — Página Home (estilo GNOME Activities Overview) — Kraga Desktop

## Objetivo
Página inicial inspirada na GNOME Activities Overview: pesquisa centralizada no
topo, conteúdo (widgets/resumos) organizado em grelha por baixo, visual calmo e
centrado, nada de sidebar/menus pesados aqui — é uma vista de "panorama".

---

## 1. Layout

```
┌──────────────────────────────────────────────────────────────┐
│                                                                 │
│                    🔍  Pesquisar em tudo...                    │  ← pesquisa
│                                                                 │       centralizada
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐   │
│  │ 📦 Cargas  │  │ 🚢 Abertos │  │ 💰 Devido  │  │ ✅ Entregue│   │  ← widgets
│  │    128     │  │     3      │  │  2.340 €   │  │    45      │   │      resumo
│  └───────────┘  └───────────┘  └───────────┘  └───────────┘   │
│                                                                 │
│  Contentores Ativos                          Ver todos ›       │
│  ┌────────┐ ┌────────┐ ┌────────┐                              │
│  │TF-03   │ │TF-04   │ │TF-05   │                               │  ← grelha de
│  │Aberto  │ │Aberto  │ │Trânsito│                               │     ícones/cards
│  └────────┘ └────────┘ └────────┘                              │
│                                                                 │
│  Últimas Cargas Inseridas                    Ver todas ›       │
│  · TF 128 — Tambor azul — João Silva — há 5 min                │
│  · TF 127 — Caixa grande — Maria Gomes — há 1h                 │
│                                                                 │
│  Atalhos Rápidos                                                │
│  [+ Nova Carga]   [+ Novo Contentor]                            │
│                                                                 │
└──────────────────────────────────────────────────────────────┘
```

- A **barra de pesquisa desta página é a mesma pesquisa global** (Cmd+K) — aqui
  aparece embutida e sempre visível, em vez de escondida atrás de um ícone.
- Widgets em cards com ícone colorido grande + número em destaque + label pequena
  por baixo (padrão GNOME Overview "shell widget").
- Secções "Contentores Ativos" e "Últimas Cargas" com link "Ver todos ›" que navega
  para a página correspondente.

## 2. Widgets de resumo (dados)

| Widget | Cálculo |
|---|---|
| Cargas (total) | `COUNT(cargas)` do mês corrente |
| Contentores Abertos | `COUNT(contentores WHERE estado='aberto')` |
| Valor Devido | `SUM(valor) WHERE estado_pagamento='devido'` |
| Entregues | `COUNT(cargas WHERE estado='entregue')` no mês |

## 3. Comportamento
- Clicar num widget navega para a página/filtro correspondente (ex: clicar em
  "Valor Devido" abre Cargas → sub-aba Faturação, filtrado por devido).
- Clicar num card de contentor ativo navega para Cargas com esse contentor
  já selecionado.
- Sem edição nesta página — é 100% leitura/navegação, mantendo-a rápida e leve.

## 4. IPC
- `home:resumo` — devolve os 4 valores dos widgets numa só chamada (evitar
  múltiplas idas à base de dados para uma página que deve carregar instantaneamente)
- `home:contentoresAtivos`, `home:ultimasCargas`

## 5. Critério de "pronto"
- [ ] Pesquisa centralizada funcional, idêntica à pesquisa global (Cmd+K)
- [ ] 4 widgets com dados reais e corretos
- [ ] Navegação por clique em widgets/cards funcional
- [ ] Página carrega rápido (uma única chamada IPC agregada para os widgets)
