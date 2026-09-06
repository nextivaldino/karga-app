import { useState } from 'react';
import { ArrowUpRight, CheckCircle as CheckCircle2, Package, Plus, MagnifyingGlass as Search } from '@phosphor-icons/react';
import { ModuleIcon, type ModuleIconName } from '@/components/icons/ModuleIcon';
import { ContextToolbar } from '@/components/layout/ContextToolbar';
import { CollapsibleSection } from '@/components/ui/CollapsibleSection';
import { ContainerPickerButton } from '@/components/ui/ContainerPickerButton';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { useHomeData } from '@/modules/home/useHomeData';
import { ROW_TINTS } from '@/modules/cargas/CargasList';
import { SincronizacaoCargaCard } from '@/modules/cargas/SincronizacaoCargaCard';
import { SYNC_HEADER_BG, SYNC_INK } from '@/modules/sync/syncVisual';
import { UsersAvatarBar } from '@/modules/home/UsersAvatarBar';
import { UltimasSincronizadasModal } from '@/modules/home/UltimasSincronizadasModal';
import { useAuth } from '@/modules/auth/AuthContext';
import { useNavigation } from '@/hooks/useNavigation';
import { useContentorAtivo } from '@/hooks/useContentorAtivo';
import { formatValor } from '@/lib/formatValor';
import { formatRelativeTime } from '@/lib/formatRelativeTime';
import { openGlobalSearch } from '@/lib/openGlobalSearch';

const SYNC_LIST_COLUMNS = [
  { key: 'codigo', label: 'Código', width: '90px' },
  { key: 'nome', label: 'Nome', width: '1fr' },
  { key: 'emissor', label: 'Emissor', width: '1fr' },
  { key: 'user', label: 'Enviado por', width: '180px' },
  { key: 'valor', label: 'Valor', width: '90px' },
  { key: 'pagamento', label: 'Pagamento', width: '96px' },
  { key: 'quando', label: '', width: '84px' },
] as const;
const SYNC_LIST_GRID = SYNC_LIST_COLUMNS.map((c) => c.width).join(' ');

function saudacao(): string {
  const hora = new Date().getHours();
  if (hora < 12) return 'Bom dia';
  if (hora < 20) return 'Boa tarde';
  return 'Boa noite';
}

export function Home(): React.JSX.Element {
  const { loading, resumo, ultimasSincronizadas, origensPwa, usuarios, moeda, refresh } = useHomeData();
  const { user } = useAuth();
  const { navigate } = useNavigation();
  const { contentoresAbertos, selectedContentorId, selectContentor, loadingContentores } = useContentorAtivo();
  const [sincronizadasModalOpen, setSincronizadasModalOpen] = useState(false);

  const currencyFormatter = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: moeda });
  const nomeOrigemPwa = new Map(origensPwa.map((o) => [o.userId, o.nome]));
  const avatarOrigemPwa = new Map(usuarios.map((u) => [u.id, u.avatar]));
  const usuariosPorId = new Map(usuarios.map((u) => [u.id, { name: u.name, avatar: u.avatar }]));

  const widgets: {
    label: string;
    value: string | number;
    iconModule: ModuleIconName | null;
    pastelBg: string;
    onClick: () => void;
  }[] = [
    {
      label: 'Cargas (mês)',
      value: resumo?.totalCargasMes ?? 0,
      iconModule: 'cargas',
      pastelBg: 'bg-primary/10',
      onClick: () => navigate('cargas'),
    },
    {
      label: 'Contentores Abertos',
      value: resumo?.contentoresAbertos ?? 0,
      iconModule: 'contentores',
      pastelBg: 'bg-success/10',
      onClick: () => navigate('contentores'),
    },
    {
      label: 'Valor Devido',
      value: currencyFormatter.format(resumo?.valorDevido ?? 0),
      iconModule: 'faturacao',
      pastelBg: 'bg-warning/10',
      onClick: () => navigate('cargas'),
    },
    {
      label: 'Entregues (mês)',
      value: resumo?.entregues ?? 0,
      iconModule: null,
      pastelBg: 'bg-purple/10',
      onClick: () => navigate('cargas'),
    },
  ];

  return (
    <div className="flex h-full flex-col">
      <ContextToolbar>
        <ContainerPickerButton
          contentores={contentoresAbertos}
          selectedId={selectedContentorId}
          onSelect={selectContentor}
          loading={loadingContentores}
        />
        {/* h-11 (44px) é a altura real do pill fechado (h-8 + p-1.5 de
            cada lado) — com essa altura explícita, -translate-y-1/2 centra
            a caixa de referência na barra tal como os outros elementos, e
            o cartão (filho normal, não absoluto) nasce encostado ao topo
            dela, só crescendo para baixo ao abrir em vez de também para cima. */}
        <div className="absolute left-1/2 top-1/2 z-40 h-11 -translate-x-1/2 -translate-y-1/2">
          <SincronizacaoCargaCard
            contentoresAbertos={contentoresAbertos}
            selectedContentorId={selectedContentorId}
            onImported={refresh}
            onSelectContentor={selectContentor}
          />
        </div>
        <div className="ml-auto mr-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('cargas', { novaCarga: '1' })}
            className="flex h-9 items-center gap-1.5 rounded-pill px-4 text-[13px] font-semibold shadow-sm transition-colors hover:brightness-95"
            style={{ backgroundColor: SYNC_HEADER_BG, color: SYNC_INK }}
          >
            <Plus size={16} weight="bold" /> Nova Carga
          </button>
        </div>
      </ContextToolbar>

      <div className="relative flex-1 overflow-hidden">
      {/* Fundo radial leve + brilhos suaves — mesma linguagem decorativa da
          Home do Kraga Mobile, adaptada à escala do desktop. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 18% 0%, color-mix(in srgb, var(--color-primary) 10%, transparent) 0%, transparent 45%), radial-gradient(circle at 100% 25%, color-mix(in srgb, var(--color-success) 8%, transparent) 0%, transparent 40%)',
        }}
      />
      <div className="pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 top-[420px] h-64 w-64 rounded-full bg-success/10 blur-3xl" />

      <div className="relative h-full overflow-y-auto p-xl">
        <div className="mx-auto flex max-w-[860px] flex-col gap-xl">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <ModuleIcon module="kraga" size={22} />
            </span>
            <div>
              <h1 className="text-[17px] font-semibold text-text-primary">
                {saudacao()}{user ? `, ${user.name.split(' ')[0]}` : ''}
              </h1>
              <p className="text-[12px] text-text-tertiary">Tudo o que precisas de saber agora, num só sítio.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={openGlobalSearch}
            className="flex items-center gap-3 rounded-control border border-border bg-bg-surface px-4 py-3 text-left text-[14px] text-text-tertiary shadow-sm transition-colors hover:border-primary"
          >
            <Search size={18} />
            Pesquisar em tudo...
          </button>

          <CollapsibleSection
            title="Resumo do Sistema"
            storageKey="resumo"
            summary={
              <div className="flex flex-wrap items-center gap-2">
                {widgets.map((widget) => (
                  <button
                    key={widget.label}
                    type="button"
                    onClick={widget.onClick}
                    className={`flex items-center gap-2 rounded-pill px-3 py-1.5 text-[12px] transition-transform hover:scale-[1.03] ${widget.pastelBg}`}
                  >
                    {widget.iconModule ? (
                      <ModuleIcon module={widget.iconModule} size={14} />
                    ) : (
                      <CheckCircle2 size={14} weight="fill" className="text-purple" />
                    )}
                    <span key={widget.value} className="animate-karga-fade font-semibold text-text-primary">
                      {loading ? '—' : widget.value}
                    </span>
                    <span className="text-text-secondary">{widget.label}</span>
                  </button>
                ))}
                <UsersAvatarBar variant="pill" />
              </div>
            }
          >
            <div className="grid grid-cols-2 gap-md sm:grid-cols-4">
              {widgets.map((widget) => (
                <button
                  key={widget.label}
                  type="button"
                  onClick={widget.onClick}
                  className={`flex flex-col items-start gap-2 rounded-surface p-lg text-left transition-transform hover:scale-[1.02] ${widget.pastelBg}`}
                >
                  {widget.iconModule ? <ModuleIcon module={widget.iconModule} size={22} /> : <CheckCircle2 size={22} weight="fill" className="text-purple" />}
                  <span key={widget.value} className="animate-karga-fade text-[22px] font-semibold text-text-primary">
                    {loading ? '—' : widget.value}
                  </span>
                  <span className="text-[12px] text-text-secondary">{widget.label}</span>
                </button>
              ))}
              <UsersAvatarBar variant="card" />
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            title="Últimas Cargas Sincronizadas"
            storageKey="sincronizadas"
            actions={
              <button
                type="button"
                onClick={() => setSincronizadasModalOpen(true)}
                className="text-[12px] font-medium text-primary"
              >
                Ver tudo ›
              </button>
            }
            summary={
              ultimasSincronizadas.length === 0 ? (
                <div className="flex items-center gap-2 rounded-control border border-dashed border-border bg-bg-app/40 p-md text-[13px] text-text-tertiary">
                  <Package size={16} className="shrink-0 opacity-60" />
                  Ainda não há cargas sincronizadas via PWA.
                </div>
              ) : (
                (() => {
                  const maisRecente = ultimasSincronizadas[0]!;
                  const nomePwa = maisRecente.origemPwaUserId ? nomeOrigemPwa.get(maisRecente.origemPwaUserId) : null;
                  const avatarPwa = maisRecente.origemPwaUserId ? avatarOrigemPwa.get(maisRecente.origemPwaUserId) : null;
                  return (
                    <button
                      type="button"
                      onClick={() => setSincronizadasModalOpen(true)}
                      className="flex w-full items-center gap-3 rounded-control bg-primary/[0.06] px-4 py-2.5 text-left text-[13px] transition-colors hover:bg-primary/10"
                    >
                      <Package size={16} className="shrink-0 text-primary" />
                      <span key={ultimasSincronizadas.length} className="animate-karga-fade font-medium text-text-primary">
                        {ultimasSincronizadas.length} carga{ultimasSincronizadas.length === 1 ? '' : 's'} sincronizada
                        {ultimasSincronizadas.length === 1 ? '' : 's'}
                      </span>
                      {nomePwa ? (
                        <span className="flex min-w-0 shrink-0 items-center gap-1.5 text-text-secondary">
                          <span className="text-text-tertiary">·</span>
                          <UserAvatar avatar={avatarPwa} size={16} />
                          <span className="truncate">{nomePwa}</span>
                        </span>
                      ) : null}
                      <span className="ml-auto shrink-0 text-text-tertiary">{formatRelativeTime(maisRecente.createdAt)}</span>
                    </button>
                  );
                })()
              )
            }
          >
            {ultimasSincronizadas.length === 0 ? (
              <div className="flex items-center gap-2 rounded-control border border-dashed border-border p-md text-[13px] text-text-tertiary">
                <Package size={16} className="shrink-0 opacity-60" />
                Ainda não há cargas sincronizadas via PWA.
              </div>
            ) : (
              <div className="overflow-hidden rounded-control border border-border">
                <div
                  className="grid border-b border-border bg-bg-surface px-md text-[11px] font-semibold uppercase tracking-wide text-text-tertiary"
                  style={{ gridTemplateColumns: SYNC_LIST_GRID }}
                >
                  {SYNC_LIST_COLUMNS.map((col) => (
                    <div key={col.key} className="truncate py-2">
                      {col.label}
                    </div>
                  ))}
                </div>
                {ultimasSincronizadas.map((carga, i) => {
                  const nomePwa = carga.origemPwaUserId ? nomeOrigemPwa.get(carga.origemPwaUserId) : null;
                  const avatarPwa = carga.origemPwaUserId ? avatarOrigemPwa.get(carga.origemPwaUserId) : null;
                  const tint = ROW_TINTS[i % ROW_TINTS.length];
                  return (
                    <button
                      key={carga.id}
                      type="button"
                      onClick={() => navigate('cargas', { entidadeId: carga.id })}
                      className="grid w-full cursor-pointer items-center px-md py-2 text-left text-[13px] text-text-primary transition-[filter] hover:brightness-95"
                      style={{
                        gridTemplateColumns: SYNC_LIST_GRID,
                        backgroundColor: `color-mix(in srgb, ${tint} 5%, var(--bg-surface))`,
                      }}
                    >
                      <span className="truncate font-medium">{carga.codigo}</span>
                      <span className="min-w-0 truncate">{carga.nome}</span>
                      <span className="flex min-w-0 items-center gap-1 text-text-secondary">
                        <ArrowUpRight size={12} className="shrink-0 text-primary" />
                        <span className="truncate">{carga.emissorNome}</span>
                      </span>
                      <span className="flex min-w-0 items-center gap-1.5 text-text-secondary">
                        {nomePwa ? (
                          <>
                            <UserAvatar avatar={avatarPwa} size={18} />
                            <span className="truncate">{nomePwa}</span>
                          </>
                        ) : (
                          '—'
                        )}
                      </span>
                      <span className="truncate text-text-secondary">{formatValor(carga.valor, carga.moeda)}</span>
                      <span>
                        <span
                          className={`rounded-pill px-2 py-0.5 text-[11px] font-medium ${
                            carga.estadoPagamento === 'pago' ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'
                          }`}
                        >
                          {carga.estadoPagamento === 'pago' ? 'Pago' : 'Devido'}
                        </span>
                      </span>
                      <span className="truncate text-right text-[11px] text-text-tertiary">
                        {formatRelativeTime(carga.createdAt)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </CollapsibleSection>

          <UltimasSincronizadasModal
            open={sincronizadasModalOpen}
            onClose={() => setSincronizadasModalOpen(false)}
            usuariosPorId={usuariosPorId}
          />

          <section>
            <h2 className="mb-sm text-[14px] font-semibold text-text-primary">Atalhos Rápidos</h2>
            <div className="flex gap-sm">
              <button
                type="button"
                onClick={() => navigate('cargas', { novaCarga: '1' })}
                className="flex items-center gap-1.5 rounded-pill px-4 py-2 text-[13px] font-semibold shadow-sm transition-colors hover:brightness-95"
                style={{ backgroundColor: SYNC_HEADER_BG, color: SYNC_INK }}
              >
                <Plus size={16} weight="bold" /> Nova Carga
              </button>
              <button
                type="button"
                onClick={() => navigate('contentores')}
                className="flex items-center gap-1.5 rounded-pill bg-primary px-4 py-2 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-primary-hover"
              >
                <Plus size={16} /> Novo Contentor
              </button>
            </div>
          </section>
        </div>
      </div>
      </div>
    </div>
  );
}
