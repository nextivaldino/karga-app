import { useCallback, useEffect, useMemo, useState } from 'react';
import { ipcService } from '@/services/ipcService';
import type { Contentor, EstadoContentor } from '@/types';

export type ViewMode = 'lista' | 'icones';

const LIMITE_DIAS_PARADO_DEFAULT = 14;

export function useContentoresPage() {
  const [contentores, setContentores] = useState<Contentor[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('icones');
  const [mostrarOcultos, setMostrarOcultos] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState<EstadoContentor | ''>('');
  const [filtroMes, setFiltroMes] = useState('');
  const [version, setVersion] = useState(0);
  const [limiteDiasParado, setLimiteDiasParado] = useState(LIMITE_DIAS_PARADO_DEFAULT);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    void ipcService.settings.get('dias_contentor_parado').then((valor) => {
      const parsed = valor ? Number(valor) : NaN;
      if (Number.isFinite(parsed) && parsed > 0) setLimiteDiasParado(parsed);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void ipcService.contentores.list({ incluirOcultos: mostrarOcultos }).then((items) => {
      if (cancelled) return;
      setContentores(items);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [mostrarOcultos, version]);

  const mesesDisponiveis = useMemo(() => {
    return [...new Set(contentores.map((c) => c.mesReferencia))].sort((a, b) => b.localeCompare(a));
  }, [contentores]);

  const filtrados = useMemo(() => {
    let lista = contentores;
    if (filtroEstado) lista = lista.filter((c) => c.estado === filtroEstado);
    if (filtroMes) lista = lista.filter((c) => c.mesReferencia === filtroMes);
    return lista;
  }, [contentores, filtroEstado, filtroMes]);

  return {
    contentores: filtrados,
    mesesDisponiveis,
    loading,
    viewMode,
    setViewMode,
    mostrarOcultos,
    setMostrarOcultos,
    filtroEstado,
    setFiltroEstado,
    filtroMes,
    setFiltroMes,
    limiteDiasParado,
    refresh,
  };
}
