import { WarningCircle as AlertCircle, CheckCircle as CheckCircle2, Clock, CloudArrowUp as UploadCloud, XCircle, type Icon as LucideIcon } from '@phosphor-icons/react';
import type { EstadoCargaPendente, EstadoItemFila } from '@/types';

export type EstadoListaCarga = EstadoCargaPendente | EstadoItemFila;

export const ESTADO_LABEL: Record<EstadoListaCarga, string> = {
  pendente: 'Pendente',
  importada: 'Importada',
  rejeitada: 'Rejeitada',
  fila: 'Por enviar',
  erro: 'Erro',
};

// Ícones flat (lucide, sem emoji) que substituem o rótulo de texto do
// estado — só a cor + forma do ícone comunicam "sincronizado ou não".
export const ESTADO_ICON: Record<EstadoListaCarga, LucideIcon> = {
  pendente: Clock,
  importada: CheckCircle2,
  rejeitada: XCircle,
  fila: UploadCloud,
  erro: AlertCircle,
};

export const ESTADO_CLASS: Record<EstadoListaCarga, string> = {
  pendente: 'text-warning',
  importada: 'text-success',
  rejeitada: 'text-error',
  fila: 'text-text-tertiary',
  erro: 'text-error',
};

export function formatMoeda(valor: number | null): string {
  if (valor == null) return '—';
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(valor);
}

export function formatDimensoes(c: number | null, l: number | null, a: number | null): string | null {
  if (c == null && l == null && a == null) return null;
  return `${c ?? '?'}×${l ?? '?'}×${a ?? '?'} cm`;
}
