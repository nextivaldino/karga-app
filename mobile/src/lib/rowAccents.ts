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

// Versão de contraste da cor de acento — em tema claro escurece (sobre um
// fundo tingido com a mesma cor a baixa opacidade, um tom escuro lê-se
// melhor do que a cor "crua"); em tema escuro faz o oposto e aclara,
// porque escurecer uma cor já pensada para fundo escuro deixava-a
// baça/ilegível em vez de clara.
export function corAcentoEscura(index: number, tema: 'light' | 'dark' = 'light'): string {
  const hex = corAcento(index, tema).replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  if (tema === 'dark') {
    const clarear = (c: number) => Math.round(c + (255 - c) * 0.4);
    return `rgb(${clarear(r)}, ${clarear(g)}, ${clarear(b)})`;
  }
  const escurecer = (c: number) => Math.round(c * 0.6);
  return `rgb(${escurecer(r)}, ${escurecer(g)}, ${escurecer(b)})`;
}
