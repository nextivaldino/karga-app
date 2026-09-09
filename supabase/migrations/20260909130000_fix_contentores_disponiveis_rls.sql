-- Corrige fuga cross-posto em contentores_disponiveis: a migration
-- 20260907130000 criou a policy "acesso contentores por posto" mas nunca
-- removeu a policy antiga de 20260828000000 ("ler contentores
-- disponíveis" USING auth.role() = 'authenticated'). Policies permissivas
-- combinam-se com OR em Postgres, logo a policy antiga sozinha já
-- satisfazia qualquer SELECT autenticado — a policy nova por posto ficou
-- sem efeito prático. Qualquer utilizador PWA via qualquer Posto.
DROP POLICY IF EXISTS "ler contentores disponíveis" ON contentores_disponiveis;
