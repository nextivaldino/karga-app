export type UserRole = 'root' | 'admin' | 'user';
export type SyncStatus = 'local' | 'synced' | 'pending';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  active: boolean;
  pwaHabilitado: boolean;
  pwaAuthUid: string | null;
  avatar: string | null;
  loginSemPassword: boolean;
  // Contentor padrão para envios PWA deste utilizador — tem prioridade
  // sobre o padrão global (ver Contentor.padraoGlobal). null = usa o
  // padrão do sistema.
  contentorPadraoId: string | null;
  createdAt: string;
  updatedAt: string;
  syncStatus: SyncStatus;
}

// Versão mínima usada no ecrã de login antes de haver sessão — só o
// suficiente para desenhar a grelha de avatares, nunca dados sensíveis.
export interface QuickLoginUser {
  id: string;
  name: string;
  avatar: string | null;
}

export type PublicUser = Omit<User, 'passwordHash'>;

export type ModuloPermissao = 'cargas' | 'contentores' | 'contactos' | 'faturacao' | 'relatorios' | 'configuracoes';

export interface Permissao {
  id: string;
  userId: string;
  modulo: ModuloPermissao;
  podeVer: boolean;
  podeCriar: boolean;
  podeEditar: boolean;
  podeEliminar: boolean;
}

export interface PermissaoInput {
  modulo: ModuloPermissao;
  podeVer: boolean;
  podeCriar: boolean;
  podeEditar: boolean;
  podeEliminar: boolean;
}

export interface SetupInput {
  rootName: string;
  rootEmail: string;
  rootPassword: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  permissoes?: PermissaoInput[];
}

export interface Sessao {
  id: string;
  userId: string;
  loginAt: string;
  logoutAt: string | null;
}

export interface UsuarioComSessao extends PublicUser {
  ultimaSessao: string | null;
}

export interface AuditoriaEntry {
  id: string;
  userId: string;
  userNome: string;
  acao: string;
  entidade: string | null;
  entidadeId: string | null;
  detalhes: string | null;
  createdAt: string;
}

export type TipoNotificacao = 'info' | 'sucesso' | 'aviso' | 'erro';

export interface Notificacao {
  id: string;
  tipo: TipoNotificacao;
  titulo: string;
  mensagem: string | null;
  lida: boolean;
  linkModulo: string | null;
  linkEntidadeId: string | null;
  createdAt: string;
}

export interface Session {
  user: PublicUser;
}

export interface HealthcheckResult {
  status: 'ok';
  timestamp: string;
}

export type MainPage = 'home' | 'cargas' | 'contentores' | 'configuracoes' | 'sync';

export interface NavigationState {
  page: MainPage;
  params?: Record<string, string>;
}

export type EstadoPagamento = 'pago' | 'devido';
export type EstadoCarga = 'recebida' | 'em_deposito' | 'em_contentor' | 'em_transito' | 'entregue' | 'arquivada';
export type EstadoContentor = 'aberto' | 'fechado' | 'em_transito' | 'entregue' | 'bloqueado';

export interface Contacto {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  morada: string | null;
  nif: string | null;
  notas: string | null;
  ativo: boolean;
  // Código-base para agrupar várias cargas deste emissor sob o mesmo
  // código (ex: "TF010", com as cargas seguintes a ficarem "TF010-A",
  // "TF010-B"...) — só é definido quando o toggle "Código único para
  // este emissor" é usado pela primeira vez ao inserir uma carga.
  codigoBase: string | null;
  createdAt: string;
  updatedAt: string;
  syncStatus: SyncStatus;
}

export interface ContactoComContagem extends Contacto {
  totalCargas: number;
  valorDevido: number;
}

export interface Etiqueta {
  id: string;
  nome: string;
  cor: string;
  createdAt: string;
  updatedAt: string;
  syncStatus: SyncStatus;
}

export interface CreateEtiquetaInput {
  nome: string;
  cor: string;
}

export type CanalContacto = 'whatsapp' | 'email' | 'manual';

export interface ContactoNotificado {
  id: string;
  contactoId: string;
  contentorId: string;
  canal: CanalContacto;
  contactadoEm: string;
}

export interface CreateContactoInput {
  nome: string;
  telefone?: string | null;
  email?: string | null;
  morada?: string | null;
  nif?: string | null;
  notas?: string | null;
}

export interface Carga {
  id: string;
  codigo: string;
  nome: string;
  comprimentoCm: number | null;
  larguraCm: number | null;
  alturaCm: number | null;
  m3: number | null;
  pesoKg: number | null;
  valor: number | null;
  moeda: string;
  estadoPagamento: EstadoPagamento;
  tipoEmbalagem: string | null;
  notas: string | null;
  estado: EstadoCarga;
  contentorId: string | null;
  emissorId: string;
  origemPwaUserId: string | null;
  // Utilizador do desktop que criou a carga (null quando veio da PWA,
  // caso em que `origemPwaUserId` é que identifica a origem).
  criadoPorUserId: string | null;
  createdAt: string;
  updatedAt: string;
  syncStatus: SyncStatus;
}

export interface CargaComEmissor extends Carga {
  emissorNome: string;
  destinatarios: string[];
}

export interface CreateCargaInput {
  codigo: string;
  nome: string;
  comprimentoCm?: number | null;
  larguraCm?: number | null;
  alturaCm?: number | null;
  pesoKg?: number | null;
  valor?: number | null;
  moeda?: string;
  estadoPagamento?: EstadoPagamento;
  tipoEmbalagem?: string | null;
  notas?: string | null;
  contentorId?: string | null;
  emissorId: string;
  origemPwaUserId?: string | null;
}

export interface CreateCargaBatchItem extends CreateCargaInput {
  recetorId?: string | null;
}

export interface Contentor {
  id: string;
  nome: string;
  codigo: string;
  mesReferencia: string;
  categoria: string | null;
  dataPartida: string | null;
  dataChegadaPrevista: string | null;
  estado: EstadoContentor;
  pesoTotalKg: number;
  m3Total: number;
  valorTotal: number;
  totalCargas: number;
  custoFrete: number | null;
  notas: string | null;
  oculto: boolean;
  bloqueado: boolean;
  // Contentor a sério, só sinalizado como agrupamento leve — mesmas
  // cargas, mesma sequência de código; sai deste estado só pela ação
  // explícita "Converter em Contentor" (`converterEmContentor`).
  ehLista: boolean;
  // Contentor padrão para envios PWA sem atribuição própria — só um
  // contentor pode ter isto a true de cada vez em todo o sistema (ver
  // contentorRepository.definirPadraoGlobal).
  padraoGlobal: boolean;
  diasParado: number | null;
  partindoEmBreve: boolean;
  chegadaEmBreve: boolean;
  atrasado: boolean;
  createdAt: string;
  updatedAt: string;
  syncStatus: SyncStatus;
}

export interface CreateContentorInput {
  nome: string;
  codigo: string;
  mesReferencia?: string;
  categoria?: string | null;
  dataPartida?: string | null;
  dataChegadaPrevista?: string | null;
  ehLista?: boolean;
}

export interface ResumoCliente {
  contactoId: string;
  nome: string;
  telefone: string | null;
  totalCargas: number;
  valorDevido: number;
  valorPago: number;
}

export interface ClienteFaturacao extends Contacto {
  totalCargas: number;
  valorDevido: number;
  valorPago: number;
  etiquetas: Etiqueta[];
}

export interface HomeResumo {
  totalCargasMes: number;
  contentoresAbertos: number;
  valorDevido: number;
  entregues: number;
}

export type SearchResultType = 'carga' | 'contentor' | 'contacto';

export interface SearchResultItem {
  type: SearchResultType;
  id: string;
  title: string;
  subtitle: string | null;
}

export interface PeriodoFiltro {
  dataInicio?: string;
  dataFim?: string;
}

export type Agrupamento = 'dia' | 'semana' | 'mes';

export interface RelatorioCargasPorPeriodoLinha {
  periodo: string;
  totalCargas: number;
  pesoTotal: number;
  m3Total: number;
  valorTotal: number;
  valorPago: number;
  valorDevido: number;
}

export interface RelatorioCargasPorContentorLinha {
  codigo: string;
  nome: string;
  estado: EstadoContentor;
  totalCargas: number;
  pesoTotal: number;
  m3Total: number;
  valorTotal: number;
}

export interface RelatorioCargasPorClienteLinha {
  nome: string;
  telefone: string | null;
  totalCargas: number;
  valorTotal: number;
}

export interface RelatorioCargaPendenteLinha {
  codigo: string;
  nome: string;
  emissorNome: string;
  contentorCodigo: string | null;
  estado: EstadoCarga;
  createdAt: string;
}

export interface RelatorioResumoFinanceiroLinha {
  periodo: string;
  valorTotal: number;
  valorPago: number;
  valorDevido: number;
}

export interface ColunaExportacao {
  header: string;
  key: string;
}

// Sync PWA (doc 16) ---------------------------------------------------

export type EstadoCargaPendente = 'pendente' | 'importada' | 'rejeitada';

export interface CargaPendente {
  id: string;
  contentorId: string;
  inseridoPorUserId: string;
  inseridoPorNome: string;
  emissorNome: string;
  emissorTelefone: string | null;
  emissorEmail: string | null;
  emissorNif: string | null;
  emissorMorada: string | null;
  recetorNome: string;
  recetorTelefone: string | null;
  recetorEmail: string | null;
  recetorMorada: string | null;
  nomeCarga: string;
  comprimentoCm: number | null;
  larguraCm: number | null;
  alturaCm: number | null;
  pesoKg: number | null;
  valor: number | null;
  pago: boolean;
  notas: string | null;
  estado: EstadoCargaPendente;
  motivoRejeicao: string | null;
  importadoEm: string | null;
  cargaLocalId: string | null;
  createdAt: string;
}

export interface SugestaoContacto {
  campo: 'emissor' | 'recetor';
  nomeOriginal: string;
  telefoneOriginal: string | null;
  sugestaoId: string | null;
  sugestaoNome: string | null;
  // true quando o nome é igual (só difere em acentos/maiúsculas) a um
  // contacto existente — associa-se sem pedir decisão ao Admin.
  automatico: boolean;
}

export interface RevisaoCargaPendente {
  pendente: CargaPendente;
  sugestoes: SugestaoContacto[];
}

export interface Mensagem {
  id: string;
  deUserId: string;
  paraUserId: string;
  texto: string;
  lida: boolean;
  createdAt: string;
}

export interface ThreadMensagemNaoLida {
  userId: string;
  nome: string;
  total: number;
}

export interface ImportarCargaInput {
  pendenteId: string;
  contentorId: string;
  emissorId?: string | null;
  recetorId?: string | null;
  nome: string;
  comprimentoCm: number | null;
  larguraCm: number | null;
  alturaCm: number | null;
  pesoKg: number | null;
  valor: number | null;
  pago: boolean;
}

export interface HabilitarPwaResult {
  user: PublicUser;
  passwordTemporaria: string;
  pwaEmail: string;
}

export interface CargasPorContentorLinha {
  contentorId: string;
  contentorCodigo: string;
  contentorNome: string;
  total: number;
}

export interface SugestaoDimensoes {
  comprimentoCm: number;
  larguraCm: number;
  alturaCm: number;
  ocorrencias: number;
}

export interface OrigemPwaLinha {
  userId: string;
  nome: string;
  total: number;
}
