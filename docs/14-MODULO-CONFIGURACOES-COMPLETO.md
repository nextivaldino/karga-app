# 14 — Módulo Configurações Completo — Kraga Desktop (definitivo)

## Objetivo
Página Configurações em Boxed Lists por categoria, estilo Android Settings /
GNOME Settings. Concentra tudo o que é administrativo, incluindo as ações
perigosas que não devem estar soltas noutras páginas.

---

## 1. Ecrã principal — categorias

```
🏢  Empresa                                        ›
👥  Contactos                                       ›
📦  Contentores e Códigos                           ›
👤  Utilizadores e Permissões                       ›
🎨  Aparência                                       ›
💾  Backup, Exportação e Segurança                  ›
📱  Dispositivos PWA                                ›
```

Cada linha é uma Boxed List row (ícone colorido + título + chevron), abrindo um
sub-ecrã dedicado.

---

## 2. 🏢 Empresa
- Dados da empresa de origem (nome, morada, contacto) — alimenta PDFs
- Dados da empresa/agência de destino (Cabo Verde) — alimenta listas em português
- Moeda de origem (select)

## 3. 👥 Contactos (gestão global — CRUD completo)
- Lista de todos os contactos do sistema (não filtrado por contentor, ao contrário
  da vista dentro de Cargas)
- Pesquisa, criar, editar, arquivar (soft delete)
- Mesmo schema/repository do módulo 01, sem alterações

## 4. 📦 Contentores e Códigos
- Prefixo de código de carga / prefixo de código de contentor
- Nº de dias para badge "contentor parado" (default 14, configurável)
- Botão "+ Novo Contentor" (mesmo formulário do módulo 13)

## 5. 👤 Utilizadores e Permissões
- Conforme `06-MODULO-AUTH-AVANCADO.md` — gestão de utilizadores, permissões
  granulares, reset de password (Root), sessões.

## 6. 🎨 Aparência
- Tema: Claro / Escuro (toggle)
- (Preparado para o futuro, não implementar agora: tamanho de fonte, densidade
  de tabela)

## 7. 💾 Backup, Exportação e Segurança — ações sensíveis, todas com confirmação

Todas as ações desta secção pedem **confirmação por password do Admin atual**
antes de executar (dialog de confirmação, `tone: danger`).

- **Fazer Backup Agora** — copia `.db` para pasta escolhida pelo utilizador
- **Restaurar Backup** — substitui `.db` atual (aviso claro do que será perdido)
- **Importar Excel** — contactos e/ou cargas em massa, com pré-visualização de
  mapeamento de colunas antes de confirmar
- **Exportar Tudo (relatório geral)** — gera PDF/Excel com todos os dados do
  sistema (não confundir com exportações normais do dia a dia, que continuam
  disponíveis diretamente em Cargas/Contentores)
- **Limpar Dados de Teste** — remove cargas/contentores marcados como teste
  (se aplicável) — ação irreversível, dupla confirmação
- **Repor Aplicação (Reset Total)** — apaga toda a base de dados e volta ao
  wizard de setup inicial — ação mais perigosa do sistema, tripla camada de
  proteção: (1) password do Admin, (2) escrever manualmente a palavra "ELIMINAR"
  num campo de confirmação, (3) toast final "Última oportunidade para cancelar"
  com 5 segundos antes do botão de confirmar ficar ativo

## 8. 📱 Dispositivos PWA
- Mantém-se o stub já implementado no módulo 00, sem alterações nesta fase.

---

## 9. IPC
- `settings:get`, `settings:getAll`, `settings:set` (já existentes)
- `settings:backup`, `settings:restore`, `settings:importarExcel` (já existentes)
- `settings:exportarTudo`, `settings:limparDadosTeste`, `settings:resetTotal`
  (novos, todos exigem `passwordConfirmacao` como parâmetro obrigatório,
  validado no main process antes de executar)

---

## 10. Critério de "pronto"
- [ ] Ecrã principal com as 7 categorias em Boxed List
- [ ] Cada categoria abre o sub-ecrã correto
- [ ] Contactos (CRUD global) funcional e independente da vista contextual em Cargas
- [ ] Todas as ações da secção "Backup, Exportação e Segurança" pedem confirmação
      por password antes de executar
- [ ] "Repor Aplicação" tem as 3 camadas de proteção especificadas
- [ ] Nenhuma ação desta secção está acessível a partir de outra página do sistema
