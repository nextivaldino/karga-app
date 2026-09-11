# doc_mobile.md — Estado atual do Karga Mobile (pré-reescrita)

> Levantamento técnico e funcional do Karga Mobile **tal como existe hoje**,
> feito por leitura direta de todo `mobile/src/`. Não é o plano original
> (`docs/17`, `19`, `20`, `25`) — esses ficaram desatualizados por ajustes
> feitos diretamente no código ao longo de várias sessões. Este documento é
> a fonte da verdade do estado atual, para servir de referência a uma
> reescrita do zero (saber o que existe, o que decidir manter, o que
> deixar cair).
>
> Snapshot no commit `7acef37` (2026-09-10). App: PWA Vite + React,
> deployment próprio no Vercel (projeto `mobile`, independente do
> Desktop), consumindo o mesmo Supabase que o Kraga Desktop.

---

## 1. Visão geral

Kraga Mobile é uma **PWA** (não uma app nativa) para funcionários de campo
inserirem cargas e consultarem o estado das que já enviaram, e para verem
mensagens/notificações vindas do Desktop. Só existe o modo "utilizador" —
o modo Admin/paridade total previsto no plano original nunca foi
construído. Existe um `RootPanelPage` separado, mas serve só o `Root`
técnico (gestão de Postos e identidades globais), não é o "modo Admin"
do PWA.

- **Sem router.** Navegação é um `useState` num contexto React
  (`useNavigation`), 3 páginas de topo: `home` | `cargas` | `definicoes`.
  Sem URL, sem deep-link, sem histórico do browser, sem back button real.
- **Online-only para dados.** O service worker (vite-plugin-pwa) só faz
  cache de assets estáticos (`js,css,html,ico,png,svg`) — nunca dos dados.
  A app tem a sua própria cache de leitura em IndexedDB (`lib/offlineQueue.ts`)
  para não ficar em branco sem rede, mas isso é código da app, não do SW.
- **Fila de escrita offline real.** Criar uma carga sem rede não falha —
  vai para uma fila local (IndexedDB) e é reenviada automaticamente
  quando a rede volta, com backoff exponencial.
- **Mesmo Supabase do Desktop**, RLS-restrito à conta autenticada
  (`auth.uid()`), nunca a service role key.

---

## 2. Stack técnica

- Vite 6 + React 19 + TypeScript (strict, `noUnusedLocals`,
  `noUncheckedIndexedAccess`)
- Tailwind CSS 3 (tokens custom via CSS vars, ver §7)
- `@supabase/supabase-js` (só a Publishable Key)
- `idb` (wrapper IndexedDB) — fila offline + cache de leitura
- `@phosphor-icons/react` (não lucide-react, ao contrário do Desktop)
- `vite-plugin-pwa` (manifest + service worker `autoUpdate`)
- Sem router, sem state manager externo (Context API + hooks só)
- Deploy: Vercel, projeto `mobile` próprio (ligado por `mobile/.vercel/`),
  independente do resto do repo

Build atual gera **1 chunk único de ~665KB** (aviso do Rollup no build) —
não há code-splitting nenhum.

---

## 3. Estrutura de ficheiros (`mobile/src/`)

```
App.tsx                        shell: auth/pin/página ativa → decide o que renderizar
main.tsx                       entry point
types.ts                       todos os tipos partilhados (não há pasta types/)

pages/
  LoginPage.tsx                 login (email OU nome + password)
  LoginBackdrop.tsx              fundo decorativo estático (login + PIN unlock)
  TrocarPasswordPage.tsx        troca obrigatória de password (must_change_password)
  PinUnlockPage.tsx             desbloqueio rápido por PIN (sessão já válida)
  HomePage.tsx                  dashboard compacto (3 cards + alertas de fila)
  CargasPage.tsx                lista/grelha de cargas, agrupada por contacto
  DefinicoesPage.tsx            perfil, posto, notificações, aparência, segurança, PIN
  RootPanelPage.tsx             painel separado para tipoAcesso==='root'

components/
  Header.tsx                    barra superior fixa (logo + ilha + engrenagem)
  DynamicIsland.tsx             pílula escura: contentor ativo + notificações
  CargasToolsMenu.tsx           "bola" a seguir à ilha (só Cargas): vista + filtro
  Dock.tsx                      navegação inferior (Início/Cargas/+) + banner sync
  NovaCargaOverlay.tsx          formulário full-screen de nova carga (com lote)
  ContentorPickerSheet.tsx      seletor de contentor (bottom sheet OU dropdown)
  CargaListRow.tsx / CargaGridCard.tsx   linha/cartão de uma carga
  NotificationBell.tsx          gatilho + painel notificações/mensagens
  MensagensTab.tsx               conteúdo da aba "Mensagens" (chat com o Admin)
  GearMenu.tsx                  botão que navega para Definições
  PasswordBanner.tsx            aviso para trocar password padrão
  AvatarPickerMobile.tsx        emoji predefinido ou upload base64
  PullToRefresh.tsx             gesto "puxar para atualizar" custom
  ui/FloatingLabelInput.tsx     input/textarea/select com legenda flutuante
  ui/PhoneField.tsx             campo de telefone com seletor de indicativo
  ui/Switch.tsx                 toggle pill
  ui/Toast.tsx                  sistema de toast global (store módulo, sem contexto)

hooks/                          um contexto React por hook, todos com padrão
                                 createContext + Provider + useXxx() que lança se
                                 usado fora do Provider
  useAuth.tsx                   sessão Supabase + pwaUser + login/logout/changePassword
  useTheme.tsx                  light/dark, persistido em localStorage
  useNavigation.tsx             página ativa (sem router)
  useContentorAtivo.tsx         lista de contentores + "contentor ativo" (para novas cargas)
  useCargasToolbar.tsx          vista lista/grelha + filtro de estado + filtro de contentor
  useNovaCargaOverlay.tsx       aberto/fechado do formulário + prefill
  useFilaOffline.tsx            fila de escrita offline (IndexedDB) + retry/backoff
  useNotificationPanel.tsx      aberto/fechado + aba ativa do painel de notificações
  usePinLock.tsx                bloqueado/desbloqueado por PIN após sessão válida

lib/
  supabase.ts                   client (lança erro se faltar .env)
  data.ts                       TODAS as chamadas Supabase (queries + RPCs + mapRow)
  offlineQueue.ts                IndexedDB: fila de escrita + cache de leitura
  cargaEstado.ts                labels/ícones/cores por estado de carga
  cargaVisual.ts                 cor de marca fixa do módulo Cargas (#ffb400)
  rowAccents.ts                  paleta de acentos por contacto + cálculo de contraste
  themeTokens.ts                 espelho JS de theme.css (para inverter tema inline)
  constants.ts                   EMPRESA_SENTINEL_ID (destinatário fixo de mensagens)
  errorMessages.ts               classifica erros em mensagem humana + transitório/permanente
  formatRelativo.ts              "há 5 min" / "ontem" / datas
  pinLocal.ts                    PIN local (hash SHA-256, nunca vai ao servidor)
  preferenciasNotificacoes.ts    on/off por tipo de notificação (localStorage)
  notificacoesVistas.ts          quais notificações já foram vistas (localStorage)
  contactSuggestions.ts          autocomplete de nomes/cargas recentes (localStorage)
  paisesIndicativo.ts            indicativos telefónicos fixos (Emissor/Recetor)

styles/theme.css                 tokens de design (ver §7)
```

---

## 4. Árvore de providers (`App.tsx`)

```
ThemeProvider
 AuthProvider
  PinLockProvider
   FilaOfflineProvider
    ContentorAtivoProvider
     NavigationProvider
      NovaCargaOverlayProvider
       NotificationPanelProvider
        CargasToolbarProvider
         AppShell            ← decide o que renderizar (ver §5)
         ToastContainer
```

`AppShell` decide em cascata: `loading` → `!session` (LoginPage) →
`bloqueado` (PinUnlockPage) → `trocarPasswordAberto`/`mustChangePassword`
(TrocarPasswordPage) → `tipoAcesso==='root'` (RootPanelPage, substitui TUDO,
sem Header/Dock) → senão o shell normal: `Header` + página ativa (Home/
Cargas/Definições) + `Dock` + `NovaCargaOverlay`.

**Nota de arquitetura:** `App.tsx` está bem fino (delega tudo a hooks),
mas a árvore de 9 providers aninhados é o candidato óbvio a simplificar
numa reescrita (ex: um único `AppProviders` que compõe a lista, ou
mover para Zustand/Jotai se a app crescer mais).

---

## 5. Autenticação e permissões

- Login por **email OU nome de utilizador** (RPC `resolver_email_login`
  resolve o nome para email antes do `signInWithPassword`, porque RLS
  impede ler `pwa_users` antes de autenticar).
- `pwaUser` (linha em `pwa_users`) é buscado logo após a sessão validar;
  se `!ativo`, faz logout forçado imediato com mensagem "acesso
  desativado".
- `mustChangePassword` vem de `user_metadata.must_change_password` na
  sessão Supabase (não de uma coluna em `pwa_users`).
- **PIN local** (`usePinLock` + `pinLocal.ts`): opcional, guardado como
  hash SHA-256 em `localStorage`, nunca no servidor. Só protege reabrir a
  app com sessão já válida (não deteção de inatividade/background).
  Removido automaticamente em qualquer logout explícito.
- `tipoAcesso`: `'root' | 'admin' | 'user'` — mas `RootPanelPage` só trata
  de facto `root`; não há UI diferenciada para `admin` vs `user` no PWA
  (o plano original previa isso, nunca foi implementado).
- Sem 2FA, sem revogação de sessões (decisão consciente, ver memória do
  projeto — fora do beta).

---

## 6. Modelo de dados (via `lib/data.ts`)

Tabelas Supabase usadas diretamente (nomes de coluna em snake_case,
mapeados para camelCase no cliente):

| Tabela | Uso no Mobile |
|---|---|
| `pwa_users` | perfil próprio (nome/avatar edita), leitura global só para `root` |
| `contentores_disponiveis` | view/tabela já filtrada (estado aberto, não bloqueado, não oculto) |
| `cargas_pendentes` | cargas inseridas pelo Mobile, RLS restringe às do próprio utilizador |
| `mensagens` | chat simples utilizador ↔ "Empresa" (sentinel UUID fixo) |
| `postos` | só via RPC `meu_posto_info` (leitura) e CRUD só para `root` |

RPCs: `resolver_email_login`, `meu_posto_info`, `root_atualizar_pwa_user`
(SECURITY DEFINER — contorna o GRANT restrito de `pwa_users` para o Root
poder mudar `tipo_acesso`/`posto_id`/`ativo` de outra pessoa).

Tipos centrais (`types.ts`): `CargaPendente`, `NovaCargaPendenteInput`,
`ContentorDisponivel`, `Mensagem`, `PwaUser`, `MeuPostoInfo`, `Posto`,
`UtilizadorRoot`, `ItemFilaOffline`. **Sem schema/Zod** — os tipos são só
TypeScript, validação é manual e dispersa pelos formulários.

---

## 7. Sistema de design

Tokens em `styles/theme.css` (CSS vars, expostos ao Tailwind via
`tailwind.config.js`): `primary` (#006fee), `success`, `error`, `warning`,
`purple` — paleta idêntica à do HeroUI. Dark mode via `[data-theme="dark"]`
num container (não só `prefers-color-scheme`), o que permite **inverter o
tema só numa subárvore** (usado no `NovaCargaOverlay`, `ContentorPickerSheet`
dropdown, `NotificationBell`, `CargasToolsMenu` — todos os painéis "que
nascem" do cabeçalho usam sempre o tema oposto ao da app, para se
destacarem do fundo).

Linguagem visual dominante: **"blocos de cor vivos"** — grupos de cargas
(por contacto) e cards da Home usam preenchimento sólido a 100% (não tint
a 10-15%), com a cor do texto calculada dinamicamente por contraste
(`corTextoSobre`, luminância ITU-R BT.601), nunca fixa a preto/branco.

Radius: `--radius-control` (13px, inputs/botões), `--radius-surface`
(18px, cards/painéis), `--radius-pill` (999px, botões/switches/dock).

**Inspiração iOS explícita em duas zonas:**
- `Header`/`DynamicIsland`: pílula escura fixa (`#1c1c1e`, não segue o
  tema), estilo Dynamic Island da Apple — contentor ativo + notificações
  fundidos num só elemento.
- `DefinicoesPage`: grupos com título pequeno maiúsculo + card por secção,
  ícones em squircle colorido (não círculo), separadores com inset
  (começam depois do ícone, não edge-to-edge), grabber no bottom sheet
  do PIN — feito nesta sessão, ver §10.

Não há biblioteca de componentes — tudo é Tailwind + primitivos próprios
(`FloatingLabelInput`, `PhoneField`, `Switch`, `Toast`). Não há
Storybook nem testes visuais.

---

## 8. Navegação e "ilha dinâmica" (estado desta sessão)

Header fixo em todas as páginas (exceto Root): logo | `DynamicIsland` |
engrenagem → Definições. A `DynamicIsland` mostra sempre: contentor ativo
(toca para abrir `ContentorPickerSheet` variant="dropdown") + botão
reconectar (só se offline) + `NotificationBell`. Nunca mais nada dentro
dela — as ferramentas específicas de Cargas (vista lista/grelha, filtro de
estado, filtro de contentor) vivem atrás de uma "bola" (`CargasToolsMenu`)
logo a seguir à ilha, só visível na página Cargas, que abre um painel
dropdown próprio ("Vista e filtro").

Escolher um contentor na `DynamicIsland` (não no seletor dentro de "Nova
Carga") faz 3 coisas: define o contentor ativo (para novas cargas),
define `contentorFiltroId` em `useCargasToolbar`, e navega para Cargas —
a lista já vem filtrada por esse contentor via query Supabase
(`listMinhasCargasPendentes(contentorId)`), não só em memória. Contentor
sem cargas mostra mensagem dedicada ("Contentor X vazio").

`Dock` (navegação inferior): só `Início`/`Cargas` + botão "+" (Nova
Carga) — cresce para mostrar um banner quando há itens a enviar ou com
erro na fila offline.

---

## 9. Fila offline e resiliência

`useFilaOffline` + `lib/offlineQueue.ts` (IndexedDB, DB `kraga-mobile`,
stores `fila` e `cache`):

- Criar carga sem rede (`navigator.onLine === false`) → vai direto para
  a fila, nunca tenta a rede.
- Com rede mas o pedido falha a meio → também cai para a fila (não perde
  dados), classificado por `errorMessages.ts` em **transitório**
  (rede/desconhecido — retry automático com backoff exponencial, base
  30s, teto 30min) ou **permanente** (sessão expirada, sem posto, RLS,
  contentor inexistente — só reenvia com ação explícita do utilizador).
- Item da fila guarda o `donoUserId`/`donoNome` no momento da criação —
  se a conta ativa mudar (telemóvel partilhado), o item fica bloqueado
  como erro permanente em vez de ser reenviado atribuído à conta errada.
- `listContentoresDisponiveis`/`listMinhasCargasPendentes` (sem filtro)
  caem para uma cópia em cache (última leitura com sucesso) se a rede
  falhar — só para a app não ficar em branco, nunca é fonte de verdade.
- Reconecta automaticamente ao evento `online` do browser.

---

## 10. O que mudou nesta sessão (contexto imediato, não fica no histórico do git sozinho)

1. `DefinicoesPage.tsx` redesenhado para se aproximar mais do painel
   Definições real do iOS (ícones squircle, separadores inset, grabber
   no sheet do PIN).
2. Deploy de produção feito no Vercel (`https://mobile-two-lime.vercel.app`).
3. Seletor de contentor da ilha passou a redirecionar para a lista de
   Cargas já filtrada a esse contentor (antes só definia o "contentor
   ativo", sem efeito na lista).
4. Ferramentas de Cargas (vista/filtro) extraídas da ilha dinâmica para
   um menu próprio acedido por uma "bola" ao lado da ilha
   (`CargasToolsMenu.tsx`) — decisão tomada depois de testar (e descartar)
   uma barra flutuante separada acima do Dock.

---

## 11. Limitações conhecidas / dívida técnica (candidatos a repensar numa reescrita)

- **Sem router real** — sem deep-link, sem partilhar um link para uma
  página específica, sem gesto "voltar" nativo do browser/Android.
- **Sem code-splitting** — 1 chunk de 665KB, tudo carregado no arranque.
- **9 providers React aninhados** em `App.tsx` — funciona, mas é o tipo
  de estrutura que degrada mal ao crescer.
- **Validação de formulário manual e dispersa** (`NovaCargaOverlay` faz
  tudo a régua e esquadro, sem schema declarativo).
- **`RootPanelPage` mistura dados de demo com reais** (`demo` prop,
  `POSTOS_INICIAIS` hardcoded) — single file de ~250 linhas com JSX quase
  todo em linha, pouco decomposto.
- **Cores em hex cru espalhadas pelo código** (`CORES_TIPO`,
  `COR_ESTADO_FILTRO`, `CORES` em HomePage, etc.) em vez de só tokens —
  necessário porque cálculo de contraste (`corTextoSobre`) exige o valor
  resolvido, mas nunca foi centralizado num único lugar.
- **`contentorAtivoId` vs `contentorFiltroId`** — dois conceitos
  parecidos (contentor por omissão para novas cargas vs contentor a
  mostrar na lista) que já causaram confusão nesta própria sessão; vale a
  pena nomear/explicar melhor ou fundir se fizer sentido numa reescrita.
- **Sem testes** (unitários, integração ou E2E) — todo o código deste
  documento foi verificado por leitura + smoke visual manual (Playwright
  ad-hoc), não por suite automatizada.
- **PWA "online-only"** é uma escolha deliberada (doc 17 §8), mas
  significa que abrir a app sem rede nenhuma (nem cache) mostra listas
  vazias, não um estado "sem ligação" explícito em todo o lado.
- **`tipoAcesso: 'admin'`** existe no tipo mas não tem nenhuma UI própria
  no Mobile — confirmar se ainda é necessário no rewrite ou se morreu de
  vez a ideia de paridade Desktop/PWA para Admin.

---

## 12. Ambiente / build

- `.env.local`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`
  (client falha ao arrancar sem estas — sem fallback).
- `npm run dev` → Vite na porta 5173 (ou seguinte livre).
- `npm run build` → `tsc --noEmit` + `vite build` (falha o build se o
  type-check falhar).
- Deploy: `vercel --prod` a partir de `mobile/` (projeto já ligado,
  `mobile/.vercel/project.json`), independente do deploy do Desktop.
