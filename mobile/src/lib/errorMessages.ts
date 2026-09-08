import type { TipoErroFila } from '@/types';

interface ClassificacaoErro {
  mensagem: string;
  tipo: TipoErroFila;
}

// Traduz erros técnicos em mensagens claras para o funcionário de campo
// (doc 19 §6) e classifica se vale a pena tentar sozinho outra vez
// (transitório) ou se precisa mesmo de ação humana (permanente) — usado
// pela fila offline para decidir o que retentar automaticamente.
export function classificarErro(err: unknown): ClassificacaoErro {
  const bruto = err instanceof Error ? err.message : String(err);
  const texto = bruto.toLowerCase();

  if (texto.includes('fetch failed') || texto.includes('network') || texto.includes('failed to fetch')) {
    return { mensagem: 'Sem ligação. Vamos tentar de novo assim que voltares a ficar online.', tipo: 'transitorio' };
  }
  if (texto.includes('jwt') || texto.includes('session') || texto.includes('sessão') || texto.includes('token')) {
    return { mensagem: 'A tua sessão expirou. Inicia sessão novamente.', tipo: 'permanente' };
  }
  if (texto.includes('posto') || texto.includes('row-level security') || texto.includes('rls') || texto.includes('violates row-level')) {
    return { mensagem: 'Este utilizador não está associado a um Posto ativo. Contacta o administrador.', tipo: 'permanente' };
  }
  if (texto.includes('contentor') && (texto.includes('not found') || texto.includes('não encontrado') || texto.includes('foreign key'))) {
    return { mensagem: 'Este contentor já não está disponível. Escolhe outro.', tipo: 'permanente' };
  }
  // Desconhecido — tratado como transitório (a maioria das falhas de
  // campo são mesmo picos de ligação), mas com tentativas limitadas via
  // backoff em vez de repetir para sempre às cegas.
  return { mensagem: 'Algo correu mal ao enviar esta carga. Toca para tentar novamente.', tipo: 'transitorio' };
}
