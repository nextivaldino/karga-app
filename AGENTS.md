# AGENTS.md — Kraga Desktop

> Este ficheiro é lido automaticamente pelo Codex no início de cada sessão.
> Contém as regras e decisões fixas do projeto. NÃO redecidir estas coisas de novo — seguir sempre.

---

## O que é este projeto

**Kraga Desktop** — sistema profissional de gestão de cargas consolidadas e expedições
marítimas entre a Europa (origem, ex: Luxemburgo) e Cabo Verde (destino), para pequenas/médias
empresas de transporte e logística.

App desktop **Electron**, multiplataforma (macOS, Windows, Linux), **offline-first**
(SQLite local), preparado desde o início para futura sincronização com um backend
central na nuvem que servirá um PWA (não implementado ainda nesta fase).

Documentos de referência completos: ver pasta `docs/`. Ler o documento do módulo
relevante ANTES de implementar esse módulo.

---

## Stack técnica (fixa — não mudar sem discutir antes)

- **Electron** (main + renderer)
- **React 19 + TypeScript + Vite**
- **Tailwind CSS**
- **better-sqlite3** (banco local, SQLite)
- **Repository Pattern** no backend (electron/models)
- **IPC Service** centralizado para comunicação renderer ↔ main
- **Lucide React** para ícones
- **electron-builder** para empacotamento (targets: mac, win, linux)

---

## Estrutura de pastas

```
KARGA-TF/
├── AGENTS.md                    (este ficheiro)
├── docs/                        (specs por módulo — ler antes de implementar)
├── electron/
│   ├── main/                    processo principal Electron
│   ├── models/                  Repository Pattern (acesso SQLite)
│   ├── sync-api/                stub da futura API de sincronização (NÃO implementar lógica real ainda)
│   └── ipc/                     handlers IPC
├── src/
│   ├── components/              componentes reutilizáveis
│   ├── pages/                   páginas principais
│   ├── hooks/                   custom hooks (ex: useCargas, useContentores)
│   ├── services/                IPCService
│   ├── modules/
│   │   ├── auth/
│   │   ├── cargas/
│   │   ├── contentores/
│   │   ├── contactos/
│   │   ├── faturacao/
│   │   ├── relatorios/
│   │   ├── configuracoes/
│   │   └── pwa-devices/         stub do gestor de dispositivos PWA (mock, sem lógica real)
│   ├── types/                   tipos TypeScript centralizados
│   ├── constants/
│   └── lib/
├── App.tsx
└── main.tsx
```

**Regra importante:** `App.tsx` deve ficar FINO — sem lógica de orquestração pesada.
(Lição aprendida do projeto anterior Next Level Academia, onde isto virou dívida técnica.)
Orquestração e estado ficam em hooks/services dedicados por módulo.

---

## Decisões de arquitetura fixas (NÃO redecidir)

### Identificadores
- Toda entidade usa **UUID** como chave primária técnica (nunca `INTEGER AUTOINCREMENT`).
  Motivo: evitar colisões quando, no futuro, houver múltiplas fontes de escrita (Desktop + PWA).
- O **código de carga** (ex: `TF 001`) é um campo de negócio separado do UUID — visível,
  editável pelo utilizador, nunca usado como chave primária.

### Auditoria e sync (preparar já, não implementar sync ainda)
- Toda tabela relevante tem `created_at`, `updated_at` (timestamps).
- Tabelas-chave (cargas, contentores, contactos, pagamentos) têm campo `sync_status`
  (`local` | `synced` | `pending`) — mesmo sem lógica de sync real ainda.
- Repository Pattern isola SEMPRE o acesso a dados, para permitir trocar
  "SQLite local" por "chamada à API" no futuro sem reescrever a UI.
- Dados não são apagados fisicamente por padrão — soft delete / arquivo (integridade
  histórica é requisito de negócio, não só técnico).

### Moeda
- Cada carga é registada e cobrada **apenas na moeda do país de origem** (configurável
  no painel Admin, associada à empresa/ponto de origem).
- **Sem conversão de câmbio, sem dupla moeda por carga.** Cabo Verde é sempre destino
  de entrega, nunca de cobrança.

### Licença
- Licença única e simples (verificação local após ativação).
- **NÃO construir** sistema de licenciamento tipo SaaS multi-tenant, bloqueio remoto,
  nem tela de reativação complexa. Fora de escopo nesta fase.

### PWA (futuro — só stub agora)
- NÃO implementar o PWA real nesta fase.
- Preparar apenas: schema de dados compatível, um módulo `pwa-devices` no painel admin
  (mock/stub visível), e um endpoint de health-check em `electron/sync-api/` que
  simula a existência da futura API — sem lógica de negócio real.
- Quando implementado no futuro: PWA terá modo Utilizador (restrito: inserir/editar
  cargas dentro de contentores já criados, visualizar, exportar/enviar recibo por
  WhatsApp) e modo Admin (quase paridade com o Desktop).

### Multiplataforma
- Build alvo desde o início: macOS (dmg), Windows (nsis + portable), Linux (AppImage/deb).
- Atenção: `better-sqlite3` é módulo nativo — requer `electron-rebuild` por
  plataforma/arquitetura. Testar build cross-platform cedo, não deixar para o fim.

---

## Utilizadores e permissões

- **Root**: super admin técnico. Reset de senha de Admins, manutenção do sistema.
  NÃO acede a dados de clientes/cargas no dia a dia.
- **Admin**: controlo operacional total (cargas, contentores, contactos, utilizadores,
  configurações, relatórios, faturação).
- **Utilizador secundário**: permissões granulares definidas pelo Admin.

---

## Convenções de código

- TypeScript estrito — **proibido `@ts-nocheck`** (lição aprendida do projeto anterior).
- Nomes de variáveis, funções, tipos em inglês; textos de UI em português (PT-PT/PT-CV,
  confirmar com o utilizador quando ambíguo).
- Tabelas grandes (ex: lista de cargas) devem prever virtualização desde o início
  (ex: `@tanstack/react-virtual`) — não deixar para depois como aconteceu no projeto anterior.
- Commits pequenos e frequentes, por módulo/funcionalidade.

---

## Regras de trabalho com o Codex (poupança de créditos)

- Implementar **um módulo de cada vez**, seguindo o `.md` correspondente em `docs/`.
- Usar **Plan Mode** antes de tarefas grandes ou ambíguas.
- Não pedir para "ler o repositório inteiro" — apontar ficheiros específicos quando possível.
- Ao terminar um módulo: commit git, depois `/clear` antes de iniciar o próximo módulo
  não relacionado.

---

## Estado atual do projeto

- [ ] Estrutura base do projeto (Electron + React + TS + Vite + Tailwind + better-sqlite3)
- [ ] Auth & Users (Root, Admin, permissões)
- [ ] Módulo Cargas
- [ ] Módulo Contentores
- [ ] Módulo Contactos
- [ ] Módulo Faturação
- [ ] Módulo Relatórios/Exportação
- [ ] Módulo Configurações
- [ ] Stub sync-api + pwa-devices
- [ ] Build cross-platform testado (mac/win/linux)

---

## ATUALIZAÇÃO — Arquitetura de UI definitiva (substitui a sidebar original)

A navegação por sidebar descrita acima na secção "Estrutura de pastas" está
**desatualizada**. A versão definitiva está em `docs/09-ARQUITETURA-PAGINAS.md`
e documentos relacionados (`08` a `14`). Resumo:

- **Sem sidebar.** Interface GNOME/Adwaita autêntica (GNOME 50), 4 páginas de
  topo com abas centralizadas: **Home · Cargas · Contentores · Configurações**.
- Contactos (CRUD global) e Faturação NÃO são páginas de topo — vivem dentro de
  Configurações e de Cargas (sub-aba), respetivamente.
- Ler, por esta ordem, antes de implementar qualquer interface:
  1. `docs/08-DESIGN-SYSTEM.md` — tokens, floating labels, Header Bar, ícones
  2. `docs/09-ARQUITETURA-PAGINAS.md` — mapa geral de páginas e navegação
  3. `docs/10-PAGINA-HOME.md`
  4. `docs/11-SISTEMA-NOTIFICACOES.md`
  5. `docs/12-MODULO-CARGAS-COMPLETO.md`
  6. `docs/13-MODULO-CONTENTORES-COMPLETO.md`
  7. `docs/14-MODULO-CONFIGURACOES-COMPLETO.md`

### Regras de UI obrigatórias (novas)
- Todos os inputs usam `FloatingLabelInput` (label dentro da caixa) — sem exceção.
- Um único componente de modal (`HeaderBarModal`) para todos os popups — proibido
  criar estruturas de modal alternativas.
- Ícones: `lucide-react`, monocromáticos para ações neutras, coloridos para
  identidade de módulo/estado.
- Ações destrutivas/irreversíveis (backup, restore, exportar tudo, reset total)
  só existem em Configurações → "Backup, Exportação e Segurança", e exigem sempre
  confirmação por password do Admin antes de executar — nunca soltas noutra página.
