# 20 — Karga Mobile: Dock Pílula, Notificações e Mensagens Desktop↔Mobile

## Objetivo
Complementa `19-KARGA-MOBILE-REDESIGN.md`: refina a dock, adiciona sino de
notificações integrado, e resolve a lacuna de mensagens identificada em
`18-RELATORIO-ESTADO-ATUAL.md` (secção 4) através de um "ID sentinela" para
a Empresa/Admin.

---

## 1. Dock estilo pílula

- Container flutuante, `border-radius: 999px` (pílula completa), sombra
  leve, sobreposto ao conteúdo (não empurra o layout).
- 4 itens: 🏠 Home · 📦 Cargas · **➕ Nova Carga** (destacado) · 💬 Mensagens.
- Ícones coloridos por identidade de página (Home azul, Cargas verde,
  Mensagens roxo — mesma paleta do design system, `08-DESIGN-SYSTEM.md`).
- **Botão "+Nova Carga"**: visualmente distinto — círculo elevado (maior
  raio, se sobrepõe ligeiramente ao topo da pílula), cor de destaque
  (`--color-primary` ou âmbar), sombra mais pronunciada — não é um item de
  navegação, é uma ação, e deve parecer uma ação (padrão "FAB na dock", como
  o botão de câmara do iOS).
- Legenda: só o item tocado/ativo mostra o nome por baixo do ícone,
  transição suave (fade/slide), os restantes ficam só com o ícone.

## 2. Filtro de estado na página Cargas — botão único expansível

Substitui quaisquer abas fixas de estado por um único controlo:
```
[ Estado: Pendente ▾ ]
```
- Ao tocar, abre um pequeno menu (Popover) com as opções: Todas, Pendente,
  Importada, Rejeitada.
- Opção selecionada fica refletida no próprio botão (texto muda).
- Mantém a página mais limpa do que abas sempre visíveis.

## 3. Sino de Notificações (mobile)

- Ícone 🔔 no header, junto ao indicador online/⚙️, com badge de contagem
  de não-lidas.
- Ao tocar, abre popover com lista de eventos, mesmo padrão do
  `11-SISTEMA-NOTIFICACOES.md` (Desktop), adaptado:
  - Carga importada / rejeitada (com motivo)
  - Mensagem nova recebida
  - Falha no envio de uma carga da fila offline
- Toque num item marca como lido e navega para o destino (Cargas ou
  Mensagens, conforme o tipo).
- Fonte de dados: tabela `notificacoes_mobile` nova (ver secção 5) ou,
  mais simples, derivar diretamente do estado das próprias
  `cargas_pendentes`/`mensagens` do utilizador (sem tabela nova) — preferir
  esta segunda abordagem por simplicidade, a não ser que se prove
  insuficiente.

## 4. Mensagens Desktop → Mobile → Desktop (resolve a lacuna)

### Conceito: ID Sentinela da Empresa
Um UUID único e fixo que representa "a Empresa" como remetente/destinatário
central — não corresponde a nenhum utilizador individual, nem precisa de
existir em `pwa_users`.

```
EMPRESA_SENTINEL_ID = "00000000-0000-0000-0000-000000000001"
```
(gerado uma vez, guardado em `settings` no Desktop com a chave
`empresa_sentinel_id`, e hardcoded como constante no código do Mobile —
`mobile/src/lib/constants.ts`)

### Fluxo Desktop → Mobile
- Em **Gestão de Utilizadores** e no **ecrã de Sincronização** (doc 16),
  o nome de cada utilizador PWA passa a ser clicável, abrindo um popup
  compositor de mensagem simples (campo de texto + "Enviar").
- Ao enviar: `INSERT INTO mensagens (de_user_id, para_user_id, texto) VALUES
  (EMPRESA_SENTINEL_ID, <id_do_utilizador>, <texto>)`, usando a Service Role
  Key (ignora RLS, já é o padrão usado pelo Desktop em toda a camada de sync).

### Fluxo Mobile → Desktop
- O composer de mensagens no Mobile (atualmente desativado, conforme
  relatório) passa a **ficar ativo**: `INSERT INTO mensagens (de_user_id,
  para_user_id, texto) VALUES (<próprio_id>, EMPRESA_SENTINEL_ID, <texto>)`.
- RLS já permite isto sem alteração (policy "enviar mensagens" já existente
  em `15-ARQUITETURA-SYNC-SUPABASE.md` — o utilizador só precisa de saber o
  `para_user_id`, que agora é uma constante fixa, não precisa de descobrir
  "qual admin").

### Fluxo de leitura no Desktop
- Ecrã de Sincronização (ou uma nova aba "Mensagens" dentro dele) lista
  todas as `mensagens WHERE para_user_id = EMPRESA_SENTINEL_ID`, agrupadas
  por utilizador remetente (Service Role Key, sem restrição de RLS).
- Responder a partir daqui usa o mesmo fluxo "Desktop → Mobile" acima.

### Por que isto substitui a "etapa dedicada" que tínhamos deixado em aberto
Não é necessário espelhar identidades de Admin no Supabase nem resolver
"qual admin responde" — há sempre um único ponto de entrada/saída
(a Empresa), que tanto o Desktop como qualquer utilizador PWA conseguem
endereçar sem ambiguidade. Mais simples e mais robusto do que a alternativa
inicialmente considerada.

## 5. Notificações — decisão de implementação

Recomendação: **não criar tabela `notificacoes_mobile` nova nesta fase**.
Derivar as notificações diretamente:
- Cargas: comparar `estado` de `cargas_pendentes` desde a última visita
  (guardar `ultima_visita_cargas` em `localStorage`/`IndexedDB` local) —
  qualquer pendente que mudou para `importada`/`rejeitada` desde então gera
  uma notificação.
- Mensagens: `mensagens WHERE para_user_id = eu AND lida = false`.
- Fila offline: falhas ficam visíveis diretamente na lista de Cargas (badge
  "⚠️ Erro") — não precisam de duplicar como notificação separada, só
  contam para o badge do sino se a falha for persistente (ex: 3+ tentativas).

Isto evita nova infraestrutura e mantém a mesma filosofia "pull" simples já
usada em todo o projeto.

---

## 6. Critério de "pronto"
- [ ] Dock em formato pílula, 4 itens, "+Nova Carga" visualmente destacado
- [ ] Legenda dinâmica só no item ativo
- [ ] Filtro de estado em Cargas consolidado num único botão expansível
- [ ] Sino de notificações funcional, badge de contagem, popover, navegação
- [ ] `EMPRESA_SENTINEL_ID` criado e configurado (Desktop `settings` +
      constante no Mobile)
- [ ] Desktop: clicar no nome de um utilizador PWA (em Utilizadores e em
      Sincronização) abre compositor de mensagem funcional
- [ ] Mobile: composer de mensagens reativado, envia corretamente para o
      sentinela
- [ ] Desktop consegue ler e responder mensagens recebidas de qualquer
      utilizador PWA
