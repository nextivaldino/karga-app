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
  '--color-primary': '#7f9fc4',
  '--color-primary-hover': '#96b3d6',
  '--color-primary-light': 'rgba(127, 159, 196, 0.15)',
  '--color-success': '#7bc99a',
  '--color-error': '#e0836f',
  '--color-warning': '#e0c96a',
  '--color-purple': '#a878b0',
  '--color-primary-rgb': '127 159 196',
  '--color-success-rgb': '123 201 154',
  '--color-error-rgb': '224 131 111',
  '--color-warning-rgb': '224 201 106',
  '--color-purple-rgb': '168 120 176',
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
