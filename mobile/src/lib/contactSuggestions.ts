// Sugestões de nomes (emissor/recetor e, agora, também nome da carga)
// guardadas localmente — mera conveniência de preenchimento, nunca fonte
// de verdade (o PWA não tem acesso à tabela `contactos` do Desktop, doc
// 17 §6, nem ao "aprender dimensões" que só existe lá).
const STORAGE_KEY_NOMES = 'kraga_mobile_sugestoes_nomes';
const STORAGE_KEY_CARGAS = 'kraga_mobile_sugestoes_cargas';
const LIMITE = 30;

function ler(chave: string): string[] {
  try {
    const raw = localStorage.getItem(chave);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function guardar(chave: string, nome: string): void {
  const limpo = nome.trim();
  if (!limpo) return;
  const atuais = ler(chave).filter((n) => n.toLowerCase() !== limpo.toLowerCase());
  const novas = [limpo, ...atuais].slice(0, LIMITE);
  localStorage.setItem(chave, JSON.stringify(novas));
}

export function listarSugestoesNomes(): string[] {
  return ler(STORAGE_KEY_NOMES);
}

export function guardarSugestaoNome(nome: string): void {
  guardar(STORAGE_KEY_NOMES, nome);
}

export function listarSugestoesCargas(): string[] {
  return ler(STORAGE_KEY_CARGAS);
}

export function guardarSugestaoCarga(nome: string): void {
  guardar(STORAGE_KEY_CARGAS, nome);
}
