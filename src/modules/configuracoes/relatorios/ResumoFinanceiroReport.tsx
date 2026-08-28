import { useEffect, useState } from 'react';
import { toast } from '@/components/ui/Toast';
import { cleanIpcError } from '@/lib/cleanIpcError';
import { formatMoeda } from '@/lib/formatMoeda';
import { ipcService } from '@/services/ipcService';
import { PeriodoFiltroBar } from './PeriodoFiltroBar';
import { RelatorioTable } from './RelatorioTable';
import type { ColunaExportacao, RelatorioResumoFinanceiroLinha } from '@/types';

function primeiroDiaDoAno(): string {
  return `${new Date().getFullYear()}-01-01`;
}

function hoje(): string {
  return new Date().toISOString().slice(0, 10);
}

const COLUNAS_EXPORTACAO: ColunaExportacao[] = [
  { header: 'Período', key: 'periodo' },
  { header: 'Valor Total', key: 'valorTotal' },
  { header: 'Valor Pago', key: 'valorPago' },
  { header: 'Valor Devido', key: 'valorDevido' },
];

export function ResumoFinanceiroReport(): React.JSX.Element {
  const [dataInicio, setDataInicio] = useState(primeiroDiaDoAno());
  const [dataFim, setDataFim] = useState(hoje());
  const [linhas, setLinhas] = useState<RelatorioResumoFinanceiroLinha[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportando, setExportando] = useState(false);

  useEffect(() => {
    setLoading(true);
    void ipcService.relatorios
      .resumoFinanceiro({ dataInicio, dataFim })
      .then(setLinhas)
      .finally(() => setLoading(false));
  }, [dataInicio, dataFim]);

  const totalGeral = linhas.reduce((s, l) => s + l.valorTotal, 0);
  const totalPago = linhas.reduce((s, l) => s + l.valorPago, 0);
  const totalDevido = linhas.reduce((s, l) => s + l.valorDevido, 0);

  async function handleExportar(formato: 'excel' | 'pdf'): Promise<void> {
    setExportando(true);
    try {
      const linhasFormatadas = linhas.map((l) => ({
        periodo: l.periodo,
        valorTotal: formatMoeda(l.valorTotal),
        valorPago: formatMoeda(l.valorPago),
        valorDevido: formatMoeda(l.valorDevido),
      }));
      const ext = formato === 'excel' ? 'xlsx' : 'pdf';
      const fileName = `Relatorio-Resumo-Financeiro-${Date.now()}.${ext}`;
      const result = await ipcService.relatorios.exportar(formato, 'Resumo Financeiro', COLUNAS_EXPORTACAO, linhasFormatadas, fileName);
      toast.success(`Relatório guardado em: ${result.path}`);
    } catch (err) {
      toast.error(cleanIpcError(err));
    } finally {
      setExportando(false);
    }
  }

  return (
    <div className="flex flex-col gap-lg">
      <PeriodoFiltroBar dataInicio={dataInicio} dataFim={dataFim} onChangeDataInicio={setDataInicio} onChangeDataFim={setDataFim} />

      <div className="grid grid-cols-3 gap-md">
        <div className="rounded-control border border-border bg-bg-app p-md text-center">
          <div className="text-[18px] font-semibold text-text-primary">{formatMoeda(totalGeral)}</div>
          <div className="text-[11px] text-text-tertiary">Total Geral</div>
        </div>
        <div className="rounded-control border border-border bg-bg-app p-md text-center">
          <div className="text-[18px] font-semibold text-success">{formatMoeda(totalPago)}</div>
          <div className="text-[11px] text-text-tertiary">Total Pago</div>
        </div>
        <div className="rounded-control border border-border bg-bg-app p-md text-center">
          <div className="text-[18px] font-semibold text-warning">{formatMoeda(totalDevido)}</div>
          <div className="text-[11px] text-text-tertiary">Total Devido</div>
        </div>
      </div>

      <RelatorioTable
        colunas={[
          { key: 'periodo', header: 'Mês' },
          { key: 'valorTotal', header: 'Valor Total', render: (v) => formatMoeda(Number(v)) },
          { key: 'valorPago', header: 'Pago', render: (v) => formatMoeda(Number(v)) },
          { key: 'valorDevido', header: 'Devido', render: (v) => formatMoeda(Number(v)) },
        ]}
        linhas={linhas as unknown as Record<string, unknown>[]}
        loading={loading}
        onExportar={handleExportar}
        exportando={exportando}
      />
    </div>
  );
}
