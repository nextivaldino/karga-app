# 03 — Módulo Faturação — Kraga Desktop

## Objetivo deste documento
Implementar o controlo de pagamentos (pago/devido) de forma consolidada por cliente,
geração de fatura/recibo em PDF, e envio por WhatsApp.

Pré-requisito: módulos 00, 01 (Cargas/Contactos) e 02 (Contentores) já implementados.

---

## 1. Contexto de negócio (resumo)

Cada carga já tem um `estado_pagamento` (`pago`/`devido`) definido no módulo 01. Este
módulo consolida essa informação por **cliente** (contacto), permitindo ver rapidamente
quem deve, gerar uma fatura com a lista de cargas desse cliente, exportar em PDF e
enviar por WhatsApp — replicando o padrão já validado no projeto Next Level Academia.

---

## 2. Não há nova tabela de "pagamentos" separada nesta fase

Decisão de simplicidade: em vez de criar uma tabela `pagamentos` independente,
o controlo continua a viver no campo `estado_pagamento` de cada carga (já existente).
Este módulo é sobretudo uma camada de **consulta, agregação e documento** sobre dados
que já existem.

> Nota para o futuro: se um dia for necessário registar pagamentos parciais
> (ex: 50% agora, 50% na entrega), aí sim criar uma tabela `pagamentos` relacionada
> 1-para-muitos com `cargas`. Fora de escopo nesta fase — manter simples.

---

## 3. Interface — Visão de Dívidas / Pagamentos

Nova página "Faturação" na sidebar, com:

- Lista agrupada **por cliente (contacto)**, mostrando:
  - Nome do cliente
  - Nº total de cargas
  - Valor total devido
  - Valor total pago
  - Data da carga mais recente em dívida
- Filtro rápido: "Só com dívida" / "Todos os clientes"
- Ordenação por valor devido (maior primeiro, por defeito — ajuda a priorizar cobrança)
- Clicar num cliente abre o detalhe (secção 4)

## 4. Interface — Detalhe do Cliente / Gerar Fatura

Ao selecionar um cliente:
- Lista de todas as cargas desse cliente (como emissor), com código, nome, valor,
  estado de pagamento — cada linha com toggle rápido Pago/Devido
- Totais: valor total, valor pago, valor devido
- Botão **"Gerar Fatura/Recibo"**:
  - Abre pré-visualização do documento (ver secção 5)
  - Botões: "Exportar PDF" e "Enviar por WhatsApp"

## 5. Documento de Fatura/Recibo (PDF)

Conteúdo:
- Cabeçalho com dados da empresa (placeholder até módulo Configurações existir)
- Dados do cliente (nome, contacto)
- Tabela: Código | Nome da Carga | Data | Valor | Estado
- Total geral, total pago, total devido
- Rodapé com nota simples (ex: "Documento gerado pelo Kraga Desktop")

Reutilizar o serviço de geração de PDF já criado no módulo 02 (Contentores)
— extrair para um serviço partilhado se ainda não estiver
(`src/lib/pdfService.ts` ou similar), em vez de duplicar lógica.

## 6. Envio por WhatsApp

- Nesta fase, usar a abordagem mais simples e robusta: gerar um **link `wa.me`**
  com o número de telefone do contacto (já guardado em `contactos.telefone`) e uma
  mensagem pré-formatada, abrindo o WhatsApp Web/App do sistema operativo.
- Não é necessário integração via API oficial do WhatsApp Business nesta fase —
  isso fica para uma fase futura, se necessário.
- Fluxo: o PDF é gerado e guardado localmente; a mensagem do WhatsApp inclui um
  texto simples (ex: "Olá {nome}, segue o resumo das suas cargas.") — o utilizador
  anexa o PDF manualmente na conversa que abre (WhatsApp Web não permite anexar
  ficheiro automaticamente via link `wa.me`; deixar isto claro ao utilizador na UI,
  ex: pequena instrução "O PDF foi guardado em: {caminho}. Anexe-o na conversa que
  vai abrir.")

---

## 7. IPC / Repository

- Não precisa de repository novo (reutiliza `cargaRepository` e `contactoRepository`
  do módulo 01, com queries de agregação adicionais).
- Canais IPC: `faturacao:resumoPorCliente`, `faturacao:detalheCliente`,
  `faturacao:gerarFatura`, `faturacao:abrirWhatsapp`

---

## 8. Critério de "pronto" para este módulo

- [ ] Página "Faturação" lista clientes com totais pago/devido corretos
- [ ] Filtro "só com dívida" funcional
- [ ] Detalhe do cliente mostra lista de cargas com toggle de pagamento
- [ ] Geração de PDF de fatura funcional e com aparência profissional
- [ ] Botão WhatsApp abre corretamente com número e mensagem pré-formatada
- [ ] Totais batem certo com os dados reais das cargas (validar manualmente com
      pelo menos 2 clientes de teste)

---

## Fora de escopo nesta fase (não implementar ainda)

- Tabela de pagamentos parciais/histórico de pagamentos
- Integração oficial com WhatsApp Business API
- Envio automático de faturas por email/SMS
- Notas de crédito, estornos, descontos
