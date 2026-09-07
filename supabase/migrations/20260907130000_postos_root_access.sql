-- Modelo multi-posto: cada Admin operacional fica associado a um Posto.
-- O Root usa a mesma aplicação Mobile, mas tem acesso administrativo global.
CREATE TABLE IF NOT EXISTS postos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  pais TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'pendente'
    CHECK (estado IN ('pendente', 'ativo', 'suspenso', 'bloqueado')),
  codigo_ativacao TEXT UNIQUE,
  codigo_usado BOOLEAN NOT NULL DEFAULT false,
  ativado_em TIMESTAMPTZ,
  installation_id TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE pwa_users
  ADD COLUMN IF NOT EXISTS posto_id UUID REFERENCES postos(id),
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS tipo_acesso TEXT NOT NULL DEFAULT 'user'
    CHECK (tipo_acesso IN ('root', 'admin', 'user'));

CREATE UNIQUE INDEX IF NOT EXISTS pwa_users_username_lower_idx
  ON pwa_users (lower(username))
  WHERE username IS NOT NULL;

ALTER TABLE contentores_disponiveis
  ADD COLUMN IF NOT EXISTS posto_id UUID REFERENCES postos(id);

ALTER TABLE cargas_pendentes
  ADD COLUMN IF NOT EXISTS posto_id UUID REFERENCES postos(id);

ALTER TABLE postos ENABLE ROW LEVEL SECURITY;

-- Funções pequenas reutilizadas pelas policies. SECURITY DEFINER evita
-- recursão ao consultar pwa_users dentro da própria policy.
CREATE OR REPLACE FUNCTION public.meu_tipo_acesso()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tipo_acesso FROM pwa_users WHERE auth_uid = auth.uid() AND ativo = true LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.meu_posto_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT posto_id FROM pwa_users WHERE auth_uid = auth.uid() AND ativo = true LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.meu_tipo_acesso() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.meu_posto_id() TO authenticated;

CREATE POLICY "root gere todos os postos" ON postos
  FOR ALL USING (public.meu_tipo_acesso() = 'root')
  WITH CHECK (public.meu_tipo_acesso() = 'root');

CREATE POLICY "admin consulta o próprio posto" ON postos
  FOR SELECT USING (
    public.meu_tipo_acesso() = 'admin' AND id = public.meu_posto_id()
  );

-- Utilizadores: Root vê/gerencia todos; Admin vê apenas o seu Posto.
CREATE POLICY "root gere identidades" ON pwa_users
  FOR ALL USING (public.meu_tipo_acesso() = 'root')
  WITH CHECK (public.meu_tipo_acesso() = 'root');

CREATE POLICY "admin consulta utilizadores do posto" ON pwa_users
  FOR SELECT USING (
    public.meu_tipo_acesso() = 'admin' AND posto_id = public.meu_posto_id()
  );

-- O Mobile só pode ler contentores do seu Posto. Root pode consultar todos.
CREATE POLICY "acesso contentores por posto" ON contentores_disponiveis
  FOR SELECT USING (
    public.meu_tipo_acesso() = 'root'
    OR posto_id = public.meu_posto_id()
  );

-- As cargas pendentes ficam sempre limitadas ao Posto do utilizador.
DROP POLICY IF EXISTS "inserir as próprias cargas pendentes" ON cargas_pendentes;
DROP POLICY IF EXISTS "ler as próprias cargas pendentes" ON cargas_pendentes;

CREATE POLICY "inserir cargas do próprio posto" ON cargas_pendentes
  FOR INSERT WITH CHECK (
    inserido_por_user_id = (SELECT id FROM pwa_users WHERE auth_uid = auth.uid())
    AND posto_id = public.meu_posto_id()
  );

CREATE POLICY "ler cargas do próprio posto" ON cargas_pendentes
  FOR SELECT USING (
    public.meu_tipo_acesso() = 'root'
    OR (posto_id = public.meu_posto_id() AND inserido_por_user_id = (SELECT id FROM pwa_users WHERE auth_uid = auth.uid()))
  );

COMMENT ON TABLE postos IS 'Identidade e estado das instalações KARGA, geridos pelo Root.';
COMMENT ON COLUMN postos.codigo_ativacao IS 'Código de utilização única para ligar uma instalação Desktop ao Posto.';
COMMENT ON COLUMN pwa_users.tipo_acesso IS 'root: gestão global; admin: gestão do Posto; user: operação Mobile.';
