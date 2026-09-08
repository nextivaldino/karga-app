import { useEffect, useRef, useState } from 'react';
import { Check, Checks, PaperPlaneTilt as Send } from '@phosphor-icons/react';
import { toast } from '@/components/ui/Toast';
import { cleanIpcError } from '@/lib/cleanIpcError';
import { ipcService } from '@/services/ipcService';
import type { Mensagem } from '@/types';

function formatHora(iso: string): string {
  return new Intl.DateTimeFormat('pt-PT', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}

function mesmoDia(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function rotuloDia(iso: string): string {
  const data = new Date(iso);
  const hoje = new Date();
  if (mesmoDia(data, hoje)) return 'Hoje';
  const ontem = new Date(hoje);
  ontem.setDate(hoje.getDate() - 1);
  if (mesmoDia(data, ontem)) return 'Ontem';
  return new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(data);
}

interface GrupoDia {
  chave: string;
  rotulo: string;
  mensagens: Mensagem[];
}

// Mensagens já vêm ordenadas ascendente (listarConversa) — agrupar é só
// olhar para a última fatia aberta e decidir se o dia mudou.
function agruparPorDia(mensagens: Mensagem[]): GrupoDia[] {
  const grupos: GrupoDia[] = [];
  for (const m of mensagens) {
    const chave = new Date(m.createdAt).toDateString();
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.chave === chave) {
      ultimo.mensagens.push(m);
    } else {
      grupos.push({ chave, rotulo: rotuloDia(m.createdAt), mensagens: [m] });
    }
  }
  return grupos;
}

interface ChatConversaProps {
  contraparteId: string;
  nome: string;
  className?: string;
}

// Vista de conversa partilhada — bolhas estilo WhatsApp (cantos
// assimétricos, separador de data, tique de lida) + input de envio.
// Usado tanto pelo chat inline do MensagensBell como pelo
// MensagemComposerModal, para as duas deixarem de ter lógica duplicada.
export function ChatConversa({ contraparteId, nome, className }: ChatConversaProps): React.JSX.Element {
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [loading, setLoading] = useState(true);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  function carregar(): void {
    setLoading(true);
    ipcService.mensagens
      .listarConversa(contraparteId)
      .then(setMensagens)
      .catch((err: unknown) => toast.error(cleanIpcError(err)))
      .finally(() => setLoading(false));
    // Abrir a conversa é o momento natural de "ler" — dispara o evento
    // para o sino descontar na hora, sem esperar pelo próximo poll.
    void ipcService.mensagens.marcarLidas(contraparteId).then(() => {
      window.dispatchEvent(new Event('mensagens:atualizada'));
    });
  }

  useEffect(() => {
    setTexto('');
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contraparteId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [mensagens]);

  async function handleEnviar(): Promise<void> {
    if (!texto.trim()) return;
    setEnviando(true);
    try {
      await ipcService.mensagens.enviar(contraparteId, texto);
      setTexto('');
      carregar();
    } catch (err) {
      toast.error(cleanIpcError(err));
    } finally {
      setEnviando(false);
    }
  }

  const grupos = agruparPorDia(mensagens);

  return (
    <div className={`flex min-h-0 flex-col ${className ?? ''}`}>
      <div ref={listRef} className="flex-1 overflow-y-auto p-3">
        {loading ? (
          <p className="text-[13px] text-text-tertiary">A carregar...</p>
        ) : mensagens.length === 0 ? (
          <p className="text-[13px] text-text-tertiary">Ainda não há mensagens com {nome}.</p>
        ) : (
          grupos.map((grupo) => (
            <div key={grupo.chave} className="flex flex-col gap-1">
              <div className="my-2 flex justify-center">
                <span className="rounded-pill bg-bg-app px-2.5 py-0.5 text-[11px] font-medium text-text-tertiary">
                  {grupo.rotulo}
                </span>
              </div>
              {grupo.mensagens.map((m) => {
                const enviada = m.deUserId !== contraparteId;
                return (
                  <div key={m.id} className={`mb-1 flex ${enviada ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-3 py-2 text-[13px] ${
                        enviada
                          ? 'rounded-br-md bg-primary text-white'
                          : 'rounded-bl-md border border-border bg-bg-surface text-text-primary'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{m.texto}</p>
                      <p
                        className={`mt-0.5 flex items-center justify-end gap-1 text-[10px] ${
                          enviada ? 'text-white/70' : 'text-text-tertiary'
                        }`}
                      >
                        {formatHora(m.createdAt)}
                        {enviada ? (m.lida ? <Checks size={13} /> : <Check size={13} />) : null}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2 border-t border-border p-2">
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void handleEnviar();
          }}
          placeholder="Escreve uma mensagem..."
          className="min-h-[36px] flex-1 rounded-control border border-border bg-bg-input px-2.5 text-[13px] text-text-primary outline-none focus:border-primary"
        />
        <button
          type="button"
          disabled={enviando || !texto.trim()}
          onClick={() => void handleEnviar()}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-primary text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}
