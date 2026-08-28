# 00 — Arquitetura do Sistema — Kraga Desktop

## Objetivo deste documento
Especificação técnica para o Claude Code criar a **estrutura base do projeto**.
Este é o primeiro módulo a ser implementado. Sem funcionalidades de negócio ainda —
só o esqueleto funcional, correndo, com login mock e uma tela vazia.

---

## 1. Stack

- Electron (última versão estável)
- React 19 + TypeScript (strict mode)
- Vite
- Tailwind CSS
- better-sqlite3
- Lucide React (ícones)
- electron-builder (build mac/win/linux)

## 2. Estrutura de pastas a criar

```
KARGA-TF/
├── electron/
│   ├── main/
│   │   └── index.ts          entrypoint do processo principal
│   ├── models/
│   │   └── database.ts       inicialização SQLite + migrations básicas
│   ├── sync-api/
│   │   └── healthcheck.ts    stub simples (retorna { status: "ok" }), sem lógica real
│   └── ipc/
│       └── index.ts          registo central de handlers IPC
├── src/
│   ├── components/
│   ├── pages/
│   │   └── Dashboard.tsx     página inicial vazia, só com layout base
│   ├── hooks/
│   ├── services/
│   │   └── ipcService.ts     wrapper centralizado para chamadas IPC
│   ├── modules/
│   │   ├── auth/
│   │   └── pwa-devices/
│   │       └── PwaDevicesStub.tsx   tela mock "Dispositivos PWA (em breve)"
│   ├── types/
│   │   └── index.ts
│   ├── constants/
│   ├── lib/
│   ├── App.tsx
│   └── main.tsx
├── docs/                     (specs, já existente)
├── CLAUDE.md                 (já existente)
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── electron-builder.yml
```

## 3. Banco de dados — regras gerais (aplicar já na base)

- Ficheiro SQLite local, caminho: `userData/kraga.db` (via `app.getPath('userData')`).
- Toda tabela criada a partir de agora segue este padrão de colunas obrigatórias:

```sql
id TEXT PRIMARY KEY,              -- UUID v4
created_at TEXT NOT NULL,         -- ISO 8601
updated_at TEXT NOT NULL,         -- ISO 8601
sync_status TEXT NOT NULL DEFAULT 'local'  -- 'local' | 'synced' | 'pending'
```

- Nesta fase inicial, criar só a tabela `users` (necessária para login):

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('root', 'admin', 'user')),
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'local'
);
```

- Usar `better-sqlite3` de forma síncrona (é o padrão recomendado da biblioteca).
- Repository Pattern: criar `electron/models/repositories/userRepository.ts` com
  funções puras (`create`, `findByEmail`, `findById`, `update`, `list`) — a UI nunca
  fala com SQLite diretamente, só através de IPC → Repository.

## 4. IPC — comunicação renderer ↔ main

- Um único ponto de entrada: `src/services/ipcService.ts` no renderer.
- Handlers registados centralmente em `electron/ipc/index.ts`.
- Nomear canais IPC com prefixo de módulo, ex: `auth:login`, `auth:logout`, `users:list`.

## 5. Autenticação (versão mínima nesta fase)

- Login simples: email + password (hash com `bcrypt` ou `argon2`).
- Seed inicial: ao abrir o app pela primeira vez (banco vazio), mostrar um
  **wizard de setup** que cria o primeiro utilizador Admin.
- Sessão guardada em memória do processo principal (sem tokens JWT nesta fase —
  isso só fará sentido quando existir o backend na nuvem).
- Três roles no enum, mas nesta fase só precisamos de `admin` funcional
  (root e user ficam preparados no schema, sem UI completa ainda).

## 6. Tela inicial (Dashboard) — versão vazia

- Layout base: sidebar esquerda (navegação) + área principal.
- Sidebar com itens (podem estar desativados/placeholder por agora):
  Dashboard, Cargas, Contentores, Contactos, Faturação, Relatórios,
  Dispositivos PWA, Configurações.
- Área principal: mensagem simples "Bem-vindo ao Kraga Desktop" — sem dados reais ainda.

## 7. Stub PWA (obrigatório já nesta fase, conforme CLAUDE.md)

- `electron/sync-api/healthcheck.ts`: função/endpoint simples que responde
  `{ status: 'ok', timestamp: <iso> }`. Sem servidor HTTP real ainda — pode ser
  só uma função chamável via IPC (`syncApi:healthcheck`), simulando a futura API.
- `src/modules/pwa-devices/PwaDevicesStub.tsx`: página simples, acessível pela
  sidebar, mostrando texto "Nenhum dispositivo PWA conectado (funcionalidade
  em desenvolvimento)". Sem lógica real, só a estrutura visual e de rota.

## 8. Build multiplataforma

- Configurar `electron-builder.yml` com os três targets desde já:

```yaml
mac:
  target: dmg
win:
  target:
    - nsis
    - portable
linux:
  target:
    - AppImage
    - deb
```

- Confirmar que `better-sqlite3` está listado corretamente em `dependencies`
  (não `devDependencies`) e testar `electron-rebuild` localmente no macOS antes
  de avançar para os próximos módulos.

## 9. Critério de "pronto" para este módulo

- [ ] `npm run dev` abre o app sem tela branca
- [ ] Primeira execução mostra wizard de setup → cria Admin
- [ ] Login funciona (email + password) → mostra Dashboard vazio
- [ ] Sidebar navega entre páginas placeholder sem erros
- [ ] Página "Dispositivos PWA" acessível e mostra stub
- [ ] `syncApi:healthcheck` responde via IPC (testável, ex: botão temporário ou log)
- [ ] `npm run build` gera pacote sem erros (pelo menos para macOS, ambiente de dev atual)

---

## Fora de escopo nesta fase (não implementar)

- Qualquer funcionalidade de Cargas, Contentores, Contactos, Faturação, Relatórios
- Sistema de licença
- Sincronização real com nuvem
- PWA funcional
- Múltiplos temas (deixar CSS simples, tema único por agora)
