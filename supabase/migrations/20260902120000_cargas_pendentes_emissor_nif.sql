-- Emissor costuma estar sedeado no país de origem (ex: Luxemburgo) —
-- permite capturar o NIF/matricule logo no Mobile, para já ir associado
-- ao contacto criado no Desktop ao importar (contactos.nif já existia).
ALTER TABLE cargas_pendentes ADD COLUMN emissor_nif TEXT;
