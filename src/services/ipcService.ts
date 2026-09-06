import type {
  Agrupamento,
  AuditoriaEntry,
  CanalContacto,
  CargaComEmissor,
  Carga,
  ColunaExportacao,
  Contacto,
  ContactoComContagem,
  ContactoNotificado,
  Contentor,
  CreateCargaBatchItem,
  CreateCargaInput,
  CreateContactoInput,
  CreateContentorInput,
  CargaPendente,
  CargasPorContentorLinha,
  CreateEtiquetaInput,
  CreateUserInput,
  EstadoContentor,
  EstadoPagamento,
  Etiqueta,
  HabilitarPwaResult,
  HealthcheckResult,
  HomeResumo,
  ImportarCargaInput,
  Mensagem,
  Notificacao,
  OrigemPwaLinha,
  Permissao,
  PermissaoInput,
  PeriodoFiltro,
  PublicUser,
  QuickLoginUser,
  RelatorioCargaPendenteLinha,
  RelatorioCargasPorClienteLinha,
  RelatorioCargasPorContentorLinha,
  RelatorioCargasPorPeriodoLinha,
  RelatorioResumoFinanceiroLinha,
  ResumoCliente,
  RevisaoCargaPendente,
  SugestaoDimensoes,
  SearchResultItem,
  SetupInput,
  Sessao,
  ThreadMensagemNaoLida,
  UsuarioComSessao,
} from '@/types';

function invoke<T>(channel: Parameters<Window['kraga']['invoke']>[0], ...args: unknown[]): Promise<T> {
  return window.kraga.invoke(channel, ...args) as Promise<T>;
}

export const ipcService = {
  license: {
    status: () => invoke<{ activated: boolean; machineId: string }>('license:status'),
    activate: (key: string) => invoke<boolean>('license:activate', key),
  },
  auth: {
    setupNeeded: () => invoke<boolean>('auth:setupNeeded'),
    completeSetup: (input: SetupInput) => invoke<PublicUser>('auth:completeSetup', input),
    login: (email: string, password: string) => invoke<PublicUser>('auth:login', email, password),
    logout: () => invoke<void>('auth:logout'),
    session: () => invoke<PublicUser | null>('auth:session'),
    updateProfile: (userId: string, changes: { name: string; email: string }) =>
      invoke<PublicUser>('auth:updateProfile', userId, changes),
    changePassword: (userId: string, currentPassword: string, newPassword: string) =>
      invoke<void>('auth:changePassword', userId, currentPassword, newPassword),
    listQuickLogin: () => invoke<QuickLoginUser[]>('auth:listQuickLogin'),
    loginSemPassword: (userId: string) => invoke<PublicUser>('auth:loginSemPassword', userId),
  },
  settings: {
    get: (chave: string) => invoke<string | null>('settings:get', chave),
    getAll: () => invoke<Record<string, string>>('settings:getAll'),
    set: (chave: string, valor: string) => invoke<void>('settings:set', chave, valor),
    backup: (passwordConfirmacao: string) =>
      invoke<{ path: string } | { canceled: true }>('settings:backup', passwordConfirmacao),
    restore: (passwordConfirmacao: string) =>
      invoke<{ path: string } | { canceled: true }>('settings:restore', passwordConfirmacao),
    previewImportExcel: () =>
      invoke<({ path: string; linhas: CreateContactoInput[]; erros: string[] }) | { canceled: true }>(
        'settings:previewImportExcel',
      ),
    confirmarImportExcel: (linhas: CreateContactoInput[], passwordConfirmacao: string) =>
      invoke<{ criados: number }>('settings:confirmarImportExcel', linhas, passwordConfirmacao),
    exportarTudo: (passwordConfirmacao: string) =>
      invoke<{ path: string } | { canceled: true }>('settings:exportarTudo', passwordConfirmacao),
    exportarContactos: () => invoke<{ path: string } | { canceled: true }>('settings:exportarContactos'),
    limparDadosTeste: (passwordConfirmacao: string) => invoke<void>('settings:limparDadosTeste', passwordConfirmacao),
    resetTotal: (passwordConfirmacao: string) => invoke<void>('settings:resetTotal', passwordConfirmacao),
  },
  system: {
    info: () => invoke<{ dbSizeBytes: number; appVersion: string }>('system:info'),
  },
  syncApi: {
    healthcheck: () => invoke<HealthcheckResult>('syncApi:healthcheck'),
  },
  contactos: {
    list: (includeInactive?: boolean, texto?: string) =>
      invoke<Contacto[]>('contactos:list', includeInactive, texto),
    create: (input: CreateContactoInput) => invoke<Contacto>('contactos:create', input),
    update: (id: string, changes: Partial<CreateContactoInput>) =>
      invoke<Contacto | null>('contactos:update', id, changes),
    search: (texto: string, limit?: number) => invoke<Contacto[]>('contactos:search', texto, limit),
    buscarSimilares: (input: { nome?: string; telefone?: string; morada?: string }, excludeId?: string) =>
      invoke<Contacto[]>('contactos:buscarSimilares', input, excludeId),
    listPorContentor: (contentorId: string) =>
      invoke<ContactoComContagem[]>('contactos:listPorContentor', contentorId),
    archive: (id: string) => invoke<Contacto | null>('contactos:archive', id),
    reactivate: (id: string) => invoke<Contacto | null>('contactos:reactivate', id),
  },
  contactosNotificados: {
    registar: (contactoId: string, contentorId: string, canal: CanalContacto) =>
      invoke<ContactoNotificado>('contactosNotificados:registar', contactoId, contentorId, canal),
    listPorContentor: (contentorId: string) =>
      invoke<Record<string, ContactoNotificado>>('contactosNotificados:listPorContentor', contentorId),
  },
  cargas: {
    list: (filters?: {
      id?: string;
      contentorId?: string | null;
      emissorId?: string;
      texto?: string;
      estadoPagamento?: EstadoPagamento;
      origemPwaUserId?: string;
      incluirArquivadas?: boolean;
    }) => invoke<CargaComEmissor[]>('cargas:list', filters),
    create: (input: CreateCargaInput) => invoke<Carga>('cargas:create', input),
    update: (id: string, changes: Partial<CreateCargaInput>) => invoke<Carga | null>('cargas:update', id, changes),
    archive: (id: string) => invoke<Carga | null>('cargas:archive', id),
    moverEmLote: (ids: string[], contentorId: string) => invoke<Carga[]>('cargas:moverEmLote', ids, contentorId),
    nextCodigo: () => invoke<string>('cargas:nextCodigo'),
    nextCodigoAgrupado: (emissorId: string, reservados?: string[]) =>
      invoke<string>('cargas:nextCodigoAgrupado', emissorId, reservados),
    addDestinatario: (cargaId: string, contactoId: string) =>
      invoke<void>('cargas:addDestinatario', cargaId, contactoId),
    createBatch: (items: CreateCargaBatchItem[]) => invoke<Carga[]>('cargas:createBatch', items),
    listOrigensPwa: () => invoke<OrigemPwaLinha[]>('cargas:listOrigensPwa'),
    countPorContentorParaUsuario: (userId: string) =>
      invoke<CargasPorContentorLinha[]>('cargas:countPorContentorParaUsuario', userId),
    sugerirDimensoes: (nome: string) => invoke<SugestaoDimensoes | null>('cargas:sugerirDimensoes', nome),
  },
  etiquetas: {
    list: () => invoke<Etiqueta[]>('etiquetas:list'),
    create: (input: CreateEtiquetaInput) => invoke<Etiqueta>('etiquetas:create', input),
    update: (id: string, changes: Partial<CreateEtiquetaInput>) =>
      invoke<Etiqueta | null>('etiquetas:update', id, changes),
    delete: (id: string) => invoke<void>('etiquetas:delete', id),
    listPorContactos: (contactoIds: string[]) =>
      invoke<Record<string, Etiqueta[]>>('etiquetas:listPorContactos', contactoIds),
    attach: (contactoId: string, etiquetaId: string) => invoke<void>('etiquetas:attach', contactoId, etiquetaId),
    detach: (contactoId: string, etiquetaId: string) => invoke<void>('etiquetas:detach', contactoId, etiquetaId),
  },
  contentores: {
    list: (filters?: { estado?: EstadoContentor; mesReferencia?: string; incluirOcultos?: boolean }) =>
      invoke<Contentor[]>('contentores:list', filters),
    obter: (id: string) => invoke<Contentor | null>('contentores:obter', id),
    create: (input: CreateContentorInput) => invoke<Contentor>('contentores:create', input),
    update: (id: string, changes: Partial<CreateContentorInput>) =>
      invoke<Contentor | null>('contentores:update', id, changes),
    converterEmContentor: (id: string) => invoke<Contentor | null>('contentores:converterEmContentor', id),
    nextCodigo: () => invoke<string>('contentores:nextCodigo'),
    bloquear: (id: string) => invoke<Contentor | null>('contentores:bloquear', id),
    desbloquear: (id: string) => invoke<Contentor | null>('contentores:desbloquear', id),
    ocultar: (id: string) => invoke<Contentor | null>('contentores:ocultar', id),
    mostrar: (id: string) => invoke<Contentor | null>('contentores:mostrar', id),
    definirPadraoGlobal: (id: string) => invoke<Contentor | null>('contentores:definirPadraoGlobal', id),
    eliminar: (id: string) => invoke<void>('contentores:eliminar', id),
    fechar: (id: string) => invoke<Contentor>('contentores:fechar', id),
    marcarEmTransito: (id: string) => invoke<Contentor>('contentores:marcarEmTransito', id),
    marcarEntregue: (id: string) => invoke<Contentor>('contentores:marcarEntregue', id),
    exportarLista: (id: string, idioma: 'pt' | 'en' | 'fr') =>
      invoke<{ path: string }>('contentores:exportarLista', id, idioma),
  },
  home: {
    resumo: () => invoke<HomeResumo>('home:resumo'),
    ultimasSincronizadas: (limit?: number) => invoke<CargaComEmissor[]>('home:ultimasSincronizadas', limit),
  },
  search: {
    global: (texto: string) => invoke<SearchResultItem[]>('search:global', texto),
  },
  shell: {
    openExternal: (url: string) => invoke<void>('shell:openExternal', url),
  },
  faturacao: {
    resumoPorCliente: (filtros?: { contentorId?: string; soComDivida?: boolean }) =>
      invoke<ResumoCliente[]>('faturacao:resumoPorCliente', filtros),
    gerarFatura: (contactoId: string, contentorId?: string) =>
      invoke<{ path: string }>('faturacao:gerarFatura', contactoId, contentorId),
  },
  relatorios: {
    cargasPorPeriodo: (filtro?: PeriodoFiltro & { agrupamento?: Agrupamento }) =>
      invoke<RelatorioCargasPorPeriodoLinha[]>('relatorios:cargasPorPeriodo', filtro),
    cargasPorContentor: (filtro?: PeriodoFiltro) =>
      invoke<RelatorioCargasPorContentorLinha[]>('relatorios:cargasPorContentor', filtro),
    cargasPorCliente: (filtro?: PeriodoFiltro) =>
      invoke<RelatorioCargasPorClienteLinha[]>('relatorios:cargasPorCliente', filtro),
    cargasPendentes: () => invoke<RelatorioCargaPendenteLinha[]>('relatorios:cargasPendentes'),
    resumoFinanceiro: (filtro?: PeriodoFiltro) =>
      invoke<RelatorioResumoFinanceiroLinha[]>('relatorios:resumoFinanceiro', filtro),
    exportar: (
      formato: 'excel' | 'pdf',
      titulo: string,
      colunas: ColunaExportacao[],
      linhas: Record<string, unknown>[],
      fileName: string,
    ) => invoke<{ path: string }>('relatorios:exportar', formato, titulo, colunas, linhas, fileName),
  },
  users: {
    list: () => invoke<UsuarioComSessao[]>('users:list'),
    create: (input: CreateUserInput) => invoke<PublicUser>('users:create', input),
    update: (userId: string, changes: { name: string; email: string }) =>
      invoke<PublicUser>('users:update', userId, changes),
    bloquear: (userId: string) => invoke<PublicUser>('users:bloquear', userId),
    reativar: (userId: string) => invoke<PublicUser>('users:reativar', userId),
    eliminar: (userId: string) => invoke<void>('users:eliminar', userId),
    resetPasswordAdmin: (targetUserId: string, newPassword: string) =>
      invoke<void>('users:resetPasswordAdmin', targetUserId, newPassword),
    resetPasswordUser: (targetUserId: string, newPassword: string) =>
      invoke<void>('users:resetPasswordUser', targetUserId, newPassword),
    listAdmins: () => invoke<PublicUser[]>('users:listAdmins'),
    habilitarPwa: (userId: string) => invoke<HabilitarPwaResult>('users:habilitarPwa', userId),
    desabilitarPwa: (userId: string) => invoke<PublicUser>('users:desabilitarPwa', userId),
    setAvatar: (userId: string, avatar: string | null) => invoke<PublicUser>('users:setAvatar', userId, avatar),
    setLoginSemPassword: (userId: string, valor: boolean) =>
      invoke<PublicUser>('users:setLoginSemPassword', userId, valor),
    setContentorPadrao: (userId: string, contentorId: string | null) =>
      invoke<PublicUser>('users:setContentorPadrao', userId, contentorId),
  },
  permissoes: {
    listPorUser: (userId: string) => invoke<Permissao[]>('permissoes:listPorUser', userId),
    set: (userId: string, permissoes: PermissaoInput[]) => invoke<Permissao[]>('permissoes:set', userId, permissoes),
  },
  sessoes: {
    listPorUser: (userId: string) => invoke<Sessao[]>('sessoes:listPorUser', userId),
  },
  auditoria: {
    list: (limit?: number) => invoke<AuditoriaEntry[]>('auditoria:list', limit),
  },
  notificacoes: {
    list: (limit?: number) => invoke<Notificacao[]>('notificacoes:list', limit),
    marcarLida: (id: string) => invoke<void>('notificacoes:marcarLida', id),
    marcarTodasLidas: () => invoke<void>('notificacoes:marcarTodasLidas'),
  },
  sync: {
    listPendentes: () => invoke<CargaPendente[]>('sync:listPendentes'),
    listPendentesComSugestoes: () => invoke<RevisaoCargaPendente[]>('sync:listPendentesComSugestoes'),
    revisarCarga: (pendenteId: string) => invoke<RevisaoCargaPendente>('sync:revisarCarga', pendenteId),
    importarCarga: (input: ImportarCargaInput) => invoke<Carga>('sync:importarCarga', input),
    rejeitarCarga: (pendenteId: string, motivo: string) => invoke<void>('sync:rejeitarCarga', pendenteId, motivo),
    listarHistorico: (limit?: number) => invoke<CargaPendente[]>('sync:listarHistorico', limit),
  },
  mensagens: {
    listarConversa: (pwaUserId: string) => invoke<Mensagem[]>('mensagens:listarConversa', pwaUserId),
    enviar: (paraUserId: string, texto: string) => invoke<void>('mensagens:enviar', paraUserId, texto),
    contarNaoLidas: () => invoke<number>('mensagens:contarNaoLidas'),
    marcarLidas: (pwaUserId: string) => invoke<void>('mensagens:marcarLidas', pwaUserId),
    listarThreadsComNaoLidas: () => invoke<ThreadMensagemNaoLida[]>('mensagens:listarThreadsComNaoLidas'),
  },
};
