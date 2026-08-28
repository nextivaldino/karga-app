# 12 — Módulo Cargas Completo — Kraga Desktop (definitivo)

## Objetivo
Especificação final da página Cargas: o posto de trabalho principal do sistema.
Substitui/complementa o módulo 01 original — mantém o schema já definido lá,
redesenha por completo a interface e o fluxo.

---

## 1. Schema (reaproveitado do módulo 01, sem alterações)
Tabelas `contactos`, `cargas`, `carga_destinatarios` — ver `01-MODULO-CARGAS.md`
para os detalhes de colunas. Este documento foca-se em interface e fluxo.

---

## 2. Barra contextual da página

```
Contêiner: [TF-2026-03 ▾]   [+ Nova Carga]   [👥 Contactos]   Modo Editor ⚫──○   [Lista | Faturação]
```

- **Seletor de Contêiner**: só lista contentores `estado='aberto'`. Persistido como
  "último contêiner ativo" (tabela `settings`).
- **+ Nova Carga**: abre o popup detalhado na secção 4.
- **👥 Contactos**: abre a lista telefónica expansível (secção 5).
- **Modo Editor**: toggle que transforma a lista principal em grelha editável
  (secção 6).
- **Sub-abas Lista | Faturação**: alterna entre a tabela normal de cargas e a
  vista de faturação (secção 7).

---

## 3. Lista de Cargas (modo normal, não-editor)
- Tabela virtualizada (já implementada no módulo 01), filtrada pelo contêiner ativo.
- Colunas: Código | Nome | Emissor | m³ | Peso | Valor | Pagamento
- Clique numa linha abre o popup de edição (mesmo componente do "Nova Carga",
  pré-preenchido).

---

## 4. Popup "Nova Carga" (Header Bar + Utility Pane)

```
┌──────────────────────────────────────────────────────┐
│ ✕      Contêiner: [ TF-2026-03 ▾ ]                    │ ← Header Bar compacta
├──────────────────────────────────────────────────────┤
│ Código: [ TF 004 ]   Automático ⚫──○ Manual            │
├──────────────────────────────────────────────────────┤
│ [ Emissor        ]  [ Recetor         ]  ▸ mais campos │
├──────────────────────────────────────────────────────┤
│ [ Nome da carga                        ]                │
│                                                          │
│  [C] [L] [A]   [Peso]  [Valor]      Pago ○──⚫           │
├──────────────────────────────────────────────────────┤
│         [Cancelar]      [+ Empilhar]      [Guardar]     │
└──────────────────────────────────────────────────────┘
```

Ao clicar **"+ Empilhar"** pela primeira vez, abre uma **Utility Pane** à direita
do popup (o popup expande horizontalmente):

```
┌──────────────────────────────┬───────────────────┐
│  (formulário, como acima)     │ Cargas empilhadas  │
│                                │ ──────────────────│
│                                │ Tambor azul        │
│                                │ TF 004 · 1.2m³     │
│                                │ ──────────────────│
│                                │ Caixa grande        │
│                                │ TF 005 · 0.8m³      │
│                                │ ──────────────────│
│                                │ + esta carga (atual)│
└──────────────────────────────┴───────────────────┘
```

- Regras confirmadas:
  - Só o **Nome** do Emissor/Recetor é obrigatório; ao escrever, associa a contacto
    existente (autocomplete) ou cria um novo automaticamente.
  - "▸ mais campos" expande telefone/email/morada/NIF (opcionais).
  - Linha C/L/A/Peso/Valor: inputs compactos (~4 caracteres), m³ calculado ao lado
    em tempo real.
  - Toggle Automático/Manual no código: manual liberta o campo para edição livre;
    automático sugere o próximo, mas continua editável pontualmente.
  - "Guardar" grava a carga atual **+ todas as empilhadas** numa única transação,
    todas associadas ao contêiner ativo, com validação de código único por linha.
  - Editar uma carga existente abre o mesmo popup sem a opção de empilhar (edição
    é sempre individual).

---

## 5. Lista de Contactos do Contentor (botão "👥 Contactos")

Popover/painel lateral (não modal de ecrã inteiro) com lista tipo agenda telefónica:

```
👥 Contactos deste Contentor
──────────────────────────────
👤 João Silva            3 cargas ›
👤 Maria Gomes            1 carga ›
──────────────────────────────
```

Ao clicar num nome, expande **inline** (acordeão, não abre novo modal):

```
👤 João Silva            3 cargas ▾
   TF 001 — Tambor azul — 45€
   TF 004 — Caixa grande — 80€
   TF 007 — Saco — 20€
   [💬 WhatsApp]  [✉️ Email]  [✏️ Editar contacto]
```

- Lista apenas emissores com pelo menos 1 carga no contentor ativo.
- Botões WhatsApp/Email só aparecem se o contacto tiver esse dado preenchido.
- "Editar contacto" abre popup simples com todos os campos de `contactos`
  (incluindo os opcionais) para completar/corrigir dados.

---

## 6. Modo Editor (grelha estilo Excel)

Ativado pelo toggle na barra contextual. Substitui a tabela normal pela grelha:

- Cantos retos, `border-collapse`, sem radius (ver design system secção 7).
- Colunas editáveis: Nome, C, L, A, Peso, Valor, Pagamento, Emissor (autocomplete
  inline), Código (só se modo manual estiver ativo globalmente).
- Colunas não-editáveis (cinza, cursor bloqueado): m³ (calculado), Código
  (se automático).
- **Edição inline**: clique numa célula ativa edição; Tab/Enter/setas navegam
  como numa folha de cálculo real; Enter na última célula da última linha cria
  nova linha vazia automaticamente.
- **Validação em tempo real por célula**: contorno vermelho + tooltip em código
  duplicado ou valor inválido (texto onde se espera número, etc.).
- **Colar do Excel/Google Sheets**: `Cmd+V` com dados tabulares (TSV) copiados de
  fora detecta o formato e preenche múltiplas linhas de uma vez, atribuindo
  códigos sequenciais automaticamente às novas linhas e correndo a validação em
  cada célula colada. Mostrar toast com resumo ("12 linhas importadas, 1 código
  duplicado corrigido automaticamente" ou similar).
- Alterações no Modo Editor gravam por linha ao sair da célula (auto-save),
  não é preciso um botão "Guardar" global — mas mostrar um pequeno indicador
  de "a gravar…" / "gravado" por linha, para dar confiança ao utilizador.

---

## 7. Sub-aba Faturação (dentro de Cargas)

- Lista agrupada por cliente (emissor) do contentor ativo (ou de todos os
  contentores, com filtro para escolher "Este contentor" / "Todos"):
  nome, nº cargas, valor devido, valor pago.
- Clicar num cliente abre detalhe: lista de cargas desse cliente com toggle
  rápido Pago/Devido por linha, e botão "Gerar Fatura/Recibo" (PDF + WhatsApp),
  conforme já especificado em `03-MODULO-FATURACAO.md` (mantém-se válido,
  só muda a localização na navegação — agora é sub-aba, não página de topo).

---

## 8. IPC (acrescenta aos já existentes do módulo 01)

- `cargas:createBatch` (grava carga atual + pilha, transação única)
- `cargas:updateCell` (edição inline no Modo Editor)
- `cargas:pasteBatch` (colar do Excel — recebe matriz de valores, devolve
  resultado com linhas criadas + eventuais conflitos resolvidos)
- `contactos:listPorContentor`, `contactos:cargasDoContacto`
- `settings:getUltimoContentorAtivo` / `settings:setUltimoContentorAtivo`

---

## 9. Critério de "pronto"
- [ ] Seletor de contêiner ativo funcional, persistido entre sessões
- [ ] Popup Nova Carga funcional com Utility Pane de empilhamento
- [ ] Toggle Automático/Manual de código funcional
- [ ] Lista de Contactos do Contentor funcional, com WhatsApp/Email/Editar
- [ ] Modo Editor funcional: edição inline, navegação por teclado, nova linha
      automática, validação em tempo real
- [ ] Colar do Excel funcional, com atribuição automática de códigos e resumo
      em toast
- [ ] Sub-aba Faturação funcional dentro de Cargas
