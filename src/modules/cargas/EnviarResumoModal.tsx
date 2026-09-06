import { useEffect, useRef, useState } from 'react';
import { CaretDown, ChatCircle, EnvelopeSimple, SlidersHorizontal } from '@phosphor-icons/react';
import { HeaderBarModal } from '@/components/ui/HeaderBarModal';
import { FloatingLabelInput } from '@/components/ui/FloatingLabelInput';
import { ipcService } from '@/services/ipcService';
import { buildWhatsAppUrl } from '@/lib/whatsapp';
import { buildReciboTexto, buildReciboAssunto, type ColunasRecibo } from '@/lib/reciboTemplate';
import { carregarDadosRecibo } from '@/lib/carregarDadosRecibo';
import { formatValor } from '@/lib/formatValor';
import type { CargaComEmissor } from '@/types';

// Forma mínima de contacto necessária para gerar e enviar um recibo —
// tanto `ContactoComContagem` (usado no painel do cliente) como o
// resumo mais estreito da pré-visualização da fatura satisfazem isto
// sem conversões.
export interface ContactoParaRecibo {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
}

interface EnviarResumoModalProps {
  open: boolean;
  onClose: () => void;
  contacto: ContactoParaRecibo | null;
  contentorId: string | null;
  cargas: CargaComEmissor[];
  onSent: () => void;
}

// Só usado antes da preferência guardada chegar (praticamente instantâneo,
// já que é a mesma chamada IPC que já carrega os dados da empresa).
const COLUNAS_INICIAIS: ColunasRecibo = { valor: true, pagamento: true };

// Popup "papel" — pensado para lembrar um recibo físico (fundo e borda
// no tom quente já reservado em theme.css para documentos, ver
// `--panel-paper-*`), com uma pré-visualização real das cargas (mesma
// linguagem visual da lista de Cargas: cabeçalho maiúsculo, linhas
// alternadas) em vez de um bloco de texto plano só. As colunas Valor e
// Pagamento são opcionais — desligar uma regenera o texto da mensagem
// na hora. O canal de envio (WhatsApp/E-mail) escolhe-se aqui, no
// momento de enviar, não antes.
export function EnviarResumoModal({
  open,
  onClose,
  contacto,
  contentorId,
  cargas,
  onSent,
}: EnviarResumoModalProps): React.JSX.Element | null {
  const [texto, setTexto] = useState('');
  const [colunas, setColunas] = useState<ColunasRecibo>(COLUNAS_INICIAIS);
  const [colunasAbertas, setColunasAbertas] = useState(false);
  const [enviando, setEnviando] = useState<'whatsapp' | 'email' | null>(null);
  const colunasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent): void {
      if (colunasRef.current && !colunasRef.current.contains(e.target as Node)) setColunasAbertas(false);
    }
    window.addEventListener('mousedown', onClickOutside);
    return () => window.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  // Reinicia para as colunas por defeito (Configurações → Exportação)
  // sempre que o modal abre para um contacto — o toggle "Colunas" abaixo
  // continua a permitir ajustar só para este envio.
  useEffect(() => {
    if (!open || !contacto) return;
    let cancelled = false;
    void carregarDadosRecibo().then(({ colunasPadrao }) => {
      if (!cancelled) setColunas(colunasPadrao);
    });
    return () => {
      cancelled = true;
    };
  }, [open, contacto?.id]);

  useEffect(() => {
    if (!open || !contacto) return;
    let cancelled = false;
    async function carregar(): Promise<void> {
      const { empresa, opcoes } = await carregarDadosRecibo();
      if (cancelled) return;
      setTexto(buildReciboTexto({ nomeContacto: contacto!.nome, cargas, empresa, opcoes, colunas }));
    }
    void carregar();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, contacto?.id, colunas]);

  if (!open || !contacto) return null;

  function alternarColuna(chave: keyof ColunasRecibo): void {
    setColunas((prev) => ({ ...prev, [chave]: !prev[chave] }));
  }

  async function handleEnviar(canal: 'whatsapp' | 'email'): Promise<void> {
    if (!contacto || !contentorId || !texto.trim()) return;
    setEnviando(canal);
    try {
      if (canal === 'whatsapp') {
        await ipcService.shell.openExternal(buildWhatsAppUrl(contacto.telefone ?? '', texto));
      } else {
        const { empresa } = await carregarDadosRecibo();
        const url = `mailto:${contacto.email ?? ''}?subject=${encodeURIComponent(buildReciboAssunto(empresa.nome))}&body=${encodeURIComponent(texto)}`;
        await ipcService.shell.openExternal(url);
      }
      await ipcService.contactosNotificados.registar(contacto.id, contentorId, canal);
      onSent();
      onClose();
    } finally {
      setEnviando(null);
    }
  }

  const moeda = cargas[0]?.moeda ?? 'EUR';

  return (
    <HeaderBarModal
      open={open}
      onClose={onClose}
      title="Recibo"
      widthClassName="max-w-[560px]"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="mr-auto rounded-control px-3 py-1.5 text-[13px] font-medium text-text-secondary transition-colors hover:bg-bg-app"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!contacto.telefone || enviando != null || !texto.trim()}
            onClick={() => void handleEnviar('whatsapp')}
            title={contacto.telefone ? undefined : 'Este contacto não tem telefone registado'}
            className="flex items-center gap-1.5 rounded-control px-3 py-1.5 text-[13px] font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-40"
            style={{ backgroundColor: '#25D366' }}
          >
            <ChatCircle size={15} weight="fill" /> {enviando === 'whatsapp' ? 'A abrir...' : 'WhatsApp'}
          </button>
          <button
            type="button"
            disabled={!contacto.email || enviando != null || !texto.trim()}
            onClick={() => void handleEnviar('email')}
            title={contacto.email ? undefined : 'Este contacto não tem e-mail registado'}
            className="flex items-center gap-1.5 rounded-control bg-primary px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            <EnvelopeSimple size={15} weight="fill" /> {enviando === 'email' ? 'A abrir...' : 'E-mail'}
          </button>
        </>
      }
    >
      <div
        className="overflow-hidden rounded-control border"
        style={{ backgroundColor: 'var(--panel-paper-bg)', borderColor: 'var(--panel-paper-border)' }}
      >
        <div className="border-b px-4 py-3" style={{ borderColor: 'var(--panel-paper-border)' }}>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">Para</p>
          <p className="text-[15px] font-semibold text-text-primary">{contacto.nome}</p>
        </div>

        <div
          ref={colunasRef}
          className="relative flex items-center justify-between border-b px-4 py-2"
          style={{ borderColor: 'var(--panel-paper-border)' }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">
            Cargas <span className="font-normal normal-case text-text-tertiary">({cargas.length})</span>
          </p>
          <button
            type="button"
            onClick={() => setColunasAbertas((v) => !v)}
            className="flex items-center gap-1 text-[11px] font-medium text-text-secondary transition-colors hover:text-text-primary"
          >
            <SlidersHorizontal size={12} /> Colunas
            <CaretDown size={10} className={`transition-transform ${colunasAbertas ? 'rotate-180' : ''}`} />
          </button>
          {colunasAbertas ? (
            <div className="absolute right-4 top-full z-10 mt-1 w-44 overflow-hidden rounded-control border border-border bg-bg-surface py-1 shadow-lg">
              <label className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-[12px] text-text-primary hover:bg-bg-app">
                <input type="checkbox" checked={colunas.valor} onChange={() => alternarColuna('valor')} />
                Valor
              </label>
              <label className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-[12px] text-text-primary hover:bg-bg-app">
                <input type="checkbox" checked={colunas.pagamento} onChange={() => alternarColuna('pagamento')} />
                Pagamento
              </label>
            </div>
          ) : null}
        </div>

        <div className="max-h-[180px] overflow-y-auto">
          <div
            className="sticky top-0 grid gap-2 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-text-tertiary"
            style={{
              backgroundColor: 'var(--panel-paper-bg-alt)',
              gridTemplateColumns: `1fr ${colunas.valor ? '70px' : ''} ${colunas.pagamento ? '64px' : ''}`.trim(),
            }}
          >
            <span>Carga</span>
            {colunas.valor ? <span className="text-right">Valor</span> : null}
            {colunas.pagamento ? <span className="text-right">Estado</span> : null}
          </div>
          {cargas.map((c, i) => (
            <div
              key={c.id}
              className="grid gap-2 px-4 py-1.5 text-[12px] text-text-primary"
              style={{
                backgroundColor: i % 2 === 1 ? 'var(--panel-paper-bg-alt)' : 'transparent',
                gridTemplateColumns: `1fr ${colunas.valor ? '70px' : ''} ${colunas.pagamento ? '64px' : ''}`.trim(),
              }}
            >
              <span className="truncate">
                <span className="font-medium">{c.codigo}</span> — {c.nome}
              </span>
              {colunas.valor ? <span className="text-right text-text-secondary">{formatValor(c.valor, c.moeda)}</span> : null}
              {colunas.pagamento ? (
                <span className={`text-right text-[11px] font-medium ${c.estadoPagamento === 'pago' ? 'text-success' : 'text-warning'}`}>
                  {c.estadoPagamento === 'pago' ? 'Pago' : 'Devido'}
                </span>
              ) : null}
            </div>
          ))}
        </div>

        {colunas.valor ? (
          <div className="flex items-center justify-end gap-4 border-y px-4 py-2 text-[12px]" style={{ borderColor: 'var(--panel-paper-border)' }}>
            <span className="text-text-secondary">
              Total <span className="font-semibold text-text-primary">{formatValor(cargas.reduce((s, c) => s + (c.valor ?? 0), 0), moeda)}</span>
            </span>
            <span className="text-text-secondary">
              Devido{' '}
              <span className="font-semibold text-warning">
                {formatValor(
                  cargas.reduce((s, c) => s + (c.estadoPagamento === 'devido' ? (c.valor ?? 0) : 0), 0),
                  moeda,
                )}
              </span>
            </span>
          </div>
        ) : null}

        <div className="px-4 py-3">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">Mensagem</p>
          <FloatingLabelInput
            as="textarea"
            label="Mensagem"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            className="min-h-[220px]"
          />
        </div>
      </div>
    </HeaderBarModal>
  );
}
