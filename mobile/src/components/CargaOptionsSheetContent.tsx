import {
  Eye,
  PencilSimple as Edit,
  Copy,
  Flag,
  Tag,
  WhatsappLogo,
  FileText,
  ClockCounterClockwise,
  Trash,
  type Icon as PhosphorIcon,
} from '@phosphor-icons/react';
import { useFilaOffline } from '@/hooks/useFilaOffline';
import { useHubSheet } from '@/hooks/useHubSheet';
import { toast } from '@/components/ui/Toast';
import type { LinhaCarga } from '@/pages/CargasHubPage';

interface OpcaoCarga {
  label: string;
  icon: PhosphorIcon;
  onClick: () => void;
  danger?: boolean;
}

// Menu de opções por carga (docs/26 §5.2) — as 9 ações pedidas. Só
// Editar/Duplicar/Enviar por WhatsApp/Eliminar (quando ainda só local,
// na fila) têm suporte real na camada de dados atual — lib/data.ts só
// insere/lê, não tem update/delete de cargas já enviadas ao servidor.
// As restantes ficam honestamente "em breve" em vez de simular um
// comportamento que a base de dados não sustenta (não inventar schema).
export function CargaOptionsSheetContent({ carga }: { carga: LinhaCarga }): React.JSX.Element {
  const { removerItem } = useFilaOffline();
  const { abrir, fechar } = useHubSheet();

  function emBreve(): void {
    toast.info('Em breve.');
    fechar();
  }

  const opcoes: OpcaoCarga[] = [
    { label: 'Ver detalhes', icon: Eye, onClick: emBreve },
    {
      label: 'Editar',
      icon: Edit,
      onClick: async () => {
        if (carga.filaId) await removerItem(carga.filaId);
        fechar();
        abrir('addCarga', { prefill: carga.prefill });
      },
    },
    {
      label: 'Duplicar',
      icon: Copy,
      onClick: () => {
        fechar();
        abrir('addCarga', { prefill: carga.prefill });
      },
    },
    { label: 'Alterar estado', icon: Flag, onClick: emBreve },
    { label: 'Marcar faturação', icon: Tag, onClick: emBreve },
    {
      label: 'Enviar por WhatsApp',
      icon: WhatsappLogo,
      onClick: () => {
        const telefone = carga.prefill.emissorTelefone;
        fechar();
        if (!telefone) {
          toast.error('Este emissor não tem telefone guardado.');
          return;
        }
        abrir('whatsapp', { nome: carga.emissorNome, telefone });
      },
    },
    { label: 'Exportar recibo', icon: FileText, onClick: emBreve },
    { label: 'Histórico', icon: ClockCounterClockwise, onClick: emBreve },
    {
      label: 'Eliminar',
      icon: Trash,
      danger: true,
      onClick: async () => {
        if (!carga.filaId) {
          toast.error('Não é possível eliminar uma carga já enviada.');
          fechar();
          return;
        }
        await removerItem(carga.filaId);
        toast.success('Carga eliminada.');
        fechar();
      },
    },
  ];

  return (
    <div className="pb-3.5">
      {opcoes.map((op) => (
        <button
          key={op.label}
          type="button"
          onClick={() => void op.onClick()}
          className={`flex w-full items-center gap-3 border-b border-border px-1 py-3 text-left text-[14px] last:border-b-0 ${
            op.danger ? 'text-error' : 'text-text-primary'
          }`}
        >
          <op.icon size={18} className={op.danger ? 'text-error' : 'text-text-secondary'} />
          {op.label}
        </button>
      ))}
    </div>
  );
}
