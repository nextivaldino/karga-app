import { useEffect, useRef, useState } from 'react';
import { PaperPlaneTilt as Send } from '@phosphor-icons/react';
import { HeaderBarModal } from '@/components/ui/HeaderBarModal';
import { toast } from '@/components/ui/Toast';
import { cleanIpcError } from '@/lib/cleanIpcError';
import { ipcService } from '@/services/ipcService';
import type { Mensagem } from '@/types';

function formatHora(iso: string): string {
  return new Intl.DateTimeFormat('pt-PT', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));
}

interface MensagemComposerModalProps {
  open: boolean;
  onClose: () => void;
  utilizador: { id: string; name: string } | null;
}

// Conversa simples estilo chat entre o Desktop (Empresa) e um utilizador
// PWA — reaproveita a tabela `mensagens` já existente, sem RLS nova: o
// Desktop lê/escreve sempre via Service Role Key.
export function MensagemComposerModal({ open, onClose, utilizador }: MensagemComposerModalProps): React.JSX.Element {
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [loading, setLoading] = useState(true);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  function carregar(): void {
    if (!utilizador) return;
    setLoading(true);
    ipcService.mensagens
      .listarConversa(utilizador.id)
      .then(setMensagens)
      .catch((err: unknown) => toast.error(cleanIpcError(err)))
      .finally(() => setLoading(false));
    // Abrir a conversa é o momento natural de "ler" as mensagens dela —
    // dispara o evento para o MensagensBell descontar na hora, sem
    // esperar pelo próximo poll de 60s.
    void ipcService.mensagens.marcarLidas(utilizador.id).then(() => {
      window.dispatchEvent(new Event('mensagens:atualizada'));
    });
  }

  useEffect(() => {
    if (!open || !utilizador) return;
    setTexto('');
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, utilizador?.id]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [mensagens]);

  async function handleEnviar(): Promise<void> {
    if (!utilizador || !texto.trim()) return;
    setEnviando(true);
    try {
      await ipcService.mensagens.enviar(utilizador.id, texto);
      setTexto('');
      carregar();
    } catch (err) {
      toast.error(cleanIpcError(err));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <HeaderBarModal
      open={open}
      onClose={onClose}
      title={utilizador ? `Mensagens — ${utilizador.name}` : 'Mensagens'}
      widthClassName="max-w-[440px]"
      footer={
        <div className="flex w-full items-center gap-2">
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleEnviar();
            }}
            placeholder="Escreve uma mensagem..."
            className="min-h-[38px] flex-1 rounded-control border border-border bg-bg-input px-3 text-[13px] text-text-primary outline-none focus:border-primary"
          />
          <button
            type="button"
            disabled={enviando || !texto.trim()}
            onClick={() => void handleEnviar()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-primary text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
          >
            <Send size={16} />
          </button>
        </div>
      }
    >
      <div ref={listRef} className="flex max-h-[360px] min-h-[200px] flex-col gap-2 overflow-y-auto">
        {loading ? (
          <p className="text-[13px] text-text-tertiary">A carregar...</p>
        ) : mensagens.length === 0 ? (
          <p className="text-[13px] text-text-tertiary">Ainda não há mensagens com {utilizador?.name}.</p>
        ) : (
          mensagens.map((m) => {
            const enviadaPelaEmpresa = m.deUserId !== utilizador?.id;
            return (
              <div key={m.id} className={`flex ${enviadaPelaEmpresa ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-control px-3 py-2 text-[13px] ${
                    enviadaPelaEmpresa ? 'bg-primary text-white' : 'bg-bg-app text-text-primary'
                  }`}
                >
                  <p>{m.texto}</p>
                  <p className={`mt-0.5 text-[10px] ${enviadaPelaEmpresa ? 'text-white/70' : 'text-text-tertiary'}`}>
                    {formatHora(m.createdAt)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </HeaderBarModal>
  );
}
