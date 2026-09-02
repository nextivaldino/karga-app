-- mensagens: o destinatário pode marcar as suas próprias mensagens
-- recebidas como lidas. Faltava esta policy — sem ela, o UPDATE de
-- "lida" feito pelo Mobile falha silenciosamente sob RLS (0 linhas
-- afetadas, sem erro), descoberto ao testar o sino de notificações (19g).
CREATE POLICY "marcar mensagem recebida como lida" ON mensagens
  FOR UPDATE USING (
    para_user_id = (SELECT id FROM pwa_users WHERE auth_uid = auth.uid())
  )
  WITH CHECK (
    para_user_id = (SELECT id FROM pwa_users WHERE auth_uid = auth.uid())
  );
