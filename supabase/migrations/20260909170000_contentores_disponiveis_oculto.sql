-- Mesma falha da migration anterior (eliminar não sincronizava), agora
-- para "Ocultar": o Desktop tinha contentores.oculto localmente desde o
-- início, mas contentores_disponiveis (espelho lido pelo PWA) nunca
-- soube disso — um contentor que o Admin escondeu no Desktop (tipicamente
-- fechado/entregue antigo que já não quer ver na lista operacional)
-- continuava a aparecer no seletor do Mobile como destino válido para
-- novas cargas.
ALTER TABLE contentores_disponiveis
  ADD COLUMN IF NOT EXISTS oculto BOOLEAN NOT NULL DEFAULT false;
