# 05 — Módulo Configurações — Kraga Desktop

## Objetivo deste documento
Implementar o painel de configuração robusto que centraliza personalizações usadas
pelos módulos anteriores (moeda, prefixos de código, dados da empresa, campos
obrigatórios, temas, backup/restore).

Pré-requisito: módulos 00, 01, 02, 03 e 04 já implementados. Este módulo consolida
placeholders deixados propositalmente nos módulos anteriores (ex: dados da empresa
no PDF, moeda de origem).

---

## 1. Nova tabela: settings

Configurações simples, tipo chave-valor, para não precisar de migração de schema
sempre que se adiciona uma nova configuração:

```sql
CREATE TABLE settings (
  chave TEXT PRIMARY KEY,
  valor TEXT NOT NULL,          -- guardado como texto/JSON, convertido no código
  updated_at TEXT NOT NULL
);
```

### Chaves a usar nesta fase

| Chave | Exemplo de valor | Usado por |
|---|---|---|
| `empresa_origem_nome` | "Toy-Fortes Transportes" | PDFs (contentor, fatura) |
| `empresa_origem_morada` | "..." | PDFs |
| `empresa_origem_contacto` | "..." | PDFs |
| `empresa_destino_nome` | "Agência Cabo Verde" | PDFs (listas em português) |
| `empresa_destino_morada` | "..." | PDFs |
| `moeda_origem` | "EUR" | Módulo Cargas (valor da carga) |
| `prefixo_codigo_carga` | "TF" | Módulo Cargas (sugestão de código) |
| `prefixo_codigo_contentor` | "CONT" | Módulo Contentores |
| `tema` | "claro" \| "escuro" | UI geral |

---

## 2. Interface — Painel de Configurações

Página "Configurações" na sidebar, organizada em secções (tabs ou acordeão):

### 2.1 Empresa
- Formulário com dados da empresa de origem e da empresa/agência de destino
  (nome, morada, contacto) — estes dados alimentam automaticamente os PDFs
  gerados nos módulos 02 e 03 (substituindo os placeholders).

### 2.2 Cargas e Códigos
- Prefixo de código de carga (editável)
- Prefixo de código de contentor (editável)
- Moeda de origem (select simples: EUR, outras a adicionar depois se necessário)

### 2.3 Campos do Formulário (painel avançado)
- Lista dos campos do formulário de Nova Carga (do módulo 01)
- Para cada campo: toggle "Visível" e toggle "Obrigatório"
- Nesta fase, aplicar isto pelo menos aos campos não-essenciais (tipo de embalagem,
  notas, dimensões individuais) — campos estruturais como Nome e Emissor continuam
  sempre obrigatórios (não permitir desativá-los, para não quebrar integridade)

### 2.4 Colunas da Tabela de Cargas
- Toggle de visibilidade das colunas da lista de Cargas (módulo 01), incluindo
  as colunas de contacto que ficam ocultas por defeito (telefone, morada, email, NIF)

### 2.5 Aparência
- Tema: Claro / Escuro (nesta fase, dois temas simples — não é preciso réplica
  exata do GNOME ainda, isso fica para uma fase de polimento visual futura)

### 2.6 Backup e Dados
- Botão "Fazer Backup Agora" → copia o ficheiro `.db` para uma pasta escolhida
  pelo utilizador (usar diálogo nativo do Electron)
- Botão "Restaurar Backup" → substitui o `.db` atual por um ficheiro selecionado
  (com confirmação clara de que isto substitui os dados atuais)
- Botão "Importar Excel" → permite importar contactos e/ou cargas em massa a
  partir de um ficheiro `.xlsx` (mapear colunas manualmente numa tela simples
  de pré-visualização antes de confirmar a importação)

---

## 3. Impacto nos módulos anteriores (ajustes a fazer)

- Módulo 01 (Cargas): ler `prefixo_codigo_carga` e `moeda_origem` de `settings`
  em vez de valores fixos no código.
- Módulo 02 (Contentores): ler `prefixo_codigo_contentor` de `settings`; usar
  `empresa_origem_*` no cabeçalho do PDF de exportação de lista.
- Módulo 03 (Faturação): usar `empresa_origem_*` no cabeçalho do PDF de fatura.

---

## 4. IPC / Repository

- `electron/models/repositories/settingsRepository.ts` (get/set genérico por chave)
- Canais IPC: `settings:get`, `settings:getAll`, `settings:set`, `settings:backup`,
  `settings:restore`, `settings:importarExcel`

---

## 5. Critério de "pronto" para este módulo

- [ ] Dados da empresa configuráveis e refletidos nos PDFs (contentor e fatura)
- [ ] Prefixos de código editáveis e refletidos na sugestão automática
- [ ] Toggle de campos obrigatórios/visíveis funcional no formulário de Cargas
- [ ] Toggle de colunas visíveis funcional na lista de Cargas
- [ ] Alternância de tema Claro/Escuro funcional
- [ ] Backup e restore funcionais (testar com um backup e restauro real)
- [ ] Importação de Excel funcional para pelo menos Contactos

---

## Fora de escopo nesta fase (não implementar ainda)

- Múltiplos temas além de Claro/Escuro
- Suporte a múltiplas moedas simultâneas
- Configurações por utilizador individual (todas as configs são globais nesta fase)
