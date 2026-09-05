import type { CSSProperties } from 'react';

// Espelha exatamente as variáveis de src/styles/theme.css — usado para
// inverter o tema só numa subárvore (ex: popup Nova Carga) através de
// estilo inline, que tem prioridade garantida sobre qualquer regra CSS
// e herda corretamente para todos os descendentes (menus incluídos).
const LIGHT: Record<string, string> = {
  '--color-primary': '#006fee',
  '--color-primary-hover': '#005bc4',
  '--color-primary-light': '#e6f1fe',
  '--color-success': '#17c964',
  '--color-error': '#f31260',
  '--color-warning': '#f5a524',
  '--color-purple': '#7828c8',
  '--color-primary-rgb': '0 111 238',
  '--color-success-rgb': '23 201 100',
  '--color-error-rgb': '243 18 96',
  '--color-warning-rgb': '245 165 36',
  '--color-purple-rgb': '120 40 200',
  '--bg-app': '#f4f4f5',
  '--bg-surface': '#ffffff',
  '--bg-header': 'rgba(255, 255, 255, 0.72)',
  '--bg-input': '#f4f4f5',
  '--text-primary': '#11181c',
  '--text-secondary': '#3f3f46',
  '--text-tertiary': '#71717a',
  '--border': '#e4e4e7',
  '--shadow-soft': '0 0 0 1px rgba(24, 24, 27, 0.04), 0 2px 8px rgba(24, 24, 27, 0.06)',
  '--shadow-medium': '0 8px 30px rgba(24, 24, 27, 0.12)',
};

const DARK: Record<string, string> = {
  '--color-primary': '#006fee',
  '--color-primary-hover': '#338ef7',
  '--color-primary-light': 'rgba(0, 111, 238, 0.18)',
  '--color-success': '#17c964',
  '--color-error': '#f31260',
  '--color-warning': '#f5a524',
  '--color-purple': '#9353d3',
  '--color-primary-rgb': '0 111 238',
  '--color-success-rgb': '23 201 100',
  '--color-error-rgb': '243 18 96',
  '--color-warning-rgb': '245 165 36',
  '--color-purple-rgb': '147 83 211',
  '--bg-app': '#000000',
  '--bg-surface': '#18181b',
  '--bg-header': 'rgba(0, 0, 0, 0.72)',
  '--bg-input': '#27272a',
  '--text-primary': '#eceef0',
  '--text-secondary': '#a1a1aa',
  '--text-tertiary': '#71717a',
  '--border': '#27272a',
  '--shadow-soft': '0 0 0 1px rgba(255, 255, 255, 0.06), 0 2px 12px rgba(0, 0, 0, 0.4)',
  '--shadow-medium': '0 8px 30px rgba(0, 0, 0, 0.55)',
};

export function estiloTema(tema: 'light' | 'dark'): CSSProperties {
  return (tema === 'light' ? LIGHT : DARK) as CSSProperties;
}
