import { MessageCircle } from 'lucide-react';
import { useNavigation } from '@/hooks/useNavigation';

// Atalho direto para a página Mensagens — vive junto das notificações no
// cabeçalho (a dock só tem Início/Cargas/+ agora). Novas mensagens já
// aparecem no sino de notificações; este botão é só o acesso rápido.
export function MessagesButton(): React.JSX.Element {
  const { navigate, page } = useNavigation();

  return (
    <button
      type="button"
      onClick={() => navigate('mensagens')}
      title="Mensagens"
      className={`flex h-9 w-9 items-center justify-center rounded-control active:bg-bg-app ${
        page === 'mensagens' ? 'text-primary' : 'text-text-secondary'
      }`}
    >
      <MessageCircle size={19} />
    </button>
  );
}
