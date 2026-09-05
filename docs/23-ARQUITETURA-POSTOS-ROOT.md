# 23 — Arquitetura de Postos e Root — Kraga Desktop

## Objetivo
Este documento captura decisões de arquitetura discutidas e ainda NÃO
implementadas: a hierarquia Root → Postos → Utilizadores Mobile, o painel
Root via browser, o mecanismo de ativação de Postos, e os ajustes ao
sistema de autenticação (registo por email, login por username, reset de
password, PIN no mobile). Nada disto foi comunicado ao Claude Code antes —
é novo, gerado fora da sessão de implementação.

---

## 1. Hierarquia geral

```
Karga-Posto-Root  (o "super admin" — controla Postos, não dados operacionais)
        │
        ├── gere → Posto-01 (ex: Luxemburgo)
        ├── gere → Posto-02 (outro país)
        └── gere → Posto-N...

Cada Posto:
        │
        ├── é, na prática, uma instalação normal do Kraga Desktop
        │   (offline-first, SQLite local como fonte de verdade dos seus
        │    próprios contentores/cargas — SEM alteração a este princípio)
        ├── gere os seus PRÓPRIOS utilizadores Mobile (editar, bloquear,
        │   resetar password) — mesma lógica que já existe hoje entre
        │   "Admin" e "utilizadores" no Desktop, só reenquadrada como
        │   "Posto" e "utilizadores desse Posto"
        └── recebe cargas dos utilizadores Mobile associados a ELE
            (reaproveita o mecanismo já construído: cargas_pendentes,
            contentores_disponiveis, sync manual/pull)
```

- **Root NÃO gere utilizadores individuais nem dados de negócio
  (cargas/contentores) diretamente.** Gere Postos: criar, suspender,
  bloquear, editar dados do Posto (nome, país, estado).
- **Cada Posto continua 100% offline-first**, exatamente como o Desktop
  já funciona hoje. Isto é uma decisão não-negociável, reafirmada durante
  a discussão: o Supabase serve para *coordenação/identidade*, nunca passa
  a ser a fonte de verdade dos dados operacionais de um Posto.
- **Cada Posto tem os seus próprios contentores.** Não há partilha de
  contentores entre Postos nesta fase.

## 2. Ativação de um novo Posto (código de provisionamento)

Resolve o problema de "o instalador pode circular livremente, como impedir
que qualquer cópia dele vire um Posto sem autorização":

1. Root, no painel, cria um registo de Posto **pendente** no Supabase
   (nome, país, estado inicial = `'pendente'`) e gera um **código de
   ativação único, de utilização única, associado a ESSE Posto
   específico**.
2. Esse código é entregue (fora do sistema — verbalmente, por email, etc.)
   a quem vai instalar fisicamente o Kraga Desktop nesse local.
3. Na primeira execução do app nesse local (depois do wizard de setup já
   existente), pede-se o código de ativação → valida-se contra o Supabase
   → se válido e ainda não usado, o registo do Posto passa a `estado =
   'ativo'` e fica ligado a essa instalação específica → só depois disso
   o Desktop passa a funcionar normalmente.
4. O código fica inutilizável depois de usado uma vez (evita reutilização
   acidental ou indevida).
5. Root pode, a qualquer momento, **suspender/bloquear** um Posto já ativo
   remotamente (o Posto passa a recusar operar, ou pelo menos a
   sincronizar, na próxima verificação de estado).

**Nota importante de segurança já esclarecida**: a chave "publishable" do
Supabase vai sempre embutida no instalador (isso é normal e seguro — a
proteção real está nas RLS policies). O código de ativação não serve para
"impedir acesso técnico ao Supabase", serve para decidir se uma instalação
é **reconhecida como Posto legítimo** dentro do negócio — sem ele, mesmo
que a app tecnicamente contacte o Supabase, não tem identidade de Posto
válida para operar de forma útil (RLS bloqueia ações que dependam de
pertencer a um `posto_id` reconhecido).

## 3. Painel Root via browser

- **Só o Root acede** — não é um painel geral para Admins de Posto.
- **2FA obrigatório** para o Root neste painel (não opcional, ao contrário
  do resto do sistema).
- **Registo de auditoria completo** de tudo o que o Root faz aqui
  (reaproveita o conceito da tabela `auditoria` já existente no Desktop,
  estendida a este contexto).
- **Arquitetura obrigatória: backend próprio, nunca browser direto ao
  Supabase com privilégios totais.** A Service Role Key NUNCA pode estar
  em código que corre no browser (qualquer pessoa pode abrir as devtools e
  roubá-la). É preciso um pequeno backend (ex: Supabase Edge Functions, ou
  um servidor Node simples) que guarda a Service Role Key só do lado do
  servidor; o painel web fala com esse backend, nunca diretamente com
  privilégios de admin.
- **🚫 REGRA ABSOLUTA: nunca "ver" passwords.** Passwords são hashes
  irreversíveis — não existe forma técnica de "mostrar a senha original".
  O painel só pode **resetar** (gerar nova, comunicar manualmente),
  nunca exibir a antiga. Isto aplica-se a QUALQUER camada do sistema
  (Posto, Root, Desktop, Mobile) — é uma regra de segurança transversal,
  não uma preferência de design.

### Âmbito do painel Root — **decisão em aberto, precisa de confirmação**
Foi levantada uma tensão ainda não resolvida: o Root deve conseguir só
**gerir Postos e utilizadores** (identidade, ativação, bloqueio — seguro e
coerente com o modelo offline-first), ou também precisa de **operar dados
de negócio remotamente** (criar contentores, gerir cargas) a partir do
painel web? A segunda opção entra em conflito direto com "cada Posto é a
fonte de verdade dos seus próprios dados" — se confirmada, precisa de
repensar a arquitetura de sincronização (deixaria de ser só pull manual
para revisão). **Recomendação: manter o painel Root limitado a
identidade/administração (Postos + utilizadores + ativação/bloqueio),
nunca a dados operacionais de negócio.** Confirmar esta decisão antes de
implementar o painel.

## 4. Autenticação — registo por email, login por username

- Utilizadores (Mobile e, potencialmente, Postos) **registam-se com
  email** (necessário para reset de password e comunicação).
- **Login do dia-a-dia usa um `username`** (não o email), mais curto e
  fácil de comunicar verbalmente a um funcionário de campo.
- Mecanismo técnico: novo campo `username` (único) na tabela de
  utilizadores. No login, o sistema faz uma consulta interna
  `username → email`, e só depois autentica com esse email + password
  contra o Supabase Auth (que continua a funcionar por email por trás —
  o utilizador nunca precisa de saber disso).

## 5. Reset de password — dois caminhos complementares

1. **Self-service por email**: usa o mecanismo nativo do Supabase Auth
   ("esqueci-me da password" → envia link de recuperação para o email
   registado). Não precisa de construir nada de raiz.
2. **Assistido pelo Posto**: o Posto (equivalente ao Admin atual do
   Desktop) pode resetar a password de qualquer utilizador Mobile
   associado a ele — mesmo padrão já existente no módulo 06, só reforçado
   aqui como parte do modelo Posto.

Os dois caminhos coexistem — self-service quando a pessoa tem acesso ao
email, assistido quando não tem.

## 6. Mobile — sessão persistente + PIN de desbloqueio rápido

- **Sessão persistente já decidida** (login uma vez por telemóvel, doc 19)
  mantém-se como o mecanismo principal.
- **PIN de 4-6 dígitos** para os casos em que É suposto pedir
  reautenticação (logout explícito, sessão expirada, logout forçado
  remotamente pelo Posto/Root):
  - Login completo (username + password) acontece normalmente, autentica
    contra o Supabase.
  - Depois desse login, o utilizador define um PIN, guardado **só
    localmente** no dispositivo (nunca enviado ao servidor).
  - Se a sessão "adormecer" (app em background, timeout curto, logout
    suave), pede-se só o PIN em vez do login completo — desbloqueia a
    sessão já válida guardada localmente.
  - Um **logout verdadeiramente explícito** (utilizador escolhe sair de
    vez, ou Posto/Root força logout remotamente) apaga a sessão E o PIN
    local — nesse caso, da próxima vez é preciso login completo outra vez.
  - Isto dá rapidez no uso diário sem esvaziar a segurança de um logout
    real.

## 7. Novo schema Supabase necessário (esboço, a detalhar antes de implementar)

```sql
CREATE TABLE postos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  pais TEXT,
  estado TEXT NOT NULL DEFAULT 'pendente'
    CHECK (estado IN ('pendente', 'ativo', 'suspenso', 'bloqueado')),
  codigo_ativacao TEXT UNIQUE,
  codigo_usado BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- pwa_users passa a referenciar o Posto ao qual pertence
ALTER TABLE pwa_users ADD COLUMN posto_id UUID REFERENCES postos(id);
ALTER TABLE pwa_users ADD COLUMN username TEXT UNIQUE;

-- contentores_disponiveis e cargas_pendentes também passam a filtrar por posto_id
ALTER TABLE contentores_disponiveis ADD COLUMN posto_id UUID REFERENCES postos(id);
```
*(Este schema é um ponto de partida para discussão — rever e confirmar
antes de aplicar, tal como fizemos com o schema de sync original.)*

---

## 8. Critério de "pronto" (para quando isto for implementado)

- [ ] Root consegue criar um Posto pendente + gerar código de ativação único
- [ ] Primeira execução do Desktop num novo local pede e valida o código,
      ativa o Posto corretamente
- [ ] Root consegue suspender/bloquear um Posto já ativo remotamente
- [ ] Painel Root: 2FA obrigatório, auditoria completa, backend próprio
      isola a Service Role Key do browser
- [ ] Nenhum ecrã, em nenhuma camada, mostra passwords — só reset
- [ ] Login por username funcional (mapeamento interno para email)
- [ ] Reset self-service por email funcional (Supabase nativo)
- [ ] Reset assistido pelo Posto funcional
- [ ] PIN local de desbloqueio rápido no Mobile, distinto de logout real
- [ ] Âmbito do painel Root confirmado e respeitado (ver secção 3)
