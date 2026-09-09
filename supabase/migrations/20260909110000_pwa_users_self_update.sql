-- Painel de Definições do Mobile (docs/25) — permite a um utilizador PWA
-- editar o próprio nome/avatar. Restrito por coluna deliberadamente: uma
-- policy de UPDATE sem GRANT por coluna deixaria o próprio utilizador
-- alterar posto_id/tipo_acesso/ativo através da mesma linha — uma
-- escalada de privilégio trivial. O Desktop continua sem esta restrição
-- (usa a Service Role Key, que ignora RLS e GRANTs de coluna).
CREATE POLICY "atualizar o próprio perfil" ON pwa_users
  FOR UPDATE USING (auth.uid() = auth_uid)
  WITH CHECK (auth.uid() = auth_uid);

REVOKE UPDATE ON pwa_users FROM authenticated;
GRANT UPDATE (nome, avatar) ON pwa_users TO authenticated;
