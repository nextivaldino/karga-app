import { useEffect, useState } from 'react';
import { toast } from '@/components/ui/Toast';
import { cleanIpcError } from '@/lib/cleanIpcError';
import { ipcService } from '@/services/ipcService';
import type { Contentor, RevisaoCargaPendente } from '@/types';

function temConflito(r: RevisaoCargaPendente): boolean {
  return r.sugestoes.some((s) => s.sugestaoId != null && !s.automatico);
}

type ItemStatus = 'pendente' | 'ok' | 'erro';

export interface ItemImportacao {
  id: string;
  nome: string;
  status: ItemStatus;
  erro?: string;
}

export interface Importacao {
  contentorLabel: string;
  itens: ItemImportacao[];
}

export interface UtilizadorContribuinte {
  nome: string;
  userId: string;
  count: number;
}

// Lógica partilhada por qualquer superfície de "sincronização rápida"
// (card compacto nas barras de Home/Cargas/Contentores, barra "pro" da
// página Sync) — um só sítio a saber ler `listPendentesComSugestoes`,
// agrupar por utilizador PWA e importar em massa, para as duas UIs
// nunca divergirem no que realmente significa "sincronizar".
export function useSincronizacaoRapida(
  contentoresAbertos: Contentor[],
  selectedContentorId: string | null,
  onImported?: () => void,
) {
  const [revisao, setRevisao] = useState<RevisaoCargaPendente[] | null>(null);
  const [importacao, setImportacao] = useState<Importacao | null>(null);
  const [msgIndex, setMsgIndex] = useState(0);

  async function carregar(): Promise<void> {
    try {
      const dados = await ipcService.sync.listPendentesComSugestoes();
      setRevisao(dados);
    } catch {
      setRevisao((atual) => atual ?? []);
    }
  }

  useEffect(() => {
    void carregar();
    const interval = setInterval(() => void carregar(), 60_000);
    return () => clearInterval(interval);
  }, []);

  const total = revisao?.length ?? 0;
  const semConflito = (revisao ?? []).filter((r) => !temConflito(r));
  const comConflito = total - semConflito.length;

  const porUtilizador = new Map<string, UtilizadorContribuinte>();
  for (const r of semConflito) {
    const chave = r.pendente.inseridoPorUserId || r.pendente.inseridoPorNome;
    const atual = porUtilizador.get(chave);
    if (atual) atual.count += 1;
    else porUtilizador.set(chave, { nome: r.pendente.inseridoPorNome, userId: r.pendente.inseridoPorUserId, count: 1 });
  }
  const utilizadores = [...porUtilizador.values()];
  const count = semConflito.length;

  const mensagensRotativas =
    utilizadores.length > 0
      ? utilizadores.map((u) => `${u.count} carga${u.count === 1 ? '' : 's'} de ${u.nome}`)
      : [`${count} carga${count === 1 ? '' : 's'} nova${count === 1 ? '' : 's'}`];
  const mensagemAtual = mensagensRotativas[msgIndex % mensagensRotativas.length]!;

  useEffect(() => {
    if (mensagensRotativas.length <= 1) return;
    const interval = setInterval(() => setMsgIndex((i) => (i + 1) % mensagensRotativas.length), 3200);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mensagensRotativas.length]);

  // Contentores bloqueados nunca são alvo de sincronização.
  const contentoresDisponiveis = contentoresAbertos.filter((c) => !c.bloqueado);
  const selecionado = contentoresDisponiveis.find((c) => c.id === selectedContentorId) ?? null;

  async function handleSincronizarEm(contentor: Contentor, itensOverride?: RevisaoCargaPendente[]): Promise<void> {
    const itens = itensOverride ?? semConflito;
    setImportacao({
      contentorLabel: contentor.nome,
      itens: itens.map((r) => ({ id: r.pendente.id, nome: r.pendente.nomeCarga, status: 'pendente' })),
    });

    let falhasCount = 0;
    for (const r of itens) {
      const sugEmissor = r.sugestoes.find((s) => s.campo === 'emissor');
      const sugRecetor = r.sugestoes.find((s) => s.campo === 'recetor');
      try {
        await ipcService.sync.importarCarga({
          pendenteId: r.pendente.id,
          contentorId: contentor.id,
          emissorId: sugEmissor?.sugestaoId ?? null,
          recetorId: sugRecetor?.sugestaoId ?? null,
          nome: r.pendente.nomeCarga,
          comprimentoCm: r.pendente.comprimentoCm,
          larguraCm: r.pendente.larguraCm,
          alturaCm: r.pendente.alturaCm,
          pesoKg: r.pendente.pesoKg,
          valor: r.pendente.valor,
          pago: r.pendente.pago,
        });
        setImportacao((p) =>
          p ? { ...p, itens: p.itens.map((it) => (it.id === r.pendente.id ? { ...it, status: 'ok' } : it)) } : p,
        );
      } catch (err) {
        falhasCount += 1;
        const erro = cleanIpcError(err);
        setImportacao((p) =>
          p ? { ...p, itens: p.itens.map((it) => (it.id === r.pendente.id ? { ...it, status: 'erro', erro } : it)) } : p,
        );
      }
    }

    const sucesso = itens.length - falhasCount;
    if (falhasCount === 0) {
      toast.success(`${sucesso} carga${sucesso === 1 ? '' : 's'} importada${sucesso === 1 ? '' : 's'}.`);
    } else {
      toast.warning(`${sucesso} importada${sucesso === 1 ? '' : 's'}, ${falhasCount} falharam.`);
    }
    onImported?.();
    await carregar();
    setTimeout(() => setImportacao(null), 1800);
  }

  return {
    total,
    semConflito,
    comConflito,
    utilizadores,
    count,
    mensagemAtual,
    msgIndex,
    importacao,
    contentoresDisponiveis,
    selecionado,
    handleSincronizarEm,
  };
}
