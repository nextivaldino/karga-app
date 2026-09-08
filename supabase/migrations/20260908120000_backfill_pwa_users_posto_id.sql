-- Backfill: utilizadores PWA criados/atualizados antes da correção a
-- upsertPwaUser (que passou a enviar posto_id) ficaram com posto_id NULL
-- em produção, apesar de já existir 1 posto ativo — a policy "acesso
-- contentores por posto" (posto_id = meu_posto_id()) nunca casa NULL com
-- um UUID real, por isso esses utilizadores viam a lista de contentores
-- sempre vazia ("Sem contentor atribuído" no Mobile).
--
-- Guarda de segurança: só corre se existir exatamente 1 posto ativo — com
-- 0 ou 2+ não há como adivinhar sozinho a que posto cada utilizador
-- pertence (mesma regra usada em electron/lib/supabaseClient.ts
-- resolverPostoId). Idempotente: só afeta linhas ainda por preencher.
DO $$
DECLARE
  unico_posto_ativo UUID;
BEGIN
  SELECT id INTO unico_posto_ativo
  FROM postos
  WHERE estado = 'ativo';

  IF (SELECT COUNT(*) FROM postos WHERE estado = 'ativo') = 1 THEN
    UPDATE pwa_users
    SET posto_id = unico_posto_ativo
    WHERE posto_id IS NULL
      AND tipo_acesso = 'user';
  END IF;
END $$;
