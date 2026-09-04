-- Recetor (Cabo Verde) também pode ter email de contacto, tal como o
-- emissor já tem — usado para enviar recibo/aviso quando a carga chega.
ALTER TABLE cargas_pendentes ADD COLUMN recetor_email TEXT;
