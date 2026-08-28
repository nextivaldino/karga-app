import { useEffect, useState } from 'react';
import { toast } from '@/components/ui/Toast';
import { cleanIpcError } from '@/lib/cleanIpcError';
import { formatMoeda } from '@/lib/formatMoeda';
import { ipcService } from '@/services/ipcService';
import { PeriodoFiltroBar } from './PeriodoFiltroBar';
import { RelatorioTable } from './RelatorioTable';
import type { Agrupamento, ColunaExportacao, RelatorioCargasPorPeriodoLinha } from '@/types';

function primeiroDiaDoMes(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function hoje(): string {
  return new Date().toISOString().slice(0, 10);
}

const COLUNAS_EXPORTACAO: ColunaExportacao[] = [
  { header: 'Período', key: 'periodo' },
  { header: 'Nº Cargas', key: 'totalCargas' },
  { header: 'Peso Total (kg)', key: 'pesoTotal' },
  { header: 'm³ Total', key: 'm3Total' },
  { header: 'Valor Total', key: 'valorTotal' },
  { header: 'Valor Pago', key: 'valorPago' },
  { header: 'Valor Devido', key: 'valorDevido' },
];

export function CargasPorPeriodoReport(): React.JSX.Element {
  const [dataInicio, setDataInicio] = useState(primeiroDiaDoMes());
  const [dataFim, setDataFim] = useState(hoje());
  const [agrupamento, setAgrupamento] = useState<Agrupamento>('mes');
  const [linhas, setLinhas] = useState<RelatorioCargasPorPeriodoLinha[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportando, setExportando] = useState(false);

  useEffect(() => {
    setLoading(true);
    void ipcService.relatorios
      .cargasPorPeriodo({ dataInicio, dataFim, agrupamento })
      .then(setLinhas)
      .finally(() => setLoading(false));
  }, [dataInicio, dataFim, agrupamento]);

  async function handleExportar(formato: 'excel' | 'pdf'): Promise<void> {
    setExportando(true);
    try {
      const linhasFormatadas = linhas.map((l) => ({
        periodo: l.periodo,
        totalCargas: l.totalCargas,
        pesoTotal: l.pesoTotal,
        m3Total: l.m3Total,
        valorTotal: formatMoeda(l.valorTotal),
        valorPago: formatMoeda(l.valorPago),
        valorDevido: formatMoeda(l.valorDevido),
      }));
      const ext = formato === 'excel' ? 'xlsx' : 'pdf';
      const fileName = `Relatorio-Cargas-Por-Periodo-${Date.now()}.${ext}`;
      const result = await ipcService.relatorios.exportar(formato, 'Cargas por Período', COLUNAS_EXPORTACAO, linhasFormatadas, fileName);
      toast.success(`Relatório guardado em: ${result.path}`);
    } catch (err) {
      toast.error(cleanIpcError(err));
    } finally {
      setExportando(false);
    }
  }

  return (
    <div className="flex flex-col gap-lg">
      <PeriodoFiltroBar
        dataInicio={dataInicio}
        dataFim={dataFim}
        onChangeDataInicio={setDataInicio}
        onChangeDataFim={setDataFim}
        agrupamento={agrupamento}
        onChangeAgrupamento={setAgrupamento}
      />
      <RelatorioTable
        colunas={[
          { key: 'periodo', header: 'Período' },
          { key: 'totalCargas', header: 'Nº Cargas' },
          { key: 'pesoTotal', header: 'Peso (kg)', render: (v) => Number(v).toFixed(1) },
          { key: 'm3Total', header: 'm³', render: (v) => Number(v).toFixed(3) },
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
