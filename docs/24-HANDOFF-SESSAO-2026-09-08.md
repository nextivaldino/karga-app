# 24 — Handoff: Sessão de 2026-09-08 (fiabilidade de sync, chat unificado, mobile)

> Documento gerado a pedido do utilizador para transição para outra sessão/
> ferramenta de IA. Cobre tudo o que foi feito nesta sessão, a partir do
> código real (commits) e do estado confirmado em produção — não do plano
> original. Continua o handoff anterior, `docs/22-HANDOFF-ESTADO-E-PLANO.md`
> (2026-09-05), que deve ser lido primeiro para contexto de fundo (arquitetura
> geral, Bloco A/B/C, decisões fixas do projeto).

---

## 1. Contexto de entrada

A sessão começou com uma auditoria completa ao sistema (sync, notificações,
fiabilidade) a pedido do utilizador. Entre 2026-09-05 (doc 22) e o início
desta sessão, o utilizador tinha avançado sozinho, fora de sessões
planeadas, com uma primeira implementação real da arquitetura multi-posto
descrita no doc `23-ARQUITETURA-POSTOS-ROOT.md` (tabela `postos`, RLS por
posto, painel Root — mas implementado dentro do **Mobile**, não do Desktop
como o doc 23 previa). Essa implementação tinha bugs de correção ativos,
que foram a primeira coisa resolvida nesta sessão.

**Regra seguida a pedido do utilizador**: código/decisões já tomadas por
ele fora de sessão são tratados como fonte da verdade — nunca sugerir
reverter para "o plano antigo".

---

## 2. O que foi feito (7 commits, todos no branch `main`)

### `3599e9a` — fix(sync): filtrar sync por posto e tornar resolução de posto resiliente
- `electron/main/sync.ts` lia `cargas_pendentes` sem filtrar por
  `posto_id` (usa Service Role Key, ignora RLS) — com 2+ postos ativos,
  qualquer Desktop passaria a ver/importar cargas de outros postos.
- `resolverPostoId()` (`electron/lib/supabaseClient.ts`) agora prioriza
  `KARGA_POSTO_ID` (env) → valor persistido em `settingsRepository` →
  auto-deteção (só com exatamente 1 posto ativo, persistindo o resultado).
- `upsertPwaUser`/`upsertContentorDisponivel` passam a enviar `posto_id`
  sempre.
- Nova UI em **Configurações → Sincronização** (Desktop) para escolher o
  posto manualmente quando há ambiguidade.
- Notificação no sino quando o posto não está configurado.
- Migração `supabase/migrations/20260908120000_backfill_pwa_users_posto_id.sql`
  para o histórico do backfill já aplicado em produção (ver secção 4).

### `31ee7e7` — feat(faturacao): cargas por contacto em qualquer papel + recibo unificado
- Contactos que só são **recetor** de uma carga (nunca emissor) não
  apareciam na Faturação nem tinham forma de receber recibo. Nova
  `cargaRepository.listarPorContacto` cobre emissor OU recetor;
  `resumoPorCliente` passa a incluir esses contactos (dívida continua a
  refletir só o lado emissor — é quem é cobrado).
- **Contactos** (Configurações) ganhou botão "Ver cargas" → salta para
  Faturação já filtrada nesse contacto.
- Unificados os 2 geradores de recibo (texto WhatsApp/e-mail vs PDF de
  fatura), que calculavam totais em separado e podiam divergir — agora
  partilham `src/lib/cargaTotais.ts` como única fonte de verdade.

### `e2df6c8` — feat(mensagens): chat estilo WhatsApp, lista completa de conversas
- O sino de mensagens do Desktop só mostrava quem tinha mensagens por ler
  (desaparecia por completo sem nenhuma) e duplicava lógica de balões com
  o `MensagemComposerModal` — dois pontos de entrada divergentes.
- Nova `mensagens.listarConversas()` mostra sempre todos os utilizadores
  PWA-habilitados, com última mensagem e não lidas.
- Novo componente partilhado `ChatConversa` (separadores de data, balões
  com cantos assimétricos, tique de leitura) — usado tanto pelo sino como
  pelo modal, elimina a duplicação.
- Mobile ganhou os mesmos balões no lugar dos cards planos "Recebida/
  Enviada".

### `3a5342f` — feat(mobile): seletor de contentor, Home compacta, padrão visual único
- Com vários contentores abertos em simultâneo em produção, a resolução
  automática de "1 só" deixou de chegar. Novo `ContentorPickerSheet`
  (Home + Nova Carga) permite escolher manualmente, mantendo a
  auto-deteção como omissão.
- Corrigido popup de notificações do Mobile que abria fora do ecrã em
  telas estreitas (estava ancorado ao botão, não ao canto do ecrã).
- Home redesenhada mais compacta, alinhada à linguagem visual do Desktop
  (cards pastel sem borda, ícone solto, sem blur decorativo).
- Padrão visual único espalhado ao resto da app Mobile: radius arbitrários
  reconduzidos aos 3 tokens (`control`/`surface`/`pill`), `.card-surface`/
  `.btn-primary` generalizados onde estavam reimplementados à mão.

### `24b4a07` — fix(sync): importarCarga resiliente a falha de rede + notificações reais
- `importarCarga` criava a carga local **antes** de confirmar no Supabase;
  se a confirmação falhasse, a carga ficava órfã e a pendente continuava
  `'pendente'` — reimportar duplicava. Agora `create`+`addDestinatario`
  correm numa transação local só, e se a confirmação remota falhar,
  `reverterImportacaoFalhada` desfaz a escrita local antes de relançar o
  erro.
- `importarCarga`/`rejeitarCarga` passam a registar notificação
  persistente no sino quando falham (sem categoria — não pode ser
  silenciada).

### `89a03bc` — fix(mobile): fila offline com contagem de tentativas e backoff
- Qualquer falha ao enviar carga (rede, sem posto, contentor inexistente)
  tinha o mesmo tratamento — retentável para sempre. Nova
  `classificarErro` marca cada falha como `transitorio` (rede,
  desconhecido) ou `permanente` (sessão expirada, sem posto, contentor
  indisponível).
- `processarFila` (automático ao reconectar) só retenta transitórios já
  fora da janela de backoff exponencial; permanentes ficam à espera de
  `reenviarItem` explícito (botão "Enviar" por linha em Cargas).

### `bafcacb` — feat(mensagens): balão flutuante estilo Messenger no canto inferior direito
- O sino de mensagens do Desktop saiu do cabeçalho e passou a ser um
  balão fixo no canto inferior direito, sempre visível por cima do
  conteúdo — inspirado no widget do Messenger em facebook.com. Em
  repouso é neutro; com mensagens por ler fica com cor de destaque,
  badge e pulso subtil. O painel abre para cima do balão.

---

## 3. Ações operacionais (não são commits de código)

- **Login do Desktop**: o utilizador reportou não conseguir entrar. Não
  era bug de código — a app estava a ser aberta diretamente pelo
  executável do Electron dentro de `node_modules` (mostrava só a página
  genérica do Electron, nunca chegava a carregar o Kraga). Resolvido:
  matei esse processo e arranquei corretamente com `npm run dev` a
  partir da raiz do projeto. **Lição para o utilizador**: usar sempre
  `npm run dev` a partir da pasta `Karga-tf`, nunca abrir o binário do
  Electron diretamente.
- **Password resets locais/produção** (com autorização explícita do
  utilizador em cada caso, por linhas/IDs concretos, nunca por predicado
  amplo — ver `feedback_producao_escritas_supabase.md` na memória):
  - Backfill de `posto_id` em 2 `pwa_users` de produção (`user_02`,
    `User-01`) que tinham ficado `NULL` antes da correção desta sessão.
  - Reset da password do Admin do Desktop (`ivaldinofortes@gmail.com`,
    base de dados **local**, `~/Library/Application Support/kraga-desktop/kraga.db`)
    para `neverchange` — o utilizador deve trocá-la por uma definitiva.
- **Deploy do Karga Mobile no Vercel**: nunca tinha sido feito (doc 22
  §5 item 8, já resolvido nesta sessão). Configuradas as variáveis de
  ambiente em falta (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`)
  e publicado em produção. **URL pública: https://mobile-two-lime.vercel.app**

---

## 4. Estado real da arquitetura multi-posto (confirmado em produção)

- Existe **1 posto ativo** ("Posto Principal") no Supabase.
- Os 11 `contentores_disponiveis` existentes já tinham `posto_id` correto
  (a auto-deteção de posto único já funcionava para eles antes desta
  sessão).
- 2 `pwa_users` tinham ficado com `posto_id = NULL` (criados antes da
  correção a `upsertPwaUser`) — corrigido via backfill pontual (ver
  secção 3) + migração `20260908120000_backfill_pwa_users_posto_id.sql`
  para o histórico.
- **Produção tem vários contentores abertos em simultâneo** (nomes por
  mês/rota: "Setembro", "Contentor Agosto", etc.) — foi o que motivou
  reverter parcialmente a decisão antiga "sem seletor manual" do Mobile.

---

## 5. Por fazer — não avançado nesta sessão

Por ordem do que ficou combinado com o utilizador (ver secção 6 para o
que ficou em aberto/inconcluso):

1. **Empacotamento e branding** — ícones da app não wired no
   `electron-builder.yml` (build sai com ícone genérico); confirmar se
   o cabeçalho principal ainda diz "Kraga Desktop" em vez de "KARGA"
   (parece já corrigido, ver `AppShell.tsx` — confirmar); licença local
   ainda deriva de `os.hostname()` (instável entre reinícios em alguns
   Macs).
2. **Sino de notificações "de sistema"** separado do de negócio — hoje
   não há, nem no Desktop nem no Mobile, um centro só para
   erros/falhas do sistema, distinto de "carga importada"/"mensagem
   nova". Esta sessão já ligou várias falhas reais ao sino existente
   (posto não configurado, falha de importação/rejeição), mas
   continuam misturadas com as notificações de negócio.
3. **Painel de Definições do Mobile** — pedido explicitamente pelo
   utilizador nesta sessão ("prepara um novo painel de configurações
   para o mobile"), mas **ficou por esclarecer e não foi implementado**.
   O utilizador respondeu a uma pergunta de esclarecimento selecionando
   simultaneamente "só redesenhar visualmente" e "adicionar
   funcionalidades novas" (preferências de notificações, info de
   perfil/posto) mais "outra coisa — vou explicar", mas a explicação
   seguinte não foi compreensível ("facial the movie collapse" — texto
   sem sentido, provavelmente erro de transcrição). **Próximo passo:
   voltar a perguntar ao utilizador o que quer exatamente antes de
   mexer** — não avançar sozinho dado o histórico de respostas
   contraditórias/pouco claras neste pedido específico.
4. **Sem testes automatizados** em nenhum dos dois projetos — continua
   por fazer, mencionado desde o handoff anterior.

---

## 6. Notas de comportamento a preservar (memória entre sessões)

- **Escritas em produção Supabase precisam de autorização explícita por
  linhas/IDs concretos**, não só um pedido genérico ("corrige a
  policy") — o classificador de segurança do harness bloqueia
  predicados amplos mesmo com autorização geral prévia. Ler primeiro,
  depois confirmar a lista exata de IDs afetados.
- **Ajustes que o utilizador faz sozinho fora de sessão** (ex: a
  primeira versão da arquitetura multi-posto) devem ser tratados como
  fonte da verdade — nunca sugerir reverter para o plano documentado
  antigo.
- Este utilizador escreve de forma muito informal/com erros de
  digitação frequentes — quando uma instrução não fizer sentido, vale a
  pena confirmar antes de agir, em vez de adivinhar (ex: item 3 da
  secção 5).

---

*Fim do handoff. Antes de continuar, correr `git log --oneline -10` e
`git status` para confirmar que o estado do repositório continua a bater
certo com este documento — o tempo não para.*
