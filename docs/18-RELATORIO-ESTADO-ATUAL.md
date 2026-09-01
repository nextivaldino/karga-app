# 18 — Relatório de Estado Atual do Projeto

> Gerado a pedido do utilizador, com base no código real do repositório (não
> na memória do plano). Cobre o estado até ao fim do Bloco B (Sync Desktop)
> e regista também o que já existe do Bloco C (Mobile PWA), que na prática
> já avançou substancialmente durante esta sessão — ver nota na secção 2.

---

## 1. Resumo do Bloco B (Sync Desktop)

**Estado: ✅ Completo e testado ponta-a-ponta com dados reais.**

| Funcionalidade | Estado | Onde |
|---|---|---|
| Toggle "Pode sincronizar via PWA" | ✅ | `electron/main/userManagement.ts` (`habilitarPwa`/`desabilitarPwa`), UI em `GestaoUtilizadores.tsx` + `PwaPasswordModal.tsx` |
| Criação/reativação de conta no Supabase Auth | ✅ (corrigido) | `electron/lib/supabaseClient.ts` — reativar reutiliza a conta banida em vez de tentar criar uma nova com o mesmo email (bug real encontrado e corrigido durante o teste) |
| Ecrã de Sincronização | ✅ (redesenhado) | `src/modules/sync/SincronizacaoView.tsx` — lista agrupada por utilizador, checkboxes, chip de conflito, seleção "só sem conflito", importar/rejeitar em massa com barra de progresso |
| Ícone de sincronização na barra superior | ✅ | `src/components/layout/SincronizacaoBell.tsx` — badge com contagem, clique navega direto para Sincronização |
| Revisão individual de carga pendente | ✅ | `src/modules/sync/RevisarCargaPendenteModal.tsx` — inalterado, continua a ser o caminho para casos com conflito real |
| Deteção de conflito de contacto | ✅ (corrigido) | `electron/lib/textMatch.ts` — distingue agora "exato" (associa sem perguntar), "parecido" (pede decisão) e "nenhum" (cria novo); antes um nome exatamente igual (só diferindo em acentos) descartava a correspondência e criava um contacto duplicado |
| Importação (individual e em massa) | ✅ | `electron/main/sync.ts` `importarCarga`, reaproveitado sem alterações pelo loop de massa no frontend |
| Rejeição (individual e em massa) | ✅ | `electron/main/sync.ts` `rejeitarCarga`, idem |
| Verificação periódica (5 min) + notificação | ✅ | `iniciarVerificacaoPeriodicaSync`, notificação agrupada por utilizador com deduplicação de 24h |

### Resultado do teste end-to-end (era o item pendente)

Executado várias vezes ao longo da sessão, com dados reais no Supabase de
produção (nunca simulado):

- Login PWA → troca de password forçada no 1º acesso → Home com contentores
  reais.
- Envio de cargas (individuais e em lote) a partir do mobile → aparecem
  corretamente em `cargas_pendentes` no Supabase.
- Desktop apanha as pendentes na verificação periódica → notificação
  correta ("N cargas novas de X (via PWA)") → clique navega para
  Sincronização.
- Deteção de conflito testada com nomes propositadamente parecidos
  ("Maria Forte" vs "Maria Fortes" já existente) — sinalizado corretamente;
  nomes só com diferença de acentuação ("Joao Silva" vs "João Silva") —
  associados automaticamente sem duplicar (após a correção do bug).
- Importação em massa (5 cargas, 2 com conflito) — as 3 sem conflito
  importadas com barra de progresso; as 2 com conflito ficaram para revisão
  manual, como esperado.
- Rejeição com motivo, "Reenviar corrigida" no mobile (cria nova linha, não
  edita a rejeitada — RLS não permite UPDATE ao role `authenticated`).
- Logout forçado no mobile quando o Admin desativa o acesso — testado com
  `visibilitychange`, incluindo um bug real encontrado e corrigido (closure
  obsoleta no listener, nunca via a sessão atual).

Todos os dados de teste sintéticos foram limpos do Supabase e da BD local
após cada ronda.

---

## 2. Estado Geral do Projeto

> **Nota importante**: o pedido original enquadra isto como "antes de
> avançarmos para o Karga Mobile" — mas o Bloco C (Mobile PWA, doc 17) já
> foi implementado e testado extensivamente nesta mesma sessão, incluindo um
> redesign visual (formulário em acordeão, Home com cartões). Ver detalhe
> na linha correspondente abaixo — não é um módulo "por começar".

| Módulo | Estado | Detalhe |
|---|---|---|
| Estrutura base (Electron+React+TS+Vite+Tailwind+SQLite) | ✅ Completo | |
| Auth & Utilizadores (Root/Admin/permissões) | ✅ Completo | `permissaoRepository`, `sessaoRepository`, `auditoriaRepository` todos wired em `electron/ipc/index.ts` |
| Módulo Cargas | ✅ Completo | Inclui Modo Editor (grelha), duplicação de linha |
| Módulo Contentores | ✅ Completo | Vistas Lista/Ícones, exportação PDF |
| Módulo Contactos | ✅ Completo | CRUD global dentro de Configurações |
| Módulo Faturação | ✅ Completo | Sub-aba dentro de Cargas |
| Módulo Relatórios/Exportação | ✅ Completo | 5 relatórios, Excel/PDF |
| Módulo Configurações | ✅ Completo | Empresa, Contactos, Contentores, Utilizadores, Aparência, Backup/Segurança, PWA Devices (stub), Relatórios, **Sincronização** (novo) |
| Sistema de Notificações | ✅ Completo | Sino + popover, verificação de contentores (30 min) |
| Stub sync-api + pwa-devices | ✅ Completo (stub, como previsto) | |
| **Bloco A — Schema Supabase + RLS** | ✅ Completo | Migração aplicada, testada |
| **Bloco B — Sync Desktop** | ✅ Completo | Ver secção 1 |
| **Bloco C — Mobile PWA** | ⚠️ Quase completo | Ver detalhe abaixo |
| Build cross-platform | ⚠️ Parcial | `.dmg` (mac-arm64) e `.AppImage` (linux-arm64) existem em `release/`, mas datam de **26 Ago**, antes de todo o trabalho de Sync/Mobile — desatualizados, precisam de rebuild. Windows (nsis) nunca foi gerado nesta sessão. |

### Detalhe do Bloco C (Mobile PWA) — o que já está feito

- ✅ Scaffold standalone (`mobile/`), design tokens partilhados com o
  Desktop, componentes touch-adaptados (`FloatingLabelInput`, `Switch`,
  `BoxedList`, `Toast`, `ProgressBar`-equivalente não aplicável aqui).
- ✅ Autenticação completa (login, troca de password forçada, logout
  forçado se desativado).
- ✅ Home, Contentores (lista + detalhe), Cargas (envio em lote + lista com
  filtro/reenvio, **agora com formulário em acordeão** — redesign feito
  nesta sessão), Configurações (tema, trocar password, logout).
- ✅ PWA instalável (manifest + service worker gerados no build).
- ⚠️ **Mensagens**: só leitura/marcar-lida. Enviar novas mensagens está
  desativado no PWA — não há, na arquitetura atual, forma segura via RLS de
  o PWA descobrir o ID de um Admin para lhe enviar algo (ver secção 4).
- ❌ **Deploy no Vercel**: nunca foi feito — precisa de login do
  utilizador (`vercel login` + `vercel --prod`), fora do meu alcance direto
  neste ambiente. A app só corre em `localhost:5174` (dev) até este passo
  acontecer.

---

## 3. Oportunidades de Otimização

Notado durante o desenvolvimento, sem estar pedido em nenhum documento:

**Performance**
- `sugerirContacto`/`calcularSugestoes` (`electron/lib/textMatch.ts`,
  `electron/main/sync.ts`) recalculam a distância de edição (Levenshtein)
  contra **todos** os contactos, para cada pendente, em cada chamada. Com
  dezenas de contactos é instantâneo; com centenas/milhares vai degradar de
  forma percetível na lista de Sincronização. Não é urgente agora, mas vale
  a pena ter um índice/pré-filtro (ex: por primeira letra) se a base de
  contactos crescer muito.
- `NotificacoesBell` e `SincronizacaoBell` fazem *polling* independente a
  cada 60s, cada um com o seu próprio pedido IPC. Funciona bem à escala
  atual, mas podia ser um único estado partilhado ("app status") para
  reduzir chamadas redundantes.

**UX**
- A instabilidade do hostname da máquina (`os.hostname()` muda entre
  reinícios do Electron nalguns Macs) partiu a licença local **repetidamente**
  ao longo desta sessão, obrigando a regenerar e reativar a chave de cada
  vez. Isto é um risco real para builds empacotados fora do ambiente de
  dev — o identificador da licença devia passar a ser um UUID persistido
  (gerado uma vez, guardado localmente), não derivado do hostname.
- O fluxo de sincronização em massa só foi testado com lotes pequenos
  (5-8 cargas). Não há ainda confirmação de como se comporta com lotes
  grandes (ex: 50+) em termos de tempo total e de UX da barra de progresso.

**Código**
- Componentes de UI (`FloatingLabelInput`, `Switch`, `BoxedList`, `Toast`)
  existem **duplicados** entre `src/` (Desktop) e `mobile/src/` (PWA) —
  decisão deliberada do Bloco C (touch-target/font-size diferentes, projetos
  com ciclos de deploy independentes), mas é uma dívida de manutenção: uma
  correção visual no Desktop não se propaga automaticamente ao Mobile.
  Nada a fazer agora, só a registar caso o projeto cresça para justificar
  um pacote partilhado.
- Não existe nenhuma suite de testes automatizados (unitários ou de
  integração) em nenhum dos dois projetos — toda a verificação desta sessão
  foi manual via CDP. Aceitável no estado atual, mas a mencionar.

---

## 4. Pontos de Atenção Antes do Mobile

Dado que o Mobile já consome dados reais do Supabase (e já foi testado a
fazê-lo), isto não são bloqueios, são notas sobre o que já está validado e
o que ainda tem uma lacuna real:

- ✅ `contentores_disponiveis` — sincronizado corretamente pelo Desktop a
  cada criação/atualização de contentor (upsert), confirmado a funcionar.
- ✅ `cargas_pendentes` — RLS confirmada a funcionar como desenhado: o PWA
  só vê e insere as suas próprias linhas; não pode fazer UPDATE/DELETE (só
  a Service Role Key do Desktop pode transitar o estado). O mobile já
  respeita isto ("Reenviar corrigida" cria linha nova, nunca edita).
- ✅ `pwa_users.ativo` — verificado no login e ao voltar o foco à aba;
  força logout com a mensagem certa quando o Admin desativa o acesso.
- ⚠️ **Lacuna real, já identificada**: a tabela `mensagens` tem RLS pronta
  para o PWA enviar E receber, mas **não há forma de o PWA descobrir o ID
  de um Admin** para lhe mandar uma mensagem nova — a tabela `users` só
  existe no SQLite local do Desktop, nunca é espelhada para o Supabase (só
  os utilizadores com PWA habilitado entram em `pwa_users`, e os Admins
  não). Por decisão já tomada nesta sessão, o composer de mensagens no
  mobile fica desativado até isto ser resolvido — precisa de uma etapa
  dedicada de "UI de mensagens no Desktop" que decida como sincronizar a
  identidade do(s) Admin(s) para o Supabase de forma segura.
- ❌ **Bloqueio real para uso fora do localhost**: o Mobile nunca foi
  publicado — não há URL público, nem variáveis de ambiente configuradas no
  Vercel. Antes de qualquer utilizador real usar o PWA fora desta máquina,
  o deploy tem de acontecer (passo que precisa da tua autenticação).

Não há nada no schema ou nas policies que precise de alteração para o que já
foi construído — o único ajuste pendente é de processo (deploy), não de
dados.
