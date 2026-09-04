import { useState } from 'react';
import { toast } from '@/components/ui/Toast';
import { cleanIpcError } from '@/lib/cleanIpcError';
import { ipcService } from '@/services/ipcService';
import { SincronizacaoBarraPro } from '@/modules/sync/SincronizacaoBarraPro';
import { SincronizacaoView } from '@/modules/sync/SincronizacaoView';
import { useContentorAtivo } from '@/hooks/useContentorAtivo';
import type { CargaPendente } from '@/types';

// Página dedicada — a barra "pro" no topo (mesmo tom amarelo do resto
// do sistema de sincronização) junta o seletor de contentor/lista, as
// estatísticas por utilizador PWA, o atalho para criar uma lista nova
// e agora também Histórico/Atualizar (no tom mais claro, à direita) —
// por baixo, a lista completa de revisão (`SincronizacaoView`) — um
// único hub, em vez de a revisão só existir escondida dentro de
// Definições e os controlos espalhados por dois sítios.
export function Sync(): React.JSX.Element {
  const { contentoresAbertos, selectedContentorId, selectContentor, loadingContentores } = useContentorAtivo();
  // `SincronizacaoView` recarrega-se sozinha ao ser remontada — depois
  // de uma importação ou de "Atualizar" na barra, basta trocar a `key`.
  const [refreshKey, setRefreshKey] = useState(0);
  const [historicoAberto, setHistoricoAberto] = useState(false);
  const [historico, setHistorico] = useState<CargaPendente[] | null>(null);
  const [historicoLoading, setHistoricoLoading] = useState(false);

  function toggleHistorico(): void {
    setHistoricoAberto((v) => !v);
    if (historico == null) {
      setHistoricoLoading(true);
      ipcService.sync
        .listarHistorico()
        .then(setHistorico)
        .catch((err: unknown) => toast.error(cleanIpcError(err)))
        .finally(() => setHistoricoLoading(false));
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-border shadow-sm">
        <SincronizacaoBarraPro
          contentoresAbertos={contentoresAbertos}
          selectedContentorId={selectedContentorId}
          onSelectContentor={selectContentor}
          loadingContentores={loadingContentores}
          onImported={() => setRefreshKey((k) => k + 1)}
          historicoAberto={historicoAberto}
          onToggleHistorico={toggleHistorico}
          onAtualizar={() => setRefreshKey((k) => k + 1)}
        />
      </div>

      <div className="flex-1 overflow-y-auto p-xl">
        <div className="mx-auto max-w-[720px]">
          <SincronizacaoView key={refreshKey} historicoAberto={historicoAberto} historico={historico} historicoLoading={historicoLoading} />
        </div>
      </div>
    </div>
  );
}
