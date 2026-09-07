-- Mantém o Mobile alinhado com a disponibilidade real do Desktop.
ALTER TABLE contentores_disponiveis
  ADD COLUMN IF NOT EXISTS bloqueado BOOLEAN NOT NULL DEFAULT false;
