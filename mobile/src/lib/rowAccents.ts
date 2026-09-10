// Faixa de cor à esquerda de cada linha da lista de cargas (estilo Trello:
// cada cartão/linha ganha um toque de cor para se distinguir das vizinhas).
// Paleta inspirada no Kraga Desktop — as mesmas 4 cores semânticas usadas
// lá para o mesmo efeito (`ROW_TINTS` em `CargasList.tsx`: primary,
// success, warning, purple), aqui como hex fixo por tema (claro/escuro)
// porque, ao contrário do desktop, precisamos de escurecer a cor em JS
// para o texto (`corAcentoEscura`) — não dá para escurecer uma
// `var(--color-x)` sem a resolver primeiro.
const PALETA_ACENTOS: Record<'light' | 'dark', string[]> = {
  light: ['#3584e4', '#2ec27e', '#e5a50a', '#9141ac'],
  dark: ['#7f9fc4', '#7bc99a', '#e0c96a', '#a878b0'],
};

export function corAcento(index: number, tema: 'light' | 'dark' = 'light'): string {
  const paleta = PALETA_ACENTOS[tema];
  return paleta[index % paleta.length] ?? paleta[0]!;
}

// Para blocos de cor cheia (não só um tint a 5-15%) — a cor de acento
// crua nem sempre dá contraste suficiente com texto preto OU branco fixo,
// por isso calculamos a luminância percetual e escolhemos o que se lê
// melhor. Fórmula standard (ITU-R BT.601) é suficiente aqui — não é uma
// verificação WCAG rigorosa, só uma escolha binária preto/branco.
export function corTextoSobre(hex: string): string {
  const limpo = hex.replace('#', '');
  const r = parseInt(limpo.slice(0, 2), 16);
  const g = parseInt(limpo.slice(2, 4), 16);
  const b = parseInt(limpo.slice(4, 6), 16);
  const luminancia = (r * 299 + g * 587 + b * 114) / 1000;
  return luminancia > 150 ? '#0b0b0c' : '#ffffff';
}

// Versão mais leve de uma cor de acento — mistura-a com branco. Usada na
// lista de Cargas: continua a ser um preenchimento sólido e contíguo (sem
// cinzento neutro a separar grupos), mas menos intensa que a cor crua —
// mais fácil de ler numa lista densa que se passa muito tempo a olhar,
// sem perder a identidade de cor por contacto.
export function corSuave(hex: string, mistura = 0.5): string {
  const limpo = hex.replace('#', '');
  const r = parseInt(limpo.slice(0, 2), 16);
  const g = parseInt(limpo.slice(2, 4), 16);
  const b = parseInt(limpo.slice(4, 6), 16);
  const misturar = (c: number) => Math.round(c + (255 - c) * mistura);
  const paraHex = (c: number) => c.toString(16).padStart(2, '0');
  return `#${paraHex(misturar(r))}${paraHex(misturar(g))}${paraHex(misturar(b))}`;
}
