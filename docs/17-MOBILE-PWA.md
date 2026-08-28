# 17 — Mobile PWA — Kraga Desktop

## Objetivo
App PWA (`mobile/`), separado do Desktop mas com a mesma linguagem visual,
para funcionários de campo inserirem cargas e para clientes/admins consultarem
via telemóvel. Deploy independente no Vercel. Online-only (sem fila offline
complexa nesta fase).

Pré-requisito: `15-ARQUITETURA-SYNC-SUPABASE.md` implementado.

---

## 1. Stack

- React + Vite + TypeScript
- Tailwind CSS (tokens copiados de `docs/08-DESIGN-SYSTEM.md`, adaptados a
  ecrã tátil — alvos de toque ≥44px)
- `@supabase/supabase-js` (cliente, usa só a Publishable Key)
- `vite-plugin-pwa` (manifest, service worker, instalável no ecrã principal)
- Deploy: Vercel

## 2. Estrutura de pastas

```
Karga-tf/
├── mobile/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── HomePage.tsx
│   │   │   ├── ContentoresPage.tsx
│   │   │   ├── CargasPage.tsx
│   │   │   └── ConfiguracoesPage.tsx
│   │   ├── components/         (FloatingLabelInput, Switch, BoxedList — versão touch)
│   │   ├── lib/supabase.ts
│   │   └── App.tsx
│   ├── public/manifest.json
│   ├── vite.config.ts
│   └── .env.local              (SUPABASE_URL + PUBLISHABLE_KEY, .gitignore)
```

## 3. Autenticação
- Supabase Auth (email + password).
- Primeiro login: força troca da password temporária definida pelo Desktop.
- Sessão persistida (Supabase cuida disso via `localStorage` do browser —
  aceitável aqui, diferente da regra de artifacts, porque é um PWA real, não
  um artifact do Claude).
- Se a conta for desativada pelo Desktop (`ativo=false` em `pwa_users`), a
  app deteta no próximo pedido e força logout com mensagem clara: **"O seu
  acesso foi desativado. Contacte o administrador."**

## 4. Página Home

```
┌─────────────────────────────┐
│ Olá, João            🟢 Online│
├─────────────────────────────┤
│ Contentores Disponíveis       │
│ 📦 TF-2026-03    📦 TF-2026-04│
├─────────────────────────────┤
│ Mensagens                     │
│ 💬 "Confirma o peso da TF 004"│
├─────────────────────────────┤
│ [+ Nova Carga]                 │
└─────────────────────────────┘
```
- Indicador online/offline sempre visível (topo).
- Contentores disponíveis = lista de `contentores_disponiveis` (só estado
  aberto).
- Mensagens = últimas de `mensagens` não lidas, com opção de responder.

## 5. Página Contentores
- Lista dos contentores disponíveis (cards).
- Ao abrir um: mostra só as cargas que **este utilizador** inseriu nesse
  contentor (via `cargas_pendentes WHERE contentor_id = X AND
  inserido_por_user_id = eu`), com o estado de cada uma (pendente/importada/
  rejeitada, com motivo se rejeitada).

## 6. Página Cargas — "+ Nova Carga" (adaptação mobile do popup do Desktop)

Mesma lógica do `12-MODULO-CARGAS-COMPLETO.md`, adaptada a ecrã pequeno:

- **Sem Utility Pane lateral** (não cabe em mobile) — o "empilhamento" vira
  uma **lista vertical simples** por baixo do formulário: preencher, tocar
  "+ Adicionar à lista", formulário limpa (mantém Emissor/Recetor), repete.
  No fim, "Enviar Todas".
- Campos: Emissor/Recetor (autocomplete contra `contactos` — nesta fase,
  como o PWA não tem acesso à tabela `contactos` do Desktop, o autocomplete
  pode ser simplificado: sugere nomes já usados pelo próprio utilizador em
  envios anteriores, guardado localmente no `localStorage` do browser, só
  como conveniência — não é fonte de verdade).
- **Sem toggle Automático/Manual de código** — o PWA nunca define código
  (ver `15-ARQUITETURA-SYNC-SUPABASE.md` secção 1).
- Campos C/L/A/Peso/Valor em grelha compacta (2 colunas em mobile, não 5
  numa linha só — não cabe).
- Toggle Pago/Devido.
- **Sem contêiner de destino embutido na Header Bar** como no Desktop —
  aqui é um seletor simples no topo do formulário (dropdown), porque o
  utilizador pode estar a inserir para um contentor diferente a cada visita.

Ao "Enviar Todas": grava em `cargas_pendentes` (estado `pendente`), mostra
confirmação, limpa o formulário.

### Lista de Cargas (mesma página, aba/tab dentro dela)
- Lista das próprias cargas enviadas (todas, não só de um contentor),
  filtrável por estado (Pendente/Importada/Rejeitada).
- Cargas rejeitadas mostram o motivo, com botão "Reenviar corrigida".

## 7. Página Configurações
- Tema (Claro/Escuro) — mesma paleta do Desktop.
- Notificações (push do browser, se suportado — nice to have, não bloqueante).
- Trocar password.
- Ver mensagens (histórico completo, não só as recentes da Home).
- Sair (logout).

## 8. Instalável (PWA real)
- `manifest.json` com ícone, nome "Kraga Mobile", `display: standalone`.
- Service worker básico (cache de assets estáticos, sem cache de dados —
  dados são sempre online-only, buscar cache de dados desatualizados seria
  pior que mostrar "sem ligação").

---

## 9. Critério de "pronto"
- [ ] Login funcional via Supabase Auth, força troca de password no 1º acesso
- [ ] Logout forçado se a conta for desativada pelo Desktop
- [ ] Home mostra contentores disponíveis, mensagens, indicador online/offline
- [ ] Contentores mostra só as próprias cargas por contentor
- [ ] Popup Nova Carga funcional em modo lote (lista vertical, sem Utility
      Pane), sem atribuir código
- [ ] Lista de Cargas com filtro por estado, cargas rejeitadas com motivo e
      opção de reenvio
- [ ] Instalável como PWA (manifest + service worker básico)
- [ ] Deploy funcional no Vercel, ligado ao projeto Supabase real
