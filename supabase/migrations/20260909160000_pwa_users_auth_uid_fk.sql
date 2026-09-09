-- pwa_users.auth_uid nunca teve FK real para auth.users — a ligação era
-- mantida só pela aplicação (Desktop, via Admin API), sem garantia ao
-- nível da base de dados. Confirmámos em produção que isso já tinha
-- causado 4 auth_uid órfãos (contas Auth apagadas sem atualizar
-- pwa_users), corrigidos manualmente antes desta migration (auth_uid
-- posto a NULL nessas 4 linhas — os dados de cargas_pendentes/mensagens
-- associados não foram tocados).
--
-- ON DELETE SET NULL (não CASCADE): se uma conta Auth for apagada no
-- futuro, a linha pwa_users e os dados que dependem dela (cargas,
-- mensagens) devem sobreviver — só o auth_uid fica órfão-nunca-mais,
-- passa a NULL, tal como já corrigimos manualmente.
ALTER TABLE pwa_users
  ADD CONSTRAINT pwa_users_auth_uid_fkey
  FOREIGN KEY (auth_uid) REFERENCES auth.users(id) ON DELETE SET NULL;
