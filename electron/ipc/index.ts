import { ipcMain, shell } from 'electron';
import * as auth from '../main/auth';
import * as maintenance from '../main/maintenance';
import * as userManagement from '../main/userManagement';
import * as license from '../main/license';
import * as sync from '../main/sync';
import { settingsRepository } from '../models/repositories/settingsRepository';
import { contactoRepository } from '../models/repositories/contactoRepository';
import { contactoNotificadoRepository } from '../models/repositories/contactoNotificadoRepository';
import { cargaRepository } from '../models/repositories/cargaRepository';
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

  ipcMain.handle('contactos:search', (_event, texto: string, limit?: number) =>
    contactoRepository.search(texto, limit),
  );

  ipcMain.handle('contactos:listPorContentor', (_event, contentorId: string) =>
    contactoRepository.listPorContentor(contentorId),
  );

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

  ipcMain.handle('cargas:create', (_event, input: CreateCargaInput) => {
    requirePermissao('cargas', 'criar');
    const carga = cargaRepository.create(input);
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

  ipcMain.handle('cargas:nextCodigo', () => cargaRepository.nextCodigo());

  ipcMain.handle('cargas:addDestinatario', (_event, cargaId: string, contactoId: string) => {
    requirePermissao('cargas', 'editar');
    return cargaRepository.addDestinatario(cargaId, contactoId);
  });

  ipcMain.handle('cargas:createBatch', (_event, items: Parameters<typeof cargaRepository.createBatch>[0]) => {
    requirePermissao('cargas', 'criar');
    const cargas = cargaRepository.createBatch(items);
    registarAuditoria('criou_cargas_lote', 'carga', null, `total=${cargas.length}`);
    return cargas;
  });

  ipcMain.handle('cargas:listOrigensPwa', () => {
    requirePermissao('cargas', 'ver');
    return cargaRepository.listOrigensPwa();
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

  ipcMain.handle('contentores:nextCodigo', () => contentorRepository.nextCodigo());

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
      contentorCodigo: contentor.codigo,
      contentorNome: contentor.nome,
      dataPartida: contentor.dataPartida,
      dataChegadaPrevista: contentor.dataChegadaPrevista,
      moeda,
      idioma: idioma as IdiomaExportacao,
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

  ipcMain.handle('home:resumo', (): HomeResumo => ({
    totalCargasMes: cargaRepository.countMesAtual(),
    contentoresAbertos: contentorRepository.countAbertos(),
    valorDevido: cargaRepository.sumValorDevido(),
    entregues: cargaRepository.countEntreguesMesAtual(),
  }));

  ipcMain.handle('home:contentoresAtivos', (_event, limit?: number) => contentorRepository.listAtivos(limit));

  ipcMain.handle('home:ultimasCargas', (_event, limit?: number) => cargaRepository.listUltimas(limit));

  ipcMain.handle('search:global', (_event, texto: string): SearchResultItem[] => {
    if (!texto.trim()) return [];

    const cargas: Carga[] = cargaRepository.search(texto);
    const contentores: Contentor[] = contentorRepository.search(texto);
    const contactos: Contacto[] = contactoRepository.search(texto);

    return [
      ...cargas.map(
        (carga): SearchResultItem => ({ type: 'carga', id: carga.id, title: carga.nome, subtitle: carga.codigo }),
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
      clienteNome: contacto.nome,
      moeda,
      cargas: cargas.map((c) => ({
        codigo: c.codigo,
        nome: c.nome,
        data: c.createdAt,
        valor: c.valor,
        estado: c.estadoPagamento,
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

  ipcMain.handle('users:list', () => userManagement.listUsuariosComSessao());

  ipcMain.handle('users:create', async (_event, input: CreateUserInput) => {
    const user = await userManagement.criarUsuario(requireSession().role, input);
    registarAuditoria('criou_utilizador', 'user', user.id);
    return user;
  });

  ipcMain.handle('users:update', (_event, userId: string, changes: { name: string; email: string }) => {
    const user = userManagement.editarUsuario(requireSession().role, userId, changes);
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
    userManagement.eliminarUsuario(requireSession().role, userId),
  );

  ipcMain.handle('users:resetPasswordAdmin', (_event, targetUserId: string, newPassword: string) =>
    userManagement.resetPasswordAdmin(requireSession().role, targetUserId, newPassword),
  );

  ipcMain.handle('users:resetPasswordUser', (_event, targetUserId: string, newPassword: string) =>
    userManagement.resetPasswordUser(requireSession().role, targetUserId, newPassword),
  );

  ipcMain.handle('users:listAdmins', () => userManagement.listAdmins());

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

  ipcMain.handle('permissoes:listPorUser', (_event, userId: string) => permissaoRepository.listPorUser(userId));

  ipcMain.handle('permissoes:set', (_event, userId: string, permissoes: PermissaoInput[]) => {
    userManagement.definirPermissoes(requireSession().role, userId, permissoes);
    return permissaoRepository.listPorUser(userId);
  });

  ipcMain.handle('sessoes:listPorUser', (_event, userId: string) => sessaoRepository.listPorUser(userId));

  ipcMain.handle('auditoria:list', (_event, limit?: number) => auditoriaRepository.list(limit));

  ipcMain.handle('notificacoes:list', (_event, limit?: number) => notificacaoRepository.list(limit));

  ipcMain.handle('notificacoes:marcarLida', (_event, id: string) => notificacaoRepository.marcarLida(id));

  ipcMain.handle('notificacoes:marcarTodasLidas', () => notificacaoRepository.marcarTodasLidas());

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
}
