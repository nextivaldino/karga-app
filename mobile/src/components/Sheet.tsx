import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
}

// Overlay/folha genérica reutilizável (docs/26 §8) — cobre Adicionar/
// editar carga, opções de carga, editar contacto e WhatsApp. Nasce do
// canto inferior direito (onde vive o FAB), não do centro — timings e
// transform-origin exatos do karga-mobile-v02-mockup.html.
export function Sheet({ open, onClose, title, subtitle, children }: SheetProps): React.JSX.Element | null {
  const [entrada, setEntrada] = useState(false);

  useEffect(() => {
    if (!open) {
      setEntrada(false);
      return;
    }
    const frame = requestAnimationFrame(() => setEntrada(true));
    return () => cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      style={{ background: 'rgba(6,9,13,0.55)', backdropFilter: 'blur(2px)', opacity: entrada ? 1 : 0, transition: 'opacity .3s ease' }}
      onClick={onClose}
    >
      <div
        className="max-h-[88%] w-full overflow-y-auto rounded-t-[28px] border border-b-0 border-border-strong px-5 pb-6 pt-2.5"
        style={{
          background: 'linear-gradient(180deg, rgba(24,32,42,0.97), rgba(14,19,25,0.99))',
          transformOrigin: 'bottom right',
          transform: entrada ? 'translateY(0) scale(1)' : 'translateY(30px) scale(0.94)',
          opacity: entrada ? 1 : 0,
          transition: 'transform .38s cubic-bezier(.28,.9,.32,1.05), opacity .28s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3.5 mt-1 h-1 w-9 rounded-full bg-white/20" />
        {title ? <p className="text-[16px] font-bold leading-tight text-text-primary">{title}</p> : null}
        {subtitle ? <p className="mb-4 text-[12px] text-text-tertiary">{subtitle}</p> : null}
        {children}
      </div>
    </div>
  );
}
