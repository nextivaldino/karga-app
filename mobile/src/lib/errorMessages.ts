// Traduz erros técnicos em mensagens claras para o funcionário de campo
// (doc 19 §6 — tabela de mensagens de erro).
export function mensagemErroAmigavel(err: unknown): string {
  const bruto = err instanceof Error ? err.message : String(err);
  const texto = bruto.toLowerCase();

  if (texto.includes('fetch failed') || texto.includes('network') || texto.includes('failed to fetch')) {
    return 'Sem ligação. Vamos tentar de novo assim que voltares a ficar online.';
  }
  if (texto.includes('jwt') || texto.includes('session') || texto.includes('sessão') || texto.includes('token')) {
    return 'A tua sessão expirou. Inicia sessão novamente.';
  }
  if (texto.includes('contentor') && (texto.includes('not found') || texto.includes('não encontrado') || texto.includes('foreign key'))) {
    return 'Este contentor já não está disponível. Escolhe outro.';
  }
  return 'Algo correu mal ao enviar esta carga. Toca para tentar novamente.';
}
