import type { EstadoCarga, EstadoContentor } from '@/types';

export const ESTADO_CONTENTOR_LABEL: Record<EstadoContentor, string> = {
  aberto: 'Aberto',
  fechado: 'Fechado',
  em_transito: 'Em Trânsito',
  entregue: 'Entregue',
  bloqueado: 'Bloqueado',
};

export const ESTADO_CONTENTOR_COLOR_CLASS: Record<EstadoContentor, string> = {
  aberto: 'text-success',
  fechado: 'text-text-tertiary',
  em_transito: 'text-primary',
  entregue: 'text-success',
  bloqueado: 'text-error',
};

export const ESTADO_CARGA_LABEL: Record<EstadoCarga, string> = {
  recebida: 'Recebida',
  em_deposito: 'Em Depósito',
  em_contentor: 'Em Contentor',
  em_transito: 'Em Trânsito',
  entregue: 'Entregue',
  arquivada: 'Arquivada',
};
