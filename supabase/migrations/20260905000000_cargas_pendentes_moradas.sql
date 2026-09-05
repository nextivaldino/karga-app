-- Moradas opcionais recolhidas no PWA e transferidas para os contactos locais
-- no momento em que o Admin importa a carga.
ALTER TABLE cargas_pendentes ADD COLUMN emissor_morada TEXT;
ALTER TABLE cargas_pendentes ADD COLUMN recetor_morada TEXT;
