import { Download } from '@phosphor-icons/react';

export interface RelatorioColuna {
  key: string;
  header: string;
  render?: (valor: unknown, linha: Record<string, unknown>) => React.ReactNode;
}

interface RelatorioTableProps {
  colunas: RelatorioColuna[];
  linhas: Record<string, unknown>[];
  loading: boolean;
  emptyMessage?: string;
  onExportar: (formato: 'excel' | 'pdf') => void;
  exportando: boolean;
}

export function RelatorioTable({
  colunas,
  linhas,
  loading,
  emptyMessage = 'Sem resultados para os filtros escolhidos.',
  onExportar,
  exportando,
}: RelatorioTableProps): React.JSX.Element {
  return (
    <div className="flex flex-col gap-md">
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-text-tertiary">{linhas.length} linha(s)</p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={exportando || linhas.length === 0}
            onClick={() => onExportar('excel')}
            className="flex items-center gap-1.5 rounded-control border border-border px-3 py-1.5 text-[13px] font-medium text-text-primary transition-colors hover:bg-bg-app disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download size={14} /> Excel
          </button>
          <button
            type="button"
            disabled={exportando || linhas.length === 0}
            onClick={() => onExportar('pdf')}
            className="flex items-center gap-1.5 rounded-control border border-border px-3 py-1.5 text-[13px] font-medium text-text-primary transition-colors hover:bg-bg-app disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download size={14} /> PDF
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-control border border-border">
        <div
          className="grid bg-bg-app px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-tertiary"
          style={{ gridTemplateColumns: `repeat(${colunas.length}, minmax(0, 1fr))` }}
        >
          {colunas.map((c) => (
            <span key={c.key} className="truncate">
              {c.header}
            </span>
          ))}
        </div>
        {loading ? (
          <p className="px-3 py-4 text-[13px] text-text-tertiary">A carregar...</p>
        ) : linhas.length === 0 ? (
          <p className="px-3 py-4 text-[13px] text-text-tertiary">{emptyMessage}</p>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {linhas.map((linha, i) => (
              <div
                key={i}
                className="grid border-t border-border px-3 py-1.5 text-[12px] text-text-primary"
                style={{ gridTemplateColumns: `repeat(${colunas.length}, minmax(0, 1fr))` }}
              >
                {colunas.map((c) => (
                  <span key={c.key} className="truncate">
                    {c.render ? c.render(linha[c.key], linha) : String(linha[c.key] ?? '—')}
                  </span>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
