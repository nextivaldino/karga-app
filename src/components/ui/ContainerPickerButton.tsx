import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { CaretDown, Check, DownloadSimple, Lock, Stack } from '@phosphor-icons/react';
import { ESTADO_CONTENTOR_COLOR_CLASS, ESTADO_CONTENTOR_LABEL } from '@/constants/labels';
import { LISTA_BG, LISTA_INK } from '@/modules/contentores/listaVisual';
import type { Contentor } from '@/types';

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function formatMesReferencia(mesReferencia: string): string {
  const [ano, mes] = mesReferencia.split('-');
  const idx = Number(mes) - 1;
  return `${MESES[idx] ?? mes} ${ano}`;
}

function formatValor(valor: number): string {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(valor);
}

// Uma cor pastel por mês (não por contentor individual) — todos os
// contentores do mesmo `mesReferencia` partilham o tom, para o olho
// agrupar visualmente sem precisar de reler o cabeçalho do grupo.
const MES_TINTS = ['var(--color-primary)', 'var(--color-success)', 'var(--color-warning)', 'var(--color-purple)'];

function agruparPorMes(contentores: Contentor[]): [string, Contentor[]][] {
  const mapa = new Map<string, Contentor[]>();
  for (const c of contentores) {
    const lista = mapa.get(c.mesReferencia) ?? [];
    lista.push(c);
    mapa.set(c.mesReferencia, lista);
  }
  return [...mapa.entries()].sort((a, b) => b[0].localeCompare(a[0]));
}

interface ContainerPickerButtonProps {
  contentores: Contentor[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading?: boolean;
  // Cor do ponto de estado sobreposto ao ícone do gatilho — usado para
  // sinalizar "há um filtro ativo" sem precisar de texto extra.
  indicatorDotClass?: string;
  // Ação rápida de exportar (PDF) diretamente na linha do contentor, sem
  // precisar de fechar o menu e ir ao menu de contexto da página.
  onExport?: (contentor: Contentor) => void;
  // Secção extra ao fundo do menu (ex: filtro de pagamento) — o menu
  // passa a ser "contêiner + filtros" num só sítio, estilo Windows,
  // em vez de dois popups separados.
  extraSection?: ReactNode;
}

// Gatilho estilo "título de página" (ícone + texto em negrito + seta) em
// vez de um combobox com moldura. Ao clicar, abre um menu completo — não
// só a lista de contentores com as suas estatísticas, mas também (via
// `extraSection`) os filtros relevantes dessa lista, tudo no mesmo
// painel. O painel usa sempre o tema OPOSTO ao da app (`.theme-invert`,
// ver theme.css) — um popover de contraste, como os menus do Windows.
export function ContainerPickerButton({
  contentores,
  selectedId,
  onSelect,
  loading = false,
  indicatorDotClass,
  onExport,
  extraSection,
}: ContainerPickerButtonProps): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = contentores.find((c) => c.id === selectedId) ?? null;
  const grupos = agruparPorMes(contentores);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent): void {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('mousedown', onClickOutside);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('mousedown', onClickOutside);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={ref} className={`relative inline-block ${open ? 'theme-invert' : ''}`}>
      <button
        type="button"
        disabled={loading || contentores.length === 0}
        onClick={() => setOpen((v) => !v)}
        className={`relative z-[51] flex items-center gap-2 px-3 py-1 text-text-primary transition-colors disabled:cursor-default disabled:opacity-60 ${
          open
            ? 'rounded-t-[14px] border border-b-0 border-border bg-bg-surface shadow-lg'
            : 'rounded-control border border-transparent hover:bg-[var(--toolbar-hover)]'
        }`}
      >
        <span className="relative shrink-0">
          <Stack size={23} className="text-success" />
          {indicatorDotClass ? (
            <span
              className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-pill border-2 ${indicatorDotClass}`}
              style={{ borderColor: open ? 'var(--bg-surface)' : 'var(--toolbar-bg)' }}
            />
          ) : null}
        </span>
        <span className="flex min-w-0 flex-col items-start">
          <span className="truncate text-[22.5px] font-semibold leading-tight">
            {loading ? 'A carregar...' : contentores.length === 0 ? 'Nenhum contentor aberto' : (selected?.nome ?? 'Selecionar')}
          </span>
          {!loading && contentores.length > 0 ? (
            <span className="truncate text-[11px] font-normal leading-tight text-text-secondary">
              {contentores.length} contentor{contentores.length === 1 ? '' : 'es'} ativo{contentores.length === 1 ? '' : 's'}
            </span>
          ) : null}
        </span>
        {!loading && contentores.length > 0 ? (
          <CaretDown size={18} className={`shrink-0 text-text-secondary transition-transform ${open ? 'rotate-180' : ''}`} />
        ) : null}
      </button>

      {open ? (
        <div className="absolute left-0 top-full z-50 w-[400px] overflow-hidden rounded-b-[13px] rounded-tr-[13px] border-x border-b border-border bg-bg-surface shadow-lg">
          <div className="px-3.5 pb-2 pt-2.5 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
            Contentores Ativos
          </div>
          <div className="max-h-[300px] overflow-y-auto pb-1.5">
            {grupos.map(([mes, itens], mesIndex) => {
              const tint = MES_TINTS[mesIndex % MES_TINTS.length];
              return (
                <div key={mes}>
                  <div className="px-3.5 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-text-secondary">
                    {formatMesReferencia(mes)}
                  </div>
                  {itens.map((c) => {
                    const isSelected = c.id === selectedId;
                    return (
                      <div
                        key={c.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          onSelect(c.id);
                          setOpen(false);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            onSelect(c.id);
                            setOpen(false);
                          }
                        }}
                        style={{ backgroundColor: `color-mix(in srgb, ${tint} ${isSelected ? 24 : 6}%, var(--bg-surface))` }}
                        className={`group flex w-full cursor-pointer flex-col gap-1 border-l-2 px-3.5 py-2.5 text-left transition-colors hover:brightness-95 ${
                          isSelected ? 'border-success' : 'border-transparent'
                        } ${c.bloqueado ? 'opacity-60' : ''}`}
                      >
                        <span className="flex items-center gap-2">
                          <Stack
                            size={15}
                            weight={isSelected ? 'fill' : 'regular'}
                            className={`shrink-0 ${ESTADO_CONTENTOR_COLOR_CLASS[c.estado]}`}
                          />
                          <span
                            className={`min-w-0 flex-1 truncate text-[14px] text-text-primary ${isSelected ? 'font-semibold' : 'font-medium'}`}
                          >
                            {c.codigo} — {c.nome}
                          </span>
                          {c.ehLista ? (
                            <span
                              className="shrink-0 rounded-pill px-1.5 py-0.5 text-[10px] font-semibold"
                              style={{ backgroundColor: LISTA_BG, color: LISTA_INK }}
                            >
                              Lista
                            </span>
                          ) : null}
                          {c.bloqueado ? <Lock size={12} weight="fill" className="shrink-0 text-error" /> : null}
                          <span className={`shrink-0 text-[11px] font-semibold ${ESTADO_CONTENTOR_COLOR_CLASS[c.estado]}`}>
                            {ESTADO_CONTENTOR_LABEL[c.estado]}
                          </span>
                          {isSelected ? <Check size={14} weight="bold" className="shrink-0 text-success" /> : null}
                          {onExport ? (
                            <button
                              type="button"
                              title="Exportar lista (PDF)"
                              onClick={(e) => {
                                e.stopPropagation();
                                onExport(c);
                              }}
                              className="shrink-0 rounded-control p-1 text-text-secondary opacity-0 transition-opacity hover:bg-bg-surface hover:text-primary group-hover:opacity-100"
                            >
                              <DownloadSimple size={14} />
                            </button>
                          ) : null}
                        </span>
                        <span className="pl-[23px] text-[12px] text-text-secondary">
                          {c.totalCargas} carga{c.totalCargas === 1 ? '' : 's'} · {formatValor(c.valorTotal)}
                          {c.diasParado != null ? ` · parado há ${c.diasParado}d` : ''}
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {extraSection ? (
            <div className="border-t border-border bg-bg-app">{extraSection}</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
