import { useEffect, useState } from 'react';
import { HeaderBarModal } from '@/components/ui/HeaderBarModal';
import { FloatingLabelInput } from '@/components/ui/FloatingLabelInput';
import { Switch } from '@/components/ui/Switch';
import { toast } from '@/components/ui/Toast';
import { cleanIpcError } from '@/lib/cleanIpcError';
import { ipcService } from '@/services/ipcService';
import type { Contentor, RevisaoCargaPendente, SugestaoContacto } from '@/types';

interface RevisarCargaPendenteModalProps {
  open: boolean;
  onClose: () => void;
  pendenteId: string | null;
  onDone: () => void;
}

type DecisaoContacto = 'sugestao' | 'novo';

function decisaoInicial(sugestao: SugestaoContacto | undefined): DecisaoContacto {
  return sugestao?.sugestaoId ? 'sugestao' : 'novo';
}

export function RevisarCargaPendenteModal({
  open,
  onClose,
  pendenteId,
  onDone,
}: RevisarCargaPendenteModalProps): React.JSX.Element {
  const [revisao, setRevisao] = useState<RevisaoCargaPendente | null>(null);
  const [contentores, setContentores] = useState<Contentor[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [motivoRejeicao, setMotivoRejeicao] = useState('');
  const [rejeitando, setRejeitando] = useState(false);

  const [contentorId, setContentorId] = useState('');
  const [nome, setNome] = useState('');
  const [comprimentoCm, setComprimentoCm] = useState('');
  const [larguraCm, setLarguraCm] = useState('');
  const [alturaCm, setAlturaCm] = useState('');
  const [pesoKg, setPesoKg] = useState('');
  const [valor, setValor] = useState('');
  const [pago, setPago] = useState(false);
  const [decisaoEmissor, setDecisaoEmissor] = useState<DecisaoContacto>('novo');
  const [decisaoRecetor, setDecisaoRecetor] = useState<DecisaoContacto>('novo');

  useEffect(() => {
    if (!open || !pendenteId) return;
    setLoading(true);
    setError(null);
    setRejeitando(false);
    setMotivoRejeicao('');
    Promise.all([ipcService.sync.revisarCarga(pendenteId), ipcService.contentores.list({ estado: 'aberto' })])
      .then(([rev, listaContentores]) => {
        setRevisao(rev);
        setContentores(listaContentores);
        setContentorId(rev.pendente.contentorId);
        setNome(rev.pendente.nomeCarga);
        setComprimentoCm(rev.pendente.comprimentoCm != null ? String(rev.pendente.comprimentoCm) : '');
        setLarguraCm(rev.pendente.larguraCm != null ? String(rev.pendente.larguraCm) : '');
        setAlturaCm(rev.pendente.alturaCm != null ? String(rev.pendente.alturaCm) : '');
        setPesoKg(rev.pendente.pesoKg != null ? String(rev.pendente.pesoKg) : '');
        setValor(rev.pendente.valor != null ? String(rev.pendente.valor) : '');
        setPago(rev.pendente.pago);
        const sugEmissor = rev.sugestoes.find((s) => s.campo === 'emissor');
        const sugRecetor = rev.sugestoes.find((s) => s.campo === 'recetor');
        setDecisaoEmissor(decisaoInicial(sugEmissor));
        setDecisaoRecetor(decisaoInicial(sugRecetor));
      })
      .catch((err: unknown) => setError(cleanIpcError(err)))
      .finally(() => setLoading(false));
  }, [open, pendenteId]);

  if (!pendenteId) return <></>;

  const sugestaoEmissor = revisao?.sugestoes.find((s) => s.campo === 'emissor');
  const sugestaoRecetor = revisao?.sugestoes.find((s) => s.campo === 'recetor');

  async function handleImportar(): Promise<void> {
    if (!pendenteId || !revisao) return;
    setSubmitting(true);
    setError(null);
    try {
      await ipcService.sync.importarCarga({
        pendenteId,
        contentorId,
        emissorId: decisaoEmissor === 'sugestao' ? sugestaoEmissor?.sugestaoId ?? null : null,
        recetorId: decisaoRecetor === 'sugestao' ? sugestaoRecetor?.sugestaoId ?? null : null,
        nome,
        comprimentoCm: comprimentoCm ? Number(comprimentoCm) : null,
        larguraCm: larguraCm ? Number(larguraCm) : null,
        alturaCm: alturaCm ? Number(alturaCm) : null,
        pesoKg: pesoKg ? Number(pesoKg) : null,
        valor: valor ? Number(valor) : null,
        pago,
      });
      toast.success('Carga importada.');
      onDone();
      onClose();
    } catch (err) {
      setError(cleanIpcError(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRejeitar(): Promise<void> {
    if (!pendenteId) return;
    if (!motivoRejeicao.trim()) {
      setError('Indica o motivo da rejeição.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await ipcService.sync.rejeitarCarga(pendenteId, motivoRejeicao.trim());
      toast.success('Carga pendente rejeitada.');
      onDone();
      onClose();
    } catch (err) {
      setError(cleanIpcError(err));
    } finally {
      setSubmitting(false);
    }
  }

  function renderContactoConflito(
    campo: 'emissor' | 'recetor',
    sugestao: SugestaoContacto | undefined,
    decisao: DecisaoContacto,
    setDecisao: (d: DecisaoContacto) => void,
  ): React.JSX.Element | null {
    if (!sugestao) return null;
    const label = campo === 'emissor' ? 'Emissor' : 'Recetor';
    return (
      <div className="rounded-control border border-border bg-bg-app p-3">
        <p className="text-[12px] font-medium text-text-secondary">{label} — "{sugestao.nomeOriginal}"</p>
        {sugestao.sugestaoId ? (
          <div className="mt-2 flex flex-col gap-1.5">
            <label className="flex items-center gap-2 text-[13px] text-text-primary">
              <input
                type="radio"
                checked={decisao === 'sugestao'}
                onChange={() => setDecisao('sugestao')}
              />
              Associar a contacto existente: <span className="font-medium">{sugestao.sugestaoNome}</span>
            </label>
            <label className="flex items-center gap-2 text-[13px] text-text-primary">
              <input type="radio" checked={decisao === 'novo'} onChange={() => setDecisao('novo')} />
              Criar novo contacto "{sugestao.nomeOriginal}"
            </label>
          </div>
        ) : (
          <p className="mt-1 text-[12px] text-text-tertiary">Sem correspondência — será criado um novo contacto.</p>
        )}
      </div>
    );
  }

  return (
    <HeaderBarModal
      open={open}
      onClose={onClose}
      title="Rever Carga Pendente (PWA)"
      widthClassName="max-w-[560px]"
      footer={
        rejeitando ? (
          <>
            <button
              type="button"
              onClick={() => setRejeitando(false)}
              className="rounded-control px-4 py-2 text-[13px] font-medium text-text-secondary transition-colors hover:bg-bg-app"
            >
              Voltar
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => void handleRejeitar()}
              className="rounded-control bg-error px-4 py-2 text-[13px] font-medium text-white transition-colors hover:brightness-95 disabled:opacity-60"
            >
              {submitting ? 'A rejeitar...' : 'Confirmar Rejeição'}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setRejeitando(true)}
              className="rounded-control px-4 py-2 text-[13px] font-medium text-error transition-colors hover:bg-bg-app"
            >
              Rejeitar
            </button>
            <button
              type="button"
              disabled={submitting || loading}
              onClick={() => void handleImportar()}
              className="rounded-control bg-primary px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
            >
              {submitting ? 'A importar...' : 'Importar'}
            </button>
          </>
        )
      }
    >
      {loading || !revisao ? (
        <p className="text-[13px] text-text-tertiary">A carregar...</p>
      ) : rejeitando ? (
        <div className="flex flex-col gap-3">
          <p className="text-[13px] text-text-secondary">
            Indica ao utilizador PWA porque é que esta carga não foi aceite.
          </p>
          <FloatingLabelInput
            as="textarea"
            label="Motivo da rejeição"
            value={motivoRejeicao}
            onChange={(e) => setMotivoRejeicao(e.target.value)}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-[12px] text-text-tertiary">Inserida por {revisao.pendente.inseridoPorNome} via PWA</p>

          <FloatingLabelInput
            as="select"
            label="Contentor de destino"
            value={contentorId}
            onChange={(e) => setContentorId(e.target.value)}
          >
            {contentores.map((c) => (
              <option key={c.id} value={c.id}>
                {c.codigo} — {c.nome}
              </option>
            ))}
          </FloatingLabelInput>

          <FloatingLabelInput label="Nome da carga" value={nome} onChange={(e) => setNome(e.target.value)} />

          <div className="grid grid-cols-3 gap-2">
            <FloatingLabelInput
              label="Comprimento (cm)"
              type="number"
              value={comprimentoCm}
              onChange={(e) => setComprimentoCm(e.target.value)}
            />
            <FloatingLabelInput
              label="Largura (cm)"
              type="number"
              value={larguraCm}
              onChange={(e) => setLarguraCm(e.target.value)}
            />
            <FloatingLabelInput
              label="Altura (cm)"
              type="number"
              value={alturaCm}
              onChange={(e) => setAlturaCm(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <FloatingLabelInput label="Peso (kg)" type="number" value={pesoKg} onChange={(e) => setPesoKg(e.target.value)} />
            <FloatingLabelInput label="Valor" type="number" value={valor} onChange={(e) => setValor(e.target.value)} />
          </div>

          <Switch checked={pago} onChange={setPago} label="Pago" />

          {renderContactoConflito('emissor', sugestaoEmissor, decisaoEmissor, setDecisaoEmissor)}
          {renderContactoConflito('recetor', sugestaoRecetor, decisaoRecetor, setDecisaoRecetor)}

          {error ? <p className="text-[13px] text-error">{error}</p> : null}
        </div>
      )}
      {rejeitando && error ? <p className="mt-2 text-[13px] text-error">{error}</p> : null}
    </HeaderBarModal>
  );
}
