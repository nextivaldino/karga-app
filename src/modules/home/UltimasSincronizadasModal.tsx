import { useEffect, useState } from 'react';
import { HeaderBarModal } from '@/components/ui/HeaderBarModal';
import { CargasList } from '@/modules/cargas/CargasList';
import { useNavigation } from '@/hooks/useNavigation';
import { ipcService } from '@/services/ipcService';
import type { CargaComEmissor } from '@/types';

const LIMITE_MODAL = 100;

interface UltimasSincronizadasModalProps {
  open: boolean;
  onClose: () => void;
  nomeOrigemPwa: Map<string, string>;
  avatarOrigemPwa: Map<string, string | null>;
}

// Popup "ver tudo" do widget de sincronização da Home — reaproveita a
// mesma `CargasList` da página Cargas (mesmas colunas, ícones, cores),
// só que com todas as cargas sincronizadas via PWA, não só as últimas 8.
export function UltimasSincronizadasModal({
  open,
  onClose,
  nomeOrigemPwa,
  avatarOrigemPwa,
}: UltimasSincronizadasModalProps): React.JSX.Element {
  const { navigate } = useNavigation();
  const [cargas, setCargas] = useState<CargaComEmissor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    void ipcService.home.ultimasSincronizadas(LIMITE_MODAL).then((dados) => {
      setCargas(dados);
      setLoading(false);
    });
  }, [open]);

  return (
    <HeaderBarModal
      open={open}
      onClose={onClose}
      title="Cargas Sincronizadas"
      widthClassName="max-w-[1100px]"
      footer={
        <button
          type="button"
          onClick={() => {
            onClose();
            navigate('cargas');
          }}
          className="rounded-pill bg-primary px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-primary-hover"
        >
          Ver mais na lista de Cargas
        </button>
      }
    >
      <div className="h-[60vh] overflow-hidden rounded-control border border-border">
        <CargasList
          cargas={cargas}
          loading={loading}
          emptyMessage="Ainda não há cargas sincronizadas."
          onSelectCarga={(carga) => {
            onClose();
            navigate('cargas', { entidadeId: carga.id });
          }}
          densidade="compacta"
          nomeOrigemPwa={nomeOrigemPwa}
          avatarOrigemPwa={avatarOrigemPwa}
        />
      </div>
    </HeaderBarModal>
  );
}
