# 26 — Karga Mobile v02: Reset de Interface (definitivo)

**Status:** Especificação final para implementação (Claude Code)
**Escopo:** Reset total da interface do Karga Mobile, exceto a página de Configurações.
**Protótipo de referência:** `karga-mobile-v02-mockup.html` (validado interativamente antes deste documento — usar como referência visual e comportamental exata)

---

## 1. Objetivo

Reconstruir o Karga Mobile do zero, partindo de uma única página funcional: **Cargas**.
Todas as outras páginas/painéis antigos são removidos. A página Cargas é o hub central da aplicação — tudo (menu, notificações, sync, ações) acontece via pop-ups e uma ilha dinâmica interativa, não em páginas separadas.

---

## 2. Fluxo de entrada

- Login bem-sucedido → redireciona diretamente para `/cargas`.
- Não existe dashboard intermédio. Cargas **é** a home.

---

## 3. Design tokens

### 3.1 Cor

| Token | Hex / valor | Uso |
|---|---|---|
| `--bg` | `#0B0F14` | Fundo geral da app |
| `--surface-top` | `#141C26` | Topo do gradiente de fundo do ecrã |
| `--surface-bot` | `#0A0E13` | Base do gradiente de fundo do ecrã |
| `--glass` | `rgba(255,255,255,0.055)` | Superfície de vidro padrão (listas, grupos de campo) |
| `--glass-strong` | `rgba(255,255,255,0.10)` | Superfície de vidro em destaque (segmented control ativo, chips selecionados) |
| `--glass-press` | `rgba(255,255,255,0.14)` | Estado pressionado |
| `--border` | `rgba(255,255,255,0.095)` | Divisórias finas entre linhas de lista |
| `--border-strong` | `rgba(255,255,255,0.16)` | Contornos de elementos ativos |
| `--text-1` | `#F4F6F8` | Texto primário |
| `--text-2` | `rgba(244,246,248,0.60)` | Texto secundário |
| `--text-3` | `rgba(244,246,248,0.36)` | Texto terciário / labels |
| `--copper` | `#C89361` | Acento primário (FAB normal, código da carga, ações principais) |
| `--copper-strong` | `#DDAE7D` | Acento primário em destaque (hover/press, gradientes) |
| `--teal2` | `#4FA6A0` | Estado "Entregue", ações WhatsApp |
| `--amber` | `#E3AC4E` | Estado "Pendente" / sincronização pendente |
| `--red` | `#C15C50` | Ações destrutivas (eliminar), erros de sync |

Direção geral: fundo azul-marinho profundo com vidro translúcido (glassmorphism), acento em cobre/latão — evita clichés genéricos (sem creme+serifada, sem SaaS-card com sombra igual em tudo). Paleta com raiz no imaginário marítimo/cargo (aço, latão, noite de porto).

### 3.2 Tipografia

- Família: `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif` (nativa iOS/Android, sem fonte importada)
- Escala: título de página 22px/650, títulos de folha 16px/650, corpo 13–14px/400–600, labels 11–12px/400, dados tabulares (código, valores, dimensões) com `font-variant-numeric: tabular-nums`
- Sem uso de caixa alta para labels; sem eyebrow labels decorativos

### 3.3 Forma e espaço

- Raio grande (`22px`) para folhas/listas; raio médio (`14–16px`) para grupos de campo e cartões; raio pequeno (`11px`) para chips e botões de linha
- Superfícies de lista: **uma única folha de vidro com divisórias finas entre linhas**, não cartões individuais empilhados com sombra própria
- Motion: transições com `cubic-bezier(.32,.9,.35,1)`, ~300–450ms, sempre disparadas por ação do utilizador (nunca animação automática decorativa)

---

## 4. Ilha dinâmica — menu principal (substitui a topbar tradicional)

Elemento central e mais distintivo da interface: a ilha dinâmica no topo do ecrã (inspirada no Dynamic Island do iOS) **é o próprio menu da aplicação**, não apenas um indicador de estado.

- **Estado normal:** pequena pílula preta, 100×26px, com um ponto de cor `--copper` indicando notificação pendente
- **Ao tocar:** expande-se a partir de si própria (mesma posição, sem deslocar-se) para ~316×328px, revelando:
  1. Cabeçalho do utilizador (avatar, nome, "Empresa Sentinel · Posto")
  2. **Notificações** (contagem de novas)
  3. **Sincronização** (última sync, atalho)
  4. **Perfil**
  5. **Definições**
  6. **Sair** (destacado a vermelho)
- Fecha ao tocar fora da ilha expandida, ou ao tocar num item da lista
- Não existem mais ícones soltos na topbar — a topbar mostra apenas o título da página ativa ("Cargas" / "Contactos" / nome do contacto selecionado)

Este padrão substitui por completo qualquer dropdown de utilizador ou sino de notificações tradicional.

---

## 5. Página Cargas — dois modos de visualização

Segmented control (estilo iOS) no topo da página, abaixo da ilha, alterna entre:

| Modo | Função |
|---|---|
| **Cargas** | Lista plana de todas as cargas |
| **Contactos** | As mesmas cargas, agrupadas por contacto |

### 5.1 Modo Cargas — colunas da lista

Cada linha (grid de 5 colunas + indicador de estado):

1. **Indicador de estado** — ponto colorido à esquerda (`--copper`=trânsito, `--teal2`=entregue, `--amber`=pendente)
2. **Código** — identificador curto, cor `--copper-strong`
3. **Emissor / Recetor** — empilhados verticalmente na mesma célula, emissor em cima, recetor em baixo com seta `→`
4. **C · A · L** — Comprimento / Altura / Largura em cm, formato compacto `120×80×100`
5. **Valor** — alinhado à direita
6. **Menu de opções** (ícone `⋮`)

### 5.2 Menu de opções por carga (bottom sheet compacto)

- Ver detalhes
- Editar
- Duplicar
- Alterar estado
- Marcar faturação (paga/devido)
- Enviar por WhatsApp
- Exportar / imprimir recibo
- Histórico (auditoria)
- **Eliminar** (destrutivo, sempre com confirmação — soft delete)

### 5.3 Modo Contactos

- Lista de contactos derivada dos emissores das cargas (agrupamento por emissor por omissão, com opção de alternar para recetor)
- Cada linha: avatar com iniciais, nome, nº de cargas + valor total, atalho WhatsApp
- Ao tocar num contacto → **reaproveita o mesmo componente de lista do modo Cargas**, filtrado por esse contacto, com cabeçalho:
  - Avatar + nome + estatísticas (nº cargas, valor acumulado)
  - Ações: **Editar dados do contacto**, **Enviar via WhatsApp**
  - Botão de voltar para a lista de contactos

---

## 6. Botão flutuante (+) — dinâmico

| Estado | Aparência | Ação ao tocar |
|---|---|---|
| Normal | Gradiente cobre (`--copper-strong` → `--copper`) | Abre folha "Adicionar carga" |
| Pendente de sincronização | Gradiente âmbar, badge com contagem | Abre a pílula de sincronização |
| Sincronizado | Pulso breve, volta ao normal | — |

- **Comportamento com o scroll:** esconde-se (translateY + fade) ao dar scroll para baixo na lista; reaparece assim que a lista para ou o utilizador dá scroll para cima
- **Pílula de sincronização:** nasce visualmente do botão (`transform-origin: bottom right`), mostra pendentes / última sincronização / erros e um botão "Sincronizar agora". É um centro de notificações **dedicado a cargas**, separado das notificações gerais (que vivem na ilha dinâmica)

---

## 7. Formulário "Adicionar carga" — campos completos (paridade com o Desktop)

O formulário mobile usa **exatamente os mesmos campos e schema de dados do módulo Cargas do Desktop** (`docs/12-MODULO-CARGAS-COMPLETO.md`), adaptado a ecrã pequeno com divulgação progressiva (campos secundários ocultos por padrão).

Renderiza como bottom sheet que nasce do botão + (`transform-origin: bottom right`, scale+translate).

### 7.1 Campos visíveis por padrão

1. **Código** — gerado automaticamente; switch "Manual" para permitir edição direta e validação de unicidade
2. **Contentor de destino** — dropdown com os contentores disponíveis
3. **Emissor** — input com autocomplete contra a tabela `contactos`
4. **Recetor** — input com autocomplete; link **"+ Adicionar outro destinatário"** para suportar múltiplos recetores por carga
5. **Nome da carga**
6. **Dimensões (C / A / L, cm)** — três inputs lado a lado + **volume em m³ calculado em tempo real**
7. **Peso (kg)**
8. **Valor**
9. **Faturação** — switch Pago / Devido
10. **Estado** — chips: Pendente / Em trânsito / Entregue

### 7.2 Campos ocultos por padrão ("Mais campos")

Dentro de cada grupo Emissor e Recetor, um toggle "Mais campos" revela (com animação de altura):
- Telefone
- Email
- Morada
- NIF

Regra de dados (herdada do Desktop): ao preencher estes campos, os dados são gravados diretamente no registo do contacto associado, nunca apagando um valor já existente por o campo vir vazio no formulário.

### 7.3 Sistema de múltiplas cargas (empilhamento)

Adaptação mobile do Utility Pane de empilhamento do Desktop (que usa painel lateral — não cabe em ecrã pequeno):

- Botão **"+ Adicionar à lista"** dentro da mesma folha: grava a carga atual como item na lista abaixo do formulário, limpa os campos específicos da carga mas **mantém Emissor/Recetor**, gera o próximo código automaticamente
- Lista de cargas empilhadas aparece como itens removíveis (✕) dentro da própria folha
- O botão principal muda de **"Guardar carga"** para **"Enviar todas (n)"** assim que há pelo menos um item empilhado
- Ao fechar a folha com itens empilhados e o formulário atual vazio, confirmar antes de descartar

---

## 8. Arquitetura de pop-ups

Um único componente de bottom-sheet/overlay reutilizável (equivalente ao `HeaderBarModal` do Desktop) cobre:

- Menu da ilha dinâmica
- Adicionar/editar carga
- Opções de carga
- Editar contacto / enviar WhatsApp
- Pílula de sincronização
- Confirmações destrutivas

---

## 9. Desativado nesta fase

- Painel antigo — removido por completo
- Todas as páginas antigas exceto **Configurações**
- Chat completo — fica como item "em breve" dentro do menu da ilha

---

## 10. Critério de "pronto"

- [ ] Ilha dinâmica funcional: expande/colapsa a partir de si própria, contém os 5 itens de menu
- [ ] Segmented control Cargas/Contactos funcional
- [ ] Lista de cargas com as 5 colunas + indicador de estado, reaproveitada no modo Contactos filtrado
- [ ] Menu de opções por carga com as 9 ações listadas
- [ ] FAB dinâmico: esconde no scroll, muda de cor em pendência de sync, abre pílula de sync
- [ ] Formulário de carga com todos os campos do Desktop, incluindo "Mais campos" ocultos por padrão e múltiplos destinatários
- [ ] Sistema de empilhamento funcional (adicionar à lista → enviar todas)
- [ ] Cálculo de volume em m³ em tempo real
- [ ] Paleta de cores e tokens tipográficos da secção 3 aplicados integralmente
- [ ] Nenhuma referência a UI antiga (dock, ícones de topbar separados, painéis removidos)

---

## 11. Prompt de execução para o Claude Code

```
Lê docs/26-KARGA-MOBILE-V02-RESET.md por completo antes de começares.
Usa karga-mobile-v02-mockup.html (na raiz do projeto) como referência
visual e comportamental exata — cores, espaçamentos, animações e
estrutura de componentes devem corresponder ao protótipo.

Reconstrói o Karga Mobile (mobile/) do zero:

1. Remove todo o painel/navegação antigos, mantém apenas Configurações.
2. Implementa a página Cargas como rota única pós-login, com:
   - Ilha dinâmica interativa (menu principal) conforme secção 4
   - Segmented control Cargas/Contactos conforme secção 5
   - Lista de cargas e lista de contactos reaproveitando o mesmo
     componente de linha
   - Menu de opções por carga (bottom sheet) com as 9 ações da secção 5.2
   - FAB dinâmico com esconder no scroll e pílula de sincronização
     conforme secção 6
3. Implementa o formulário "Adicionar carga" com paridade total de
   campos com o Desktop (secção 7), incluindo divulgação progressiva
   de "Mais campos" e o sistema de empilhamento de múltiplas cargas.
4. Aplica os tokens de cor, tipografia e forma da secção 3 via Tailwind
   (config de tema) ou CSS variables, não valores soltos espalhados
   pelo código.
5. Reaproveita o padrão de repository/IPC já existente para
   cargas/contactos; não inventes novo schema de dados.

Antes de gerares qualquer código, mostra-me o plano de implementação
(estrutura de componentes e ficheiros) para eu aprovar.
```
