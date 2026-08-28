// Sugestões de nomes de emissor/recetor guardadas localmente — mera
// conveniência de preenchimento, nunca fonte de verdade (o PWA não tem
// acesso à tabela `contactos` do Desktop, doc 17 §6).
const STORAGE_KEY = 'kraga_mobile_sugestoes_nomes';
const LIMITE = 30;

function ler(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function listarSugestoesNomes(): string[] {
  return ler();
}

export function guardarSugestaoNome(nome: string): void {
  const limpo = nome.trim();
  if (!limpo) return;
  const atuais = ler().filter((n) => n.toLowerCase() !== limpo.toLowerCase());
  const novas = [limpo, ...atuais].slice(0, LIMITE);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(novas));
}
