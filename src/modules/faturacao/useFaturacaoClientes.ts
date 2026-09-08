import { useCallback, useEffect, useState } from 'react';
import { ipcService } from '@/services/ipcService';
import type { ClienteFaturacao, Etiqueta } from '@/types';

// Consolida duas fontes: o agregado por cliente (faturacao:resumoPorCliente
// — só clientes com cargas, já filtrado por contentor/dívida) com os dados
// completos do contacto (telefone/email/morada/nif — resumoPorCliente só
// devolve nome/telefone) e as etiquetas atribuídas. Evita duplicar SQL de
// agregação no backend só para juntar mais colunas.
export function useFaturacaoClientes(contentorId: string | null) {
  const [escopoTodos, setEscopoTodos] = useState(true);
  const [soComDivida, setSoComDivida] = useState(false);
  const [texto, setTexto] = useState('');
  const [etiquetaFiltro, setEtiquetaFiltro] = useState<string | null>(null);
  const [clientes, setClientes] = useState<ClienteFaturacao[]>([]);
  const [etiquetas, setEtiquetas] = useState<Etiqueta[]>([]);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void Promise.all([
      ipcService.faturacao.resumoPorCliente({
        contentorId: escopoTodos ? undefined : (contentorId ?? undefined),
        soComDivida,
      }),
      ipcService.contactos.list(false),
      ipcService.etiquetas.list(),
    ]).then(async ([resumos, contactos, todasEtiquetas]) => {
      if (cancelled) return;
      const etiquetasPorContacto = await ipcService.etiquetas.listPorContactos(resumos.map((r) => r.contactoId));
      if (cancelled) return;
      const contactosPorId = new Map(contactos.map((c) => [c.id, c]));
      const merged: ClienteFaturacao[] = resumos.flatMap((resumo) => {
        const contacto = contactosPorId.get(resumo.contactoId);
        if (!contacto) return [];
        return [
          {
            ...contacto,
            totalCargas: resumo.totalCargas,
            valorDevido: resumo.valorDevido,
            valorPago: resumo.valorPago,
            papeis: resumo.papeis,
            etiquetas: etiquetasPorContacto[resumo.contactoId] ?? [],
          },
        ];
      });
      setClientes(merged);
      setEtiquetas(todasEtiquetas);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [contentorId, escopoTodos, soComDivida, version]);

  const textoNormalizado = texto.trim().toLowerCase();
  const clientesFiltrados = clientes.filter((cliente) => {
    if (etiquetaFiltro && !cliente.etiquetas.some((e) => e.id === etiquetaFiltro)) return false;
    if (!textoNormalizado) return true;
    return (
      cliente.nome.toLowerCase().includes(textoNormalizado) ||
      (cliente.telefone ?? '').includes(textoNormalizado) ||
      (cliente.email ?? '').toLowerCase().includes(textoNormalizado)
    );
  });

  return {
    clientes: clientesFiltrados,
    totalClientes: clientes.length,
    etiquetas,
    loading,
    escopoTodos,
    setEscopoTodos,
    soComDivida,
    setSoComDivida,
    texto,
    setTexto,
    etiquetaFiltro,
    setEtiquetaFiltro,
    refresh,
  };
}
