import { useEffect, useState } from 'react';
import { ChatCircle as MessageCircle, PaperPlaneTilt as Send } from '@phosphor-icons/react';
import { useAuth } from '@/hooks/useAuth';
import { useTopBarSlot } from '@/hooks/useTopBarSlot';
import { enviarMensagem, listMensagens, marcarMensagemLida } from '@/lib/data';
import { EMPRESA_SENTINEL_ID } from '@/lib/constants';
import { toast } from '@/components/ui/Toast';
import { PullToRefresh } from '@/components/PullToRefresh';
import { formatRelativo } from '@/lib/formatRelativo';
import type { Mensagem } from '@/types';

export function MensagensPage(): React.JSX.Element {
  const { pwaUser } = useAuth();
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [loading, setLoading] = useState(true);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);

  useTopBarSlot(<span className="text-[16px] font-semibold text-text-primary">Mensagens</span>);

  async function recarregar(): Promise<void> {
    try {
      setMensagens(await listMensagens());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao carregar mensagens.');
    }
  }

  useEffect(() => {
    void recarregar().finally(() => setLoading(false));
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

  async function handleEnviar(): Promise<void> {
    if (!pwaUser || !texto.trim()) return;
    setEnviando(true);
    try {
      await enviarMensagem(pwaUser.id, EMPRESA_SENTINEL_ID, texto);
      setTexto('');
      void recarregar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao enviar mensagem.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <PullToRefresh onRefresh={recarregar} className="flex-1 p-4">
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
      </PullToRefresh>

      <div className="flex shrink-0 items-center gap-2 border-t border-border bg-bg-surface p-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void handleEnviar();
          }}
          placeholder="Escreve uma mensagem para o Admin..."
          className="min-h-touch flex-1 rounded-control border border-border bg-bg-input px-3 text-[15px] text-text-primary outline-none focus:border-primary"
        />
        <button
          type="button"
          disabled={enviando || !texto.trim()}
          onClick={() => void handleEnviar()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-white transition-colors active:bg-primary-hover disabled:opacity-50"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
