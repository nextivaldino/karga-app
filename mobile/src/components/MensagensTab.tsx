import { useEffect, useMemo, useState } from 'react';
import { ChatCircle as MessageCircle, PaperPlaneTilt as Send } from '@phosphor-icons/react';
import { useAuth } from '@/hooks/useAuth';
import { enviarMensagem, listMensagens, marcarMensagemLida } from '@/lib/data';
import { EMPRESA_SENTINEL_ID } from '@/lib/constants';
import { toast } from '@/components/ui/Toast';
import type { Mensagem } from '@/types';

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

function formatHora(iso: string): string {
  return new Intl.DateTimeFormat('pt-PT', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}

interface GrupoDia {
  chave: string;
  rotulo: string;
  mensagens: Mensagem[];
}

function agruparPorDia(mensagens: Mensagem[]): GrupoDia[] {
  const grupos: GrupoDia[] = [];
  for (const m of mensagens) {
    const chave = new Date(m.createdAt).toDateString();
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.chave === chave) ultimo.mensagens.push(m);
    else grupos.push({ chave, rotulo: rotuloDia(m.createdAt), mensagens: [m] });
  }
  return grupos;
}

// Conteúdo da aba "Mensagens" do painel da ilha dinâmica — antes era a
// página MensagensPage própria; passou a viver aqui porque o corpo da app
// ficou reduzido a 3 páginas (Home, Cargas, Definições) e mensagens é,
// na prática, mais uma categoria de notificação do que uma página própria.
export function MensagensTab(): React.JSX.Element {
  const { pwaUser } = useAuth();
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [loading, setLoading] = useState(true);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);

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

  // listMensagens vem mais recente primeiro (para o feed antigo) — a
  // conversa em bolhas lê-se do mais antigo para o mais recente.
  const ordenadas = useMemo(() => [...mensagens].sort((a, b) => a.createdAt.localeCompare(b.createdAt)), [mensagens]);
  const grupos = useMemo(() => agruparPorDia(ordenadas), [ordenadas]);

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
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 overflow-y-auto p-3.5">
        {loading ? (
          <p className="text-[13px] text-text-tertiary">A carregar...</p>
        ) : mensagens.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <MessageCircle size={26} className="text-text-tertiary" />
            <p className="text-[13px] text-text-tertiary">Ainda não há mensagens.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {grupos.map((grupo) => (
              <div key={grupo.chave} className="flex flex-col gap-1">
                <div className="my-1.5 flex justify-center">
                  <span className="rounded-pill bg-bg-app px-2.5 py-0.5 text-[11px] font-medium text-text-tertiary">{grupo.rotulo}</span>
                </div>
                {grupo.mensagens.map((m) => {
                  const recebida = m.paraUserId === pwaUser?.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => void handleAbrir(m)}
                      className={`flex min-h-touch w-full ${recebida ? 'justify-start' : 'justify-end'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-3 py-2 text-left ${
                          recebida
                            ? `rounded-bl-md border border-border text-text-primary ${!m.lida ? 'bg-primary-light' : 'bg-bg-app'}`
                            : 'rounded-br-md bg-primary text-white'
                        }`}
                      >
                        <p className="whitespace-pre-wrap text-[14px]">{m.texto}</p>
                        <p className={`mt-0.5 text-[11px] ${recebida ? 'text-text-tertiary' : 'text-white/70'}`}>{formatHora(m.createdAt)}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2 border-t border-border p-3">
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void handleEnviar();
          }}
          placeholder="Escreve uma mensagem para o Admin..."
          className="min-h-touch flex-1 rounded-control border border-border bg-bg-input px-3 text-[14px] text-text-primary outline-none focus:border-primary"
        />
        <button
          type="button"
          disabled={enviando || !texto.trim()}
          onClick={() => void handleEnviar()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-white transition-colors active:bg-primary-hover disabled:opacity-50"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
