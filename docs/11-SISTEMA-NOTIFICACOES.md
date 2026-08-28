# 11 — Sistema de Notificações — Kraga Desktop

## Objetivo
Sistema de notificações integrado tanto com o sistema operativo (mac/win/linux,
via Electron `Notification` API nativa) quanto com um centro de notificações
dentro da própria app, para nada passar despercebido ao utilizador.

---

## 1. Dois canais de notificação

### 1.1 Notificação nativa do SO (Electron `new Notification()`)
Usada para eventos importantes que o utilizador deve ver mesmo com a app em
segundo plano:
- Contentor perto da data de partida (ex: faltam 2 dias)
- Erro crítico (ex: falha ao gravar, base de dados corrompida)
- Backup concluído/falhado
- (Futuro, quando sync existir) Nova sincronização recebida do PWA

### 1.2 Centro de notificações interno (dentro da app)
Ícone de sino 🔔 na Header Bar principal (direita, ao lado da pesquisa/utilizador),
com contador de não-lidas. Ao clicar, abre um `Popover` (padrão GNOME) com a lista:

```
🔔 (3)
┌──────────────────────────────────────┐
│ Notificações                    Limpar│
├──────────────────────────────────────┤
│ 🟠 Contentor TF-03 parte em 2 dias     │
│    há 10 min                           │
├──────────────────────────────────────┤
│ 🟢 Backup concluído com sucesso        │
│    há 2h                               │
├──────────────────────────────────────┤
│ 🔵 12 cargas importadas do Excel       │
│    ontem                               │
└──────────────────────────────────────┘
```

---

## 2. Schema

```sql
CREATE TABLE notificacoes (
  id TEXT PRIMARY KEY,
  tipo TEXT NOT NULL CHECK (tipo IN ('info', 'sucesso', 'aviso', 'erro')),
  titulo TEXT NOT NULL,
  mensagem TEXT,
  lida INTEGER NOT NULL DEFAULT 0,
  link_modulo TEXT,        -- ex: 'contentores', 'cargas' — para navegação ao clicar
  link_entidade_id TEXT,   -- ex: id do contentor relacionado
  created_at TEXT NOT NULL
);
```

## 3. Eventos que geram notificação (nesta fase)

| Evento | Tipo | Notificação nativa? |
|---|---|---|
| Contentor aberto há mais de X dias sem carga nova | aviso | Não (só interna) |
| Contentor a X dias da data de partida | aviso | Sim |
| Backup concluído | sucesso | Sim |
| Backup falhado | erro | Sim |
| Importação Excel concluída (lote) | info | Não (só interna) |
| Erro ao gravar carga/contentor (falha inesperada) | erro | Sim |
| Código de carga duplicado detetado em lote colado | aviso | Não (só interna) |

## 4. Comportamento
- Clicar numa notificação interna marca-a como lida e navega para o
  módulo/entidade relacionada (via `link_modulo` + `link_entidade_id`).
- Botão "Limpar" marca todas como lidas (soft — mantém histórico, só limpa o badge).
- Notificações nativas do SO, ao serem clicadas, trazem a janela do Kraga para
  primeiro plano e navegam para o mesmo destino.
- Verificação periódica em background (ex: a cada 30 min, timer no main process)
  para gerar as notificações de "contentor perto da data de partida" e "contentor
  parado há X dias" — não depende de o utilizador estar a navegar nessa página.

## 5. IPC
- `notificacoes:list`, `notificacoes:marcarLida`, `notificacoes:marcarTodasLidas`,
  `notificacoes:criar` (uso interno pelo sistema, não exposto à UI diretamente)

## 6. Critério de "pronto"
- [ ] Ícone de sino com contador funcional na Header Bar
- [ ] Popover de notificações abre e lista corretamente
- [ ] Notificações nativas do SO disparam nos eventos "Sim" da tabela acima
- [ ] Clicar numa notificação navega para o destino correto
- [ ] Verificação periódica em background gera notificações de contentor
      automaticamente, sem depender da app estar em primeiro plano
