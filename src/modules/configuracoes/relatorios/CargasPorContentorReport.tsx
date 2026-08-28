import { useEffect, useState } from 'react';
import { toast } from '@/components/ui/Toast';
import { cleanIpcError } from '@/lib/cleanIpcError';
import { formatMoeda } from '@/lib/formatMoeda';
import { ipcService } from '@/services/ipcService';
import { ESTADO_CONTENTOR_LABEL } from '@/constants/labels';
import { PeriodoFiltroBar } from './PeriodoFiltroBar';
import { RelatorioTable } from './RelatorioTable';
import type { ColunaExportacao, RelatorioCargasPorContentorLinha } from '@/types';

function primeiroDiaDoMes(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function hoje(): string {
  return new Date().toISOString().slice(0, 10);
}

const COLUNAS_EXPORTACAO: ColunaExportacao[] = [
  { header: 'Código', key: 'codigo' },
  { header: 'Nome', key: 'nome' },
  { header: 'Estado', key: 'estado' },
  { header: 'Nº Cargas', key: 'totalCargas' },
  { header: 'Peso Total (kg)', key: 'pesoTotal' },
  { header: 'm³ Total', key: 'm3Total' },
  { header: 'Valor Total', key: 'valorTotal' },
];

export function CargasPorContentorReport(): React.JSX.Element {
  const [dataInicio, setDataInicio] = useState(primeiroDiaDoMes());
  const [dataFim, setDataFim] = useState(hoje());
  const [linhas, setLinhas] = useState<RelatorioCargasPorContentorLinha[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportando, setExportando] = useState(false);

  useEffect(() => {
    setLoading(true);
    void ipcService.relatorios
      .cargasPorContentor({ dataInicio, dataFim })
      .then(setLinhas)
      .finally(() => setLoading(false));
  }, [dataInicio, dataFim]);

  async function handleExportar(formato: 'excel' | 'pdf'): Promise<void> {
    setExportando(true);
    try {
      const linhasFormatadas = linhas.map((l) => ({
        codigo: l.codigo,
        nome: l.nome,
        estado: ESTADO_CONTENTOR_LABEL[l.estado],
        totalCargas: l.totalCargas,
        pesoTotal: l.pesoTotal,
        m3Total: l.m3Total,
        valorTotal: formatMoeda(l.valorTotal),
      }));
      const ext = formato === 'excel' ? 'xlsx' : 'pdf';
      const fileName = `Relatorio-Cargas-Por-Contentor-${Date.now()}.${ext}`;
      const result = await ipcService.relatorios.exportar(formato, 'Cargas por Contentor', COLUNAS_EXPORTACAO, linhasFormatadas, fileName);
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
          { key: 'codigo', header: 'Código' },
          { key: 'nome', header: 'Nome' },
          { key: 'estado', header: 'Estado', render: (v) => ESTADO_CONTENTOR_LABEL[v as keyof typeof ESTADO_CONTENTOR_LABEL] },
          { key: 'totalCargas', header: 'Nº Cargas' },
          { key: 'pesoTotal', header: 'Peso (kg)', render: (v) => Number(v).toFixed(1) },
          { key: 'm3Total', header: 'm³', render: (v) => Number(v).toFixed(3) },
          { key: 'valorTotal', header: 'Valor Total', render: (v) => formatMoeda(Number(v)) },
        ]}
        linhas={linhas as unknown as Record<string, unknown>[]}
        loading={loading}
        onExportar={handleExportar}
        exportando={exportando}
      />
    </div>
  );
}
