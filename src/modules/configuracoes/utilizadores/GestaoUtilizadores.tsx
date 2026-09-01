import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Switch } from '@/components/ui/Switch';
import { toast } from '@/components/ui/Toast';
import { cleanIpcError } from '@/lib/cleanIpcError';
import { ipcService } from '@/services/ipcService';
import { ResetPasswordModal } from '@/modules/root/ResetPasswordModal';
import { NovoUtilizadorModal } from './NovoUtilizadorModal';
import { EditarUtilizadorModal } from './EditarUtilizadorModal';
import { PwaPasswordModal } from './PwaPasswordModal';
import type { UsuarioComSessao } from '@/types';

function formatUltimaSessao(iso: string | null): string {
  if (!iso) return 'Nunca iniciou sessão';
  return new Intl.DateTimeFormat('pt-PT', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));
}

export function GestaoUtilizadores(): React.JSX.Element {
  const [utilizadores, setUtilizadores] = useState<UsuarioComSessao[]>([]);
  const [loading, setLoading] = useState(true);
  const [novoOpen, setNovoOpen] = useState(false);
  const [editando, setEditando] = useState<UsuarioComSessao | null>(null);
  const [resetando, setResetando] = useState<UsuarioComSessao | null>(null);
  const [eliminando, setEliminando] = useState<UsuarioComSessao | null>(null);
  const [pwaEmProgresso, setPwaEmProgresso] = useState<string | null>(null);
  const [pwaAtivado, setPwaAtivado] = useState<{ user: UsuarioComSessao; email: string; password: string } | null>(null);

  async function carregar(): Promise<void> {
    setLoading(true);
    const dados = await ipcService.users.list();
    setUtilizadores(dados.filter((u) => u.role === 'user'));
    setLoading(false);
  }

  useEffect(() => {
    void carregar();
  }, []);

  async function handleToggleActive(u: UsuarioComSessao): Promise<void> {
    try {
      if (u.active) {
        await ipcService.users.bloquear(u.id);
        toast.success(`${u.name} bloqueado.`);
      } else {
        await ipcService.users.reativar(u.id);
        toast.success(`${u.name} reativado.`);
      }
      void carregar();
    } catch (err) {
      toast.error(cleanIpcError(err));
    }
  }

  async function handleTogglePwa(u: UsuarioComSessao, habilitado: boolean): Promise<void> {
    setPwaEmProgresso(u.id);
    try {
      if (habilitado) {
        const result = await ipcService.users.habilitarPwa(u.id);
        setPwaAtivado({
          user: { ...u, pwaHabilitado: true, pwaAuthUid: result.user.pwaAuthUid },
          email: result.pwaEmail,
          password: result.passwordTemporaria,
        });
      } else {
        await ipcService.users.desabilitarPwa(u.id);
        toast.success(`Acesso PWA de ${u.name} desativado.`);
      }
      void carregar();
    } catch (err) {
      toast.error(cleanIpcError(err));
    } finally {
      setPwaEmProgresso(null);
    }
  }

  async function handleEliminar(): Promise<void> {
    if (!eliminando) return;
    try {
      await ipcService.users.eliminar(eliminando.id);
      toast.success(`${eliminando.name} eliminado.`);
      setEliminando(null);
      void carregar();
    } catch (err) {
      toast.error(cleanIpcError(err));
      setEliminando(null);
    }
  }

  return (
    <div>
      <div className="mb-md flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-text-primary">Gestão de Utilizadores</h2>
        <button
          type="button"
          onClick={() => setNovoOpen(true)}
          className="flex items-center gap-1.5 rounded-control bg-primary px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-primary-hover"
        >
          <Plus size={16} /> Novo Utilizador
        </button>
      </div>

      {loading ? (
        <p className="text-[13px] text-text-tertiary">A carregar...</p>
      ) : utilizadores.length === 0 ? (
        <p className="text-[13px] text-text-tertiary">Nenhum utilizador secundário criado ainda.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {utilizadores.map((u) => (
            <div
              key={u.id}
              className={`flex items-center justify-between gap-3 rounded-control border border-border bg-bg-surface px-4 py-3 ${
                !u.active ? 'opacity-60' : ''
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[14px] font-medium text-text-primary">{u.name}</span>
                  {!u.active ? (
                    <span className="rounded-pill bg-bg-app px-1.5 py-0.5 text-[10px] font-medium uppercase text-text-tertiary">
                      Bloqueado
                    </span>
                  ) : null}
                </div>
                <p className="truncate text-[12px] text-text-tertiary">{u.email}</p>
                <p className="truncate text-[11px] text-text-tertiary">{formatUltimaSessao(u.ultimaSessao)}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <Switch
                  checked={u.pwaHabilitado}
                  disabled={pwaEmProgresso === u.id}
                  onChange={(checked) => void handleTogglePwa(u, checked)}
                  label="PWA"
                />
                <button
                  type="button"
                  onClick={() => setEditando(u)}
                  className="rounded-control px-2.5 py-1.5 text-[12px] font-medium text-text-secondary transition-colors hover:bg-bg-app"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => setResetando(u)}
                  className="rounded-control px-2.5 py-1.5 text-[12px] font-medium text-text-secondary transition-colors hover:bg-bg-app"
                >
                  Resetar Password
                </button>
                <button
                  type="button"
                  onClick={() => void handleToggleActive(u)}
                  className="rounded-control px-2.5 py-1.5 text-[12px] font-medium text-text-secondary transition-colors hover:bg-bg-app"
                >
                  {u.active ? 'Bloquear' : 'Reativar'}
                </button>
                <button
                  type="button"
                  onClick={() => setEliminando(u)}
                  className="rounded-control px-2.5 py-1.5 text-[12px] font-medium text-error transition-colors hover:bg-bg-app"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <NovoUtilizadorModal open={novoOpen} onClose={() => setNovoOpen(false)} onSaved={carregar} />
      <EditarUtilizadorModal open={editando != null} onClose={() => setEditando(null)} utilizador={editando} onSaved={carregar} />
      <ResetPasswordModal
        open={resetando != null}
        onClose={() => setResetando(null)}
        target={resetando}
        onReset={(targetUserId, newPassword) => ipcService.users.resetPasswordUser(targetUserId, newPassword)}
      />
      <PwaPasswordModal
        open={pwaAtivado != null}
        onClose={() => setPwaAtivado(null)}
        target={pwaAtivado?.user ?? null}
        pwaEmail={pwaAtivado?.email ?? null}
        passwordTemporaria={pwaAtivado?.password ?? null}
      />

      <ConfirmDialog
        open={eliminando != null}
        title="Eliminar Utilizador"
        message={`Tens a certeza que queres eliminar "${eliminando?.name}"? A conta fica desativada (histórico mantido).`}
        tone="danger"
        confirmLabel="Eliminar"
        onConfirm={() => void handleEliminar()}
        onCancel={() => setEliminando(null)}
      />
    </div>
  );
}
