export type EstadoCargaPendente = 'pendente' | 'importada' | 'rejeitada';

export interface ContentorDisponivel {
  id: string;
  nome: string;
  codigo: string;
  estado: string;
  bloqueado: boolean;
  // Contentor padrão para envios PWA sem atribuição própria — só um pode
  // ser true de cada vez em todo o sistema.
  padraoGlobal: boolean;
  updatedAt: string;
}

export interface CargaPendente {
  id: string;
  contentorId: string;
  inseridoPorUserId: string;
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
  // Só existe depois de importada no Desktop (electron/main/sync.ts
  // nextCodigo()/código manual) — null enquanto 'pendente'/'rejeitada'.
  codigo: string | null;
  createdAt: string;
}

export interface NovaCargaPendenteInput {
  contentorId: string;
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
}

export interface Mensagem {
  id: string;
  deUserId: string;
  paraUserId: string;
  texto: string;
  lida: boolean;
  createdAt: string;
}

export interface PwaUser {
  id: string;
  nome: string;
  email: string;
  ativo: boolean;
  authUid: string | null;
  // Contentor padrão deste utilizador (atribuído pelo Admin) — tem
  // prioridade sobre o padrão global. null = usa o padrão do sistema.
  contentorPadraoId: string | null;
  postoId: string | null;
  username: string | null;
  tipoAcesso: 'root' | 'admin' | 'user';
  // Base64 (data:image/...) ou emoji, mesmo padrão do Desktop
  // (UserAvatar.tsx) — nunca um URL remoto, não há Storage neste projeto.
  avatar: string | null;
}

export interface MeuPostoInfo {
  nome: string;
  pais: string | null;
}

export type EstadoPosto = 'pendente' | 'ativo' | 'suspenso' | 'bloqueado';
export type TipoAcesso = 'root' | 'admin' | 'user';

// Utilizador PWA visto pelo painel Root — não confundir com PwaUser (o
// próprio utilizador autenticado). Usado só na gestão global de
// identidades, por isso não traz avatar/PIN/etc.
export interface UtilizadorRoot {
  id: string;
  nome: string;
  email: string;
  tipoAcesso: TipoAcesso;
  ativo: boolean;
  postoId: string | null;
}

export interface Posto {
  id: string;
  nome: string;
  pais: string;
  estado: EstadoPosto;
  codigoAtivacao: string | null;
  codigoUsado: boolean;
  ativadoEm: string | null;
  installationId: string | null;
  createdAt: string;
  updatedAt: string;
}

// Estado que só existe localmente, antes de a carga chegar ao Supabase —
// nunca é enviado ao servidor, só usado para mostrar o item na Lista de
// Cargas enquanto está na fila offline (doc 19 §6).
export type EstadoItemFila = 'fila' | 'erro';

// 'transitorio' — vale a pena tentar sozinho outra vez (rede, erro
// desconhecido); 'permanente' — repetir sozinho nunca vai resolver
// (sessão expirada, sem posto, contentor inexistente), precisa de ação
// humana. null enquanto o item nunca falhou.
export type TipoErroFila = 'transitorio' | 'permanente';

export interface ItemFilaOffline {
  id: string;
  item: NovaCargaPendenteInput;
  estado: EstadoItemFila;
  criadoEm: string;
  ultimoErro: string | null;
  tentativas: number;
  ultimaTentativaEm: string | null;
  tipoErro: TipoErroFila | null;
  // Dono no momento em que o item foi enfileirado — impede que, ao trocar
  // de conta no mesmo aparelho com itens ainda por enviar, a fila os
  // reenvie atribuídos ao utilizador errado (ver useFilaOffline).
  donoUserId: string;
  donoNome: string;
}
