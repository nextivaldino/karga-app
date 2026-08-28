import { useState } from 'react';
import { BoxedList, BoxedListRow } from '@/components/ui/BoxedList';
import { CargasPendentesReport } from './relatorios/CargasPendentesReport';
import { CargasPorClienteReport } from './relatorios/CargasPorClienteReport';
import { CargasPorContentorReport } from './relatorios/CargasPorContentorReport';
import { CargasPorPeriodoReport } from './relatorios/CargasPorPeriodoReport';
import { ResumoFinanceiroReport } from './relatorios/ResumoFinanceiroReport';

type Relatorio = 'periodo' | 'contentor' | 'cliente' | 'pendentes' | 'financeiro' | null;

const RELATORIO_TITULO: Record<Exclude<Relatorio, null>, string> = {
  periodo: 'Cargas por Período',
  contentor: 'Cargas por Contentor',
  cliente: 'Cargas por Cliente',
  pendentes: 'Cargas Pendentes',
  financeiro: 'Resumo Financeiro',
};

export function RelatoriosConfig(): React.JSX.Element {
  const [relatorio, setRelatorio] = useState<Relatorio>(null);

  if (relatorio) {
    return (
      <div className="flex-1 overflow-y-auto p-xl">
        <div className="mx-auto flex max-w-[720px] flex-col gap-lg">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setRelatorio(null)}
              className="text-[13px] font-medium text-primary"
            >
              ‹ Relatórios
            </button>
            <span className="text-[13px] font-medium text-text-secondary">/ {RELATORIO_TITULO[relatorio]}</span>
          </div>
          {relatorio === 'periodo' ? <CargasPorPeriodoReport /> : null}
          {relatorio === 'contentor' ? <CargasPorContentorReport /> : null}
          {relatorio === 'cliente' ? <CargasPorClienteReport /> : null}
          {relatorio === 'pendentes' ? <CargasPendentesReport /> : null}
          {relatorio === 'financeiro' ? <ResumoFinanceiroReport /> : null}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-xl">
      <div className="mx-auto max-w-[560px]">
        <BoxedList>
          <BoxedListRow
            title="Cargas por Período"
            subtitle="Totais agrupados por dia, semana ou mês"
            onClick={() => setRelatorio('periodo')}
          />
          <BoxedListRow
            title="Cargas por Contentor"
            subtitle="Lista de contentores com totais no período"
            onClick={() => setRelatorio('contentor')}
          />
          <BoxedListRow
            title="Cargas por Cliente"
            subtitle="Nº de cargas e valor movimentado por cliente"
            onClick={() => setRelatorio('cliente')}
          />
          <BoxedListRow
            title="Cargas Pendentes"
            subtitle="Cargas ainda não entregues nem arquivadas"
            onClick={() => setRelatorio('pendentes')}
          />
          <BoxedListRow
            title="Resumo Financeiro"
            subtitle="Total pago vs. devido no período"
            onClick={() => setRelatorio('financeiro')}
          />
        </BoxedList>
      </div>
    </div>
  );
}
