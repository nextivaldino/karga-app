# 09 — Arquitetura de Páginas e Navegação — Kraga Desktop (definitivo)

> Substitui qualquer versão anterior de navegação/IA. Sobrepõe-se às interfaces dos
> módulos 00-02 (schemas e regras de negócio mantêm-se).

---

## 1. Páginas de topo (4 no total)

```
┌──────────────────────────────────────────────────────────────┐
│   🏠 Home    📦 Cargas    🚢 Contentores    ⚙️ Configurações    🔍  👤 │
└──────────────────────────────────────────────────────────────┘
```

- Abas **centralizadas**, ícones GNOME coloridos (não monocromáticos aqui — são a
  identidade de cada página).
- Cada página tem a sua própria barra de ferramentas contextual logo abaixo
  (ver secções seguintes).
- **Contactos** e **Faturação** NÃO são páginas de topo:
  - Contactos (gestão global/CRUD completo) → categoria dentro de Configurações
  - Faturação (pago/devido, gerar fatura) → sub-aba dentro de Cargas
  - A "lista telefónica do contentor" é uma vista contextual dentro da própria
    página Cargas (não confundir com a gestão global de Contactos)

## 2. Pesquisa Global (estilo Spotlight)
- Ícone 🔍 na Header Bar principal, atalho `Cmd+K`.
- Ao abrir: campo de pesquisa em overlay centrado, procura simultaneamente em
  Cargas (nome/código), Contentores (nome/código) e Contactos (nome).
- Resultados agrupados por tipo, com ícone colorido do módulo correspondente.
- Selecionar um resultado navega diretamente para a página/registo (ex: clicar
  numa carga abre a página Cargas já com esse contentor selecionado e a carga
  em destaque).

---

## 3. Página Home
- Widgets/cards: contentores abertos, cargas do mês, valor devido total, últimas
  cargas inseridas — mesmos resumos já definidos anteriormente.
- Atalhos rápidos: "+ Nova Carga", "+ Novo Contentor".
- Sem pesquisa própria (usa a global).

## 4. Página Cargas (ver `10-MODULO-CARGAS-COMPLETO.md` para detalhe total)

Barra contextual:
```
Contêiner: [TF-2026-03 ▾]  [+ Nova Carga]  [👥 Contactos]  [Modo Editor ⚫──○]  Vista: Lista | Faturação
```

- Sub-abas dentro da página: **Lista de Cargas** | **Faturação**
- Botão **Contactos** abre a lista telefónica expansível do contentor ativo
- Toggle **Modo Editor** transforma a lista em grelha tipo Excel editável

## 5. Página Contentores (ver `11-MODULO-CONTENTORES-COMPLETO.md`)

Barra contextual:
```
[+ Novo Contentor]   Vista: ☰ Lista | ▤ Ícones   🔍 Filtrar   Ordenar ▾
```

- Agrupamento por mês de referência, estilo Finder
- Clique direito / botão "⋯" por contentor → Editar · Exportar · Bloquear · Ocultar · Eliminar

## 6. Página Configurações (ver `12-MODULO-CONFIGURACOES-COMPLETO.md`)

Boxed List de categorias:
```
🏢 Empresa · 👥 Contactos · 📦 Contentores e Códigos · 👤 Utilizadores e Permissões
🎨 Aparência · 💾 Backup, Exportação e Segurança · 📱 Dispositivos PWA
```

---

## 7. Regra de segurança transversal (importante)
Todas as ações potencialmente destrutivas ou sensíveis — **exportação em massa,
backup, restauro, limpar/reset da aplicação, eliminar definitivamente** — vivem
exclusivamente dentro de Configurações → "Backup, Exportação e Segurança", nunca
soltas noutras páginas. Cada uma destas ações exige **confirmação por código**
(password do utilizador Admin atual) antes de executar. Exportações "normais" do
dia a dia (ex: exportar lista de um contentor específico, exportar uma fatura)
continuam disponíveis diretamente nas páginas Cargas/Contentores — só as ações
em massa/irreversíveis ficam trancadas em Configurações.

---

## 8. Estrutura de ficheiros (visão geral)

```
src/
├── styles/theme.css
├── components/
│   ├── layout/
│   │   ├── AppShell.tsx
│   │   ├── MainTabs.tsx          # Home | Cargas | Contentores | Configurações
│   │   ├── ContextToolbar.tsx    # barra contextual por página
│   │   ├── GlobalSearch.tsx      # Cmd+K overlay
│   │   └── StatusBar.tsx
│   └── ui/
│       ├── FloatingLabelInput.tsx
│       ├── Switch.tsx
│       ├── BoxedList.tsx
│       ├── ViewSwitcher.tsx
│       ├── HeaderBarModal.tsx
│       ├── UtilityPane.tsx
│       ├── ContextMenu.tsx
│       ├── Toast.tsx / Banner.tsx / ConfirmDialog.tsx
├── modules/
│   ├── home/
│   ├── cargas/          # lista, modo editor, faturação (sub-aba), contactos-do-contentor
│   ├── contentores/     # vista Finder
│   └── configuracoes/   # categorias em boxed list, incl. Contactos (CRUD global)
```

## 9. Critério de "pronto"
- [ ] 4 páginas de topo com abas centralizadas e ícones coloridos
- [ ] Pesquisa global funcional (Cmd+K), resultados de 3 tipos, navegação direta
- [ ] Cada página com barra contextual própria conforme especificado
- [ ] Contactos acessível via Configurações (CRUD global) e via Cargas (contextual)
- [ ] Faturação acessível como sub-aba dentro de Cargas
- [ ] Ações destrutivas/sensíveis só existem em Configurações, com confirmação por código
