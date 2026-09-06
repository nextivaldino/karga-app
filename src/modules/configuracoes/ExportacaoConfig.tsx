import { useEffect, useState } from 'react';
import { FileArrowDown, FilePdf, FileXls } from '@phosphor-icons/react';
import { Switch } from '@/components/ui/Switch';
import { ipcService } from '@/services/ipcService';

// Código e Nome identificam a carga e ficam sempre visíveis em qualquer
// exportação — só o resto é opcional. As chaves seguem o padrão já
// usado no resto da app para preferências booleanas em `settings`
// (string '0'/'1', ver `recibo_incluir_*` em EmpresaConfig).
const CHAVES_PDF = {
  dimensoes: 'export_pdf_col_dimensoes',
  peso: 'export_pdf_col_peso',
  m3: 'export_pdf_col_m3',
  valor: 'export_pdf_col_valor',
  emissor: 'export_pdf_col_emissor',
  destinatario: 'export_pdf_col_destinatario',
} as const;

const CHAVES_EXCEL = {
  emissor: 'export_excel_col_emissor',
  peso: 'export_excel_col_peso',
  m3: 'export_excel_col_m3',
  valor: 'export_excel_col_valor',
  moeda: 'export_excel_col_moeda',
  pagamento: 'export_excel_col_pagamento',
  estado: 'export_excel_col_estado',
  criadoEm: 'export_excel_col_criado_em',
} as const;

const CHAVES_MENSAGEM = {
  valor: 'recibo_incluir_valor',
  pagamento: 'recibo_incluir_pagamento',
} as const;

type ChavePdf = keyof typeof CHAVES_PDF;
type ChaveExcel = keyof typeof CHAVES_EXCEL;
type ChaveMensagem = keyof typeof CHAVES_MENSAGEM;

const LABEL_PDF: Record<ChavePdf, string> = {
  dimensoes: 'Dimensões (C×L×A)',
  peso: 'Peso',
  m3: 'm³',
  valor: 'Valor',
  emissor: 'Emissor',
  destinatario: 'Destinatário(s)',
};

const LABEL_EXCEL: Record<ChaveExcel, string> = {
  emissor: 'Emissor',
  peso: 'Peso (kg)',
  m3: 'm³',
  valor: 'Valor',
  moeda: 'Moeda',
  pagamento: 'Pagamento',
  estado: 'Estado',
  criadoEm: 'Criado em',
};

const LABEL_MENSAGEM: Record<ChaveMensagem, string> = {
  valor: 'Valor',
  pagamento: 'Estado de pagamento',
};

function lerGrupo<K extends string>(all: Record<string, string>, chaves: Record<K, string>): Record<K, boolean> {
  const resultado = {} as Record<K, boolean>;
  for (const chave in chaves) {
    resultado[chave] = all[chaves[chave]] !== '0';
  }
  return resultado;
}

interface SeccaoExportacaoProps<K extends string> {
  icon: React.ReactNode;
  titulo: string;
  descricao: string;
  chaves: Record<K, string>;
  labels: Record<K, string>;
  valores: Record<K, boolean> | null;
  onToggle: (chave: K, valor: boolean) => void;
}

function SeccaoExportacao<K extends string>({
  icon,
  titulo,
  descricao,
  chaves,
  labels,
  valores,
  onToggle,
}: SeccaoExportacaoProps<K>): React.JSX.Element {
  return (
    <div>
      <h2 className="mb-1 flex items-center gap-2 text-[15px] font-semibold text-text-primary">
        {icon} {titulo}
      </h2>
      <p className="mb-md text-[12px] text-text-tertiary">{descricao}</p>
      <p className="mb-1.5 text-[11px] text-text-tertiary">Código e Nome aparecem sempre.</p>
      {valores ? (
        <div className="flex flex-col gap-2">
          {(Object.keys(chaves) as K[]).map((chave) => (
            <div key={chave} className="flex items-center justify-between gap-3 rounded-control border border-border bg-bg-app px-3 py-2.5">
              <p className="text-[13px] font-medium text-text-primary">{labels[chave]}</p>
              <Switch checked={valores[chave]} onChange={(v) => onToggle(chave, v)} />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

// Configura o que sai em cada tipo de exportação — a lista de contentor
// em PDF, a folha "Cargas" do Excel de "Exportar Tudo", e o resumo
// enviado por WhatsApp/e-mail. Cada secção é independente: desligar uma
// coluna aqui só afeta esse canal, não os outros dois.
export function ExportacaoConfig(): React.JSX.Element {
  const [pdf, setPdf] = useState<Record<ChavePdf, boolean> | null>(null);
  const [excel, setExcel] = useState<Record<ChaveExcel, boolean> | null>(null);
  const [mensagem, setMensagem] = useState<Record<ChaveMensagem, boolean> | null>(null);

  useEffect(() => {
    void ipcService.settings.getAll().then((all) => {
      setPdf(lerGrupo(all, CHAVES_PDF));
      setExcel(lerGrupo(all, CHAVES_EXCEL));
      setMensagem(lerGrupo(all, CHAVES_MENSAGEM));
    });
  }, []);

  async function handleTogglePdf(chave: ChavePdf, valor: boolean): Promise<void> {
    setPdf((prev) => (prev ? { ...prev, [chave]: valor } : prev));
    await ipcService.settings.set(CHAVES_PDF[chave], valor ? '1' : '0');
  }

  async function handleToggleExcel(chave: ChaveExcel, valor: boolean): Promise<void> {
    setExcel((prev) => (prev ? { ...prev, [chave]: valor } : prev));
    await ipcService.settings.set(CHAVES_EXCEL[chave], valor ? '1' : '0');
  }

  async function handleToggleMensagem(chave: ChaveMensagem, valor: boolean): Promise<void> {
    setMensagem((prev) => (prev ? { ...prev, [chave]: valor } : prev));
    await ipcService.settings.set(CHAVES_MENSAGEM[chave], valor ? '1' : '0');
  }

  return (
    <div className="flex-1 overflow-y-auto p-xl">
      <div className="mx-auto flex max-w-[560px] flex-col gap-xl">
        <SeccaoExportacao
          icon={<FilePdf size={18} weight="fill" className="text-error" />}
          titulo="Lista de Contentor (PDF)"
          descricao="Colunas da tabela ao exportar a lista de cargas de um contentor em PDF."
          chaves={CHAVES_PDF}
          labels={LABEL_PDF}
          valores={pdf}
          onToggle={(chave, valor) => void handleTogglePdf(chave, valor)}
        />

        <SeccaoExportacao
          icon={<FileXls size={18} weight="fill" className="text-success" />}
          titulo="Exportar Tudo (Excel)"
          descricao='Colunas da folha "Cargas" ao exportar tudo em Excel, a partir de Backup, Exportação e Segurança.'
          chaves={CHAVES_EXCEL}
          labels={LABEL_EXCEL}
          valores={excel}
          onToggle={(chave, valor) => void handleToggleExcel(chave, valor)}
        />

        <SeccaoExportacao
          icon={<FileArrowDown size={18} weight="fill" className="text-primary" />}
          titulo="Resumo por Mensagem (WhatsApp/E-mail)"
          descricao="Colunas incluídas por defeito no resumo de cargas enviado a um contacto — pode ainda ser ajustado por envio."
          chaves={CHAVES_MENSAGEM}
          labels={LABEL_MENSAGEM}
          valores={mensagem}
          onToggle={(chave, valor) => void handleToggleMensagem(chave, valor)}
        />
      </div>
    </div>
  );
}
