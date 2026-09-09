-- Painel de Definições do Mobile (docs/25) — perfil editável precisa de
-- guardar a foto do utilizador. Mesmo padrão do Desktop: base64 direto
-- numa coluna TEXT (ver electron/models/database.ts users.avatar), não um
-- URL de Supabase Storage — não existe nenhuma infraestrutura de Storage
-- neste projeto, e reaproveitar o padrão já usado evita construir uma de
-- raiz só para isto.
ALTER TABLE pwa_users ADD COLUMN IF NOT EXISTS avatar TEXT;
