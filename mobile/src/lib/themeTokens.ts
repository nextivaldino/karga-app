import type { CSSProperties } from 'react';

// Espelha exatamente as variáveis de src/styles/theme.css — usado para
// inverter o tema só numa subárvore (ex: popup Nova Carga) através de
// estilo inline, que tem prioridade garantida sobre qualquer regra CSS
// e herda corretamente para todos os descendentes (menus incluídos).
const LIGHT: Record<string, string> = {
  '--color-primary': '#3584e4',
  '--color-primary-hover': '#1c71d8',
  '--color-primary-light': '#eaf2fc',
  '--color-success': '#2ec27e',
  '--color-error': '#e01b24',
  '--color-warning': '#e5a50a',
  '--color-purple': '#9141ac',
  '--color-primary-rgb': '53 132 228',
  '--color-success-rgb': '46 194 126',
  '--color-error-rgb': '224 27 36',
  '--color-warning-rgb': '229 165 10',
  '--color-purple-rgb': '145 65 172',
  '--bg-app': '#f6f5f4',
  '--bg-surface': '#ffffff',
  '--bg-header': 'rgba(255, 255, 255, 0.8)',
  '--bg-input': '#ffffff',
  '--text-primary': '#241f31',
  '--text-secondary': '#5e5c64',
  '--text-tertiary': '#9a9996',
  '--border': '#deddda',
};

const DARK: Record<string, string> = {
  '--color-primary': '#78aeed',
  '--color-primary-hover': '#97c4f2',
  '--color-primary-light': 'rgba(120, 174, 237, 0.15)',
  '--color-success': '#57e389',
  '--color-error': '#ff7b63',
  '--color-warning': '#f8e45c',
  '--color-purple': '#c061cb',
  '--color-primary-rgb': '120 174 237',
  '--color-success-rgb': '87 227 137',
  '--color-error-rgb': '255 123 99',
  '--color-warning-rgb': '248 228 92',
  '--color-purple-rgb': '192 97 203',
  '--bg-app': '#1e1e1e',
  '--bg-surface': '#2d2d2d',
  '--bg-header': 'rgba(36, 31, 49, 0.8)',
  '--bg-input': '#363636',
  '--text-primary': '#ffffff',
  '--text-secondary': '#c0bfbc',
  '--text-tertiary': '#77767b',
  '--border': 'rgba(255, 255, 255, 0.1)',
};

export function estiloTema(tema: 'light' | 'dark'): CSSProperties {
  return (tema === 'light' ? LIGHT : DARK) as CSSProperties;
}
