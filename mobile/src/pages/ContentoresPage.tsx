import { useEffect, useState } from 'react';
import { ArrowLeft, Package } from 'lucide-react';
import { useNavigation } from '@/hooks/useNavigation';
import { listContentoresDisponiveis, listMinhasCargasPendentes } from '@/lib/data';
import { toast } from '@/components/ui/Toast';
import type { CargaPendente, ContentorDisponivel, EstadoCargaPendente } from '@/types';

const ESTADO_LABEL: Record<EstadoCargaPendente, string> = {
  pendente: 'Pendente',
  importada: 'Importada',
  rejeitada: 'Rejeitada',
};

const ESTADO_CLASS: Record<EstadoCargaPendente, string> = {
  pendente: 'bg-warning/10 text-warning',
  importada: 'bg-success/10 text-success',
  rejeitada: 'bg-error/10 text-error',
};

function ContentorDetalhe({ contentor, onVoltar }: { contentor: ContentorDisponivel; onVoltar: () => void }): React.JSX.Element {
  const [cargas, setCargas] = useState<CargaPendente[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelado = false;
    setLoading(true);
    listMinhasCargasPendentes(contentor.id)
      .then((items) => {
        if (!cancelado) setCargas(items);
      })
      .catch((err: unknown) => toast.error(err instanceof Error ? err.message : 'Falha ao carregar cargas.'))
      .finally(() => {
        if (!cancelado) setLoading(false);
      });
    return () => {
      cancelado = true;
    };
  }, [contentor.id]);

  return (
    <div className="flex flex-col gap-4 p-4">
      <button type="button" onClick={onVoltar} className="flex min-h-touch w-fit items-center gap-1.5 text-[15px] font-medium text-primary">
        <ArrowLeft size={18} /> Contentores
      </button>

      <div>
        <h1 className="text-[20px] font-semibold text-text-primary">{contentor.codigo}</h1>
        <p className="text-[14px] text-text-tertiary">{contentor.nome}</p>
      </div>

      <div>
        <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-text-tertiary">As Minhas Cargas Aqui</h2>
        {loading ? (
          <p className="text-[14px] text-text-tertiary">A carregar...</p>
        ) : cargas.length === 0 ? (
          <p className="text-[14px] text-text-tertiary">Ainda não inseriu cargas neste contentor.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {cargas.map((c) => (
              <div key={c.id} className="rounded-control border border-border bg-bg-surface p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[15px] font-medium text-text-primary">{c.nomeCarga}</span>
                  <span className={`shrink-0 rounded-pill px-2 py-0.5 text-[11px] font-medium ${ESTADO_CLASS[c.estado]}`}>
                    {ESTADO_LABEL[c.estado]}
                  </span>
                </div>
                <p className="text-[13px] text-text-tertiary">
                  {c.emissorNome} → {c.recetorNome}
                </p>
                {c.estado === 'rejeitada' && c.motivoRejeicao ? (
                  <p className="mt-1 text-[13px] text-error">Motivo: {c.motivoRejeicao}</p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function ContentoresPage(): React.JSX.Element {
  const { params } = useNavigation();
  const [contentores, setContentores] = useState<ContentorDisponivel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecionado, setSelecionado] = useState<ContentorDisponivel | null>(null);

  useEffect(() => {
    let cancelado = false;
    listContentoresDisponiveis()
      .then((items) => {
        if (cancelado) return;
        setContentores(items);
        if (params?.contentorId) {
          const alvo = items.find((c) => c.id === params.contentorId);
          if (alvo) setSelecionado(alvo);
        }
      })
      .catch((err: unknown) => toast.error(err instanceof Error ? err.message : 'Falha ao carregar contentores.'))
      .finally(() => {
        if (!cancelado) setLoading(false);
      });
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.contentorId]);

  if (selecionado) {
    return <ContentorDetalhe contentor={selecionado} onVoltar={() => setSelecionado(null)} />;
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      <h1 className="text-[20px] font-semibold text-text-primary">Contentores</h1>
      {loading ? (
        <p className="text-[14px] text-text-tertiary">A carregar...</p>
      ) : contentores.length === 0 ? (
        <p className="text-[14px] text-text-tertiary">Nenhum contentor disponível de momento.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {contentores.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelecionado(c)}
              className="flex min-h-touch flex-col items-start gap-2 rounded-surface border border-border bg-bg-surface p-4 text-left active:bg-bg-app"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-control bg-primary/10 text-primary">
                <Package size={20} />
              </span>
              <span className="text-[15px] font-medium text-text-primary">{c.codigo}</span>
              <span className="truncate text-[13px] text-text-tertiary">{c.nome}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
