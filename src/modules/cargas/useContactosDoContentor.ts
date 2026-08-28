import { useCallback, useEffect, useState } from 'react';
import { ipcService } from '@/services/ipcService';
import type { ContactoComContagem } from '@/types';

export function useContactosDoContentor(contentorId: string | null) {
  const [contactos, setContactos] = useState<ContactoComContagem[]>([]);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    if (!contentorId) {
      setContactos([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void ipcService.contactos.listPorContentor(contentorId).then((items) => {
      if (cancelled) return;
      setContactos(items);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [contentorId, version]);

  return { contactos, loading, refresh };
}
