# 07 — Build e Release — Kraga Desktop

## Objetivo deste documento
Preparar o empacotamento multiplataforma final e o checklist de entrega,
seguindo o mesmo padrão de qualidade já validado no projeto Next Level Academia
(ver `RELEASE_v1.0.0.md` como referência de formato).

Pré-requisito: módulos 00 a 06 implementados e testados individualmente.

---

## 1. Configuração de build (electron-builder)

Confirmar/finalizar `electron-builder.yml` com os três targets:

```yaml
appId: com.nextlab.kragadesktop
productName: Kraga Desktop
mac:
  target: dmg
  category: public.app-category.business
win:
  target:
    - nsis
    - portable
linux:
  target:
    - AppImage
    - deb
  category: Office
```

- Confirmar `better-sqlite3` corretamente configurado em `dependencies` e testar
  `electron-rebuild` para cada plataforma-alvo antes de gerar builds finais.
- Ícones da aplicação (`.icns` para mac, `.ico` para windows, `.png` para linux)
  — usar placeholder profissional se o logotipo definitivo ainda não existir.

## 2. Scripts npm a confirmar/criar

```json
{
  "scripts": {
    "dev": "...",
    "start:native": "...",
    "rebuild": "electron-rebuild -f -w better-sqlite3",
    "test": "...",
    "build": "vite build",
    "verify": "npm test && npm run build",
    "dist:mac": "electron-builder --mac",
    "dist:win": "electron-builder --win",
    "dist:linux": "electron-builder --linux",
    "dist:all": "electron-builder --mac --win --linux"
  }
}
```

## 3. Licença (implementação simples, conforme decidido)

- Ao primeiro arranque, gerar/gravar localmente uma chave de ativação simples
  (ex: hash derivado de dados da máquina + uma chave fornecida manualmente pelo
  desenvolvedor no momento da entrega).
- Sem verificação online, sem servidor de licenciamento.
- Ecrã simples de "Licença inválida" caso a verificação local falhe, com campo
  para inserir a chave correta.
- Manter a lógica isolada (`electron/main/license.ts`) para poder evoluir para
  algo mais robusto no futuro sem afetar o resto do sistema.

## 4. Checklist de entrega ao cliente (adaptar do Next Level Academia)

### Instalação
- [ ] Instalar via `.dmg` (mac) / Setup ou portable (windows) / AppImage ou `.deb` (linux)
- [ ] Abrir sem tela branca / crash
- [ ] Wizard de setup ou login (se já existir utilizador seed)
- [ ] Ativação de licença bem-sucedida

### Operação mínima (percorrer todos os módulos)
- [ ] Criar/editar 1 contacto
- [ ] Criar/editar 1 carga, confirmar cálculo de m³ e código automático
- [ ] Criar 1 contentor, associar cargas, fechar, exportar PDF
- [ ] Gerar 1 fatura, confirmar valores, exportar PDF, testar botão WhatsApp
- [ ] Abrir cada relatório e confirmar dados corretos
- [ ] Alterar pelo menos 1 configuração (ex: prefixo de código) e confirmar reflexo
- [ ] Backup e restore da base de dados
- [ ] Criar 1 utilizador secundário com permissões limitadas e testar o acesso
- [ ] Logout / login

### Dados
- [ ] Confirmar moeda configurada corretamente
- [ ] Confirmar dados da empresa no branding e nos PDFs
- [ ] (Opcional) Importar Excel de teste

### Pós-instalação
- [ ] Criar atalho no ambiente de trabalho
- [ ] Explicar pasta de backups ao cliente
- [ ] Entregar credenciais de admin fora do repositório/instalador

## 5. Rollback

1. Desinstalar/parar a versão atual
2. Restaurar backup `.db` anterior (Configurações → Backup/Restore, ou cópia manual)
3. Reinstalar build anterior, se necessário

## 6. Documento final de release

No fim, gerar um `RELEASE_v1.0.0.md` para o Kraga Desktop seguindo exatamente o
mesmo formato/qualidade do documento já usado no Next Level Academia (fornecido
como referência): o que se entrega, pré-requisitos, como gerar o instalador,
checklist de entrega, limitações conhecidas, suporte.

---

## Critério de "pronto" (Beta v1 completa)

- [ ] Build gerado com sucesso para pelo menos macOS e Windows
- [ ] Checklist de entrega completo, sem falhas
- [ ] `RELEASE_v1.0.0.md` do Kraga Desktop escrito e revisto
- [ ] Licença simples funcional
