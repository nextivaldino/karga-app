# 06 — Módulo Auth Avançado (Root + Permissões) — Kraga Desktop

## Objetivo deste documento
Completar o sistema de utilizadores iniciado no módulo 00: papel Root, criação de
utilizadores secundários, permissões granulares e auditoria básica.

Pré-requisito: módulos 00 a 05 já implementados. Este módulo só faz sentido
quando o sistema já tem funcionalidades reais a proteger.

---

## 1. Contexto

No módulo 00, o schema `users` já tem a coluna `role` com `('root', 'admin', 'user')`,
mas só o fluxo de Admin está funcional. Este módulo completa os outros dois papéis.

---

## 2. Papéis e responsabilidades

### Root
- Não acede a dados operacionais (cargas, contentores, contactos, faturação).
- Função exclusiva: resetar password de utilizadores Admin, e aceder a um ecrã de
  "Manutenção" simples (ex: ver logs de erro, forçar backup, ver espaço em disco
  usado pela base de dados).
- Deve existir sempre pelo menos um utilizador Root no sistema (não pode ser eliminado
  se for o único).

### Admin
- Acesso total às funcionalidades operacionais (como já implementado).
- Pode criar, editar, bloquear e eliminar utilizadores do tipo `user`.
- Pode atribuir permissões granulares aos utilizadores `user` (ver secção 3).

### User (utilizador secundário)
- Acesso limitado, definido pelas permissões atribuídas pelo Admin.

---

## 3. Permissões granulares

Nova tabela para permissões por módulo, em vez de hardcode:

```sql
CREATE TABLE permissoes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  modulo TEXT NOT NULL,          -- 'cargas', 'contentores', 'contactos', 'faturacao', 'relatorios', 'configuracoes'
  pode_ver INTEGER NOT NULL DEFAULT 0,
  pode_criar INTEGER NOT NULL DEFAULT 0,
  pode_editar INTEGER NOT NULL DEFAULT 0,
  pode_eliminar INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

- Um utilizador `admin` ignora esta tabela (tem sempre acesso total).
- Um utilizador `user` só vê/faz o que a tabela `permissoes` permitir, módulo a módulo.
- A UI (sidebar, botões de ação) deve esconder/desativar o que o utilizador não pode
  usar — mas a validação real e definitiva acontece sempre no lado do Electron main
  process (IPC handlers), nunca só no frontend.

---

## 4. Sessões, histórico e auditoria

### Sessões
```sql
CREATE TABLE sessoes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  login_at TEXT NOT NULL,
  logout_at TEXT,               -- NULL enquanto ativa
  created_at TEXT NOT NULL
);
```
- Regista início/fim de sessão. Admin pode ver histórico de sessões de qualquer
  utilizador num ecrã simples ("Utilizador X, última sessão: ...").

### Auditoria (mínima, focada no essencial)
```sql
CREATE TABLE auditoria (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  acao TEXT NOT NULL,           -- ex: "criou_carga", "editou_contentor", "fechou_contentor"
  entidade TEXT,                -- ex: "carga", "contentor"
  entidade_id TEXT,
  detalhes TEXT,                -- JSON simples com o que mudou, se aplicável
  created_at TEXT NOT NULL
);
```
- Registar apenas ações sensíveis/importantes: criar/editar/eliminar carga, fechar
  contentor, alterar pagamento, criar/editar utilizador. Não registar cada clique.

---

## 5. Interface

### 5.1 Gestão de Utilizadores (Admin)
- Lista de utilizadores: nome, email, role, estado (ativo/bloqueado), última sessão
- Ações: criar, editar, bloquear/desbloquear, eliminar (soft delete), resetar
  password (gera password temporária ou permite definir uma nova)
- Ao criar/editar um `user`, mostrar painel de permissões por módulo (checkboxes
  Ver/Criar/Editar/Eliminar por módulo)

### 5.2 Ecrã de Manutenção (Root)
- Login separado ou mesmo ecrã de login com deteção automática do role
- Após login como Root: ecrã simples com:
  - Lista de Admins (para reset de password)
  - Botão de backup forçado (reutiliza `settings:backup` do módulo 05)
  - Informação básica do sistema (tamanho da base de dados, versão do app)

### 5.3 Sidebar dinâmica
- Itens da sidebar mostrados/escondidos conforme o role e as permissões do
  utilizador autenticado.

---

## 6. IPC / Repository

- `electron/models/repositories/permissaoRepository.ts`
- `electron/models/repositories/auditoriaRepository.ts`
- `electron/models/repositories/sessaoRepository.ts`
- Canais IPC: `users:create`, `users:update`, `users:block`, `users:delete`,
  `users:resetPassword`, `permissoes:get`, `permissoes:set`, `auditoria:list`,
  `sessoes:list`
- Middleware central de verificação de permissão nos handlers IPC sensíveis
  (verificar antes de executar a ação, não confiar só na UI)

---

## 7. Critério de "pronto" para este módulo

- [ ] Login distingue corretamente Root / Admin / User e mostra a UI correta
- [ ] Root consegue resetar password de um Admin
- [ ] Admin consegue criar um utilizador `user` com permissões específicas
- [ ] Um utilizador `user` só vê/consegue usar o que tem permissão (testar com
      um caso real: ex: user só com permissão de ver Cargas, sem criar/editar)
- [ ] Sidebar esconde corretamente itens sem permissão
- [ ] Ações sensíveis ficam registadas em `auditoria`
- [ ] Sessões são registadas corretamente (login/logout)

---

## Fora de escopo nesta fase (não implementar ainda)

- Autenticação multi-fator (2FA)
- Notificações em tempo real de ações de outros utilizadores
- Exportação de logs de auditoria (pode ficar para Relatórios, se necessário depois)
