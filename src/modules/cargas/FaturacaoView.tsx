import { useState } from 'react';
import { useFaturacao } from './useFaturacao';
import { ClienteDetalheModal } from './ClienteDetalheModal';
import type { ResumoCliente } from '@/types';

interface FaturacaoViewProps {
  contentorId: string | null;
}

function formatValor(valor: number): string {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(valor);
}

export function FaturacaoView({ contentorId }: FaturacaoViewProps): React.JSX.Element {
  const { clientes, loading, escopoTodos, setEscopoTodos, soComDivida, setSoComDivida, refresh } =
    useFaturacao(contentorId);
  const [selected, setSelected] = useState<ResumoCliente | null>(null);

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-3 border-b border-border px-lg py-2">
        <div className="inline-flex items-center gap-0.5 rounded-control bg-bg-input p-0.5">
          <button
            type="button"
            onClick={() => setEscopoTodos(false)}
            className={`rounded-[6px] px-3 py-1 text-[12px] font-medium transition-colors ${
              !escopoTodos ? 'bg-primary/10 text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Este contentor
          </button>
          <button
            type="button"
            onClick={() => setEscopoTodos(true)}
            className={`rounded-[6px] px-3 py-1 text-[12px] font-medium transition-colors ${
              escopoTodos ? 'bg-primary/10 text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Todos
          </button>
        </div>

        <div className="inline-flex items-center gap-0.5 rounded-control bg-bg-input p-0.5">
          <button
            type="button"
            onClick={() => setSoComDivida(true)}
            className={`rounded-[6px] px-3 py-1 text-[12px] font-medium transition-colors ${
              soComDivida ? 'bg-primary/10 text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Só com dívida
          </button>
          <button
            type="button"
            onClick={() => setSoComDivida(false)}
            className={`rounded-[6px] px-3 py-1 text-[12px] font-medium transition-colors ${
              !soComDivida ? 'bg-primary/10 text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Todos os clientes
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex h-full items-center justify-center text-[13px] text-text-tertiary">A carregar...</div>
        ) : clientes.length === 0 ? (
          <div className="flex h-full items-center justify-center text-[13px] text-text-tertiary">
            Nenhum cliente encontrado.
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="grid grid-cols-[1fr_100px_110px_110px] border-b border-border bg-bg-app px-lg py-2 text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
              <span>Cliente</span>
              <span>Nº Cargas</span>
              <span>Devido</span>
              <span>Pago</span>
            </div>
            {clientes.map((cliente) => (
              <button
                key={cliente.contactoId}
                type="button"
                onClick={() => setSelected(cliente)}
                className="grid grid-cols-[1fr_100px_110px_110px] items-center border-b border-border px-lg py-2.5 text-left text-[13px] text-text-primary transition-colors hover:bg-bg-app"
              >
                <span className="truncate">{cliente.nome}</span>
                <span className="text-text-secondary">{cliente.totalCargas}</span>
                <span className={cliente.valorDevido > 0 ? 'font-medium text-warning' : 'text-text-secondary'}>
                  {formatValor(cliente.valorDevido)}
                </span>
                <span className="text-text-secondary">{formatValor(cliente.valorPago)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <ClienteDetalheModal
        open={selected != null}
        onClose={() => setSelected(null)}
        cliente={selected}
        contentorId={contentorId}
        escopoTodos={escopoTodos}
        onDataChanged={refresh}
      />
    </div>
  );
}
