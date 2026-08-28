# 16 — Módulo Sync (lado Desktop) — Kraga Desktop

## Objetivo
Ecrã de revisão e importação de cargas pendentes vindas do Mobile PWA, gestão
de utilizadores habilitados para sincronizar, e resolução de conflitos.

Pré-requisito: `15-ARQUITETURA-SYNC-SUPABASE.md` implementado (schema Supabase
+ RLS + upsert de contentores).

---

## 1. Configurações → Utilizadores e Permissões (extensão)

Na linha de cada utilizador (módulo 06), adicionar:
- Toggle **"Pode sincronizar via PWA"**
- Ao ativar: chama Supabase Admin API (Service Role Key, só no main process)
  para criar o utilizador no Supabase Auth (email + password temporária
  gerada), grava `pwa_habilitado=1` e `pwa_auth_uid` localmente, faz upsert
  em `pwa_users`.
- Ao desativar: desativa a conta no Supabase Auth (`ban_duration` longo ou
  eliminar sessão), grava `pwa_habilitado=0`, atualiza `pwa_users.ativo=false`.
- Mostrar a password temporária **uma única vez**, em ecrã, com aviso para
  copiar/entregar ao funcionário — não fica recuperável depois (mesma lógica
  de reset de password já usada no módulo 06).

## 2. Upsert de Contentores Disponíveis

- Hook no `contentorRepository`: sempre que `estado`, `nome` ou `codigo` de
  um contentor mudar, dispara upsert assíncrono (não bloqueante) para
  `contentores_disponiveis` no Supabase.
- Se não houver internet, falha silenciosamente e tenta novamente no próximo
  evento de mudança ou no próximo ciclo de polling (não é crítico ter isto
  sempre 100% atualizado ao segundo).

## 3. Novo item de navegação: "🔄 Sincronização"

Sub-secção dentro de Configurações (ou acessível diretamente a partir da
notificação) — **não** é uma 5ª página de topo, mantém-se dentro da filosofia
de Configurações concentrar o administrativo.

```
🔄 Sincronização
─────────────────────────────────
3 cargas pendentes de revisão

👤 João Silva (via PWA)          3 cargas
   ▸ Tambor azul — 45€ — Contentor: TF-2026-03
   ▸ Caixa grande — 80€ — Contentor: TF-2026-03
   ▸ Saco — 20€ — Contentor: TF-2026-04
```

## 4. Ecrã de Revisão de Carga Pendente

Ao clicar numa carga pendente, abre popup (reutiliza `HeaderBarModal`):

```
┌──────────────────────────────────────────────────┐
│ ✕   Revisar Carga Pendente (via PWA)              │
├──────────────────────────────────────────────────┤
│ Inserida por: João Silva · há 12 min               │
│ Contentor destino: [ TF-2026-03 ▾ ]  (editável)    │
├──────────────────────────────────────────────────┤
│ Emissor: "João da Silva"                            │
│  ⚠️ Parece igual a "João Silva" (já existente)       │
│  ( ) Associar ao existente   ( ) Criar novo contacto │
├──────────────────────────────────────────────────┤
│ Nome: Tambor azul   C:60 L:60 A:90   Peso:25  45€   │
├──────────────────────────────────────────────────┤
│        [Rejeitar]      [Editar antes]   [Importar]  │
└──────────────────────────────────────────────────┘
```

### Deteção de conflito de contacto
- Ao carregar o ecrã, corre uma comparação aproximada (normalizar acentos/
  maiúsculas, distância de edição simples — ex: Levenshtein com limiar) entre
  `emissor_nome`/`recetor_nome` da carga pendente e os nomes já existentes em
  `contactos`.
- Se encontrar correspondência próxima (não exata), mostra o aviso com as
  duas opções (Associar ao existente / Criar novo) — Admin decide.
- Se não encontrar nada parecido, associa automaticamente a um contacto novo
  sem perguntar (comportamento normal, sem conflito a resolver).

### Botão "Importar"
- Atribui código sequencial real (mesma lógica de `cargas:nextCodigo` já
  existente).
- Cria a carga em SQLite local com `origem_pwa_user_id` = utilizador que
  inseriu.
- Atualiza `cargas_pendentes` no Supabase: `estado='importada'`,
  `carga_local_id=<novo id>`, `importado_em=now()`.
- Mostra toast de confirmação.

### Botão "Rejeitar"
- Pede motivo (texto curto obrigatório).
- Atualiza `cargas_pendentes`: `estado='rejeitada'`, `motivo_rejeicao`.
- Não cria nada localmente.

### Botão "Editar antes"
- Mesmo ecrã, mas todos os campos ficam editáveis antes de importar (ex:
  corrigir um peso claramente errado) — sem alterar os dados originais em
  `cargas_pendentes`, só o que é gravado na carga final.

## 5. Verificação periódica (polling)

- Reaproveita o timer já existente do Sistema de Notificações (doc 11).
- A cada ciclo (ex: 5 min), consulta `cargas_pendentes WHERE estado =
  'pendente'` (Service Role Key), agrupa por `inserido_por_user_id`, gera
  notificação (nativa + interna) se houver pendentes novos desde a última
  verificação (evitar notificar repetidamente pelo mesmo lote).
- Notificação clicável navega diretamente para "🔄 Sincronização".

## 6. Filtro "Cargas por Utilizador PWA"

- Em Relatórios (ou como filtro adicional na Lista de Cargas), permitir
  filtrar `WHERE origem_pwa_user_id = X` — visão de produtividade/rastreio
  por funcionário de campo.

---

## 7. IPC

- `sync:listPendentes`, `sync:revisarCarga` (detalhe + sugestão de conflito),
  `sync:importarCarga`, `sync:rejeitarCarga`
- `users:habilitarPwa`, `users:desabilitarPwa`
- `contentores:upsertDisponivel` (interno, chamado automaticamente)

---

## 8. Critério de "pronto"
- [ ] Toggle "Pode sincronizar via PWA" cria/desativa conta Supabase Auth
      corretamente
- [ ] Ecrã "🔄 Sincronização" lista pendentes agrupados por utilizador
- [ ] Revisão deteta conflito de contacto parecido e permite associar/criar
- [ ] Importar atribui código sequencial correto e grava
      `origem_pwa_user_id`
- [ ] Rejeitar exige motivo e não cria nada localmente
- [ ] Notificação periódica funciona e navega para o ecrã correto
- [ ] Filtro por utilizador PWA funcional em Relatórios/Lista de Cargas
