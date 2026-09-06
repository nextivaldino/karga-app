import { useEffect, useRef, useState } from 'react';
import { ArrowsClockwise, GearSix, MagicWand } from '@phosphor-icons/react';
import { ContextToolbar } from '@/components/layout/ContextToolbar';
import { ContainerPickerButton } from '@/components/ui/ContainerPickerButton';
import { Switch } from '@/components/ui/Switch';
import { SincronizacaoCargaCard } from '@/modules/cargas/SincronizacaoCargaCard';
import { useSincronizacaoRapida } from '@/modules/cargas/useSincronizacaoRapida';
import { SincronizacaoView } from '@/modules/sync/SincronizacaoView';
import { useContentorAtivo } from '@/hooks/useContentorAtivo';
import { useNavigation } from '@/hooks/useNavigation';
import { usePreferenciasUI } from '@/hooks/usePreferenciasUI';
import { SYNC_HEADER_BG, SYNC_INK } from '@/modules/sync/syncVisual';

// Página dedicada — a mesma barra de sincronização (pill âmbar,
// centrada) que aparece em Home/Cargas/Contentores, só que na versão
// "grande" (é o motivo de existir desta página), com o seletor de
// contentor à esquerda e os atalhos de página à direita — exatamente o
// mesmo esquema das outras páginas, só que aqui é o assunto principal.
// Por baixo, a lista completa de revisão (`SincronizacaoView`).
export function Sync(): React.JSX.Element {
  const { contentoresAbertos, selectedContentorId, selectContentor, loadingContentores } = useContentorAtivo();
  const { navigate } = useNavigation();
  const { autoSincronizar, setAutoSincronizar } = usePreferenciasUI();
  // `SincronizacaoView` recarrega-se sozinha ao ser remontada — depois
  // de uma importação ou de "Atualizar", basta trocar a `key`.
  const [refreshKey, setRefreshKey] = useState(0);
  // Só para saber se há cargas pendentes — a mesma pergunta que a aba
  // Sync já faz para decidir se fica amarela (MainTabs.tsx). A barra
  // segue a aba: enquanto houver algo por sincronizar, fica exatamente
  // da mesma cor, para o "flare" da aba se fundir sem emenda com ela.
  // Também é usado para o "Sincronizar automático": quando ligado, entra
  // sozinho assim que aparece algo sem conflito — com conflito continua
  // sempre a exigir "Rever" manual, nunca é resolvido às escondidas.
  const { total, semConflito, selecionado, handleSincronizarEm } = useSincronizacaoRapida(
    contentoresAbertos,
    selectedContentorId,
    () => setRefreshKey((k) => k + 1),
  );
  const amarela = total > 0;
  const autoEmCursoRef = useRef(false);

  useEffect(() => {
    if (!autoSincronizar || autoEmCursoRef.current) return;
    if (semConflito.length === 0 || !selecionado) return;

    const nomes = semConflito.map((r) => r.pendente.nomeCarga);
    autoEmCursoRef.current = true;
    void handleSincronizarEm(selecionado, [...semConflito]).finally(() => {
      autoEmCursoRef.current = false;
      if (typeof Notification === 'undefined') return;
      const corpo = nomes.length > 6 ? `${nomes.slice(0, 6).join(', ')} e mais ${nomes.length - 6}` : nomes.join(', ');
      if (Notification.permission === 'granted') {
        new Notification(`${nomes.length} carga${nomes.length === 1 ? '' : 's'} sincronizada${nomes.length === 1 ? '' : 's'} automaticamente`, {
          body: corpo,
        });
      } else if (Notification.permission !== 'denied') {
        void Notification.requestPermission();
      }
    });
  }, [autoSincronizar, semConflito, selecionado, handleSincronizarEm]);

  return (
    <div className="flex h-full flex-col">
      <ContextToolbar style={amarela ? { backgroundColor: SYNC_HEADER_BG } : undefined}>
        <ContainerPickerButton
          contentores={contentoresAbertos}
          selectedId={selectedContentorId}
          onSelect={selectContentor}
          loading={loadingContentores}
        />

        {/* h-12 (48px) é a altura real do pill "grande" fechado (h-10 do
            botão + p-1 de cada lado) — com essa altura explícita,
            -translate-y-1/2 centra a caixa de referência na barra tal
            como o resto dos elementos, e o cartão nasce encostado ao topo
            dela, só crescendo para baixo ao abrir. */}
        <div className="absolute left-1/2 top-1/2 z-40 h-12 -translate-x-1/2 -translate-y-1/2">
          <SincronizacaoCargaCard
            contentoresAbertos={contentoresAbertos}
            selectedContentorId={selectedContentorId}
            onImported={() => setRefreshKey((k) => k + 1)}
            onSelectContentor={selectContentor}
            grande
          />
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-3">
          <label
            title="Entra sozinho assim que chega uma carga sem conflito — com conflito continua sempre a exigir revisão manual."
            className="flex shrink-0 items-center gap-1.5 text-[12px] font-medium"
            style={{ color: amarela ? SYNC_INK : undefined }}
          >
            <MagicWand size={13} className={amarela ? '' : 'text-text-secondary'} />
            <span className={amarela ? '' : 'text-text-secondary'}>Automático</span>
            <Switch checked={autoSincronizar} onChange={setAutoSincronizar} />
          </label>

          <div className="h-4 w-px shrink-0" style={{ backgroundColor: amarela ? 'rgba(26,18,0,0.2)' : 'var(--border)' }} />

          <button
            type="button"
            onClick={() => setRefreshKey((k) => k + 1)}
            style={{ color: amarela ? SYNC_INK : undefined }}
            className={`flex items-center gap-1.5 rounded-control px-2.5 py-1.5 text-[12px] font-medium transition-colors ${
              amarela ? 'hover:bg-black/10' : 'text-text-secondary hover:bg-[var(--toolbar-hover)]'
            }`}
          >
            <ArrowsClockwise size={13} /> Atualizar
          </button>
          <button
            type="button"
            onClick={() => navigate('configuracoes', { secao: 'sincronizacao' })}
            title="Configurações de sincronização"
            style={{ color: amarela ? SYNC_INK : undefined }}
            className={`flex items-center gap-1.5 rounded-control px-2.5 py-1.5 text-[12px] font-medium transition-colors ${
              amarela ? 'hover:bg-black/10' : 'text-text-secondary hover:bg-[var(--toolbar-hover)]'
            }`}
          >
            <GearSix size={14} weight="fill" />
            <span className="hidden sm:inline">Config.</span>
          </button>
        </div>
      </ContextToolbar>

      <div className="flex-1 overflow-y-auto p-xl">
        <div className="mx-auto max-w-[1200px]">
          <SincronizacaoView key={refreshKey} />
        </div>
      </div>
    </div>
  );
}
