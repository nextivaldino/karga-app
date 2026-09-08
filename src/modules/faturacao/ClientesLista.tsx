import { MagnifyingGlass as Search, UserCirclePlus, UserCircle } from '@phosphor-icons/react';
import { formatValor } from '@/lib/formatValor';
import type { ClienteFaturacao, Etiqueta } from '@/types';

interface ClientesListaProps {
  clientes: ClienteFaturacao[];
  totalClientes: number;
  etiquetas: Etiqueta[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (cliente: ClienteFaturacao) => void;
  texto: string;
  onTextoChange: (texto: string) => void;
  escopoTodos: boolean;
  onEscopoTodosChange: (v: boolean) => void;
  soComDivida: boolean;
  onSoComDividaChange: (v: boolean) => void;
  etiquetaFiltro: string | null;
  onEtiquetaFiltroChange: (id: string | null) => void;
  onCriarCliente: () => void;
}

export function ClientesLista({
  clientes,
  totalClientes,
  etiquetas,
  loading,
  selectedId,
  onSelect,
  texto,
  onTextoChange,
  escopoTodos,
  onEscopoTodosChange,
  soComDivida,
  onSoComDividaChange,
  etiquetaFiltro,
  onEtiquetaFiltroChange,
  onCriarCliente,
}: ClientesListaProps): React.JSX.Element {
  return (
    <div className="flex h-full w-[320px] shrink-0 flex-col border-r border-border">
      <div className="flex shrink-0 flex-col gap-2 border-b border-border p-3">
        <div className="flex items-center gap-1.5">
          <div className="flex h-9 flex-1 items-center gap-2 rounded-control border border-border bg-bg-input px-2.5">
            <Search size={14} className="shrink-0 text-text-tertiary" />
            <input
              value={texto}
              onChange={(e) => onTextoChange(e.target.value)}
              placeholder="Pesquisar clientes..."
              className="h-full flex-1 bg-transparent text-[13px] text-text-primary outline-none placeholder:text-text-tertiary"
            />
          </div>
          <button
            type="button"
            onClick={onCriarCliente}
            title="Novo Cliente"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-success text-white shadow-sm transition-colors hover:brightness-95"
          >
            <UserCirclePlus size={18} weight="fill" />
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="inline-flex h-7 items-center gap-0.5 rounded-control bg-bg-input p-0.5">
            <button
              type="button"
              onClick={() => onEscopoTodosChange(false)}
              className={`rounded-[5px] px-2 text-[11px] font-medium transition-colors ${
                !escopoTodos ? 'bg-primary/10 text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Este contentor
            </button>
            <button
              type="button"
              onClick={() => onEscopoTodosChange(true)}
              className={`rounded-[5px] px-2 text-[11px] font-medium transition-colors ${
                escopoTodos ? 'bg-primary/10 text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Todos
            </button>
          </div>
          <button
            type="button"
            onClick={() => onSoComDividaChange(!soComDivida)}
            className={`h-7 shrink-0 rounded-control px-2 text-[11px] font-medium transition-colors ${
              soComDivida ? 'bg-warning/15 text-warning' : 'bg-bg-input text-text-secondary hover:text-text-primary'
            }`}
          >
            Só com dívida
          </button>
        </div>

        {etiquetas.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {etiquetas.map((etiqueta) => {
              const ativa = etiquetaFiltro === etiqueta.id;
              return (
                <button
                  key={etiqueta.id}
                  type="button"
                  onClick={() => onEtiquetaFiltroChange(ativa ? null : etiqueta.id)}
                  className="flex items-center gap-1 rounded-pill border px-2 py-0.5 text-[11px] font-medium transition-colors"
                  style={
                    ativa
                      ? { backgroundColor: etiqueta.cor, borderColor: etiqueta.cor, color: '#fff' }
                      : { borderColor: `color-mix(in srgb, ${etiqueta.cor} 45%, transparent)`, color: etiqueta.cor }
                  }
                >
                  {etiqueta.nome}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex h-full items-center justify-center text-[13px] text-text-tertiary">A carregar...</div>
        ) : clientes.length === 0 ? (
          <div className="flex h-full items-center justify-center px-4 text-center text-[13px] text-text-tertiary">
            {totalClientes === 0 ? 'Nenhum cliente com cargas.' : 'Nenhum cliente corresponde ao filtro.'}
          </div>
        ) : (
          clientes.map((cliente) => {
            const ativo = cliente.id === selectedId;
            return (
              <button
                key={cliente.id}
                type="button"
                onClick={() => onSelect(cliente)}
                className={`flex w-full flex-col gap-1.5 border-b border-border px-3 py-3 text-left transition-colors ${
                  ativo ? 'bg-primary/10' : 'hover:bg-bg-app'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <UserCircle size={22} weight="fill" className={`shrink-0 ${ativo ? 'text-primary' : 'text-text-tertiary'}`} />
                  <span className={`truncate text-[15px] font-medium ${ativo ? 'text-primary' : 'text-text-primary'}`}>
                    {cliente.nome}
                  </span>
                  {!cliente.papeis.includes('emissor') ? (
                    <span
                      className="shrink-0 rounded-pill bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary"
                      title="Só recebe cargas, não é cobrado"
                    >
                      Recetor
                    </span>
                  ) : null}
                  <span className="ml-auto shrink-0 text-[11px] text-text-tertiary">{cliente.totalCargas} cargas</span>
                </div>
                <div className="flex items-center justify-between pl-[30px]">
                  <div className="flex flex-wrap gap-1">
                    {cliente.etiquetas.slice(0, 3).map((etiqueta) => (
                      <span
                        key={etiqueta.id}
                        className="h-1.5 w-1.5 shrink-0 rounded-pill"
                        style={{ backgroundColor: etiqueta.cor }}
                        title={etiqueta.nome}
                      />
                    ))}
                  </div>
                  <span
                    className={`shrink-0 text-[12px] font-medium ${
                      cliente.valorDevido > 0 ? 'text-warning' : 'text-text-tertiary'
                    }`}
                  >
                    {cliente.valorDevido > 0 ? formatValor(cliente.valorDevido) : 'Sem dívida'}
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
