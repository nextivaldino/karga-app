-- A migration 20260909110000 restringiu UPDATE em pwa_users, via
-- REVOKE/GRANT por coluna, ao role `authenticated` inteiro — incluindo o
-- root. Isso deixou a policy "root gere identidades" (FOR ALL) sem efeito
-- prático fora da Service Role Key: mesmo com a policy RLS a permitir,
-- o GRANT (nome, avatar) bloqueia UPDATE a tipo_acesso/posto_id/ativo.
--
-- Esta RPC dá ao root um caminho explícito e auditável para editar essas
-- colunas sem depender do GRANT amplo (que continua restrito para
-- utilizadores normais, propositadamente, para impedir auto-escalada de
-- privilégio). A verificação de `meu_tipo_acesso() = 'root'` é feita
-- dentro da função porque SECURITY DEFINER ignora RLS — sem esta
-- verificação explícita, qualquer chamador autenticado poderia editar
-- qualquer utilizador.
CREATE OR REPLACE FUNCTION public.root_atualizar_pwa_user(
  p_user_id UUID,
  p_tipo_acesso TEXT DEFAULT NULL,
  p_posto_id UUID DEFAULT NULL,
  p_ativo BOOLEAN DEFAULT NULL
)
RETURNS pwa_users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resultado pwa_users;
BEGIN
  IF public.meu_tipo_acesso() <> 'root' THEN
    RAISE EXCEPTION 'Apenas o Root pode executar esta operação.';
  END IF;

  IF p_tipo_acesso IS NOT NULL AND p_tipo_acesso NOT IN ('root', 'admin', 'user') THEN
    RAISE EXCEPTION 'tipo_acesso inválido: %', p_tipo_acesso;
  END IF;

  UPDATE pwa_users
  SET
    tipo_acesso = COALESCE(p_tipo_acesso, tipo_acesso),
    posto_id = CASE WHEN p_posto_id IS NOT NULL THEN p_posto_id ELSE posto_id END,
    ativo = COALESCE(p_ativo, ativo),
    updated_at = now()
  WHERE id = p_user_id
  RETURNING * INTO resultado;

  IF resultado.id IS NULL THEN
    RAISE EXCEPTION 'Utilizador PWA não encontrado: %', p_user_id;
  END IF;

  RETURN resultado;
END;
$$;

GRANT EXECUTE ON FUNCTION public.root_atualizar_pwa_user(UUID, TEXT, UUID, BOOLEAN) TO authenticated;
