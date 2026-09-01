# 19 — Karga Mobile: Redesign + Modo Offline

## Objetivo
Redesenho completo da interface do Karga Mobile (`mobile/`) para um layout
moderno, minimalista, com dock estilo iOS, e introdução de modo offline com
fila de sincronização. Substitui as secções de interface de
`17-MOBILE-PWA.md` (o schema/backend desse documento mantém-se válido).

---

## 1. Sessão e Login

- **Sessão persistente**: depois do primeiro login bem-sucedido em cada
  telemóvel/browser, o token de sessão do Supabase Auth fica guardado
  (mecanismo padrão do SDK) — o utilizador não volta a ver o ecrã de login
  ao reabrir a app, só se fizer logout explícito ou a sessão expirar/for
  revogada pelo Admin.
- **Troca de password**: deixa de ser obrigatória no primeiro acesso.
  Mostrar uma sugestão não-bloqueante (banner dispensável: "Recomendamos
  alterar a password padrão. Alterar agora?") em vez de forçar o fluxo.
- **Ecrã de login**: minimalista — logo centrado, `FloatingLabelInput` para
  email/password, botão "Entrar" de largura total, sem elementos extra.
  Mensagens de erro claras ("Email ou password incorretos", "Conta
  desativada — contacte o administrador").

## 2. Credenciais padrão (gerado pelo Desktop)

- Ao ativar "Pode sincronizar via PWA" (módulo 16), o Desktop atribui:
  - Email: `userNN@karga.com` (NN = número sequencial automático,
    ex: `user01@karga.com`, `user02@karga.com`...)
  - Password inicial: `1234567` (igual para todos, documentado como padrão
    de arranque — o banner de sugestão de troca cobre o risco)
- Isto substitui a geração de password aleatória "temporária" do doc 16 —
  mais simples de comunicar verbalmente a um funcionário de campo.

## 3. Layout geral — Dock estilo iOS

```
┌─────────────────────────────────────────┐
│  Olá, João 👋                🟢  ⚙️      │  ← Header: saudação + online + engrenagem
├─────────────────────────────────────────┤
│                                           │
│              (conteúdo)                  │
│                                           │
├─────────────────────────────────────────┤
│      🏠          📦          💬          │  ← Dock: 3 ícones fixos
│     Home                                  │  ← label só sob o item ativo
└─────────────────────────────────────────┘
```

- **Dock com só 3 itens**: Home · Cargas · Mensagens. Ícones sem label por
  omissão; o item ativo (selecionado) mostra o texto por baixo do ícone,
  os outros ficam só ícone — efeito limpo e dinâmico.
- **Engrenagem** (canto superior direito, ao lado do indicador de estado
  online/offline): abre um menu (`Popover` simples) com: Configurações,
  Trocar Password, Sobre, Sair. Tudo o que não é uso diário fica aqui,
  fora da dock principal.
- **Indicador online/offline**: círculo colorido (verde = online, cinza/
  vermelho = offline) sempre visível junto à engrenagem.
- Header mostra sempre "Olá, {nome_do_utilizador}" à esquerda.

## 4. Página Home — cards minimalistas

```
┌─────────────┐ ┌─────────────┐
│ 📦 12        │ │ 💰 340€      │
│ cargas/semana│ │ este mês     │
└─────────────┘ └─────────────┘
┌─────────────────────────────┐
│ 🔔 2 mensagens novas          │
└─────────────────────────────┘
┌─────────────────────────────┐
│ ⏳ 3 cargas por enviar         │  ← só aparece se houver fila offline pendente
└─────────────────────────────┘
```
- Cards tocáveis, cada um navega para a página relevante (Cargas, Mensagens).
- Dados vêm de uma agregação simples sobre as próprias `cargas_pendentes`
  do utilizador (cache local, ver secção 6).

## 5. Botão Nova Carga — popup reorganizado

Acedido pelo ícone 📦 "Cargas" na dock → botão "+ Nova Carga" no topo dessa
página (não fica na dock em si, para manter a dock a só 3 itens fixos,
conforme pedido de minimizar itens).

```
┌──────────────────────────────────────────┐
│ ✕  Nova Carga            Contêiner: [▾]   │
├──────────────────────────────────────────┤
│ Emissor: [ Nome          ]  (+)            │
│   ▸ (expande) Telefone · Morada · NIF · Email │
│ Recetor: [ Nome          ]  (+)            │
│   ▸ (expande) Telefone · Morada · NIF · Email │
├──────────────────────────────────────────┤
│ Nome da carga: [                       ]   │
│ C[  ] L[  ] A[  ]   Peso[  ]   Valor[  ]   │
│ Pago ⚫──○ (ativo por defeito)              │
├──────────────────────────────────────────┤
│      [+ Empilhar mais uma]    [Enviar]     │
└──────────────────────────────────────────┘
```

- **"(+)" ao lado do nome** expande os campos opcionais desse contacto
  (telefone, morada, NIF, email) — mais compacto que o "▸ mais campos"
  do Desktop, mais adequado a ecrã pequeno.
- **Pago vem ativado por defeito** (diferente do Desktop, que é Devido por
  defeito) — no contexto de campo, assume-se pagamento já combinado.
- **Sem seletor de código nem toggle automático/manual** — mantém-se a
  regra do doc 15: o PWA nunca atribui código.
- **Empilhar**: lista vertical simples (sem Utility Pane lateral, não cabe
  em mobile) — cada "+ Empilhar mais uma" adiciona a atual a uma lista por
  baixo do botão, limpa o formulário (mantém Emissor/Recetor), repete.
  "Enviar" grava tudo de uma vez (ou enfileira offline, ver secção 6).

## 6. Modo Offline — fila de sincronização

**Mudança de arquitetura face ao `17-MOBILE-PWA.md` original** (que definia
o PWA como "online-only"). Agora:

### Armazenamento local
- `IndexedDB` (via biblioteca leve, ex: `idb`) guarda:
  - Cache de leitura: últimos contentores disponíveis e cargas do próprio
    utilizador (para a app não ficar em branco offline)
  - Fila de escrita: cargas criadas offline, com estado `'fila'`

### Fluxo
1. Utilizador cria carga(s) com o telemóvel sem ligação → grava na fila
   local `IndexedDB`, mostra imediatamente na Lista de Cargas com badge
   **"⏳ Por enviar"** (não bloqueia a UI, parece "enviado" ao utilizador
   exceto pelo badge).
2. App deteta mudança de conectividade (`navigator.onLine` +
   `window.addEventListener('online', ...)`, com verificação ativa
   adicional via pequeno pedido de teste, já que `navigator.onLine` não é
   sempre fiável).
3. Ao recuperar ligação: banner no topo **"A enviar 3 cargas..."**, processa
   a fila uma a uma (grava em `cargas_pendentes` no Supabase).
4. Cada item da fila atualiza para:
   - **"✅ Enviada"** — sucesso, remove da fila local, item passa a refletir
     o estado real (`pendente` no servidor)
   - **"⚠️ Erro — toca para detalhes"** — falha (ex: contentor entretanto
     fechado/inexistente); mostra mensagem clara e específica, não o erro
     técnico bruto; oferece "Tentar novamente" ou "Editar e reenviar"
5. Fila nunca se perde ao fechar a app — persiste em `IndexedDB` até ser
   enviada com sucesso ou descartada manualmente pelo utilizador.

### Mensagens de erro claras (substituem erros técnicos)
| Erro técnico | Mensagem mostrada |
|---|---|
| Contentor não encontrado/fechado | "Este contentor já não está disponível. Escolhe outro." |
| Falha de rede a meio do envio | "Sem ligação. Vamos tentar de novo assim que voltares a ficar online." |
| Sessão expirada | "A tua sessão expirou. Inicia sessão novamente." |
| Erro genérico do servidor | "Algo correu mal ao enviar esta carga. Toca para tentar novamente." |

## 7. Página Cargas — lista compacta, agrupada

```
[+ Nova Carga]                          🔍
─────────────────────────────────────────
João Silva ──────────────────────────────
  Tambor azul     45€    ⏳ Por enviar
  Caixa grande    80€    ✅ Pendente
─────────────────────────────────────────
Maria Gomes ──────────────────────────────
  Saco            20€    ✅ Importada
```
- Colunas alinhadas: Nome da carga · Valor · Estado.
- Agrupado por utilizador **emissor** com separador horizontal fino entre
  grupos (relevante quando o mesmo funcionário insere para vários clientes).
- Toque numa linha com estado `pendente` ou `fila`/`erro` permite editar
  antes de (re)enviar; itens `importada`/`rejeitada` só em leitura (mas
  mostra motivo se rejeitada).
- Filtro rápido por estado (dropdown simples no topo).

## 8. Página Mensagens
- Mantém-se como já estava (leitura + marcar lida) — o composer de novas
  mensagens continua desativado nesta fase, conforme lacuna já identificada
  no relatório de estado (`18-RELATORIO-ESTADO-ATUAL.md` secção 4:
  ausência de espelho de identidade de Admin no Supabase). Não faz parte
  deste redesign resolver isso agora.

## 9. Desktop — histórico de sincronização (complementa doc 16)

No ecrã "🔄 Sincronização" do Desktop, adicionar uma aba/secção
**"Histórico"** junto à de "Pendentes":
- Lista simples de eventos recentes: importações bem-sucedidas, rejeições,
  e também **erros reportados pelo próprio PWA** (ex: se uma carga na fila
  offline falhar repetidamente, isso fica visível ao Admin como sinal de
  possível problema, não só ao funcionário no telemóvel).
- Não precisa de ser elaborado — uma lista cronológica simples
  (evento, utilizador, timestamp, resultado) já cumpre o objetivo de dar
  visibilidade ao Admin sobre o que está a acontecer do lado do PWA.

---

## 10. Critério de "pronto"
- [ ] Sessão persistente funcional (login 1x por dispositivo)
- [ ] Banner de sugestão de troca de password (não bloqueante)
- [ ] Credenciais padrão `userNN@karga.com` / `1234567` geradas pelo Desktop
- [ ] Dock com 3 ícones, label dinâmica só no ativo
- [ ] Menu de engrenagem com Configurações/Trocar Password/Sobre/Sair
- [ ] Home com cards minimalistas incl. card de "por enviar" quando aplicável
- [ ] Popup Nova Carga reorganizado conforme secção 5, Pago por defeito
- [ ] Modo offline funcional: criar carga sem ligação, ver badge "Por
      enviar", envio automático ao reconectar, mensagens de erro claras
- [ ] Lista de Cargas compacta, agrupada por utilizador com separador
- [ ] Desktop mostra histórico de sincronização (sucessos/erros/rejeições)
