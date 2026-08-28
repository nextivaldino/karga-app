# 13 — Módulo Contentores Completo — Kraga Desktop (definitivo)

## Objetivo
Página Contentores redesenhada em estilo Finder/Nautilus (GNOME Files), com
organização inteligente. Schema mantém-se igual ao módulo 02.

---

## 1. Schema
Reaproveitado integralmente de `02-MODULO-CONTENTORES.md` — sem alterações.
Campos confirmados: Nome, Código (auto/manual, mesma regra de Cargas), Data de
Partida, Data de Chegada, Estado, flags de Bloqueado/Oculto.

```sql
-- adicionar ao schema já existente, se ainda não estiver:
ALTER TABLE contentores ADD COLUMN oculto INTEGER NOT NULL DEFAULT 0;
ALTER TABLE contentores ADD COLUMN bloqueado INTEGER NOT NULL DEFAULT 0;
```

---

## 2. Barra contextual

```
[+ Novo Contentor]   Vista: ☰ Lista | ▤ Ícones   🔍 Filtrar   Ordenar ▾   ☐ Mostrar ocultos
```

## 3. Vista Ícones (estilo Finder)

```
Agosto 2026
┌────────┐ ┌────────┐ ┌────────┐
│  📦     │ │  📦     │ │  📦     │
│ TF-03  │ │ TF-04  │ │ TF-05  │
│ Aberto │ │ Aberto │ │Trânsito│
└────────┘ └────────┘ └────────┘

Julho 2026
┌────────┐ ┌────────┐
│  📦     │ │  🔒     │
│ TF-01  │ │ TF-02  │
│Entregue│ │Bloqueado│
└────────┘ └────────┘
```

- Agrupamento automático por `mes_referencia`, separadores estilo Finder.
- Ícone do contentor muda conforme estado (caixa normal / cadeado se bloqueado /
  check se entregue).
- Clique simples seleciona; duplo clique abre o detalhe; clique direito (ou botão
  "⋯" visível no hover) abre o menu de contexto.

## 4. Vista Lista
- Tabela: Código | Nome | Mês Ref. | Estado | Nº Cargas | Peso Total | m³ Total |
  Valor Total | Data Partida — mesma informação, formato tabular compacto.

## 5. Menu de contexto (clique direito)

```
✏️ Editar
📤 Exportar Lista (PDF)
🔒 Bloquear / 🔓 Desbloquear
🙈 Ocultar
🗑️ Eliminar (só se aberto e sem cargas)
```

- **Bloquear**: impede qualquer edição/associação de cargas, mesmo estando `aberto`
  (diferente de `fechado` — bloqueado é uma trava manual adicional, reversível).
- **Ocultar**: remove da vista principal sem apagar; reaparece com "☐ Mostrar
  ocultos" ativo na barra contextual.
- **Eliminar**: só disponível se `estado='aberto'` e zero cargas associadas
  (senão, sugerir "Ocultar" em vez de eliminar).

## 6. Organização inteligente

- Ordenação por defeito: Abertos primeiro → Em Trânsito → Fechados → Entregues,
  e dentro de cada grupo, mais recente primeiro.
- **Badges/alertas automáticos**:
  - Contentor aberto há mais de N dias (configurável em Configurações, default 14)
    sem nova carga → badge âmbar "Parado há X dias"
  - Contentor a ≤2 dias da `data_partida` → badge azul "Parte em breve"
  - Estes badges também alimentam o Sistema de Notificações (ver documento 11)
- Filtro rápido por estado e por mês na barra contextual.

## 7. Detalhe do Contentor (duplo clique)
Mantém-se conforme já especificado em `02-MODULO-CONTENTORES.md` secção 4:
dados editáveis (se aberto e não bloqueado), lista de cargas associadas, totais
em tempo real, botão Fechar, botão Exportar Lista.

## 8. Criação de Contentor
Disponível em dois pontos, mesmo formulário reutilizado:
- Botão "+ Novo Contentor" nesta página
- Categoria "Contentores e Códigos" em Configurações

Popup de criação: Nome, Código (toggle auto/manual, igual ao padrão de Cargas),
Data de Partida (opcional), Data de Chegada Prevista (opcional). Estado inicia
sempre como `aberto`.

---

## 9. IPC (acrescenta aos já existentes do módulo 02)
- `contentores:bloquear`, `contentores:desbloquear`, `contentores:ocultar`,
  `contentores:mostrar`
- `contentores:listAgrupadoPorMes`

---

## 10. Critério de "pronto"
- [ ] Vista Ícones e Vista Lista funcionais, com toggle
- [ ] Agrupamento por mês na vista ícones
- [ ] Menu de contexto completo (editar, exportar, bloquear, ocultar, eliminar)
- [ ] Badges inteligentes (parado há X dias, parte em breve) visíveis e corretos
- [ ] Criação de contentor funcional nos dois pontos de entrada
- [ ] "Mostrar ocultos" funcional
