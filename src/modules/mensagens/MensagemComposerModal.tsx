import { HeaderBarModal } from '@/components/ui/HeaderBarModal';
import { ChatConversa } from './ChatConversa';

interface MensagemComposerModalProps {
  open: boolean;
  onClose: () => void;
  utilizador: { id: string; name: string } | null;
}

// Conversa estilo WhatsApp entre o Desktop (Empresa) e um utilizador PWA —
// wrapper fino sobre ChatConversa (a mesma vista usada pelo chat inline do
// MensagensBell), reaproveitando a tabela `mensagens` já existente.
export function MensagemComposerModal({ open, onClose, utilizador }: MensagemComposerModalProps): React.JSX.Element {
  return (
    <HeaderBarModal
      open={open}
      onClose={onClose}
      title={utilizador ? `Mensagens — ${utilizador.name}` : 'Mensagens'}
      widthClassName="max-w-[440px]"
    >
      {utilizador ? <ChatConversa contraparteId={utilizador.id} nome={utilizador.name} className="h-[420px] -m-lg" /> : null}
    </HeaderBarModal>
  );
}
