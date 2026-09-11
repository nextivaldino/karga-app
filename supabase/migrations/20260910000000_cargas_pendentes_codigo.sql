-- Código definitivo (ex: "TF 012") atribuído pelo Desktop ao importar uma
-- carga pendente do PWA. Fica NULL enquanto a carga não é importada — o
-- código só existe depois de decidido no Desktop (nextCodigo()/código
-- manual em electron/main/sync.ts), nunca antes.
ALTER TABLE cargas_pendentes ADD COLUMN codigo TEXT;
