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
  recetorNome: string;
  recetorTelefone: string | null;
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
  recetorNome: string;
  recetorTelefone: string | null;
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
