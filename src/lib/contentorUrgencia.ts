export type UrgenciaTier = 'aviso' | 'alerta' | 'critico';

export function getUrgenciaTier(diasParado: number, limite: number): UrgenciaTier {
  if (diasParado > limite * 3) return 'critico';
  if (diasParado > limite * 2) return 'alerta';
  return 'aviso';
}

export const URGENCIA_PILL_CLASS: Record<UrgenciaTier, string> = {
  aviso: 'bg-warning/10 text-warning',
  alerta: 'bg-warning/25 text-warning font-semibold',
  critico: 'bg-error/15 text-error font-semibold',
};

export const URGENCIA_TEXT_CLASS: Record<UrgenciaTier, string> = {
  aviso: 'text-warning',
  alerta: 'text-warning font-semibold',
  critico: 'text-error font-semibold',
};
