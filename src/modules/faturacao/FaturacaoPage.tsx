import { useState } from 'react';
import { ContactoFormModal } from '@/modules/contactos/ContactoFormModal';
import { useFaturacaoClientes } from './useFaturacaoClientes';
import { ClientesLista } from './ClientesLista';
import { ClientePainel } from './ClientePainel';
import type { Contentor } from '@/types';

interface FaturacaoPageProps {
  contentorId: string | null;
  contentoresAbertos: Contentor[];
  // Pré-seleciona um cliente ao montar — usado pelo link "Ver cargas" a
  // partir de Contactos (Configurações). Só lido no mount (ver useState
  // abaixo); esta página é sempre remontada de raiz ao navegar para cá.
  initialClienteId?: string | null;
}

// Página mestre-detalhe: coluna esquerda com todos os clientes
// (pesquisa, etiquetas, âmbito/dívida), coluna direita com o cliente
// selecionado — cargas, ações em linha e em lote, envio de recibo,
// fatura PDF e edição dos dados do cliente. Substitui tanto a antiga
// aba "Faturação" (só relatório) como o painel lateral "Contactos".
export function FaturacaoPage({ contentorId, contentoresAbertos, initialClienteId }: FaturacaoPageProps): React.JSX.Element {
  const {
    clientes,
    totalClientes,
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
  } = useFaturacaoClientes(contentorId);

  const [selectedId, setSelectedId] = useState<string | null>(initialClienteId ?? null);
  const [criarClienteAberto, setCriarClienteAberto] = useState(false);
  const selected = clientes.find((c) => c.id === selectedId) ?? null;

  return (
    <div className="flex h-full">
      <ClientesLista
        clientes={clientes}
        totalClientes={totalClientes}
        etiquetas={etiquetas}
        loading={loading}
        selectedId={selectedId}
        onSelect={(cliente) => setSelectedId(cliente.id)}
        texto={texto}
        onTextoChange={setTexto}
        escopoTodos={escopoTodos}
        onEscopoTodosChange={setEscopoTodos}
        soComDivida={soComDivida}
        onSoComDividaChange={setSoComDivida}
        etiquetaFiltro={etiquetaFiltro}
        onEtiquetaFiltroChange={setEtiquetaFiltro}
        onCriarCliente={() => setCriarClienteAberto(true)}
      />

      <ContactoFormModal
        open={criarClienteAberto}
        onClose={() => setCriarClienteAberto(false)}
        onSaved={() => {
          // O novo contacto só aparece nesta lista quando tiver a
          // primeira carga associada (a lista de clientes de faturação
          // é sempre "contactos com cargas") — nada a selecionar já.
          setCriarClienteAberto(false);
        }}
      />

      {selected ? (
        <ClientePainel
          key={selected.id}
          cliente={selected}
          contentorId={contentorId}
          escopoTodos={escopoTodos}
          contentoresAbertos={contentoresAbertos}
          todasEtiquetas={etiquetas}
          onDataChanged={refresh}
        />
      ) : (
        <div className="flex flex-1 items-center justify-center text-[13px] text-text-tertiary">
          Seleciona um cliente para ver as cargas e gerir a faturação.
        </div>
      )}
    </div>
  );
}
