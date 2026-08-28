import { CheckCircle2, Container, Package, Plus, Search, Wallet } from 'lucide-react';
import { ContextToolbar } from '@/components/layout/ContextToolbar';
import { useHomeData } from '@/modules/home/useHomeData';
import { useNavigation } from '@/hooks/useNavigation';
import { formatRelativeTime } from '@/lib/formatRelativeTime';
import { openGlobalSearch } from '@/lib/openGlobalSearch';
import { ESTADO_CONTENTOR_COLOR_CLASS, ESTADO_CONTENTOR_LABEL } from '@/constants/labels';

const ESTADO_PASTEL_BG: Record<string, string> = {
  aberto: 'bg-success/10',
  fechado: 'bg-text-tertiary/10',
  em_transito: 'bg-primary/10',
  entregue: 'bg-success/10',
  bloqueado: 'bg-error/10',
};

export function Home(): React.JSX.Element {
  const { loading, resumo, contentoresAtivos, ultimasCargas, moeda } = useHomeData();
  const { navigate } = useNavigation();

  const currencyFormatter = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: moeda });

  const widgets = [
    {
      label: 'Cargas (mês)',
      value: resumo?.totalCargasMes ?? 0,
      icon: Package,
      colorClass: 'text-warning',
      pastelBg: 'bg-warning/10',
      onClick: () => navigate('cargas'),
    },
    {
      label: 'Contentores Abertos',
      value: resumo?.contentoresAbertos ?? 0,
      icon: Container,
      colorClass: 'text-success',
      pastelBg: 'bg-success/10',
      onClick: () => navigate('contentores'),
    },
    {
      label: 'Valor Devido',
      value: currencyFormatter.format(resumo?.valorDevido ?? 0),
      icon: Wallet,
      colorClass: 'text-warning',
      pastelBg: 'bg-warning/10',
      onClick: () => navigate('cargas'),
    },
    {
      label: 'Entregues (mês)',
      value: resumo?.entregues ?? 0,
      icon: CheckCircle2,
      colorClass: 'text-success',
      pastelBg: 'bg-success/10',
      onClick: () => navigate('cargas'),
    },
  ];

  return (
    <div className="flex h-full flex-col">
      <ContextToolbar>
        <span className="text-[13px] font-medium text-text-secondary">Home</span>
      </ContextToolbar>

      <div className="flex-1 overflow-y-auto p-xl">
        <div className="mx-auto flex max-w-[860px] flex-col gap-xl">
          <button
            type="button"
            onClick={openGlobalSearch}
            className="flex items-center gap-3 rounded-control border border-border bg-bg-surface px-4 py-3 text-left text-[14px] text-text-tertiary shadow-sm transition-colors hover:border-primary"
          >
            <Search size={18} />
            Pesquisar em tudo...
          </button>

          <div className="grid grid-cols-2 gap-md sm:grid-cols-4">
            {widgets.map((widget) => {
              const Icon = widget.icon;
              return (
                <button
                  key={widget.label}
                  type="button"
                  onClick={widget.onClick}
                  className={`flex flex-col items-start gap-2 rounded-surface p-lg text-left transition-transform hover:scale-[1.02] ${widget.pastelBg}`}
                >
                  <Icon size={22} className={widget.colorClass} />
                  <span className="text-[22px] font-semibold text-text-primary">{loading ? '—' : widget.value}</span>
                  <span className="text-[12px] text-text-secondary">{widget.label}</span>
                </button>
              );
            })}
          </div>

          <section>
            <div className="mb-sm flex items-center justify-between">
              <h2 className="text-[14px] font-semibold text-text-primary">Contentores Ativos</h2>
              <button
                type="button"
                onClick={() => navigate('contentores')}
                className="text-[12px] font-medium text-primary"
              >
                Ver todos ›
              </button>
            </div>
            {contentoresAtivos.length === 0 ? (
              <p className="text-[13px] text-text-tertiary">Nenhum contentor aberto ou em trânsito.</p>
            ) : (
              <div className="grid grid-cols-2 gap-sm sm:grid-cols-3 md:grid-cols-4">
                {contentoresAtivos.map((contentor) => (
                  <button
                    key={contentor.id}
                    type="button"
                    onClick={() => navigate('contentores', { id: contentor.id })}
                    className={`flex flex-col items-start gap-1 rounded-control p-md text-left transition-transform hover:scale-[1.02] ${
                      ESTADO_PASTEL_BG[contentor.estado] ?? 'bg-bg-app'
                    }`}
                  >
                    <span className="text-[13px] font-medium text-text-primary">{contentor.codigo}</span>
                    <span className={`text-[12px] ${ESTADO_CONTENTOR_COLOR_CLASS[contentor.estado]}`}>
                      {ESTADO_CONTENTOR_LABEL[contentor.estado]}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="mb-sm flex items-center justify-between">
              <h2 className="text-[14px] font-semibold text-text-primary">Últimas Cargas Inseridas</h2>
              <button type="button" onClick={() => navigate('cargas')} className="text-[12px] font-medium text-primary">
                Ver todas ›
              </button>
            </div>
            {ultimasCargas.length === 0 ? (
              <p className="text-[13px] text-text-tertiary">Ainda não há cargas registadas.</p>
            ) : (
              <div className="flex flex-col divide-y divide-border">
                {ultimasCargas.map((carga) => (
                  <div key={carga.id} className="flex items-center gap-3 px-1 py-2.5 text-[13px]">
                    <span className="font-medium text-text-primary">{carga.codigo}</span>
                    <span className="text-text-secondary">{carga.nome}</span>
                    <span className="text-text-tertiary">{carga.emissorNome}</span>
                    <span className="ml-auto shrink-0 text-text-tertiary">{formatRelativeTime(carga.createdAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-sm text-[14px] font-semibold text-text-primary">Atalhos Rápidos</h2>
            <div className="flex gap-sm">
              <button
                type="button"
                onClick={() => navigate('cargas')}
                className="flex items-center gap-1.5 rounded-control bg-primary px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-primary-hover"
              >
                <Plus size={16} /> Nova Carga
              </button>
              <button
                type="button"
                onClick={() => navigate('contentores')}
                className="flex items-center gap-1.5 rounded-control border border-border bg-bg-surface px-4 py-2 text-[13px] font-medium text-text-primary transition-colors hover:bg-bg-app"
              >
                <Plus size={16} /> Novo Contentor
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
