import { useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { listMensagens, marcarMensagemLida } from '@/lib/data';
import { toast } from '@/components/ui/Toast';
import { formatRelativo } from '@/lib/formatRelativo';
import type { Mensagem } from '@/types';

export function MensagensPage(): React.JSX.Element {
  const { pwaUser } = useAuth();
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listMensagens()
      .then(setMensagens)
      .catch((err: unknown) => toast.error(err instanceof Error ? err.message : 'Falha ao carregar mensagens.'))
      .finally(() => setLoading(false));
  }, []);

  async function handleAbrir(m: Mensagem): Promise<void> {
    if (m.lida || m.paraUserId !== pwaUser?.id) return;
    try {
      await marcarMensagemLida(m.id);
      setMensagens((prev) => prev.map((x) => (x.id === m.id ? { ...x, lida: true } : x)));
    } catch {
      // não crítico — a mensagem só fica marcada como lida na próxima tentativa
    }
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      <h1 className="text-[20px] font-semibold text-text-primary">Mensagens</h1>

      {loading ? (
        <p className="text-[14px] text-text-tertiary">A carregar...</p>
      ) : mensagens.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <MessageCircle size={32} className="text-text-tertiary" />
          <p className="text-[14px] text-text-tertiary">Ainda não há mensagens.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {mensagens.map((m) => {
            const recebida = m.paraUserId === pwaUser?.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => void handleAbrir(m)}
                className={`flex min-h-touch flex-col items-start gap-1 rounded-control border border-border p-3 text-left ${
                  recebida && !m.lida ? 'bg-primary-light' : 'bg-bg-surface'
                }`}
              >
                <span className="text-[11px] font-medium uppercase tracking-wide text-text-tertiary">
                  {recebida ? 'Recebida' : 'Enviada'}
                </span>
                <span className="text-[15px] text-text-primary">{m.texto}</span>
                <span className="text-[12px] text-text-tertiary">{formatRelativo(m.createdAt)}</span>
              </button>
            );
          })}
        </div>
      )}

      <p className="mt-2 rounded-control bg-bg-app p-3 text-[13px] text-text-tertiary">
        O envio de novas mensagens para o Admin fica disponível assim que essa funcionalidade for adicionada do lado do
        Desktop.
      </p>
    </div>
  );
}
