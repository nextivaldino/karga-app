import { useEffect, useState } from 'react';
import { ArrowsClockwise as RefreshCw, Lightning as Zap } from '@phosphor-icons/react';
import { HeaderBarModal } from '@/components/ui/HeaderBarModal';
import { useNavigation } from '@/hooks/useNavigation';
import { toast } from '@/components/ui/Toast';
import { ipcService } from '@/services/ipcService';
import { SYNC_GREEN, SYNC_HEADER_BG } from '@/modules/sync/syncVisual';
import type { RevisaoCargaPendente } from '@/types';

function temConflito(r: RevisaoCargaPendente): boolean {
  return r.sugestoes.some((s) => s.sugestaoId != null && !s.automatico);
}

// Vive no AppShell (não na Home) — monta uma única vez por sessão, logo a
// seguir ao login, e verifica de imediato se há cargas do Kraga Mobile por
// sincronizar. Garante que ninguém depende de reparar no card da Home ou no
// sino da barra superior para não perder uma carga.
export function SincronizacaoLoginModal(): React.JSX.Element | null {
  const { navigate } = useNavigation();
  const [revisao, setRevisao] = useState<RevisaoCargaPendente[] | null>(null);
  const [open, setOpen] = useState(false);
  const [importando, setImportando] = useState(false);

  useEffect(() => {
    let cancelado = false;
    ipcService.sync
      .listPendentesComSugestoes()
      .then((dados) => {
        if (cancelado) return;
        setRevisao(dados);
        if (dados.length > 0) setOpen(true);
      })
      .catch(() => undefined);
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!open || revisao == null || revisao.length === 0) return null;

  const semConflito = revisao.filter((r) => !temConflito(r));
  const comConflito = revisao.length - semConflito.length;

  async function handleImportarRapido(): Promise<void> {
    setImportando(true);
    let sucesso = 0;
    let falhas = 0;
    for (const r of semConflito) {
      const sugEmissor = r.sugestoes.find((s) => s.campo === 'emissor');
      const sugRecetor = r.sugestoes.find((s) => s.campo === 'recetor');
      try {
        await ipcService.sync.importarCarga({
          pendenteId: r.pendente.id,
          contentorId: r.pendente.contentorId,
          emissorId: sugEmissor?.sugestaoId ?? null,
          recetorId: sugRecetor?.sugestaoId ?? null,
          nome: r.pendente.nomeCarga,
          comprimentoCm: r.pendente.comprimentoCm,
          larguraCm: r.pendente.larguraCm,
          alturaCm: r.pendente.alturaCm,
          pesoKg: r.pendente.pesoKg,
          valor: r.pendente.valor,
          pago: r.pendente.pago,
        });
        sucesso += 1;
      } catch {
        falhas += 1;
      }
    }
    setImportando(false);
    setOpen(false);
    if (sucesso > 0) toast.success(`${sucesso} carga${sucesso === 1 ? '' : 's'} sincronizada${sucesso === 1 ? '' : 's'}.`);
    if (falhas > 0) toast.warning(`${falhas} carga${falhas === 1 ? '' : 's'} falharam ao sincronizar — revê em Sincronização.`);
  }

  return (
    <HeaderBarModal
      open={open}
      onClose={() => setOpen(false)}
      title="Cargas à espera de sincronização"
      widthClassName="max-w-[440px]"
      footer={
        <>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-control px-4 py-2 text-[13px] font-medium text-text-secondary transition-colors hover:bg-bg-app"
          >
            Mais tarde
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              navigate('sync');
            }}
            className="rounded-control border border-border px-4 py-2 text-[13px] font-medium text-text-primary transition-colors hover:bg-bg-app"
          >
            Rever tudo
          </button>
          {semConflito.length > 0 ? (
            <button
              type="button"
              disabled={importando}
              onClick={() => void handleImportarRapido()}
              className="flex items-center gap-1.5 rounded-control px-4 py-2 text-[13px] font-medium text-white transition-colors disabled:opacity-60"
              style={{ backgroundColor: SYNC_GREEN }}
            >
              <Zap size={14} /> {importando ? 'A sincronizar...' : `Sincronizar ${semConflito.length} agora`}
            </button>
          ) : null}
        </>
      }
    >
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: SYNC_HEADER_BG }}>
          <RefreshCw size={20} style={{ color: SYNC_GREEN }} />
        </span>
        <p className="text-[13px] text-text-secondary">
          <span className="font-semibold text-text-primary">
            {revisao.length} carga{revisao.length === 1 ? '' : 's'}
          </span>{' '}
          chegaram do Kraga Mobile e ainda não estão no sistema — {semConflito.length} sem conflito
          {comConflito > 0 ? `, ${comConflito} a precisar de revisão` : ''}.
        </p>
      </div>
    </HeaderBarModal>
  );
}
