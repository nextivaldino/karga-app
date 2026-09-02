// Faixa de cor à esquerda de cada linha da lista de cargas (estilo Trello:
// cada cartão/linha ganha um toque de cor para se distinguir das vizinhas).
// Deliberadamente à parte das cores semânticas do sistema (primary=emissor,
// success=recetor, error/warning=estado) para não confundir significados —
// aqui a cor não tem significado, só serve de destaque visual por linha.
const PALETA_ACENTOS = ['#f97316', '#6366f1', '#ec4899', '#14b8a6', '#eab308', '#8b5cf6'];

export function corAcento(index: number): string {
  return PALETA_ACENTOS[index % PALETA_ACENTOS.length] ?? '#6366f1';
}
