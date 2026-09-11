import { useEffect, useRef, useState } from 'react';
import { Bell, ArrowsClockwise, UserCircle, Gear, SignOut } from '@phosphor-icons/react';
import { useAuth } from '@/hooks/useAuth';
import { useFilaOffline } from '@/hooks/useFilaOffline';
import { useCargasHub } from '@/hooks/useCargasHub';
import { useNavigation } from '@/hooks/useNavigation';
import { obterMeuPosto } from '@/lib/data';
import { formatRelativo } from '@/lib/formatRelativo';
import type { MeuPostoInfo } from '@/types';

// Ilha dinâmica — o próprio menu principal da app (docs/26 §4), não só
// um indicador de estado. Pílula preta 100×26, expande a partir de si
// própria (mesma posição) para 316×328 revelando utilizador,
// notificações, sincronização, perfil, definições e sair. Substitui por
// completo qualquer dropdown de utilizador/sino de notificações
// tradicional — não há mais nada solto no topbar.
export function DynamicIslandMenu(): React.JSX.Element {
  const { pwaUser, logout } = useAuth();
  const { fila } = useFilaOffline();
  const { ultimaSincronizacao } = useCargasHub();
  const { navigate } = useNavigation();
  const [aberta, setAberta] = useState(false);
  const [posto, setPosto] = useState<MeuPostoInfo | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void obterMeuPosto()
      .then(setPosto)
      .catch(() => setPosto(null));
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent): void {
      if (aberta && ref.current && !ref.current.contains(e.target as Node)) setAberta(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [aberta]);

  const notificacoes = fila.filter((f) => f.estado === 'erro').length;
  const iniciais = (pwaUser?.nome ?? '?')
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  function irPara(pagina: 'definicoes'): void {
    setAberta(false);
    navigate(pagina);
  }

  return (
    <div
      ref={ref}
      onClick={() => setAberta((v) => !v)}
      className="fixed left-1/2 z-[45] cursor-pointer overflow-hidden bg-black"
      style={{
        top: 'calc(env(safe-area-inset-top) + 14px)',
        transform: 'translateX(-50%)',
        width: aberta ? 316 : 100,
        height: aberta ? 328 : 26,
        borderRadius: aberta ? 30 : 20,
        boxShadow: '0 0 0 1px rgba(255,255,255,0.06)',
        transition: 'width .48s cubic-bezier(.32,.88,.32,1), height .48s cubic-bezier(.32,.88,.32,1), border-radius .4s ease',
      }}
    >
      {!aberta ? (
        <span
          className="absolute right-2.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-primary"
          style={{ opacity: notificacoes > 0 ? 1 : 0, transition: 'opacity .2s ease' }}
        />
      ) : null}

      <div
        className="flex h-full flex-col px-4 pb-3 pt-4"
        style={{
          opacity: aberta ? 1 : 0,
          pointerEvents: aberta ? 'auto' : 'none',
          transition: aberta ? 'opacity .25s ease .18s' : 'none',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2.5 flex shrink-0 items-center justify-between">
          <span className="text-[13px] font-semibold text-white">Menu</span>
          <button type="button" onClick={() => setAberta(false)} className="text-[15px] leading-none text-white/45">
            ✕
          </button>
        </div>

        <div className="mb-1.5 flex shrink-0 items-center gap-2.5 border-b border-white/[0.09] pb-3.5 pt-2">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-[#241609]"
            style={{ background: 'linear-gradient(145deg, var(--copper-strong), var(--copper))' }}
          >
            {iniciais}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13.5px] font-semibold text-white">{pwaUser?.nome ?? '—'}</p>
            <p className="mt-0.5 truncate text-[11px] text-white/40">{posto ? `Posto · ${posto.nome}` : 'Sem posto associado'}</p>
          </div>
        </div>

        <button
          type="button"
          className="flex shrink-0 items-center gap-2.5 rounded-[11px] px-1.5 py-2 text-left text-[13px] text-white/85 active:bg-white/[0.08]"
        >
          <Bell size={16} className="shrink-0 text-white/55" />
          Notificações
          <span className={`ml-auto text-[11px] ${notificacoes > 0 ? 'text-warning' : 'text-white/40'}`}>
            {notificacoes > 0 ? `${notificacoes} ${notificacoes === 1 ? 'nova' : 'novas'}` : 'sem novas'}
          </span>
        </button>

        <button
          type="button"
          className="flex shrink-0 items-center gap-2.5 rounded-[11px] px-1.5 py-2 text-left text-[13px] text-white/85 active:bg-white/[0.08]"
        >
          <ArrowsClockwise size={16} className="shrink-0 text-white/55" />
          Sincronização
          <span className="ml-auto text-[11px] text-white/40">{ultimaSincronizacao ? formatRelativo(ultimaSincronizacao) : '—'}</span>
        </button>

        <button
          type="button"
          onClick={() => irPara('definicoes')}
          className="flex shrink-0 items-center gap-2.5 rounded-[11px] px-1.5 py-2 text-left text-[13px] text-white/85 active:bg-white/[0.08]"
        >
          <UserCircle size={16} className="shrink-0 text-white/55" />
          Perfil
        </button>

        <button
          type="button"
          onClick={() => irPara('definicoes')}
          className="flex shrink-0 items-center gap-2.5 rounded-[11px] px-1.5 py-2 text-left text-[13px] text-white/85 active:bg-white/[0.08]"
        >
          <Gear size={16} className="shrink-0 text-white/55" />
          Definições
        </button>

        <button
          type="button"
          onClick={() => void logout()}
          className="flex shrink-0 items-center gap-2.5 rounded-[11px] px-1.5 py-2 text-left text-[13px] text-error active:bg-white/[0.08]"
        >
          <SignOut size={16} className="shrink-0 text-error" />
          Sair
        </button>
      </div>
    </div>
  );
}
