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

-- Row Level Security ---------------------------------------------------

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
