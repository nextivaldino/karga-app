-- resolver_email_login (20260906120000) resolvia login por `nome`, que
-- nunca foi UNIQUE — com dois pwa_users ativos do mesmo nome (plausível
-- entre postos diferentes), `LIMIT 1` devolvia o email de um registo
-- arbitrário. A coluna `username` (índice único, 20260907130000) nunca
-- chegou a ser usada aqui. Esta versão: 1) tenta username exato (único,
-- sem ambiguidade); 2) só cai para `nome` se houver exatamente um ativo
-- com esse nome — caso contrário devolve NULL, e o cliente já trata NULL
-- como "utilizador ou password incorretos" (useAuth.tsx login()).
CREATE OR REPLACE FUNCTION resolver_email_login(identificador TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  por_username TEXT;
  candidatos_por_nome TEXT[];
BEGIN
  SELECT email INTO por_username
  FROM pwa_users
  WHERE ativo = true AND lower(username) = lower(trim(identificador))
  LIMIT 1;

  IF por_username IS NOT NULL THEN
    RETURN por_username;
  END IF;

  SELECT array_agg(email) INTO candidatos_por_nome
  FROM pwa_users
  WHERE ativo = true AND lower(nome) = lower(trim(identificador));

  IF array_length(candidatos_por_nome, 1) = 1 THEN
    RETURN candidatos_por_nome[1];
  END IF;

  RETURN NULL;
END;
$$;
