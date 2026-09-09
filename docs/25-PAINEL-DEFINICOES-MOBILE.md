# 25 — Painel de Definições do Karga Mobile

## Objetivo
Redesenho e expansão do painel de Configurações do Mobile (definido
originalmente na secção 7 do `19-KARGA-MOBILE-REDESIGN.md`), confirmado
com o utilizador após uma sessão anterior em que o pedido tinha ficado
ambíguo. Cobre 5 pontos confirmados explicitamente.

Pré-requisito: sessão de 2026-09-08 (`24-HANDOFF-SESSAO-2026-09-08.md`)
já implementada — em particular a resolução de `posto_id` e o padrão
visual único já aplicado ao Mobile (cards pastel sem borda, tokens
`control`/`surface`/`pill`).

---

## 1. Redesenho visual (mesma funcionalidade, melhor aparência)

- Aplicar o mesmo padrão visual já unificado no resto do Mobile nesta
  sessão anterior (`.card-surface`, `.btn-primary`, tokens de radius) —
  o painel de Configurações atual ainda pode ter estilos antigos por
  reconciliar.
- Organizar em secções com separadores claros (não uma lista plana única):
  **Perfil** · **Posto** · **Notificações** · **Segurança** · **Sobre**.
- Cada secção com título pequeno em maiúsculas (mesmo padrão de label
  já usado no resto do design system) e um card por secção.

## 2. Preferências de Notificações (ligar/desligar tipos de alerta)

Lista de toggles, um por tipo de notificação já existente no sino do
Mobile:
- 🔔 Carga importada
- 🔔 Carga rejeitada (sempre ativo, não pode desligar — informação
  crítica que precisa de ação do próprio utilizador)
- 💬 Mensagem nova
- ⚠️ Falha no envio (fila offline) — sempre ativo, mesma razão que acima

Guardar preferências em `localStorage`/`IndexedDB` local (não precisa de
sincronizar com o Supabase — é preferência de dispositivo, não de conta).

## 3. Informação do Posto associado

Card de leitura simples:
```
📍 Posto
Nome: Posto Principal
País: Luxemburgo
```
Dados vêm de `contentores_disponiveis`/`pwa_users.posto_id` já
resolvidos — sem edição possível aqui (a gestão do Posto é feita no
Desktop/painel Root, não no Mobile).

## 4. Editar Perfil (nome, foto)

- Campo de nome editável (grava em `pwa_users.nome`).
- Upload de foto de perfil — usar o **Supabase Storage** (bucket
  público de avatares, já que o sistema já usa avatares reais em
  notificações/mensagens, conforme a sessão de 2026-09-08). Redimensionar
  no cliente antes de enviar (ex: 256×256) para não sobrecarregar o
  bucket com imagens grandes.
- Avatar atualizado reflete imediatamente nas mensagens/notificações que
  já mostram avatares reais.

## 5. Gestão do PIN de desbloqueio rápido

- Se ainda não configurado (ver `19-KARGA-MOBILE-REDESIGN.md`, que
  previa PIN mas cuja implementação real deve ser confirmada nesta
  tarefa): opção "Configurar PIN".
- Se já configurado: opção "Alterar PIN" (pede o PIN atual antes de
  definir um novo) e "Desativar PIN" (volta a pedir login completo
  sempre que a sessão precisar de reautenticação).

---

## 6. IPC / Supabase

- Nenhuma tabela nova necessária — usa `pwa_users` (nome, avatar_url) e
  preferências locais (sem sync).
- Confirmar se existe já `avatar_url` em `pwa_users`; se não, adicionar:
  ```sql
  ALTER TABLE pwa_users ADD COLUMN avatar_url TEXT;
  ```

---

## 7. Critério de "pronto"
- [ ] Painel reorganizado em secções (Perfil/Posto/Notificações/Segurança/Sobre)
- [ ] Toggles de notificação funcionais, persistidos localmente
- [ ] Card de informação do Posto correto e só-leitura
- [ ] Edição de nome + foto de perfil funcional, avatar propaga a
      mensagens/notificações
- [ ] PIN: configurar/alterar/desativar funcional
- [ ] Visual consistente com o padrão já unificado no resto do Mobile
