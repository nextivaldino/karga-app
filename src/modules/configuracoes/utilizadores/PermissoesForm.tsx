import type { ModuloPermissao, PermissaoInput } from '@/types';

const MODULOS: { key: ModuloPermissao; label: string }[] = [
  { key: 'cargas', label: 'Cargas' },
  { key: 'contentores', label: 'Contentores' },
  { key: 'contactos', label: 'Contactos' },
  { key: 'faturacao', label: 'Faturação' },
  { key: 'relatorios', label: 'Relatórios' },
  { key: 'configuracoes', label: 'Configurações' },
];

const ACOES: { key: keyof Omit<PermissaoInput, 'modulo'>; label: string }[] = [
  { key: 'podeVer', label: 'Ver' },
  { key: 'podeCriar', label: 'Criar' },
  { key: 'podeEditar', label: 'Editar' },
  { key: 'podeEliminar', label: 'Eliminar' },
];

interface PermissoesFormProps {
  permissoes: PermissaoInput[];
  onChange: (permissoes: PermissaoInput[]) => void;
}

function vazio(modulo: ModuloPermissao): PermissaoInput {
  return { modulo, podeVer: false, podeCriar: false, podeEditar: false, podeEliminar: false };
}

export function PermissoesForm({ permissoes, onChange }: PermissoesFormProps): React.JSX.Element {
  function getLinha(modulo: ModuloPermissao): PermissaoInput {
    return permissoes.find((p) => p.modulo === modulo) ?? vazio(modulo);
  }

  function toggle(modulo: ModuloPermissao, acao: keyof Omit<PermissaoInput, 'modulo'>): void {
    const atual = getLinha(modulo);
    const atualizado = { ...atual, [acao]: !atual[acao] };
    const outros = permissoes.filter((p) => p.modulo !== modulo);
    onChange([...outros, atualizado]);
  }

  return (
    <div className="overflow-hidden rounded-control border border-border">
      <div className="grid grid-cols-5 bg-bg-app px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
        <span>Módulo</span>
        {ACOES.map((a) => (
          <span key={a.key} className="text-center">
            {a.label}
          </span>
        ))}
      </div>
      {MODULOS.map((m) => {
        const linha = getLinha(m.key);
        return (
          <div key={m.key} className="grid grid-cols-5 items-center border-t border-border px-3 py-2 text-[13px]">
            <span className="text-text-primary">{m.label}</span>
            {ACOES.map((a) => (
              <span key={a.key} className="flex justify-center">
                <input
                  type="checkbox"
                  checked={linha[a.key]}
                  onChange={() => toggle(m.key, a.key)}
                  className="h-3.5 w-3.5 accent-primary"
                />
              </span>
            ))}
          </div>
        );
      })}
    </div>
  );
}
