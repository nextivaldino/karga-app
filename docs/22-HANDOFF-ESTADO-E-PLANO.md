# 22 — Handoff: Estado Real e Plano de Continuação

> Documento único e definitivo de transição entre ferramentas de IA. Gerado
> a pedido do utilizador porque os créditos da sessão anterior (Claude Code)
> se esgotaram e o projeto vai continuar com outra ferramenta (Google
> Antigravity). Qualquer IA nova deve começar por este ficheiro — não
> precisa de reler a conversa anterior. Baseado no **código real do
> repositório em 2026-09-05**, não no plano original nem em nenhum relatório
> anterior isoladamente (esses ficam como histórico, ver secção 6).

---

## 1. Visão Geral do Projeto

**Kraga** (marca visual "KARGA") é um sistema profissional de gestão de
cargas consolidadas e expedições marítimas entre a Europa (origem, ex.:
Luxemburgo) e Cabo Verde (destino), pensado para pequenas/médias empresas de
transporte e logística. O produto tem hoje **duas aplicações separadas** que
partilham dados através de uma base Supabase comum:

- **Kraga Desktop** (raiz do repo) — app **Electron + React 19 + TypeScript +
  Vite + Tailwind**, com **SQLite local** (`better-sqlite3`) como fonte de
  verdade offline-first. É onde o Admin faz a gestão operacional completa:
  cargas, contentores, contactos, faturação, relatórios, utilizadores e
  configurações. Usa Repository Pattern (`electron/models/repositories`) e
  IPC centralizado (`electron/ipc`) entre o processo principal e o renderer.
- **Kraga Mobile** (`mobile/`) — PWA independente, também React 19 + TS +
  Vite + Tailwind, mas **sem SQLite**: fala diretamente com o **Supabase**
  (Auth + Postgres) via `@supabase/supabase-js`, com cache/fila de escrita
  offline em `IndexedDB` (`idb`). É usado por funcionários de campo para
  inserir cargas ("cargas pendentes") que o Admin depois revê e importa no
  Desktop.
- **Supabase** é a ponte cloud entre os dois: guarda `pwa_users`,
  `cargas_pendentes`, `contentores_disponiveis` e `mensagens`. A
  sincronização é **manual, unidirecional (pull) e controlada pelo Admin**
  no Desktop — nunca automática nem bidirecional em tempo real. O Desktop
  usa a **Service Role Key** (ignora RLS) só no processo principal Electron;
  o Mobile usa só a **Publishable Key**, restrita por RLS (nunca deve ter a
  Service Role Key — isto é uma regra de segurança fixa, ver `mobile/src/lib/supabase.ts`).

Toda a arquitetura foi desenhada desde o início para uma futura evolução
multi-instância ("multi-posto"), descrita em detalhe na secção 4 — essa
parte **ainda não está implementada**, é só a decisão já tomada para onde o
sistema vai crescer a seguir.

---

## 2. Estado Real Completo (código atual, não o plano)

### 2.1 Desktop — módulos base (sem alterações desde `18-RELATORIO-ESTADO-ATUAL.md`, continuam ✅)

| Módulo | Estado | Onde |
|---|---|---|
| Estrutura base (Electron+React+TS+Vite+Tailwind+SQLite) | ✅ Completo | |
| Auth & Utilizadores (Root/Admin/permissões) | ✅ Completo | `permissaoRepository`, `sessaoRepository`, `auditoriaRepository`, `electron/ipc/index.ts` |
| Módulo Cargas | ✅ Completo | Modo Editor (grelha), duplicação de linha |
| Módulo Contentores | ✅ Completo | Vistas Lista/Ícones, exportação PDF |
| Módulo Contactos | ✅ Completo | CRUD global dentro de Configurações |
| Módulo Faturação | ✅ Completo | Sub-aba dentro de Cargas |
| Módulo Relatórios/Exportação | ✅ Completo | 5 relatórios, Excel/PDF |
| Módulo Configurações | ✅ Completo | Empresa, Contactos, Contentores, Utilizadores, Aparência, Backup/Segurança, PWA Devices (stub), Relatórios, Sincronização |
| Sistema de Notificações (Desktop) | ✅ Completo | Sino + popover, verificação de contentores (30 min) |
| Stub `sync-api` + `pwa-devices` | ✅ Completo (stub, como previsto) | |
| Bloco A — Schema Supabase + RLS | ✅ Completo | |
| Bloco B — Sync Desktop (revisão/importação de pendentes) | ✅ Completo | `electron/main/sync.ts`, `src/modules/sync/` |

### 2.2 O que mudou/avançou **depois** de `18-RELATORIO-ESTADO-ATUAL.md` (2026-09-01 → 2026-09-05)

Tudo confirmado por leitura direta do código atual, não por memória de commits antigos.

**Desktop:**

| Funcionalidade | Estado | Onde / Nota |
|---|---|---|
| Identidade visual "KARGA" (login/about) | ✅ | Popup "Sobre o Karga" no menu hambúrguer, ícone de barco a amarelo. **Inconsistência menor**: o texto do cabeçalho principal (`AppShell.tsx`) ainda diz literalmente "Kraga Desktop", não foi atualizado para "KARGA" — ver secção 3. |
| Pesquisa global no cabeçalho | ✅ | Substituiu o popup "Spotlight" antigo; campo sempre visível entre as abas e o menu de utilizador, resultados cruzados por tipo (contacto → cargas dele + contentor). Portado para o `body` via portal para nunca ficar tapado. |
| **Abas do topo estilo Chrome** (doc `21`, Parte 1) | ✅ Implementado | `src/components/layout/MainTabs.tsx` — silhueta com "flare" côncavo nos cantos (`TabFlare`), aba ativa funde-se com a cor da `ContextToolbar`/conteúdo, inativas com tom de repouso próprio, colapsar para só-ícone via chevron no hover, ícone da app antes da barra de abas (`AppShell.tsx`, `ModuleIcon module="kraga"`). Documentado em `docs/08-DESIGN-SYSTEM.md` secção 4b. **Ver secção 3 para o desvio na Parte 2 (barra da página Cargas).** |
| Cargas: coluna "Origem" com avatar real | ✅ | Mostra avatar do PWA ou do criador Desktop; novo campo `criado_por_user_id` |
| Modo Editor (grelha) — polish | ✅ | Dicas de atalhos, linha de rascunho mais clara, indicador de gravação por linha, toggle mostrar/esconder coluna Observação |
| Contentores: categoria "Lista" | ✅ | Contentor a sério, sinalizado como agrupamento leve, coluna post-it colapsável, ação de conversão para contentor normal |
| **Sync Hub** — página de topo dedicada "Sync" | ✅ | Substituiu a sub-secção escondida em Definições; barra "pro" amarela (seletor contentor/lista, stats por utilizador com avatares reais, atalho "Criar Lista"), lista completa de revisão + aba Histórico (cumpre o critério do doc `19` secção 9) |
| Recibos WhatsApp/e-mail unificados | ✅ | `reciboTemplate` + toggles em Empresa, substitui 3 geradores divergentes antigos; modal de preview estilo papel com visibilidade de colunas e totais ao vivo |
| `FloatingLabelInput` reescrito (Desktop) | ✅ | Label deixa de flutuar sobre valor preenchido, placeholder fantasma quando vazio, tooltip no hover |
| Avatares de utilizador | ✅ | Em notificações, mensagens e listas de carga |
| Botões de criação color-coded | ✅ | cargas=amarelo, contentores=azul, contactos=verde |
| Home — secções colapsáveis | ✅ | Resumo do sistema e "Últimas cargas sincronizadas" |
| Deteção de duplicados de contacto + ações de menu de contexto | ✅ | |
| **Mensagens Desktop↔Mobile** (doc `20`, secção 4 — "ID Sentinela da Empresa") | ✅ Implementado e **confirmado a funcionar nesta sessão** | `EMPRESA_SENTINEL_ID = '00000000-0000-0000-0000-000000000001'` (`electron/lib/mensagens.ts`, `mobile/src/lib/constants.ts`); compositor no Desktop em `src/modules/mensagens/MensagemComposerModal.tsx`. Testado ponta-a-ponta: 2 utilizadores mobile reais enviaram mensagens que apareceram corretamente no dropdown "N mensagens por ler" do Desktop, agrupadas por remetente. |

**Mobile:**

| Funcionalidade | Estado | Onde / Nota |
|---|---|---|
| Modo offline com fila IndexedDB (doc `19` §6) | ✅ Implementado, **com um bug de UX real encontrado nesta sessão** | `useFilaOffline.tsx`, `lib/offlineQueue.ts` — ver secção 3 |
| Sino de notificações (doc `20` §3/§5) | ✅ | `NotificationBell.tsx`, derivado de `cargas_pendentes`/`mensagens`/fila, sem tabela nova (decisão do doc 20 respeitada) |
| Composer de mensagens mobile → Desktop | ✅ **reativado e confirmado a funcionar** | Contradiz o estado "desativado" registado em `18-RELATORIO-ESTADO-ATUAL.md` secção 2/4 — isso já foi resolvido pelo doc `20`. Testado nesta sessão com 2 utilizadores reais, mensagens chegaram ao Desktop. |
| Dock — evoluiu **além** do spec do doc `20` | ⚠️ Ver nota | O doc 20 pedia dock-pílula com 4 itens (Home/Cargas/+Nova Carga/Mensagens). O código atual (`Dock.tsx`) só tem **3 itens: Início · Cargas · +** — "Mensagens" foi retirado da dock e vive só dentro do sino de notificações ("Ver todas as mensagens"). Isto foi uma decisão tomada em sessão(ões) posterior(es) ao doc 20 (commits `f18b7ff`, depois `9b8dedf` "ilha dinâmica na dock"), nunca documentada por escrito — os docs 19/20 ficaram desatualizados neste ponto específico. |
| Identidade visual "Karga" + painel de Definições | ✅ | Commits `9b8dedf`, `eba99cb`, `cd2f716` |
| Alinhamento visual "HeroUI-like" (sem migrar stack) | ✅ | Último commit (`cd2f716`) — ajustes visuais só, Tailwind mantém-se, não houve migração de biblioteca de componentes |
| Formulário Nova Carga — campos de morada | ✅ **testado e a funcionar nesta sessão**, mas **com alterações ainda por commitar** | Ver secção 3 — dependia de uma migração Supabase que só foi aplicada nesta sessão |

### 2.3 Trabalho de teste realizado nesta sessão (2026-09-05)

Para validar o sync ponta-a-ponta, foram usados os utilizadores de teste já
existentes no Supabase (`user01@karga.com` / `user02@karga.com`, password
redefinida para `TesteKarga#2026` via Admin API — ambos test accounts, não
utilizadores reais). Resultado: **10 cargas pendentes reais** (5 por
utilizador) e **2 mensagens reais** foram inseridas no Supabase e confirmadas
visíveis no Sync Hub do Desktop, agrupadas corretamente por utilizador. Nada
foi importado/revisto/rejeitado — ficou tudo em estado `pendente` para
inspeção. Esta atividade descobriu e corrigiu um bug real de produção (ver
secção 3, primeiro item).

---

## 3. Dívida Técnica e Problemas Conhecidos em Aberto

Por ordem de impacto:

1. **🔴 Migração Supabase não commitada** — `supabase/migrations/20260905000000_cargas_pendentes_moradas.sql`
   (adiciona `emissor_morada`/`recetor_morada` a `cargas_pendentes`) estava
   **untracked no git** e **nunca tinha sido aplicada ao Supabase remoto**.
   Isto fazia com que **qualquer envio de carga a partir do Mobile falhasse
   silenciosamente** (erro PostgREST `PGRST204 — column not found`) e caísse
   sem aviso claro na fila offline local, dando a ilusão de "guardado, vai
   enviar mais tarde" quando na realidade nunca teria sido enviado (erro de
   schema, não de rede). **Corrigido nesta sessão** via `supabase db push`
   — a migração já está aplicada no Supabase. **Falta**: dar `git add` e
   commit ao ficheiro da migração (continua untracked) e às restantes
   alterações de código relacionadas (`mobile/src/lib/data.ts`,
   `mobile/src/types.ts`, `src/types/index.ts`, `mobile/src/components/NovaCargaOverlay.tsx`
   já têm os campos de morada implementados no working tree, mas nada disto
   está commitado — ver `git status`/`git diff` antes de continuar).

2. **⚠️ Doc `21` Parte 2 (barra contextual da página Cargas) — implementada com desvios do spec, nunca reconciliada.**
   A Parte 1 (abas Chrome) foi implementada fielmente. A Parte 2 pedia esta
   ordem exata, da esquerda para a direita: `[+Nova Carga]` → omnibox de
   pesquisa → `ViewSwitcher` → Contentor+Filtros → Lista/Faturação
   redesenhado → Modo Editor no fim. O código atual (`src/pages/Cargas.tsx`,
   `ContextToolbar`) tem: Contentor+Filtros **primeiro**, depois um
   `SincronizacaoCargaCard` centrado (não previsto no doc 21, veio do
   checkpoint de sync hub), depois o `ViewSwitcher` Lista/Faturação, e só
   depois, à direita (`ml-auto`), o botão Nova Carga + Modo Editor. A
   pesquisa "omnibox" acabou por ser implementada como campo de pesquisa
   **global no cabeçalho** (fora da página Cargas), não como elemento da
   barra contextual da página Cargas como o doc 21 pedia. **Só o requisito
   "Modo Editor no fim" foi cumprido à letra.** Decisão pendente: ou
   reimplementar a barra conforme o doc 21 literal, ou aceitar o desvio
   atual e reescrever o doc 21 (ou uma nota no doc 08/09) a documentar o
   que foi realmente decidido — atualmente **nenhum documento reflete o
   estado real desta barra**.

3. **⚠️ Armadilha de UX real na fila/lote de Nova Carga (Mobile).**
   Em `NovaCargaOverlay.tsx`, `handleEnviar()` só envia `lote` (as cargas já
   confirmadas com "Guardar e adicionar outra"); se o utilizador preenche a
   última carga do lote e clica diretamente em "Enviar" **sem** primeiro
   clicar "Guardar e adicionar outra", os valores do formulário atual são
   **silenciosamente ignorados** (nem entram no lote, nem dão erro). Isto
   foi reproduzido durante o teste desta sessão (aconteceu ao próprio script
   de automação, exatamente como aconteceria a um humano apressado). Não é
   incoerente com o desenho atual, mas é uma armadilha fácil de cair.
   Sugestão: em `handleEnviar`, se o form atual tiver dados válidos e não
   estiver ainda no lote, incluí-lo automaticamente no envio.

4. **⚠️ Mensagens de erro da fila offline não distinguem "offline real" de "falha de servidor".**
   `useFilaOffline.tsx` já distingue internamente os dois casos no código
   (comentário "Falha a meio... cai para a fila em vez de rebentar"), mas a
   mensagem mostrada ao utilizador é idêntica nos dois casos ("vai enviar
   quando ficares online"). Isto atrasou o diagnóstico do bug nº1 durante
   o teste desta sessão. Considerar UI diferenciada para os dois casos.

5. **⚠️ Ícones da app (`icons/karga.icns`, `icons/karga--icons.icns`) existem mas não estão wired no build.**
   `electron-builder.yml` não tem nenhum campo `icon:` nas secções
   `mac`/`win`/`linux` — o build ainda vai sair com o ícone genérico do
   Electron, apesar dos ficheiros de ícone já existirem no repo (pasta
   `icons/`, untracked).

6. **⚠️ Inconsistência de nome**: cabeçalho principal do Desktop ainda diz
   "Kraga Desktop" (`AppShell.tsx` linha ~64), enquanto o login/about já
   foram atualizados para a marca "KARGA".

7. **Build cross-platform desatualizado.** `.dmg` (mac-arm64) e `.AppImage`
   (linux-arm64) em `release/` datam de 26 Ago — antes de todo o trabalho de
   Sync/Mobile/redesign. Windows (nsis) nunca foi gerado. Precisa de
   rebuild completo antes de qualquer entrega.

8. **Deploy do Mobile nunca foi feito.** Só corre em `localhost:5173`
   (dev). Sem URL público, sem variáveis de ambiente no Vercel. Precisa de
   `vercel login` + `vercel --prod` (ação que precisa da autenticação do
   utilizador, fora do alcance direto de uma IA).

9. **Licença local instável.** Identificador da licença ainda derivado de
   `os.hostname()`, que pode mudar entre reinícios do Electron nalguns Macs
   — devia passar a ser um UUID persistido gerado uma vez.

10. **Sem testes automatizados** em nenhum dos dois projetos (Desktop ou
    Mobile) — toda a verificação até agora foi manual (via CDP/Playwright
    ou inspeção visual).

11. **Duplicação de componentes UI Desktop/Mobile** (`FloatingLabelInput`,
    `Switch`, `BoxedList`, `Toast`) — decisão deliberada (touch-targets/
    font-sizes diferentes, ciclos de deploy independentes), mas é dívida de
    manutenção: uma correção visual num lado não se propaga ao outro.

12. **`textMatch`/`calcularSugestoes`** recalculam Levenshtein contra todos
    os contactos a cada chamada — sem urgência agora, mas não escala bem
    para centenas/milhares de contactos.

13. **Working tree com alterações não commitadas** no fim desta sessão —
    ver `git status`: `electron/main/sync.ts`, `mobile/src/components/Dock.tsx`,
    `mobile/src/components/NovaCargaOverlay.tsx`,
    `mobile/src/components/ui/FloatingLabelInput.tsx`, `mobile/src/lib/data.ts`,
    `mobile/src/pages/CargasPage.tsx`, `mobile/src/types.ts`, `src/types/index.ts`
    modificados; `AGENTS.md`, `Avatares/`, `icons/`, e a migração do item nº1
    untracked. **Qualquer IA nova deve correr `git status`/`git diff` antes
    de assumir que o código reflete o último commit** — este handoff
    descreve o estado do *working tree*, não do último commit em si.

---

## 4. Decisões de Arquitetura Já Tomadas Mas Ainda Não Implementadas

Esta secção descreve a **visão de evolução de longo prazo já acordada com o
utilizador**, para quando se voltar a mexer em login/permissões/notificações.
**Nada disto deve ser implementado sem confirmação explícita do utilizador**
— fica aqui registado para não se perder, não como uma tarefa pronta a
avançar.

### 4.1 Arquitetura Postos/Root

- Vão existir **vários "Postos"** (instalações do Kraga Desktop) — o nome do
  projeto já assume isto (`karga-desktop-posto-01`).
- Um posto especial, o **Karga-Posto-Root**, controla todos os outros
  Postos. Os restantes Postos ficam em vários países (ex.: Cabo Verde,
  Luxemburgo), todos a **partilhar a mesma base de dados** (Supabase).
- Cada Posto gere **os seus próprios utilizadores Mobile** (utilizadores
  PWA) — não é uma lista global única gerida só pelo Root.
- **Código de ativação único por Posto** — cada instalação Desktop
  ativa-se com um código próprio (semelhante ao conceito de licença atual,
  mas por Posto, não por instalação isolada genérica).
- O **sistema de login/autenticação passa a ditar o papel** de cada posto
  (posto-root vs. posto normal noutro país vs. utilizador mobile) — as
  permissões deixam de ser só os 3 papéis atuais (Root/Admin/Utilizador
  secundário, para uma instalação única) e passam a ser multi-tenant/
  multi-posto.
- Isto muda o desenho do sistema de notificações: um posto normal
  provavelmente só deve ver notificações do seu próprio posto; o posto-root
  vê tudo.

### 4.2 Painel Root — acesso e segurança

- O painel do Posto-Root deve ser **acessível via browser** (não só dentro
  do Electron do posto-root), com um **backend próprio** — precisamente
  para que a **Service Role Key nunca chegue ao frontend/browser** (hoje a
  Service Role Key só existe no processo principal Electron; este novo
  painel via browser precisa da sua própria camada de servidor a
  intermediar, nunca expor a chave ao cliente).
- **Reset de password de um Posto/utilizador nunca deve "ver" a password**
  — a ação do Root é sempre "resetar" (gerar nova password ou forçar
  redefinição), nunca "revelar" a password atual. Isto já é parcialmente
  o padrão hoje (`src/modules/root/ResetPasswordModal.tsx` já existe para o
  Root atual — confirmar se já respeita esta regra ou se precisa de ajuste
  quando isto for revisitado).

### 4.3 Login Mobile e recuperação de acesso

- **Login Mobile por username mapeado a email** — hoje o login do Mobile
  (`mobile/src/hooks/useAuth.tsx`) é diretamente por email real via
  Supabase Auth (`supabase.auth.signInWithPassword({ email, password })`).
  A visão futura é o utilizador de campo fazer login com um **username**
  simples (não um email), que internamente é mapeado para o email real
  usado pelo Supabase Auth — mais fácil de comunicar verbalmente a um
  funcionário do que um endereço de email.
- **Reset de password self-service por email via Supabase** — hoje não
  existe nenhum fluxo de "esqueci-me da password" no Mobile (só o Admin/
  Root pode gerir isto pelo Desktop). A visão é ativar o fluxo nativo do
  Supabase Auth de recuperação por email para os utilizadores Mobile.
- **PIN local de 4-6 dígitos** para desbloqueio rápido de sessão
  persistente no Mobile — a sessão já é persistente hoje (token do
  Supabase guardado, doc `19` secção 1), mas sem nenhuma camada extra de
  proteção rápida. A visão é adicionar um PIN local (guardado só no
  dispositivo, não no servidor) que desbloqueia a sessão já autenticada
  sem precisar de reintroduzir email/username+password todas as vezes —
  um segundo fator de conveniência local, não substitui o login real.

### 4.4 Nota de sequenciamento

O utilizador pediu explicitamente, numa sessão anterior, para **não
implementar nada da secção 4 sem antes confirmar** — a prioridade imediata
era resolver pontas soltas de interface primeiro (secção 3). Antes de
avançar com qualquer parte desta secção 4, uma IA nova deve confirmar com o
utilizador que já é o momento certo para o fazer.

---

## 5. Próximos Passos Recomendados (por prioridade)

1. **Reconciliar o estado do git.** Rever `git status`/`git diff`, decidir
   o que commitar (a migração do item 3.1, os campos de morada no Mobile,
   `AGENTS.md`, e decidir o destino de `Avatares/` e `icons/` — parecem
   material de branding a integrar, não lixo).
2. **Resolver a divergência do doc `21` Parte 2** (secção 3, item 2) —
   decidir com o utilizador se se reimplementa a barra literal ou se se
   documenta o desvio atual como decisão final.
3. **Wire dos ícones da app** no `electron-builder.yml` (`icon:` em mac/
   win/linux, apontando para `icons/karga.icns` ou equivalente por
   plataforma).
4. **Corrigir a armadilha de UX da fila/lote** no Mobile (secção 3, item 3)
   — incluir o form atual no envio se tiver dados válidos e não estiver no
   lote.
5. **Diferenciar mensagens de erro "offline" vs "falha real"** na fila
   offline do Mobile (secção 3, item 4).
6. **Corrigir a inconsistência de nome** "Kraga Desktop" → "KARGA" no
   cabeçalho principal (`AppShell.tsx`), para alinhar com o resto do
   rebranding já feito.
7. **Rebuild cross-platform** (mac/win/linux) — o que existe em `release/`
   está desatualizado desde antes do trabalho de Sync/Mobile.
8. **Deploy do Mobile no Vercel** — precisa da autenticação do utilizador.
9. **Corrigir o identificador de licença** para um UUID persistido em vez
   de `os.hostname()`.
10. **Retomar a arquitetura Postos/Root (secção 4)** — só depois de
    confirmar explicitamente com o utilizador que é o momento certo; é a
    mudança de maior impacto (login, permissões, notificações), não deve
    ser avançada de ânimo leve nem parcialmente.

---

## 6. Mapa de Todos os Documentos em `docs/`

| Ficheiro | Cobre |
|---|---|
| `00-ARQUITETURA.md` | Especificação da estrutura base do projeto (Electron+React+TS+Vite+Tailwind+SQLite) — primeiro módulo, esqueleto sem funcionalidades de negócio. |
| `01-MODULO-CARGAS.md` | Especificação original do módulo Cargas (registo/listagem/edição) + base de Contactos. Substituído na prática por `12` (schema mantém-se). |
| `02-MODULO-CONTENTORES.md` | Especificação original do módulo Contentores (criação, gestão, fecho, exportação porto/alfândega). Substituído na prática por `13` (schema mantém-se). |
| `03-MODULO-FATURACAO.md` | Controlo de pagamentos (pago/devido) por cliente, fatura/recibo PDF, envio WhatsApp. |
| `04-MODULO-RELATORIOS.md` | Relatórios consolidados + exportação genérica Excel/PDF. |
| `05-MODULO-CONFIGURACOES.md` | Especificação original do painel de Configurações (moeda, prefixos, empresa, temas, backup). Substituído na prática por `14`. |
| `06-MODULO-AUTH-AVANCADO.md` | Papel Root, utilizadores secundários, permissões granulares, auditoria. |
| `07-BUILD-RELEASE.md` | Empacotamento multiplataforma e checklist de entrega. |
| `08-DESIGN-SYSTEM.md` | Tokens visuais, `FloatingLabelInput`, Header Bar, ícones, e (secção 4b) a receita completa das abas estilo Chrome. **Ler antes de qualquer trabalho de UI no Desktop.** |
| `09-ARQUITETURA-PAGINAS.md` | Mapa definitivo de navegação: 4 páginas de topo (Home/Cargas/Contentores/Configurações — nota: `Sync` foi adicionada depois, ver secção 2.2 deste handoff), sem sidebar. |
| `10-PAGINA-HOME.md` | Página Home estilo GNOME Activities Overview. |
| `11-SISTEMA-NOTIFICACOES.md` | Sistema de notificações do Desktop (nativas OS + centro interno). |
| `12-MODULO-CARGAS-COMPLETO.md` | Especificação final/definitiva da página Cargas (substitui `01`). |
| `13-MODULO-CONTENTORES-COMPLETO.md` | Especificação final/definitiva da página Contentores, estilo Finder/Nautilus (substitui `02`). |
| `14-MODULO-CONFIGURACOES-COMPLETO.md` | Especificação final/definitiva de Configurações, estilo Boxed Lists (substitui `05`). |
| `15-ARQUITETURA-SYNC-SUPABASE.md` | Desenho da camada de sincronização Desktop↔Supabase↔Mobile: schema, RLS, regra "pull manual, nunca automático". |
| `16-MODULO-SYNC-DESKTOP.md` | Ecrã de revisão/importação de cargas pendentes no Desktop, gestão de utilizadores PWA habilitados, resolução de conflitos. |
| `17-MOBILE-PWA.md` | Especificação original do Mobile PWA (online-only, sem fila offline). Secções de interface substituídas por `19`; schema/backend mantém-se válido. |
| `18-RELATORIO-ESTADO-ATUAL.md` | Relatório de estado gerado a partir do código real, cobrindo até ao fim do Bloco B (Sync Desktop) e o arranque do Bloco C (Mobile). Ponto de partida deste handoff (secção 2 atualiza tudo o que mudou desde aqui). |
| `19-KARGA-MOBILE-REDESIGN.md` | Redesign completo do Mobile: sessão persistente, credenciais padrão, dock estilo iOS (versão intermédia, já superada — ver `20` e secção 2.2), Home em cards, popup Nova Carga reorganizado, modo offline com fila IndexedDB. |
| `20-KARGA-MOBILE-DOCK-NOTIFICACOES-MENSAGENS.md` | Complementa `19`: dock em pílula (também já superada, ver secção 2.2), filtro de estado consolidado, sino de notificações, e a solução do "ID Sentinela da Empresa" para mensagens Desktop↔Mobile↔Desktop. |
| `21-PROMPT-REDESIGN-ABAS-CHROME-E-BARRA-CARGAS.md` | Prompt de tarefa para o redesign das abas de topo estilo Chrome (Parte 1, ✅ implementada) e reorganização da barra contextual da página Cargas (Parte 2, ⚠️ implementada com desvios — ver secção 3, item 2). |
| `22-HANDOFF-ESTADO-E-PLANO.md` | Este documento. |

---

*Fim do handoff. Qualquer IA nova: comece por correr `git status` e
`git diff` para confirmar o estado exato do working tree antes de agir —
este documento descreve-o fielmente a partir de 2026-09-05, mas o tempo não
para.*
