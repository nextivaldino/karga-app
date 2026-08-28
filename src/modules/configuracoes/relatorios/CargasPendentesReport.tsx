import { useEffect, useState } from 'react';
import { toast } from '@/components/ui/Toast';
import { cleanIpcError } from '@/lib/cleanIpcError';
import { ipcService } from '@/services/ipcService';
import { ESTADO_CARGA_LABEL } from '@/constants/labels';
import { RelatorioTable } from './RelatorioTable';
import type { ColunaExportacao, RelatorioCargaPendenteLinha } from '@/types';

const COLUNAS_EXPORTACAO: ColunaExportacao[] = [
  { header: 'Código', key: 'codigo' },
  { header: 'Nome', key: 'nome' },
  { header: 'Emissor', key: 'emissorNome' },
  { header: 'Contentor', key: 'contentorCodigo' },
  { header: 'Estado', key: 'estado' },
  { header: 'Criado em', key: 'createdAt' },
];

function formatData(iso: string): string {
  return new Intl.DateTimeFormat('pt-PT').format(new Date(iso));
}

export function CargasPendentesReport(): React.JSX.Element {
  const [linhas, setLinhas] = useState<RelatorioCargaPendenteLinha[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportando, setExportando] = useState(false);

  useEffect(() => {
    setLoading(true);
    void ipcService.relatorios
      .cargasPendentes()
      .then(setLinhas)
      .finally(() => setLoading(false));
  }, []);

  async function handleExportar(formato: 'excel' | 'pdf'): Promise<void> {
    setExportando(true);
    try {
      const linhasFormatadas = linhas.map((l) => ({
        codigo: l.codigo,
        nome: l.nome,
        emissorNome: l.emissorNome,
        contentorCodigo: l.contentorCodigo ?? '—',
        estado: ESTADO_CARGA_LABEL[l.estado],
        createdAt: formatData(l.createdAt),
      }));
      const ext = formato === 'excel' ? 'xlsx' : 'pdf';
      const fileName = `Relatorio-Cargas-Pendentes-${Date.now()}.${ext}`;
      const result = await ipcService.relatorios.exportar(formato, 'Cargas Pendentes', COLUNAS_EXPORTACAO, linhasFormatadas, fileName);
      toast.success(`Relatório guardado em: ${result.path}`);
    } catch (err) {
      toast.error(cleanIpcError(err));
    } finally {
      setExportando(false);
    }
  }

  return (
    <div className="flex flex-col gap-lg">
      <p className="text-[12px] text-text-tertiary">Cargas ainda não entregues nem arquivadas.</p>
      <RelatorioTable
        colunas={[
          { key: 'codigo', header: 'Código' },
          { key: 'nome', header: 'Nome' },
          { key: 'emissorNome', header: 'Emissor' },
          { key: 'contentorCodigo', header: 'Contentor', render: (v) => (v ? String(v) : '—') },
          { key: 'estado', header: 'Estado', render: (v) => ESTADO_CARGA_LABEL[v as keyof typeof ESTADO_CARGA_LABEL] },
          { key: 'createdAt', header: 'Criado em', render: (v) => formatData(String(v)) },
        ]}
        linhas={linhas as unknown as Record<string, unknown>[]}
        loading={loading}
        onExportar={handleExportar}
        exportando={exportando}
      />
    </div>
  );
}
