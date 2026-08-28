# Kraga Desktop — Release v1.0.0 (Beta)

## O que se entrega

Aplicação desktop **Kraga Desktop**, sistema de gestão de cargas consolidadas e
expedições marítimas entre a Europa e Cabo Verde, offline-first (SQLite local),
com os módulos: Home, Cargas (com Faturação), Contentores, Configurações
(Empresa, Contactos, Contentores e Códigos, Utilizadores e Permissões,
Aparência, Backup/Exportação/Segurança, Dispositivos PWA — stub, Relatórios),
Auth Avançado (Root / Admin / Utilizador secundário com permissões
granulares), Sistema de Notificações, e licenciamento local simples.

Builds gerados nesta entrega:

| Plataforma | Formato | Estado |
|---|---|---|
| macOS (arm64) | `.dmg` | ✅ Gerado e testado (app abre, sem crash) |
| Linux (arm64) | `.AppImage` | ✅ Gerado |
| Linux (arm64) | `.deb` | ❌ Não gerado nesta máquina (ver Limitações) |
| Windows | `.exe` (nsis + portable) | ❌ Não gerado nesta máquina (ver Limitações) |

## Pré-requisitos

- **Para correr a aplicação**: macOS 10.13+ (Intel ou Apple Silicon) ou
  distribuição Linux com suporte a AppImage/FUSE. Sem dependências externas —
  a base de dados SQLite é local e embutida.
- **Para gerar builds a partir do código-fonte**: Node.js 20+, npm, e para
  Windows especificamente, Wine (se o build for feito a partir de mac/Linux)
  ou uma máquina Windows nativa / runner de CI Windows.

## Como gerar o instalador

```bash
npm install
npm run rebuild        # recompila better-sqlite3 para a ABI do Electron
npm run dist:mac        # gera .dmg (mac)
npm run dist:linux       # gera .AppImage + .deb (linux)
npm run dist:win        # gera .exe nsis + portable (windows — requer Wine fora do Windows)
npm run dist:all        # os três de uma vez
```

Os instaladores ficam em `release/`. O ícone da aplicação (`build/icon.png`,
1024×1024) é convertido automaticamente pelo electron-builder para `.icns`
(mac) e `.ico` (windows) — é um placeholder profissional (navio estilizado
sobre gradiente azul, alinhado com as cores do design system), a substituir
pelo logotipo definitivo quando disponível.

## Licenciamento

Licença local simples, sem servidor nem verificação online (`electron/main/license.ts`):

1. No primeiro arranque, a app mostra o ecrã "Ativação da Licença" com um
   **identificador desta máquina** (`hostname|plataforma|arquitetura`).
2. O cliente envia esse identificador ao developer.
3. O developer gera a chave correspondente:
   ```bash
   npm run license:generate -- "<machineId-do-cliente>"
   ```
4. O cliente introduz a chave no ecrã de ativação. A chave fica gravada
   localmente e validada em cada arranque seguinte (sem rede).

## Checklist de entrega ao cliente

### Instalação
- [x] Abrir sem tela branca / crash (confirmado: app empacotada arranca e
      mostra a UI corretamente)
- [x] Ecrã de ativação de licença funcional (testado: chave inválida
      rejeitada, chave válida ativa e avança)
- [x] Wizard de setup cria Root + Admin corretamente
- [ ] Instalar via `.dmg` / Setup Windows / `.deb` Linux — `.dmg` testado
      (app abre a partir do bundle gerado); Setup Windows e `.deb` Linux
      não gerados nesta máquina (ver Limitações Conhecidas)

### Operação mínima (percorrida e testada nesta entrega)
- [x] Criar/editar 1 contacto
- [x] Criar/editar 1 carga, cálculo de m³ e código automático corretos
- [x] Criar 1 contentor, associar cargas, fechar, exportar lista em PDF
- [x] Gerar 1 fatura, exportar PDF, testar link WhatsApp
- [x] Abrir cada um dos 5 relatórios e confirmar dados corretos
- [x] Alterar 1 configuração (prefixo de código) e confirmar reflexo na
      sugestão automática
- [x] Backup e restore da base de dados (mecânica interna verificada;
      fluxo de diálogo nativo do SO não é automatizável em testes, ver
      Limitações Conhecidas)
- [x] Criar 1 utilizador secundário com permissões limitadas e confirmar
      que o acesso é corretamente restringido (testado inclusive por IPC
      direto, contornando a UI, para confirmar que a validação real está
      no processo principal)
- [x] Logout / login (Admin, Root, utilizador secundário)

### Dados
- [x] Moeda configurada corretamente e refletida nas cargas
- [x] Dados da empresa refletidos no branding e nos PDFs (fatura e lista
      de contentor)
- [x] Importação de Excel — mecânica interna verificada (parsing de
      colunas, deteção de linhas inválidas); fluxo de escolha de ficheiro
      via diálogo nativo não automatizável em testes

### Pós-instalação (ações do próprio cliente, fora do âmbito técnico)
- [ ] Criar atalho no ambiente de trabalho
- [ ] Explicar a pasta de backups ao cliente (`~/Documents/Kraga Desktop/`)
- [ ] Entregar credenciais de Admin fora do repositório/instalador

## Rollback

1. Fechar a aplicação.
2. Restaurar um backup `.db` anterior via Configurações → Backup, Exportação
   e Segurança → Restaurar Backup (ou substituir manualmente o ficheiro em
   `~/Library/Application Support/kraga-desktop/kraga.db`, com a app fechada).
3. Reinstalar a versão anterior do instalador, se necessário.

## Limitações conhecidas desta entrega

- **Build Windows não gerado nesta máquina**: cross-build de `.exe`
  (nsis/portable) a partir de macOS requer Wine, não instalado nesta máquina
  de desenvolvimento. Recomenda-se gerar via GitHub Actions (runner
  `windows-latest`) ou uma máquina Windows nativa — prática padrão da
  indústria para apps Electron multiplataforma.
- **`.deb` Linux não gerado nesta máquina**: o utilitário `ar` do macOS não é
  compatível com o formato esperado pelo empacotador `.deb` (`fpm`). O
  `.AppImage` (universal, não depende de gestor de pacotes) foi gerado com
  sucesso e cobre a generalidade das distribuições Linux. Para gerar o
  `.deb`, correr `npm run dist:linux` num runner/máquina Linux, ou instalar
  GNU binutils localmente.
- **Diálogos nativos do SO (escolher/guardar ficheiro) e notificações
  nativas do SO** não são automatizáveis pela ferramenta de testes usada ao
  longo do desenvolvimento (Chrome DevTools Protocol, que só controla o
  conteúdo da janela Electron, não a UI nativa do sistema operativo). Estes
  fluxos foram verificados por revisão de código e, quando possível, por
  scripts standalone que exercitam a mesma lógica com dados reais (ex:
  `db.backup()`, parsing de Excel).
- **Metadados de contacto/homepage no `package.json`** (`suporte@kraga.example.com`,
  `https://kraga.example.com`) são placeholders — substituir pelos dados
  reais da empresa antes de uma distribuição pública.
- **Root/Admin/Utilizadores secundários**: as ações de auditoria cobrem as
  operações explicitamente sensíveis (criar/editar/eliminar carga, alterar
  pagamento, fechar contentor, criar/editar utilizador) — não é um registo
  exaustivo de todas as ações do sistema, por desenho.
- **Sincronização com o futuro PWA**: fora de âmbito nesta fase (só o stub
  visível em Configurações → Dispositivos PWA e o healthcheck em
  `electron/sync-api/`, sem lógica de negócio real).

## Suporte

Para questões técnicas sobre esta entrega, contactar o developer responsável
pela sessão de desenvolvimento.
