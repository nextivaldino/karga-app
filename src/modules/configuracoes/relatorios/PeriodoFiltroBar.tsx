import type { Agrupamento } from '@/types';

interface PeriodoFiltroBarProps {
  dataInicio: string;
  dataFim: string;
  onChangeDataInicio: (v: string) => void;
  onChangeDataFim: (v: string) => void;
  agrupamento?: Agrupamento;
  onChangeAgrupamento?: (v: Agrupamento) => void;
}

export function PeriodoFiltroBar({
  dataInicio,
  dataFim,
  onChangeDataInicio,
  onChangeDataFim,
  agrupamento,
  onChangeAgrupamento,
}: PeriodoFiltroBarProps): React.JSX.Element {
  return (
    <div className="flex items-end gap-3">
      <label className="flex flex-col gap-1 text-[12px] text-text-secondary">
        Data Início
        <input
          type="date"
          value={dataInicio}
          onChange={(e) => onChangeDataInicio(e.target.value)}
          className="rounded-control border border-border bg-bg-input px-2 py-1.5 text-[13px] text-text-primary outline-none focus:border-primary"
        />
      </label>
      <label className="flex flex-col gap-1 text-[12px] text-text-secondary">
        Data Fim
        <input
          type="date"
          value={dataFim}
          onChange={(e) => onChangeDataFim(e.target.value)}
          className="rounded-control border border-border bg-bg-input px-2 py-1.5 text-[13px] text-text-primary outline-none focus:border-primary"
        />
      </label>
      {agrupamento && onChangeAgrupamento ? (
        <label className="flex flex-col gap-1 text-[12px] text-text-secondary">
          Agrupar por
          <select
            value={agrupamento}
            onChange={(e) => onChangeAgrupamento(e.target.value as Agrupamento)}
            className="rounded-control border border-border bg-bg-input px-2 py-1.5 text-[13px] text-text-primary outline-none focus:border-primary"
          >
            <option value="dia">Dia</option>
            <option value="semana">Semana</option>
            <option value="mes">Mês</option>
          </select>
        </label>
      ) : null}
    </div>
  );
}
