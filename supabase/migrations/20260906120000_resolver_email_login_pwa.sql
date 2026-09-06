-- Permite ao PWA entrar por nome (além do email já suportado pelo
-- Supabase Auth). RLS restringe SELECT em pwa_users a auth.uid() =
-- auth_uid — inútil antes do login, quando ainda não há sessão. Uma
-- função SECURITY DEFINER resolve só o email correspondente ao nome
-- (nunca a linha inteira), chamável pelo cliente anon sem expor a tabela.
CREATE OR REPLACE FUNCTION resolver_email_login(identificador TEXT)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM pwa_users
  WHERE ativo = true AND lower(nome) = lower(trim(identificador))
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION resolver_email_login(TEXT) TO anon, authenticated;
