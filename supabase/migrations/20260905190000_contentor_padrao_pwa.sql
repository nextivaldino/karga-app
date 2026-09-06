-- Contentor padrão para envios PWA: um contentor global (para qualquer
-- utilizador PWA sem atribuição própria) e um por utilizador (tem
-- prioridade sobre o global). Resolve a UX de o Mobile mostrar uma lista
-- global de contentores sem qualquer indicação de qual escolher.
ALTER TABLE contentores_disponiveis ADD COLUMN padrao_global BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE pwa_users ADD COLUMN contentor_padrao_id UUID REFERENCES contentores_disponiveis(id);
