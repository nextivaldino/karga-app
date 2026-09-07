-- Compatibilidade e segurança: mesmo que um cliente antigo não envie
-- posto_id, o servidor preenche-o a partir da identidade autenticada.
CREATE OR REPLACE FUNCTION public.preencher_posto_carga()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.posto_id IS NULL THEN
    NEW.posto_id := public.meu_posto_id();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cargas_pendentes_preencher_posto ON cargas_pendentes;
CREATE TRIGGER cargas_pendentes_preencher_posto
  BEFORE INSERT ON cargas_pendentes
  FOR EACH ROW EXECUTE FUNCTION public.preencher_posto_carga();

GRANT EXECUTE ON FUNCTION public.preencher_posto_carga() TO authenticated;