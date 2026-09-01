function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dist: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dist[i]![0] = i;
  for (let j = 0; j <= n; j++) dist[0]![j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const custo = a[i - 1] === b[j - 1] ? 0 : 1;
      dist[i]![j] = Math.min(dist[i - 1]![j]! + 1, dist[i]![j - 1]! + 1, dist[i - 1]![j - 1]! + custo);
    }
  }

  return dist[m]![n]!;
}

interface ContactoBasico {
  id: string;
  nome: string;
}

export type ResultadoSugestao =
  | { tipo: 'exato'; contacto: ContactoBasico }
  | { tipo: 'parecido'; contacto: ContactoBasico }
  | { tipo: 'nenhum' };

// Compara o nome dado contra os contactos existentes:
// - "exato" (igual após normalizar acentos/maiúsculas) — mesma pessoa,
//   associa-se sem perguntar nada ao Admin.
// - "parecido" (dentro do limiar de distância de edição, mas não igual) —
//   pode ser a mesma pessoa com erro de escrita, ou pode não ser — pede
//   decisão humana (doc 16 §4).
// - "nenhum" — sem candidato plausível, cria-se um contacto novo.
export function sugerirContacto(nome: string, contactos: ContactoBasico[]): ResultadoSugestao {
  const alvo = normalizar(nome);
  if (!alvo) return { tipo: 'nenhum' };

  let melhor: { contacto: ContactoBasico; distancia: number } | null = null;

  for (const contacto of contactos) {
    const candidato = normalizar(contacto.nome);
    if (candidato === alvo) return { tipo: 'exato', contacto };
    const distancia = levenshtein(alvo, candidato);
    const limiar = Math.max(2, Math.floor(Math.max(alvo.length, candidato.length) * 0.3));
    if (distancia <= limiar && (!melhor || distancia < melhor.distancia)) {
      melhor = { contacto, distancia };
    }
  }

  return melhor ? { tipo: 'parecido', contacto: melhor.contacto } : { tipo: 'nenhum' };
}

export function nomesIguais(a: string, b: string): boolean {
  return normalizar(a) === normalizar(b);
}
