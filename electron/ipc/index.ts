import { ipcMain, shell } from 'electron';
import * as auth from '../main/auth';
import * as maintenance from '../main/maintenance';
import * as userManagement from '../main/userManagement';
import * as license from '../main/license';
import * as sync from '../main/sync';
import * as mensagens from '../lib/mensagens';
import { settingsRepository } from '../models/repositories/settingsRepository';
import { contactoRepository } from '../models/repositories/contactoRepository';
import { contactoNotificadoRepository } from '../models/repositories/contactoNotificadoRepository';
import { cargaRepository } from '../models/repositories/cargaRepository';
import { etiquetaRepository } from '../models/repositories/etiquetaRepository';
import { contentorRepository } from '../models/repositories/contentorRepository';
import { faturacaoRepository } from '../models/repositories/faturacaoRepository';
import { relatoriosRepository } from '../models/repositories/relatoriosRepository';
import { permissaoRepository } from '../models/repositories/permissaoRepository';
import { sessaoRepository } from '../models/repositories/sessaoRepository';
import { auditoriaRepository } from '../models/repositories/auditoriaRepository';
import { notificacaoRepository } from '../models/repositories/notificacaoRepository';
import { healthcheck } from '../sync-api/healthcheck';
import { generatePdfFromHtml } from '../lib/pdfService';
import { buildFaturaHtml } from '../lib/invoiceTemplate';
import { buildContentorListaHtml, type IdiomaExportacao } from '../lib/contentorExportTemplate';
import { exportRelatorioExcel, exportRelatorioPdf } from '../lib/relatorioExportService';
import type {
  Carga,
  ColunaExportacao,
  Contacto,
  Contentor,
  CreateCargaInput,
  CreateContactoInput,
  CreateContentorInput,
  CreateEtiquetaInput,
  CreateUserInput,
  HomeResumo,
  ImportarCargaInput,
  ModuloPermissao,
  PeriodoFiltro,
  PermissaoInput,
  SearchResultItem,
  SetupInput,
  UserRole,
} from '../../src/types';

function requireSession(): { id: string; role: UserRole } {
  const session = auth.getSession();
  if (!session) throw new Error('Sessão inválida — inicia sessão novamente.');
  return session;
}

function requirePermissao(modulo: ModuloPermissao, acao: 'ver' | 'criar' | 'editar' | 'eliminar'): { id: string; role: UserRole } {
  const session = requireSession();
  if (!permissaoRepository.podeAcesso(session.id, session.role, modulo, acao)) {
    throw new Error('Não tens permissão para esta ação.');
  }
  return session;
}

function registarAuditoria(acao: string, entidade: string | null = null, entidadeId: string | null = null, detalhes: string | null = null): void {
  const session = auth.getSession();
  if (!session) return;
  auditoriaRepository.registar(session.id, acao, entidade, entidadeId, detalhes);
}

const ALLOWED_EXTERNAL_PROTOCOLS = new Set(['https:', 'mailto:']);
const IDIOMAS_EXPORTACAO_CONTENTOR: ReadonlySet<string> = new Set(['pt', 'en', 'fr']);

function isSafeExternalUrl(url: string): boolean {
  try {
    return ALLOWED_EXTERNAL_PROTOCOLS.has(new URL(url).protocol);
  } catch {
    return false;
  }
}

export function registerIpcHandlers(): void {
  ipcMain.handle('license:status', () => ({
    activated: license.isActivated(),
    machineId: license.getMachineId(),
  }));

  ipcMain.handle('license:activate', (_event, key: string) => license.activate(key));

  ipcMain.handle('auth:setupNeeded', () => auth.setupNeeded());

  ipcMain.handle('auth:completeSetup', (_event, input: SetupInput) => auth.completeSetup(input));

  ipcMain.handle('auth:login', (_event, email: string, password: string) => auth.login(email, password));

  ipcMain.handle('auth:logout', () => auth.logout());

  ipcMain.handle('auth:session', () => auth.getSession());

  ipcMain.handle('auth:updateProfile', (_event, userId: string, changes: { name: string; email: string }) =>
    auth.updateProfile(userId, changes),
  );

  ipcMain.handle('auth:changePassword', (_event, userId: string, currentPassword: string, newPassword: string) =>
    auth.changePassword(userId, currentPassword, newPassword),
  );

  ipcMain.handle('auth:listQuickLogin', () => auth.listQuickLogin());

  ipcMain.handle('auth:loginSemPassword', (_event, userId: string) => auth.loginSemPassword(userId));

  ipcMain.handle('auth:solicitarResetPasswordAdmin', (_event, email: string) => auth.solicitarResetPasswordAdmin(email));

  ipcMain.handle('settings:get', (_event, chave: string) => settingsRepository.get(chave));

  ipcMain.handle('settings:getAll', () => settingsRepository.getAll());

  ipcMain.handle('settings:set', (_event, chave: string, valor: string) => settingsRepository.set(chave, valor));

  ipcMain.handle('settings:backup', (_event, passwordConfirmacao: string) => maintenance.backup(passwordConfirmacao));

  ipcMain.handle('settings:restore', (_event, passwordConfirmacao: string) => maintenance.restore(passwordConfirmacao));

  ipcMain.handle('settings:previewImportExcel', () => maintenance.previewImportExcel());

  ipcMain.handle(
    'settings:confirmarImportExcel',
    (_event, linhas: Parameters<typeof maintenance.confirmarImportExcel>[0], passwordConfirmacao: string) =>
      maintenance.confirmarImportExcel(linhas, passwordConfirmacao),
  );

  ipcMain.handle('settings:exportarTudo', (_event, passwordConfirmacao: string) =>
    maintenance.exportarTudo(passwordConfirmacao),
  );

  ipcMain.handle('settings:exportarContactos', () => maintenance.exportarContactos());

  ipcMain.handle('settings:limparDadosTeste', (_event, passwordConfirmacao: string) =>
    maintenance.limparDadosTeste(passwordConfirmacao),
  );

  ipcMain.handle('settings:resetTotal', (_event, passwordConfirmacao: string) =>
    maintenance.resetTotal(passwordConfirmacao),
  );

  ipcMain.handle('system:info', () => maintenance.getSystemInfo());

  ipcMain.handle('syncApi:healthcheck', () => healthcheck());

  ipcMain.handle('contactos:list', (_event, includeInactive?: boolean, texto?: string) => {
    requirePermissao('contactos', 'ver');
    return contactoRepository.list(includeInactive, texto);
  });

  ipcMain.handle('contactos:create', (_event, input: CreateContactoInput) => {
    requirePermissao('contactos', 'criar');
    const contacto = contactoRepository.create(input);
    registarAuditoria('criou_contacto', 'contacto', contacto.id);
    return contacto;
  });

  ipcMain.handle('contactos:update', (_event, id: string, changes: Partial<CreateContactoInput>) => {
    requirePermissao('contactos', 'editar');
    const contacto = contactoRepository.update(id, changes);
    registarAuditoria('editou_contacto', 'contacto', id);
    return contacto;
  });

  ipcMain.handle('contactos:search', (_event, texto: string, limit?: number) => {
    requirePermissao('contactos', 'ver');
    return contactoRepository.search(texto, limit);
  });

  ipcMain.handle(
    'contactos:buscarSimilares',
    (_event, input: { nome?: string; telefone?: string; morada?: string }, excludeId?: string) => {
      requirePermissao('contactos', 'ver');
      return contactoRepository.buscarSimilares(input, excludeId);
    },
  );

  ipcMain.handle('contactos:listPorContentor', (_event, contentorId: string) => {
    requirePermissao('contactos', 'ver');
    return contactoRepository.listPorContentor(contentorId);
  });

  ipcMain.handle('contactos:archive', (_event, id: string) => {
    requirePermissao('contactos', 'eliminar');
    const contacto = contactoRepository.archive(id);
    registarAuditoria('arquivou_contacto', 'contacto', id);
    return contacto;
  });

  ipcMain.handle('contactos:reactivate', (_event, id: string) => {
    requirePermissao('contactos', 'editar');
    return contactoRepository.reactivate(id);
  });

  ipcMain.handle('contactosNotificados:registar', (_event, contactoId: string, contentorId: string, canal: 'whatsapp' | 'email' | 'manual') => {
    requirePermissao('contactos', 'editar');
    return contactoNotificadoRepository.registar(contactoId, contentorId, canal);
  });

  ipcMain.handle('contactosNotificados:listPorContentor', (_event, contentorId: string) => {
    requirePermissao('contactos', 'ver');
    return contactoNotificadoRepository.listUltimosPorContentor(contentorId);
  });

  ipcMain.handle('cargas:list', (_event, filters?: Parameters<typeof cargaRepository.list>[0]) => {
    requirePermissao('cargas', 'ver');
    return cargaRepository.list(filters);
  });

  ipcMain.handle(
    'cargas:listarPorContacto',
    (_event, contactoId: string, filtros?: Parameters<typeof cargaRepository.listarPorContacto>[1]) => {
      requirePermissao('cargas', 'ver');
      return cargaRepository.listarPorContacto(contactoId, filtros);
    },
  );

  ipcMain.handle('cargas:create', (_event, input: CreateCargaInput) => {
    const session = requirePermissao('cargas', 'criar');
    const carga = cargaRepository.create(input, session.id);
    registarAuditoria('criou_carga', 'carga', carga.id);
    return carga;
  });

  ipcMain.handle('cargas:update', (_event, id: string, changes: Partial<CreateCargaInput>) => {
    requirePermissao('cargas', 'editar');
    const carga = cargaRepository.update(id, changes);
    if (changes.estadoPagamento !== undefined) {
      registarAuditoria('alterou_pagamento_carga', 'carga', id, `estadoPagamento=${changes.estadoPagamento}`);
    } else {
      registarAuditoria('editou_carga', 'carga', id);
    }
    return carga;
  });

  ipcMain.handle('cargas:nextCodigo', () => {
    requirePermissao('cargas', 'criar');
    return cargaRepository.nextCodigo();
  });

  ipcMain.handle('cargas:nextCodigoAgrupado', (_event, emissorId: string, reservados?: string[]) => {
    requirePermissao('cargas', 'criar');
    return cargaRepository.nextCodigoAgrupado(emissorId, reservados);
  });

  ipcMain.handle('cargas:codigoExiste', (_event, codigo: string) => {
    requirePermissao('cargas', 'ver');
    return cargaRepository.codigoExiste(codigo);
  });

  ipcMain.handle('cargas:addDestinatario', (_event, cargaId: string, contactoId: string) => {
    requirePermissao('cargas', 'editar');
    return cargaRepository.addDestinatario(cargaId, contactoId);
  });

  ipcMain.handle('cargas:createBatch', (_event, items: Parameters<typeof cargaRepository.createBatch>[0]) => {
    const session = requirePermissao('cargas', 'criar');
    const cargas = cargaRepository.createBatch(items, session.id);
    registarAuditoria('criou_cargas_lote', 'carga', null, `total=${cargas.length}`);
    return cargas;
  });

  ipcMain.handle('cargas:listOrigensPwa', () => {
    requirePermissao('cargas', 'ver');
    return cargaRepository.listOrigensPwa();
  });

  ipcMain.handle('cargas:countPorContentorParaUsuario', (_event, userId: string) => {
    requirePermissao('cargas', 'ver');
    return cargaRepository.countPorContentorParaUsuario(userId);
  });

  ipcMain.handle('cargas:sugerirDimensoes', (_event, nome: string) => {
    requirePermissao('cargas', 'ver');
    return cargaRepository.sugerirDimensoes(nome);
  });

  ipcMain.handle('cargas:archive', (_event, id: string) => {
    requirePermissao('cargas', 'eliminar');
    const carga = cargaRepository.archive(id);
    registarAuditoria('arquivou_carga', 'carga', id);
    return carga;
  });

  ipcMain.handle('cargas:moverEmLote', (_event, ids: string[], contentorId: string) => {
    requirePermissao('cargas', 'editar');
    const cargas = cargaRepository.moverEmLote(ids, contentorId);
    registarAuditoria('moveu_cargas_lote', 'carga', null, `total=${cargas.length};contentorId=${contentorId}`);
    return cargas;
  });

  ipcMain.handle('etiquetas:list', () => {
    requirePermissao('contactos', 'ver');
    return etiquetaRepository.list();
  });

  ipcMain.handle('etiquetas:create', (_event, input: CreateEtiquetaInput) => {
    requirePermissao('contactos', 'editar');
    const etiqueta = etiquetaRepository.create(input);
    registarAuditoria('criou_etiqueta', 'etiqueta', etiqueta.id);
    return etiqueta;
  });

  ipcMain.handle('etiquetas:update', (_event, id: string, changes: Partial<CreateEtiquetaInput>) => {
    requirePermissao('contactos', 'editar');
    const etiqueta = etiquetaRepository.update(id, changes);
    registarAuditoria('editou_etiqueta', 'etiqueta', id);
    return etiqueta;
  });

  ipcMain.handle('etiquetas:delete', (_event, id: string) => {
    requirePermissao('contactos', 'eliminar');
    etiquetaRepository.remove(id);
    registarAuditoria('eliminou_etiqueta', 'etiqueta', id);
  });

  ipcMain.handle('etiquetas:listPorContactos', (_event, contactoIds: string[]) => {
    requirePermissao('contactos', 'ver');
    return etiquetaRepository.listPorContactos(contactoIds);
  });

  ipcMain.handle('etiquetas:attach', (_event, contactoId: string, etiquetaId: string) => {
    requirePermissao('contactos', 'editar');
    etiquetaRepository.attach(contactoId, etiquetaId);
    registarAuditoria('associou_etiqueta', 'contacto', contactoId, `etiquetaId=${etiquetaId}`);
  });

  ipcMain.handle('etiquetas:detach', (_event, contactoId: string, etiquetaId: string) => {
    requirePermissao('contactos', 'editar');
    etiquetaRepository.detach(contactoId, etiquetaId);
    registarAuditoria('removeu_etiqueta', 'contacto', contactoId, `etiquetaId=${etiquetaId}`);
  });

  ipcMain.handle('contentores:list', (_event, filters?: Parameters<typeof contentorRepository.list>[0]) => {
    requirePermissao('contentores', 'ver');
    return contentorRepository.list(filters);
  });

  ipcMain.handle('contentores:obter', (_event, id: string) => {
    requirePermissao('contentores', 'ver');
    return contentorRepository.findById(id);
  });

  ipcMain.handle('contentores:create', (_event, input: CreateContentorInput) => {
    requirePermissao('contentores', 'criar');
    const contentor = contentorRepository.create(input);
    registarAuditoria('criou_contentor', 'contentor', contentor.id);
    return contentor;
  });

  ipcMain.handle('contentores:update', (_event, id: string, changes: Partial<CreateContentorInput>) => {
    requirePermissao('contentores', 'editar');
    const contentor = contentorRepository.update(id, changes);
    registarAuditoria('editou_contentor', 'contentor', id);
    return contentor;
  });

  ipcMain.handle('contentores:converterEmContentor', (_event, id: string) => {
    requirePermissao('contentores', 'editar');
    const contentor = contentorRepository.converterEmContentor(id);
    registarAuditoria('converteu_lista_em_contentor', 'contentor', id);
    return contentor;
  });

  ipcMain.handle('contentores:nextCodigo', () => {
    requirePermissao('contentores', 'criar');
    return contentorRepository.nextCodigo();
  });

  ipcMain.handle('contentores:bloquear', (_event, id: string) => {
    requirePermissao('contentores', 'editar');
    return contentorRepository.bloquear(id);
  });

  ipcMain.handle('contentores:desbloquear', (_event, id: string) => {
    requirePermissao('contentores', 'editar');
    return contentorRepository.desbloquear(id);
  });

  ipcMain.handle('contentores:ocultar', (_event, id: string) => {
    requirePermissao('contentores', 'editar');
    return contentorRepository.ocultar(id);
  });

  ipcMain.handle('contentores:mostrar', (_event, id: string) => {
    requirePermissao('contentores', 'editar');
    return contentorRepository.mostrar(id);
  });

  ipcMain.handle('contentores:definirPadraoGlobal', (_event, id: string) => {
    requirePermissao('contentores', 'editar');
    return contentorRepository.definirPadraoGlobal(id);
  });

  ipcMain.handle('contentores:eliminar', (_event, id: string) => {
    requirePermissao('contentores', 'eliminar');
    contentorRepository.eliminar(id);
    registarAuditoria('eliminou_contentor', 'contentor', id);
  });

  ipcMain.handle('contentores:fechar', (_event, id: string) => {
    requirePermissao('contentores', 'editar');
    const contentor = contentorRepository.fechar(id);
    registarAuditoria('fechou_contentor', 'contentor', id);
    return contentor;
  });

  ipcMain.handle('contentores:marcarEmTransito', (_event, id: string) => {
    requirePermissao('contentores', 'editar');
    const contentor = contentorRepository.marcarEmTransito(id);
    registarAuditoria('marcou_em_transito_contentor', 'contentor', id);
    return contentor;
  });

  ipcMain.handle('contentores:marcarEntregue', (_event, id: string) => {
    requirePermissao('contentores', 'editar');
    const contentor = contentorRepository.marcarEntregue(id);
    registarAuditoria('marcou_entregue_contentor', 'contentor', id);
    return contentor;
  });

  ipcMain.handle('contentores:exportarLista', async (_event, id: string, idioma: string) => {
    requirePermissao('contentores', 'ver');
    if (!IDIOMAS_EXPORTACAO_CONTENTOR.has(idioma)) {
      throw new Error(`Idioma não suportado: ${idioma}`);
    }
    const contentor = contentorRepository.findById(id);
    if (!contentor) throw new Error('Contentor não encontrado.');

    const cargas = cargaRepository.list({ contentorId: id });
    const destinatariosPorCarga = cargaRepository.listDestinatariosPorCarga(cargas.map((c) => c.id));
    const moeda = settingsRepository.get('moeda_origem') ?? 'EUR';

    const html = buildContentorListaHtml({
      empresaNome: settingsRepository.get('empresa_origem_nome') ?? 'Kraga Desktop',
      empresaMorada: settingsRepository.get('empresa_origem_morada') ?? '',
      empresaContacto: settingsRepository.get('empresa_origem_contacto') ?? '',
      empresaLogo: settingsRepository.get('empresa_origem_logo'),
      empresaNif: settingsRepository.get('empresa_origem_nif'),
      contentorCodigo: contentor.codigo,
      contentorNome: contentor.nome,
      dataPartida: contentor.dataPartida,
      dataChegadaPrevista: contentor.dataChegadaPrevista,
      moeda,
      idioma: idioma as IdiomaExportacao,
      colunas: {
        dimensoes: settingsRepository.get('export_pdf_col_dimensoes') !== '0',
        peso: settingsRepository.get('export_pdf_col_peso') !== '0',
        m3: settingsRepository.get('export_pdf_col_m3') !== '0',
        valor: settingsRepository.get('export_pdf_col_valor') !== '0',
        emissor: settingsRepository.get('export_pdf_col_emissor') !== '0',
        destinatario: settingsRepository.get('export_pdf_col_destinatario') !== '0',
      },
      cargas: cargas.map((c) => ({
        codigo: c.codigo,
        nome: c.nome,
        comprimentoCm: c.comprimentoCm,
        larguraCm: c.larguraCm,
        alturaCm: c.alturaCm,
        pesoKg: c.pesoKg,
        m3: c.m3,
        valor: c.valor,
        emissorNome: c.emissorNome,
        destinatarios: destinatariosPorCarga[c.id] ?? [],
      })),
    });

    const fileName = `Lista-${contentor.codigo.replace(/[^a-zA-Z0-9]+/g, '-')}-${idioma}-${Date.now()}.pdf`;
    const path = await generatePdfFromHtml(html, fileName);
    return { path };
  });

  ipcMain.handle('home:resumo', (): HomeResumo => {
    requireSession();
    return {
      totalCargasMes: cargaRepository.countMesAtual(),
      contentoresAbertos: contentorRepository.countAbertos(),
      valorDevido: cargaRepository.sumValorDevido(),
      entregues: cargaRepository.countEntreguesMesAtual(),
    };
  });

  ipcMain.handle('home:ultimasSincronizadas', (_event, limit?: number) => {
    requireSession();
    return cargaRepository.listUltimasSincronizadas(limit);
  });

  ipcMain.handle('search:global', (_event, texto: string): SearchResultItem[] => {
    requireSession();
    if (!texto.trim()) return [];

    // `searchGlobal` de cada repositório cruza com as outras entidades
    // (emissor <-> carga <-> contentor) — procurar um nome de cliente
    // também traz as cargas dele e o contentor onde estão, e vice-versa.
    const cargas = cargaRepository.searchGlobal(texto);
    const contentores = contentorRepository.searchGlobal(texto);
    const contactos = contactoRepository.searchGlobal(texto);

    return [
      ...cargas.map(
        (carga): SearchResultItem => ({
          type: 'carga',
          id: carga.id,
          title: carga.nome,
          subtitle: `${carga.codigo} · ${carga.emissorNome}${carga.contentorCodigo ? ` · ${carga.contentorCodigo}` : ''}`,
        }),
      ),
      ...contentores.map(
        (contentor): SearchResultItem => ({
          type: 'contentor',
          id: contentor.id,
          title: contentor.nome,
          subtitle: contentor.codigo,
        }),
      ),
      ...contactos.map(
        (contacto): SearchResultItem => ({
          type: 'contacto',
          id: contacto.id,
          title: contacto.nome,
          subtitle: contacto.telefone,
        }),
      ),
    ];
  });

  ipcMain.handle('shell:openExternal', (_event, url: string) => {
    if (!isSafeExternalUrl(url)) {
      throw new Error(`URL não permitido: ${url}`);
    }
    return shell.openExternal(url);
  });

  ipcMain.handle('faturacao:resumoPorCliente', (_event, filtros?: Parameters<typeof faturacaoRepository.resumoPorCliente>[0]) => {
    requirePermissao('faturacao', 'ver');
    return faturacaoRepository.resumoPorCliente(filtros);
  });

  ipcMain.handle('faturacao:gerarFatura', async (_event, contactoId: string, contentorId?: string) => {
    requirePermissao('faturacao', 'ver');
    const contacto = contactoRepository.findById(contactoId);
    if (!contacto) throw new Error('Contacto não encontrado.');

    const cargas = cargaRepository.list({ emissorId: contactoId, contentorId });
    const moeda = settingsRepository.get('moeda_origem') ?? 'EUR';

    const html = buildFaturaHtml({
      empresaNome: settingsRepository.get('empresa_origem_nome') ?? 'Kraga Desktop',
      empresaMorada: settingsRepository.get('empresa_origem_morada') ?? '',
      empresaContacto: settingsRepository.get('empresa_origem_contacto') ?? '',
      empresaLogo: settingsRepository.get('empresa_origem_logo'),
      empresaNif: settingsRepository.get('empresa_origem_nif'),
      clienteNome: contacto.nome,
      moeda,
      cargas: cargas.map((c) => ({
        codigo: c.codigo,
        nome: c.nome,
        data: c.createdAt,
        valor: c.valor,
        estadoPagamento: c.estadoPagamento,
      })),
    });

    const fileName = `Fatura-${contacto.nome.replace(/[^a-zA-Z0-9]+/g, '-')}-${Date.now()}.pdf`;
    const path = await generatePdfFromHtml(html, fileName);
    return { path };
  });

  ipcMain.handle('relatorios:cargasPorPeriodo', (_event, filtro?: Parameters<typeof relatoriosRepository.cargasPorPeriodo>[0]) => {
    requirePermissao('relatorios', 'ver');
    return relatoriosRepository.cargasPorPeriodo(filtro);
  });

  ipcMain.handle('relatorios:cargasPorContentor', (_event, filtro?: PeriodoFiltro) => {
    requirePermissao('relatorios', 'ver');
    return relatoriosRepository.cargasPorContentor(filtro);
  });

  ipcMain.handle('relatorios:cargasPorCliente', (_event, filtro?: PeriodoFiltro) => {
    requirePermissao('relatorios', 'ver');
    return relatoriosRepository.cargasPorCliente(filtro);
  });

  ipcMain.handle('relatorios:cargasPendentes', () => {
    requirePermissao('relatorios', 'ver');
    return relatoriosRepository.cargasPendentes();
  });

  ipcMain.handle('relatorios:resumoFinanceiro', (_event, filtro?: PeriodoFiltro) => {
    requirePermissao('relatorios', 'ver');
    return relatoriosRepository.resumoFinanceiro(filtro);
  });

  ipcMain.handle(
    'relatorios:exportar',
    async (
      _event,
      formato: 'excel' | 'pdf',
      titulo: string,
      colunas: ColunaExportacao[],
      linhas: Record<string, unknown>[],
      fileName: string,
    ) => {
      const path =
        formato === 'excel'
          ? await exportRelatorioExcel(titulo, colunas, linhas, fileName)
          : await exportRelatorioPdf(titulo, colunas, linhas, fileName);
      return { path };
    },
  );

  ipcMain.handle('users:list', () => {
    requirePermissao('configuracoes', 'ver');
    return userManagement.listUsuariosComSessao();
  });

  ipcMain.handle('users:create', async (_event, input: CreateUserInput) => {
    const user = await userManagement.criarUsuario(requireSession().role, input);
    registarAuditoria('criou_utilizador', 'user', user.id);
    return user;
  });

  ipcMain.handle('users:update', async (_event, userId: string, changes: { name: string; email: string }) => {
    const user = await userManagement.editarUsuario(requireSession().role, userId, changes);
    registarAuditoria('editou_utilizador', 'user', userId);
    return user;
  });

  ipcMain.handle('users:bloquear', (_event, userId: string) =>
    userManagement.bloquearUsuario(requireSession().role, userId),
  );

  ipcMain.handle('users:reativar', (_event, userId: string) =>
    userManagement.reativarUsuario(requireSession().role, userId),
  );

  ipcMain.handle('users:eliminar', (_event, userId: string) =>
    userManagement.desativarUsuario(requireSession().role, userId),
  );

  ipcMain.handle('users:resetPasswordAdmin', (_event, targetUserId: string, newPassword: string) =>
    userManagement.resetPasswordAdmin(requireSession().role, targetUserId, newPassword),
  );

  ipcMain.handle('users:resetPasswordUser', (_event, targetUserId: string, newPassword: string) =>
    userManagement.resetPasswordUser(requireSession().role, targetUserId, newPassword),
  );

  ipcMain.handle('users:listAdmins', () => {
    requireSession();
    return userManagement.listAdmins();
  });

  ipcMain.handle('users:habilitarPwa', async (_event, userId: string) => {
    const result = await userManagement.habilitarPwa(requireSession().role, userId);
    registarAuditoria('ativou_pwa_utilizador', 'user', userId);
    return result;
  });

  ipcMain.handle('users:desabilitarPwa', async (_event, userId: string) => {
    const user = await userManagement.desabilitarPwa(requireSession().role, userId);
    registarAuditoria('desativou_pwa_utilizador', 'user', userId);
    return user;
  });

  ipcMain.handle('users:setAvatar', (_event, userId: string, avatar: string | null) =>
    userManagement.setAvatar(requireSession(), userId, avatar),
  );

  ipcMain.handle('users:setLoginSemPassword', (_event, userId: string, valor: boolean) =>
    userManagement.setLoginSemPassword(requireSession(), userId, valor),
  );

  ipcMain.handle('users:setContentorPadrao', (_event, userId: string, contentorId: string | null) =>
    userManagement.setContentorPadraoPwa(requireSession().role, userId, contentorId),
  );

  ipcMain.handle('permissoes:listPorUser', (_event, userId: string) => {
    requirePermissao('configuracoes', 'ver');
    return permissaoRepository.listPorUser(userId);
  });

  ipcMain.handle('permissoes:set', (_event, userId: string, permissoes: PermissaoInput[]) => {
    userManagement.definirPermissoes(requireSession().role, userId, permissoes);
    return permissaoRepository.listPorUser(userId);
  });

  ipcMain.handle('sessoes:listPorUser', (_event, userId: string) => {
    requirePermissao('configuracoes', 'ver');
    return sessaoRepository.listPorUser(userId);
  });

  ipcMain.handle('auditoria:list', (_event, limit?: number) => {
    requirePermissao('configuracoes', 'ver');
    return auditoriaRepository.list(limit);
  });

  ipcMain.handle('notificacoes:list', (_event, limit?: number) => {
    requireSession();
    return notificacaoRepository.list(limit);
  });

  ipcMain.handle('notificacoes:marcarLida', (_event, id: string) => {
    requireSession();
    return notificacaoRepository.marcarLida(id);
  });

  ipcMain.handle('notificacoes:marcarTodasLidas', () => {
    requireSession();
    return notificacaoRepository.marcarTodasLidas();
  });

  ipcMain.handle('sync:listPendentes', () => {
    requirePermissao('configuracoes', 'ver');
    return sync.listarPendentes();
  });

  ipcMain.handle('sync:listPendentesComSugestoes', () => {
    requirePermissao('configuracoes', 'ver');
    return sync.listarPendentesComSugestoes();
  });

  ipcMain.handle('sync:revisarCarga', (_event, pendenteId: string) => {
    requirePermissao('configuracoes', 'ver');
    return sync.revisarCarga(pendenteId);
  });

  ipcMain.handle('sync:importarCarga', async (_event, input: ImportarCargaInput) => {
    requirePermissao('configuracoes', 'editar');
    const carga = await sync.importarCarga(input);
    registarAuditoria('importou_carga_pwa', 'carga', carga.id, `pendenteId=${input.pendenteId}`);
    return carga;
  });

  ipcMain.handle('sync:rejeitarCarga', async (_event, pendenteId: string, motivo: string) => {
    requirePermissao('configuracoes', 'editar');
    await sync.rejeitarCarga(pendenteId, motivo);
    registarAuditoria('rejeitou_carga_pwa', 'carga_pendente', pendenteId, motivo);
  });

  ipcMain.handle('sync:listarHistorico', (_event, limit?: number) => {
    requirePermissao('configuracoes', 'ver');
    return sync.listarHistorico(limit);
  });

  ipcMain.handle('sync:listarPostos', () => {
    requirePermissao('configuracoes', 'ver');
    return sync.listarPostos();
  });

  ipcMain.handle('sync:ativarPosto', async (_event, codigo: string) => {
    requirePermissao('configuracoes', 'editar');
    const posto = await sync.ativarPosto(codigo);
    registarAuditoria('ativou_posto_por_codigo', 'posto', posto.id);
    return posto;
  });

  ipcMain.handle('sync:diagnosticoPosto', () => {
    requirePermissao('configuracoes', 'ver');
    return sync.obterDiagnosticoPosto();
  });

  ipcMain.handle('mensagens:listarConversa', (_event, pwaUserId: string) => {
    requirePermissao('configuracoes', 'ver');
    return mensagens.listarConversa(pwaUserId);
  });

  ipcMain.handle('mensagens:enviar', async (_event, paraUserId: string, texto: string) => {
    requirePermissao('configuracoes', 'editar');
    await mensagens.enviarComoEmpresa(paraUserId, texto);
    registarAuditoria('enviou_mensagem', 'user', paraUserId);
  });

  ipcMain.handle('mensagens:contarNaoLidas', () => {
    requirePermissao('configuracoes', 'ver');
    return mensagens.contarNaoLidas();
  });

  ipcMain.handle('mensagens:marcarLidas', async (_event, pwaUserId: string) => {
    requirePermissao('configuracoes', 'editar');
    await mensagens.marcarLidas(pwaUserId);
  });

  ipcMain.handle('mensagens:listarConversas', () => {
    requirePermissao('configuracoes', 'ver');
    return mensagens.listarConversas();
  });
}
