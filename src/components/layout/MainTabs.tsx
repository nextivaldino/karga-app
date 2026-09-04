import { useEffect, useState } from 'react';
import { CaretDoubleLeft as ChevronsLeft } from '@phosphor-icons/react';
import type { MainPage, ModuloPermissao } from '@/types';
import { useNavigation } from '@/hooks/useNavigation';
import { usePermissoes } from '@/hooks/usePermissoes';
import { ipcService } from '@/services/ipcService';
import { ModuleIcon, type ModuleIconName } from '@/components/icons/ModuleIcon';
import { SYNC_HEADER_BG, SYNC_INK } from '@/modules/sync/syncVisual';

const TABS: {
  page: MainPage;
  label: string;
  iconModule: ModuleIconName;
  colorClass: string;
  modulo: ModuloPermissao | null;
}[] = [
  { page: 'home', label: 'Home', iconModule: 'home', colorClass: 'text-primary', modulo: null },
  { page: 'cargas', label: 'Cargas', iconModule: 'cargas', colorClass: 'text-warning', modulo: 'cargas' },
  { page: 'contentores', label: 'Contentores', iconModule: 'contentores', colorClass: 'text-success', modulo: 'contentores' },
  { page: 'sync', label: 'Sync', iconModule: 'sincronizacao', colorClass: 'text-warning', modulo: 'cargas' },
];

// Abas ao estilo autêntico do separador de abas do Chrome — ver
// docs/08-DESIGN-SYSTEM.md secção 4b para a receita completa. Resumo:
// - Silhueta: topo arredondado + "flare" côncavo na base (TabFlare abaixo).
// - A ativa funde-se com o conteúdo por baixo: mesma cor plana do
//   ContextToolbar em todas as páginas (var(--toolbar-bg), sem tinta por
//   módulo — abandonámos a cor por página). Todas as páginas de topo têm
//   agora `ContextToolbar`, incluindo a Home.
// - As inativas têm um tom de repouso permanente (var(--toolbar-hover)),
//   distinto do fundo do cabeçalho e da cor cheia da ativa; hover reforça
//   para var(--bg-app).
// - Cada aba colapsa para só-ícone via o chevron que aparece no hover.
const FLARE_RADIUS = 10;
const COLLAPSED_WIDTH = 44;
const EXPANDED_WIDTH = 128;
// Folga no topo da aba — ~10% da altura do cabeçalho (48px) — para não
// ficar encostada à altura toda da barra. O botão exterior mantém-se a
// 100% da altura via items-stretch (encaixe exato, zero arredondamento
// possível); é o retângulo INTERIOR que fica mais baixo, começando
// `TAB_TOP_GAP`px abaixo do topo mas colado ao fundo do botão exterior
// (`bottom-0` dentro de uma caixa que já é exata) — assim a base nunca
// tem folga fracionária a separar a aba da sub-barra por baixo (o bug
// que tínhamos com `items-end` + altura explícita: a base ficava a meio
// pixel do sítio certo, e essa fresta deixava a cor do cabeçalho aparecer
// como uma linha fina).
const TAB_TOP_GAP = 5;

function TabFlare({ side, tabColor }: { side: 'left' | 'right'; tabColor: string }): React.JSX.Element {
  // O círculo tem de estar centrado no canto EXTERIOR-SUPERIOR da
  // caixinha (não no canto próximo da aba) — só assim a tangente da curva
  // fica vertical no topo (continua o lado reto da aba) e horizontal no
  // fundo (encontra a base a direito), sem "cotovelo" a meio. Verificado
  // isoladamente em scratchpad/tab-shape-test.html antes de aplicar aqui.
  const corner = side === 'left' ? 'top left' : 'top right';
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute bottom-0 ${side === 'left' ? '-left-[10px]' : '-right-[10px]'}`}
      style={{
        width: FLARE_RADIUS,
        height: FLARE_RADIUS,
        // Transparente perto do centro (canto exterior, fica "vazio"),
        // cor da aba longe do centro (perto da aba e da base). Transparente
        // em vez de uma cor fixa deixa o que estiver mesmo por trás
        // (vizinho ativo/inativo, ou o header simples) aparecer sem
        // costura, sem depender de adivinhar a cor certa.
        background: `radial-gradient(circle at ${corner}, transparent ${FLARE_RADIUS}px, ${tabColor} ${FLARE_RADIUS}px)`,
      }}
    />
  );
}

export function MainTabs(): React.JSX.Element {
  const { page, navigate } = useNavigation();
  const { pode } = usePermissoes();
  // Por definição só Home e Cargas (as páginas de uso mais frequente)
  // começam expandidas com o nome visível — Contentores e Sync
  // arrancam minimizadas (só ícone), expandindo assim que o utilizador
  // clica nelas (handleTabClick já trata disso) ou o pedir manualmente.
  const [colapsadas, setColapsadas] = useState<Partial<Record<MainPage, boolean>>>({
    contentores: true,
    sync: true,
  });
  const [pendentesSync, setPendentesSync] = useState(0);

  useEffect(() => {
    async function carregar(): Promise<void> {
      const pendentes = await ipcService.sync.listPendentes();
      setPendentesSync(pendentes.length);
    }
    void carregar();
    const interval = setInterval(() => void carregar(), 60_000);
    return () => clearInterval(interval);
  }, []);

  function handleTabClick(tab: MainPage, estaColapsada: boolean): void {
    if (estaColapsada) setColapsadas((prev) => ({ ...prev, [tab]: false }));
    if (page !== tab) navigate(tab);
  }

  function handleColapsar(e: React.MouseEvent, tab: MainPage): void {
    e.stopPropagation();
    setColapsadas((prev) => ({ ...prev, [tab]: true }));
  }

  return (
    <nav className="flex h-[var(--chrome-header-h)] items-stretch">
      {TABS.filter((tab) => tab.modulo === null || pode(tab.modulo, 'ver')).map((tab) => {
        const active = page === tab.page;
        const colapsada = Boolean(colapsadas[tab.page]);
        // A aba "Sync" funde-se com a barra amarela da sua própria
        // página (não a `--toolbar-bg` neutra das restantes) — sem isto
        // ficava sempre com uma emenda visível entre a aba ativa e a
        // barra por baixo. Texto/ícone passam a usar a tinta escura do
        // sistema de sincronização (fixa, não depende do tema) em vez
        // da cor de identidade do módulo/tema, que perde contraste em
        // cima de amarelo.
        // Só fica amarela enquanto houver mesmo cargas por rever/sincronizar
        // — assim que fica tudo em dia, a aba volta ao tom neutro das
        // outras, tal como a própria barra "pro" já faz (verde quando não
        // há nada pendente).
        const isSync = tab.page === 'sync' && pendentesSync > 0;
        const tabColor = isSync ? SYNC_HEADER_BG : 'var(--toolbar-bg)';
        return (
          <button
            key={tab.page}
            type="button"
            onClick={() => handleTabClick(tab.page, colapsada)}
            title={colapsada ? tab.label : undefined}
            style={{ WebkitAppRegion: 'no-drag', width: colapsada ? COLLAPSED_WIDTH : EXPANDED_WIDTH } as React.CSSProperties}
            className="group relative shrink-0 transition-[width] duration-150"
          >
            {/* Corpo visual da aba — preenche do `TAB_TOP_GAP` até ao fundo
                exato do botão exterior (que já ocupa 100% do cabeçalho via
                items-stretch), garantindo fusão sem fresta com a barra por
                baixo mesmo com a aba mais baixa que o cabeçalho. */}
            <div
              style={{
                top: TAB_TOP_GAP,
                backgroundColor: active ? tabColor : 'var(--toolbar-hover)',
                color: active && isSync ? SYNC_INK : undefined,
              }}
              className={`absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 rounded-t-[10px] px-3 text-[13px] font-medium transition-colors ${
                active ? (isSync ? '' : 'text-text-primary') : 'text-text-secondary group-hover:bg-bg-app group-hover:text-text-primary'
              }`}
            >
              {active ? (
                <>
                  <TabFlare side="left" tabColor={tabColor} />
                  <TabFlare side="right" tabColor={tabColor} />
                </>
              ) : null}
              <span className="relative shrink-0">
                <ModuleIcon module={tab.iconModule} size={18} colorOverride={active && isSync ? SYNC_INK : undefined} />
                {tab.page === 'sync' && pendentesSync > 0 ? (
                  <span
                    style={{ borderColor: active ? tabColor : 'var(--toolbar-hover)' }}
                    className="absolute -right-2 -top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-pill border-2 bg-error px-0.5 text-[8px] font-bold text-white"
                  >
                    {pendentesSync > 99 ? '99+' : pendentesSync}
                  </span>
                ) : null}
              </span>
              {!colapsada ? (
                <span className={`whitespace-nowrap ${active && !isSync ? tab.colorClass : ''}`}>{tab.label}</span>
              ) : null}
              {/* Botão de colapsar sobreposto (não ocupa espaço no layout
                  normal da aba) — só aparece no hover, para não obrigar a
                  aba a ficar mais larga só para lhe dar lugar permanente. */}
              {!colapsada ? (
                <button
                  type="button"
                  onClick={(e) => handleColapsar(e, tab.page)}
                  title="Colapsar aba"
                  style={{ backgroundColor: active ? tabColor : 'var(--bg-app)' }}
                  className="absolute right-1 top-1/2 -translate-y-1/2 rounded-[4px] p-0.5 text-text-tertiary opacity-0 transition-opacity hover:text-text-primary group-hover:opacity-100"
                >
                  <ChevronsLeft size={12} />
                </button>
              ) : null}
            </div>
          </button>
        );
      })}
    </nav>
  );
}
