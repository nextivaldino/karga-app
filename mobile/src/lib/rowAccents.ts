// Faixa de cor à esquerda de cada linha da lista de cargas (estilo Trello:
// cada cartão/linha ganha um toque de cor para se distinguir das vizinhas).
// Deliberadamente à parte das cores semânticas do sistema (primary=emissor,
// success=recetor, error/warning=estado) para não confundir significados —
// aqui a cor não tem significado, só serve de destaque visual por linha.
const PALETA_ACENTOS = ['#f97316', '#6366f1', '#ec4899', '#14b8a6', '#eab308', '#8b5cf6'];

export function corAcento(index: number): string {
  return PALETA_ACENTOS[index % PALETA_ACENTOS.length] ?? '#6366f1';
}

// Versão escurecida da cor de acento — usada no texto (sobre um fundo já
// tingido com a mesma cor a baixa opacidade, um tom escuro lê-se melhor
// do que a cor "crua", mais vibrante, pensada para a barra lateral).
export function corAcentoEscura(index: number): string {
  const hex = corAcento(index).replace('#', '');
  const r = Math.round(parseInt(hex.slice(0, 2), 16) * 0.6);
  const g = Math.round(parseInt(hex.slice(2, 4), 16) * 0.6);
  const b = Math.round(parseInt(hex.slice(4, 6), 16) * 0.6);
  return `rgb(${r}, ${g}, ${b})`;
}
