import { useEffect, useState } from 'react';
import { ipcService } from '@/services/ipcService';
import type { Contentor } from '@/types';

const ULTIMO_CONTENTOR_KEY = 'ultimo_contentor_ativo';

// "Contentor ativo" — o mesmo conceito partilhado entre Cargas e
// Contentores (e futuramente Home): qual o contentor aberto que o
// utilizador está a trabalhar agora. Persistido em `settings` para
// sobreviver a trocas de página/reinícios da app.
export function useContentorAtivo() {
  const [contentoresAbertos, setContentoresAbertos] = useState<Contentor[]>([]);
  const [selectedContentorId, setSelectedContentorId] = useState<string | null>(null);
  const [loadingContentores, setLoadingContentores] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([ipcService.contentores.list({ estado: 'aberto' }), ipcService.settings.get(ULTIMO_CONTENTOR_KEY)]).then(
      ([abertos, savedId]) => {
        if (cancelled) return;
        setContentoresAbertos(abertos);
        const initial = abertos.find((c) => c.id === savedId) ?? abertos[0] ?? null;
        setSelectedContentorId(initial?.id ?? null);
        setLoadingContentores(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  function selectContentor(id: string): void {
    setSelectedContentorId(id);
    void ipcService.settings.set(ULTIMO_CONTENTOR_KEY, id);
  }

  const selectedContentor = contentoresAbertos.find((c) => c.id === selectedContentorId) ?? null;

  return { contentoresAbertos, selectedContentorId, selectedContentor, selectContentor, loadingContentores };
}
