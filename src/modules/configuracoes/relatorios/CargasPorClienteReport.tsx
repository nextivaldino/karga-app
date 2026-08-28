import { useEffect, useState } from 'react';
import { toast } from '@/components/ui/Toast';
import { cleanIpcError } from '@/lib/cleanIpcError';
import { formatMoeda } from '@/lib/formatMoeda';
import { ipcService } from '@/services/ipcService';
import { PeriodoFiltroBar } from './PeriodoFiltroBar';
import { RelatorioTable } from './RelatorioTable';
import type { ColunaExportacao, RelatorioCargasPorClienteLinha } from '@/types';

function primeiroDiaDoMes(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function hoje(): string {
  return new Date().toISOString().slice(0, 10);
}

const COLUNAS_EXPORTACAO: ColunaExportacao[] = [
  { header: 'Cliente', key: 'nome' },
  { header: 'Telefone', key: 'telefone' },
  { header: 'Nº Cargas', key: 'totalCargas' },
  { header: 'Valor Total Movimentado', key: 'valorTotal' },
];

export function CargasPorClienteReport(): React.JSX.Element {
  const [dataInicio, setDataInicio] = useState(primeiroDiaDoMes());
  const [dataFim, setDataFim] = useState(hoje());
  const [linhas, setLinhas] = useState<RelatorioCargasPorClienteLinha[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportando, setExportando] = useState(false);

  useEffect(() => {
    setLoading(true);
    void ipcService.relatorios
      .cargasPorCliente({ dataInicio, dataFim })
      .then(setLinhas)
      .finally(() => setLoading(false));
  }, [dataInicio, dataFim]);

  async function handleExportar(formato: 'excel' | 'pdf'): Promise<void> {
    setExportando(true);
    try {
      const linhasFormatadas = linhas.map((l) => ({
        nome: l.nome,
        telefone: l.telefone ?? '—',
        totalCargas: l.totalCargas,
        valorTotal: formatMoeda(l.valorTotal),
      }));
      const ext = formato === 'excel' ? 'xlsx' : 'pdf';
      const fileName = `Relatorio-Cargas-Por-Cliente-${Date.now()}.${ext}`;
      const result = await ipcService.relatorios.exportar(formato, 'Cargas por Cliente', COLUNAS_EXPORTACAO, linhasFormatadas, fileName);
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
      <RelatorioTable
        colunas={[
          { key: 'nome', header: 'Cliente' },
          { key: 'telefone', header: 'Telefone', render: (v) => (v ? String(v) : '—') },
          { key: 'totalCargas', header: 'Nº Cargas' },
          { key: 'valorTotal', header: 'Valor Total Movimentado', render: (v) => formatMoeda(Number(v)) },
        ]}
        linhas={linhas as unknown as Record<string, unknown>[]}
        loading={loading}
        onExportar={handleExportar}
        exportando={exportando}
      />
    </div>
  );
}
