import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { cleanIpcError } from '@/lib/cleanIpcError';
import { ipcService } from '@/services/ipcService';
import { RevisarCargaPendenteModal } from './RevisarCargaPendenteModal';
import type { CargaPendente } from '@/types';

function formatData(iso: string): string {
  return new Intl.DateTimeFormat('pt-PT', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));
}

export function SincronizacaoView(): React.JSX.Element {
  const [pendentes, setPendentes] = useState<CargaPendente[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [revisando, setRevisando] = useState<string | null>(null);

  async function carregar(): Promise<void> {
    setLoading(true);
    setErro(null);
    try {
      const dados = await ipcService.sync.listPendentes();
      setPendentes(dados);
    } catch (err) {
      setErro(cleanIpcError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void carregar();
  }, []);

  const porUtilizador = new Map<string, { nome: string; itens: CargaPendente[] }>();
  for (const p of pendentes) {
    const atual = porUtilizador.get(p.inseridoPorUserId) ?? { nome: p.inseridoPorNome, itens: [] };
    atual.itens.push(p);
    porUtilizador.set(p.inseridoPorUserId, atual);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-text-primary">Cargas Pendentes de Revisão (PWA)</h2>
        <button
          type="button"
          onClick={() => void carregar()}
          className="flex items-center gap-1.5 rounded-control px-2.5 py-1.5 text-[12px] font-medium text-text-secondary transition-colors hover:bg-bg-app"
        >
          <RefreshCw size={14} /> Atualizar
        </button>
      </div>

      {erro ? (
        <p className="text-[13px] text-error">{erro}</p>
      ) : loading ? (
        <p className="text-[13px] text-text-tertiary">A carregar...</p>
      ) : pendentes.length === 0 ? (
        <p className="text-[13px] text-text-tertiary">Não há cargas pendentes de revisão.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {[...porUtilizador.entries()].map(([userId, grupo]) => (
            <div key={userId} className="rounded-surface border border-border bg-bg-surface">
              <div className="border-b border-border px-4 py-2">
                <span className="text-[13px] font-medium text-text-primary">{grupo.nome}</span>
                <span className="ml-2 text-[12px] text-text-tertiary">
                  {grupo.itens.length} carga{grupo.itens.length === 1 ? '' : 's'}
                </span>
              </div>
              <div className="flex flex-col">
                {grupo.itens.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setRevisando(p.id)}
                    className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5 text-left last:border-b-0 transition-colors hover:bg-bg-app"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[13px] text-text-primary">{p.nomeCarga}</p>
                      <p className="truncate text-[12px] text-text-tertiary">
                        {p.emissorNome} → {p.recetorNome}
                      </p>
                    </div>
                    <span className="shrink-0 text-[11px] text-text-tertiary">{formatData(p.createdAt)}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <RevisarCargaPendenteModal
        open={revisando != null}
        onClose={() => setRevisando(null)}
        pendenteId={revisando}
        onDone={() => void carregar()}
      />
    </div>
  );
}
