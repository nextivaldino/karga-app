import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ArrowsClockwise } from '@phosphor-icons/react';

// Distância mínima puxada para disparar o refresh, e o máximo que o
// indicador se afasta do topo (resistência elástica) — valores ao
// estilo dos apps nativos (iOS/Android), não configuráveis por página.
const LIMIAR_PX = 64;
const RESISTENCIA_MAX_PX = 90;

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: ReactNode;
  className?: string;
  // Repassado ao onScroll nativo do contentor — usado pelo Cargas Hub
  // (docs/26 §6) para esconder o FAB ao dar scroll, sem precisar de um
  // ref próprio para o mesmo elemento.
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
}

// Gesto "puxar para atualizar" — só arranca quando o próprio container
// já está no topo (scrollTop 0), para não interferir com o scroll normal
// da lista. Cada página passa o seu próprio `onRefresh` (recarrega os
// dados que essa página mostra), este componente só trata do gesto e do
// indicador visual.
export function PullToRefresh({ onRefresh, children, className, onScroll }: PullToRefreshProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const puxandoRef = useRef(false);
  const [distancia, setDistancia] = useState(0);
  const [atualizando, setAtualizando] = useState(false);

  function onTouchStart(e: React.TouchEvent<HTMLDivElement>): void {
    if (atualizando) return;
    const el = containerRef.current;
    if (!el || el.scrollTop > 0) {
      puxandoRef.current = false;
      return;
    }
    puxandoRef.current = true;
    containerRef.current!.dataset.startY = String(e.touches[0]!.clientY);
  }

  function onTouchMove(e: React.TouchEvent<HTMLDivElement>): void {
    if (!puxandoRef.current) return;
    const startY = Number(containerRef.current?.dataset.startY ?? 0);
    const delta = e.touches[0]!.clientY - startY;
    if (delta <= 0) {
      setDistancia(0);
      return;
    }
    // Resistência elástica — cada px puxado conta cada vez menos.
    setDistancia(Math.min(RESISTENCIA_MAX_PX, delta * 0.5));
  }

  async function onTouchEnd(): Promise<void> {
    if (!puxandoRef.current) return;
    puxandoRef.current = false;
    if (distancia < LIMIAR_PX) {
      setDistancia(0);
      return;
    }
    setAtualizando(true);
    setDistancia(LIMIAR_PX * 0.7);
    try {
      await onRefresh();
    } finally {
      setAtualizando(false);
      setDistancia(0);
    }
  }

  const rodar = distancia > 0 || atualizando;
  const anguloArrasto = Math.min(distancia / LIMIAR_PX, 1) * 360;

  return (
    <div
      ref={containerRef}
      className={`relative overflow-y-auto overscroll-contain ${className ?? ''}`}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={() => void onTouchEnd()}
      onScroll={onScroll}
    >
      {rodar ? (
        <div
          className="pointer-events-none sticky top-0 z-10 flex items-center justify-center overflow-hidden transition-[height] duration-150"
          style={{ height: distancia }}
        >
          <ArrowsClockwise
            size={18}
            className={`text-text-tertiary ${atualizando ? 'animate-spin' : ''}`}
            style={atualizando ? undefined : { transform: `rotate(${anguloArrasto}deg)` }}
          />
        </div>
      ) : null}
      {children}
    </div>
  );
}
