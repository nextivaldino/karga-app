export type EstadoCargaPendente = 'pendente' | 'importada' | 'rejeitada';

export interface ContentorDisponivel {
  id: string;
  nome: string;
  codigo: string;
  estado: string;
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
}

// Estado que só existe localmente, antes de a carga chegar ao Supabase —
// nunca é enviado ao servidor, só usado para mostrar o item na Lista de
// Cargas enquanto está na fila offline (doc 19 §6).
export type EstadoItemFila = 'fila' | 'erro';

export interface ItemFilaOffline {
  id: string;
  item: NovaCargaPendenteInput;
  estado: EstadoItemFila;
  criadoEm: string;
  ultimoErro: string | null;
}
