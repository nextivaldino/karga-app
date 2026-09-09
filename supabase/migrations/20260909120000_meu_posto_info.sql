-- Painel de Definições do Mobile (docs/25) — card "Info do Posto", só
-- leitura. A tabela `postos` só tem SELECT liberado a admin/root
-- (20260907130000_postos_root_access.sql) e tem colunas sensíveis
-- (codigo_ativacao, installation_id) que nunca devem chegar a um
-- utilizador PWA normal — em vez de abrir SELECT à tabela, uma função
-- SECURITY DEFINER devolve só nome+país, mesmo padrão já usado por
-- meu_tipo_acesso()/meu_posto_id().
CREATE OR REPLACE FUNCTION public.meu_posto_info()
RETURNS TABLE(nome TEXT, pais TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.nome, p.pais
  FROM postos p
  JOIN pwa_users u ON u.posto_id = p.id
  WHERE u.auth_uid = auth.uid() AND u.ativo = true;
$$;

GRANT EXECUTE ON FUNCTION public.meu_posto_info() TO authenticated;
