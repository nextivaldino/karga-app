import { useEffect, useState } from 'react';
import { useNovaCargaOverlay } from '@/hooks/useNovaCargaOverlay';
import { toast } from '@/components/ui/Toast';
import { listContentoresDisponiveis, listMinhasCargasPendentes } from '@/lib/data';
import type { CargaPendente, ContentorDisponivel, EstadoCargaPendente } from '@/types';

const ESTADO_LABEL: Record<EstadoCargaPendente, string> = { pendente: 'Pendente', importada: 'Importada', rejeitada: 'Rejeitada' };
const ESTADO_CLASS: Record<EstadoCargaPendente, string> = {
  pendente: 'bg-warning/10 text-warning',
  importada: 'bg-success/10 text-success',
  rejeitada: 'bg-error/10 text-error',
};

export function CargasPage(): React.JSX.Element {
  const { abrir } = useNovaCargaOverlay();
  const [contentores, setContentores] = useState<ContentorDisponivel[]>([]);
  const [cargas, setCargas] = useState<CargaPendente[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<EstadoCargaPendente | 'todas'>('todas');

  useEffect(() => {
    listContentoresDisponiveis()
      .then(setContentores)
      .catch((err: unknown) => toast.error(err instanceof Error ? err.message : 'Falha ao carregar contentores.'));
  }, []);

  useEffect(() => {
    setLoading(true);
    listMinhasCargasPendentes()
      .then(setCargas)
      .catch((err: unknown) => toast.error(err instanceof Error ? err.message : 'Falha ao carregar cargas.'))
      .finally(() => setLoading(false));
  }, []);

  const filtradas = filtro === 'todas' ? cargas : cargas.filter((c) => c.estado === filtro);

  return (
    <div className="flex flex-col gap-3 p-4">
      <h1 className="text-[20px] font-semibold text-text-primary">Cargas</h1>

      <div className="flex gap-2 overflow-x-auto">
        {(['todas', 'pendente', 'importada', 'rejeitada'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFiltro(f)}
            className={`min-h-touch shrink-0 rounded-pill px-4 text-[14px] font-medium ${
              filtro === f ? 'bg-primary text-white' : 'bg-bg-surface text-text-secondary'
            }`}
          >
            {f === 'todas' ? 'Todas' : ESTADO_LABEL[f]}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-[14px] text-text-tertiary">A carregar...</p>
      ) : filtradas.length === 0 ? (
        <p className="text-[14px] text-text-tertiary">Nenhuma carga aqui.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {filtradas.map((c) => {
            const contentor = contentores.find((ct) => ct.id === c.contentorId);
            return (
              <div key={c.id} className="rounded-control border border-border bg-bg-surface p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[15px] font-medium text-text-primary">{c.nomeCarga}</span>
                  <span className={`shrink-0 rounded-pill px-2 py-0.5 text-[11px] font-medium ${ESTADO_CLASS[c.estado]}`}>
                    {ESTADO_LABEL[c.estado]}
                  </span>
                </div>
                <p className="text-[13px] text-text-tertiary">
                  {contentor?.codigo ?? '—'} · {c.emissorNome} → {c.recetorNome}
                </p>
                {c.estado === 'rejeitada' ? (
                  <>
                    {c.motivoRejeicao ? <p className="mt-1 text-[13px] text-error">Motivo: {c.motivoRejeicao}</p> : null}
                    <button
                      type="button"
                      onClick={() =>
                        abrir({
                          contentorId: c.contentorId,
                          emissorNome: c.emissorNome,
                          emissorTelefone: c.emissorTelefone,
                          emissorEmail: c.emissorEmail,
                          recetorNome: c.recetorNome,
                          recetorTelefone: c.recetorTelefone,
                          nomeCarga: c.nomeCarga,
                          comprimentoCm: c.comprimentoCm,
                          larguraCm: c.larguraCm,
                          alturaCm: c.alturaCm,
                          pesoKg: c.pesoKg,
                          valor: c.valor,
                          pago: c.pago,
                          notas: c.notas,
                        })
                      }
                      className="mt-2 min-h-touch w-fit rounded-control border border-primary px-3 text-[13px] font-medium text-primary active:bg-primary-light"
                    >
                      Reenviar corrigida
                    </button>
                  </>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
