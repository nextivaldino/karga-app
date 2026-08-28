# 15 — Arquitetura de Sincronização (Supabase) — Kraga Desktop + Mobile PWA

## Objetivo
Definir a camada de sincronização entre o Kraga Desktop (fonte de verdade local,
offline-first) e o novo app **Mobile PWA** (`mobile/`), usando Supabase como
ponte cloud. Sincronização é **manual, unidirecional (pull) e controlada pelo
Admin** — nunca automática nem bidirecional em tempo real.

Pré-requisito: todos os módulos 00-14 já implementados e funcionais.

---

## 1. Princípios (não negociáveis)

1. **O Desktop continua a ser a única fonte de verdade.** `cargas`, `contentores`
   e `contactos` finais só existem no SQLite local do Desktop.
2. **O Mobile PWA nunca escreve diretamente nas tabelas finais.** Insere sempre
   numa tabela de "pendentes" no Supabase.
3. **Nenhum código de carga é atribuído pelo PWA.** É atribuído só no momento
   da importação, pelo Desktop, eliminando conflitos de numeração entre
   vários utilizadores a inserir em simultâneo.
4. **Importação é sempre uma decisão explícita do Admin**, nunca automática.
5. **Rastreabilidade obrigatória**: toda carga importada guarda qual
   utilizador PWA a inseriu originalmente.

---

## 2. Credenciais do projeto Supabase (já criado)

```
SUPABASE_PROJECT_REF=ycvgzxhvkvunvflgpfeb
SUPABASE_URL=https://ycvgzxhvkvunvflgpfeb.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_igaT9CjjVZ6qN9XVXKaB9g_tiTzYBPh
```

⚠️ **A Service Role Key (privilégios totais) NUNCA vai neste documento nem em
nenhum ficheiro commitado.** Guardar apenas em `.env` local (Desktop) — deve
constar em `.gitignore`. Se o Claude Code precisar dela para configurar o
lado do Desktop, o utilizador cola-a diretamente no terminal/`.env`, nunca
num documento ou numa mensagem de chat.

O Desktop usa a Service Role Key (acesso elevado, só no processo principal
Electron). O Mobile PWA usa exclusivamente a Publishable Key (frontend,
restrita por Row Level Security).

---

## 3. Schema no Supabase (Postgres)

```sql
-- Espelho mínimo de utilizadores autorizados a usar o PWA.
-- Populado/atualizado pelo Desktop quando o Admin ativa "Pode sincronizar".
CREATE TABLE pwa_users (
  id UUID PRIMARY KEY,                -- mesmo UUID do users.id local
  nome TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  auth_uid UUID UNIQUE,               -- referência ao Supabase Auth user
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Espelho READ-ONLY dos contentores abertos. O Desktop empurra (upsert) sempre
-- que um contentor abre/fecha/muda de estado. O PWA só lê.
CREATE TABLE contentores_disponiveis (
  id UUID PRIMARY KEY,                -- mesmo UUID do contentor local
  nome TEXT NOT NULL,
  codigo TEXT NOT NULL,
  estado TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- O que o PWA insere. Nunca tem código de carga definitivo.
CREATE TABLE cargas_pendentes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contentor_id UUID NOT NULL REFERENCES contentores_disponiveis(id),
  inserido_por_user_id UUID NOT NULL REFERENCES pwa_users(id),

  emissor_nome TEXT NOT NULL,
  emissor_telefone TEXT,
  emissor_email TEXT,

  recetor_nome TEXT NOT NULL,
  recetor_telefone TEXT,

  nome_carga TEXT NOT NULL,
  comprimento_cm NUMERIC,
  largura_cm NUMERIC,
  altura_cm NUMERIC,
  peso_kg NUMERIC,
  valor NUMERIC,
  pago BOOLEAN NOT NULL DEFAULT false,
  notas TEXT,

  estado TEXT NOT NULL DEFAULT 'pendente'
    CHECK (estado IN ('pendente', 'importada', 'rejeitada')),
  motivo_rejeicao TEXT,               -- preenchido pelo Desktop se rejeitada
  importado_em TIMESTAMPTZ,
  carga_local_id TEXT,                -- UUID da carga real, depois de importada

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Mensagens simples Desktop ↔ PWA (por utilizador)
CREATE TABLE mensagens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  de_user_id UUID NOT NULL,
  para_user_id UUID NOT NULL,
  texto TEXT NOT NULL,
  lida BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## 4. Row Level Security (obrigatório, não opcional)

```sql
ALTER TABLE pwa_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE contentores_disponiveis ENABLE ROW LEVEL SECURITY;
ALTER TABLE cargas_pendentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensagens ENABLE ROW LEVEL SECURITY;

-- pwa_users: cada utilizador só vê o seu próprio registo
CREATE POLICY "ver o próprio registo" ON pwa_users
  FOR SELECT USING (auth.uid() = auth_uid);

-- contentores_disponiveis: qualquer utilizador autenticado pode ler
CREATE POLICY "ler contentores disponíveis" ON contentores_disponiveis
  FOR SELECT USING (auth.role() = 'authenticated');

-- cargas_pendentes: só pode inserir e ler as suas próprias
CREATE POLICY "inserir as próprias cargas pendentes" ON cargas_pendentes
  FOR INSERT WITH CHECK (
    inserido_por_user_id = (SELECT id FROM pwa_users WHERE auth_uid = auth.uid())
  );
CREATE POLICY "ler as próprias cargas pendentes" ON cargas_pendentes
  FOR SELECT USING (
    inserido_por_user_id = (SELECT id FROM pwa_users WHERE auth_uid = auth.uid())
  );
-- Nenhuma policy de UPDATE/DELETE para o role "authenticated" — só o Desktop,
-- via Service Role Key (que ignora RLS), pode marcar como importada/rejeitada.

-- mensagens: só vê as suas (enviadas ou recebidas)
CREATE POLICY "ver mensagens próprias" ON mensagens
  FOR SELECT USING (
    de_user_id = (SELECT id FROM pwa_users WHERE auth_uid = auth.uid())
    OR para_user_id = (SELECT id FROM pwa_users WHERE auth_uid = auth.uid())
  );
CREATE POLICY "enviar mensagens" ON mensagens
  FOR INSERT WITH CHECK (
    de_user_id = (SELECT id FROM pwa_users WHERE auth_uid = auth.uid())
  );
```

---

## 5. Fluxo de sincronização (passo a passo)

1. Admin, em Configurações → Utilizadores, ativa **"Pode sincronizar via PWA"**
   para um utilizador → Desktop cria/atualiza o registo em `pwa_users` e a
   conta correspondente no Supabase Auth (via Service Role Key), definindo
   uma password temporária que o utilizador troca no primeiro login do PWA.
2. Sempre que um contentor muda de estado no Desktop (aberto/fechado/etc.),
   o Desktop faz `upsert` em `contentores_disponiveis` (só os campos
   relevantes — nunca dados sensíveis de cargas/valores).
3. Funcionário abre o Mobile PWA, autentica via Supabase Auth, vê os
   contentores abertos, insere cargas → gravadas em `cargas_pendentes`
   (estado `'pendente'`).
4. Desktop, periodicamente (polling a cada 5 min, usando o motor de
   verificação já existente do Sistema de Notificações — doc 11), consulta
   `cargas_pendentes WHERE estado = 'pendente'` via Service Role Key.
5. Se houver novas → gera notificação interna + nativa: **"3 cargas novas de
   João Silva (via PWA)"**.
6. Admin abre o ecrã de revisão (ver `16-MODULO-SYNC-DESKTOP.md`), analisa
   cada carga pendente, resolve conflitos de contacto, escolhe/confirma o
   contentor, e importa.
7. Ao importar: Desktop atribui código sequencial real, cria a carga em
   SQLite local com `origem_pwa_user_id` preenchido, e faz `update` na linha
   correspondente em `cargas_pendentes` (`estado = 'importada'`,
   `carga_local_id = <novo uuid>`).
8. Se o Admin rejeitar uma carga pendente (ex: dados incoerentes): `estado =
   'rejeitada'`, `motivo_rejeicao` preenchido — o PWA mostra isso ao
   utilizador que a inseriu.

---

## 6. Alterações ao schema local (Desktop)

```sql
ALTER TABLE users ADD COLUMN pwa_habilitado INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN pwa_auth_uid TEXT;  -- referência ao Supabase Auth

ALTER TABLE cargas ADD COLUMN origem_pwa_user_id TEXT;  -- NULL = inserida no Desktop
```

---

## 7. Critério de "pronto"
- [ ] Schema Supabase criado exatamente conforme secção 3
- [ ] RLS policies aplicadas e testadas (um utilizador não consegue ler
      `cargas_pendentes` de outro, via teste manual com 2 contas)
- [ ] Desktop consegue fazer upsert em `contentores_disponiveis` ao
      abrir/fechar um contentor
- [ ] Toggle "Pode sincronizar via PWA" cria conta no Supabase Auth
      corretamente
- [ ] Polling periódico deteta cargas pendentes e gera notificação
- [ ] Service Role Key nunca aparece em ficheiro commitado (verificar
      `.gitignore` inclui `.env`)
