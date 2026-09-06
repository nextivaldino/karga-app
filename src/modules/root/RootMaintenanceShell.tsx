import { useEffect, useState } from 'react';
import { Database, HardDrive, Key, SignOut } from '@phosphor-icons/react';
import { ModuleIcon } from '@/components/icons/ModuleIcon';
import { toast, ToastContainer } from '@/components/ui/Toast';
import { ipcService } from '@/services/ipcService';
import { useAuth } from '@/modules/auth/AuthContext';
import { PasswordConfirmDialog } from '@/modules/configuracoes/PasswordConfirmDialog';
import { ResetPasswordModal } from './ResetPasswordModal';
import type { PublicUser } from '@/types';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function RootMaintenanceShell(): React.JSX.Element {
  const { user, logout } = useAuth();
  const [admins, setAdmins] = useState<PublicUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetTarget, setResetTarget] = useState<PublicUser | null>(null);
  const [backupOpen, setBackupOpen] = useState(false);
  const [systemInfo, setSystemInfo] = useState<{ dbSizeBytes: number; appVersion: string } | null>(null);

  async function carregar(): Promise<void> {
    setLoading(true);
    const [listaAdmins, info] = await Promise.all([ipcService.users.listAdmins(), ipcService.system.info()]);
    setAdmins(listaAdmins);
    setSystemInfo(info);
    setLoading(false);
  }

  useEffect(() => {
    void carregar();
  }, []);

  async function handleBackup(password: string): Promise<void> {
    const result = await ipcService.settings.backup(password);
    if (!('canceled' in result)) toast.success(`Backup guardado em: ${result.path}`);
    setBackupOpen(false);
  }

  return (
    <div className="flex h-full flex-col bg-bg-app">
      <header
        className="flex h-12 shrink-0 items-center justify-between border-b border-border px-lg backdrop-blur-md"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--color-error) 16%, var(--bg-header))',
          WebkitAppRegion: 'drag',
        } as React.CSSProperties}
      >
        <div className="flex items-center gap-2 text-[13px] font-semibold text-text-primary">
          <ModuleIcon module="kraga" size={16} /> Kraga Desktop — Manutenção (Root)
        </div>
        <button
          type="button"
          onClick={() => void logout()}
          title={user ? `Sair (${user.name})` : 'Sair'}
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          className="flex h-8 w-8 items-center justify-center rounded-control text-text-secondary transition-colors hover:bg-bg-app"
        >
          <SignOut size={18} />
        </button>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto p-xl">
        <div className="mx-auto flex max-w-[640px] flex-col gap-lg">
          <div className="rounded-control border border-border bg-bg-app p-md text-[13px] text-text-tertiary">
            O papel Root não acede a dados operacionais (cargas, contentores, contactos). Esta área serve apenas
            para manutenção técnica do sistema.
          </div>

          <div>
            <h2 className="mb-md flex items-center gap-2 text-[15px] font-semibold text-text-primary">
              <HardDrive size={16} /> Informação do Sistema
            </h2>
            <div className="grid grid-cols-2 gap-md">
              <div className="rounded-control border border-border bg-bg-surface p-md text-center">
                <div className="text-[16px] font-semibold text-text-primary">
                  {systemInfo ? formatBytes(systemInfo.dbSizeBytes) : '—'}
                </div>
                <div className="text-[11px] text-text-tertiary">Tamanho da Base de Dados</div>
              </div>
              <div className="rounded-control border border-border bg-bg-surface p-md text-center">
                <div className="text-[16px] font-semibold text-text-primary">{systemInfo?.appVersion ?? '—'}</div>
                <div className="text-[11px] text-text-tertiary">Versão do Kraga Desktop</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setBackupOpen(true)}
              className="mt-md flex items-center gap-1.5 rounded-control bg-primary px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-primary-hover"
            >
              <Database size={16} /> Forçar Backup Agora
            </button>
          </div>

          <div>
            <h2 className="mb-md flex items-center gap-2 text-[15px] font-semibold text-text-primary">
              <Key size={16} /> Utilizadores Admin
            </h2>
            {loading ? (
              <p className="text-[13px] text-text-tertiary">A carregar...</p>
            ) : admins.length === 0 ? (
              <p className="text-[13px] text-text-tertiary">Nenhum Admin encontrado.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {admins.map((admin) => (
                  <div
                    key={admin.id}
                    className={`flex items-center justify-between rounded-control border px-4 py-3 ${
                      admin.passwordResetSolicitadoEm ? 'border-warning/40 bg-warning/10' : 'border-border bg-bg-surface'
                    }`}
                  >
                    <div>
                      <p className="text-[14px] font-medium text-text-primary">{admin.name}</p>
                      <p className="text-[12px] text-text-tertiary">{admin.email}</p>
                      {admin.passwordResetSolicitadoEm ? (
                        <p className="mt-0.5 text-[12px] font-medium text-warning">
                          ⚠ Pediu reset de password no ecrã de login
                        </p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => setResetTarget(admin)}
                      className={`rounded-control border px-3 py-1.5 text-[13px] font-medium transition-colors ${
                        admin.passwordResetSolicitadoEm
                          ? 'border-warning bg-warning text-white hover:brightness-95'
                          : 'border-border text-text-primary hover:bg-bg-app'
                      }`}
                    >
                      Resetar Password
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <ResetPasswordModal
        open={resetTarget != null}
        onClose={() => setResetTarget(null)}
        target={resetTarget}
        onReset={(targetUserId, newPassword) => ipcService.users.resetPasswordAdmin(targetUserId, newPassword)}
      />

      <PasswordConfirmDialog
        open={backupOpen}
        title="Forçar Backup Agora"
        message="Vais escolher uma pasta para guardar uma cópia da base de dados atual."
        confirmLabel="Continuar"
        onConfirm={handleBackup}
        onCancel={() => setBackupOpen(false)}
      />

      <ToastContainer />
    </div>
  );
}
