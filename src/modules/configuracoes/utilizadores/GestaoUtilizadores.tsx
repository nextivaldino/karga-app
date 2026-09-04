import { useEffect, useMemo, useState } from 'react';
import { CaretDown, Key as KeyRound, MagnifyingGlass, ChatCircle as MessageCircle, Plus, UsersThree } from '@phosphor-icons/react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { FloatingLabelInput } from '@/components/ui/FloatingLabelInput';
import { Switch } from '@/components/ui/Switch';
import { toast } from '@/components/ui/Toast';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { cleanIpcError } from '@/lib/cleanIpcError';
import { ipcService } from '@/services/ipcService';
import { ResetPasswordModal } from '@/modules/root/ResetPasswordModal';
import { MensagemComposerModal } from '@/modules/mensagens/MensagemComposerModal';
import { NovoUtilizadorModal } from './NovoUtilizadorModal';
import { EditarUtilizadorModal } from './EditarUtilizadorModal';
import { PwaPasswordModal } from './PwaPasswordModal';
import type { UsuarioComSessao } from '@/types';

function formatUltimaSessao(iso: string | null): string {
  if (!iso) return 'Nunca iniciou sessão';
  return new Intl.DateTimeFormat('pt-PT', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));
}

interface GestaoUtilizadoresProps {
  // Vindo do atalho "Ver perfil" do card de avatares na Home — abre já
  // o modal de edição deste utilizador, se ele existir entre os
  // secundários geridos aqui.
  initialEditUserId?: string;
  // Vindo do MensagensBell — abre já a conversa com este utilizador.
  initialConversaUserId?: string;
}

export function GestaoUtilizadores({
  initialEditUserId,
  initialConversaUserId,
}: GestaoUtilizadoresProps = {}): React.JSX.Element {
  const [utilizadores, setUtilizadores] = useState<UsuarioComSessao[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [expandidoId, setExpandidoId] = useState<string | null>(null);
  const [novoOpen, setNovoOpen] = useState(false);
  const [editando, setEditando] = useState<UsuarioComSessao | null>(null);
  const [resetando, setResetando] = useState<UsuarioComSessao | null>(null);
  const [eliminando, setEliminando] = useState<UsuarioComSessao | null>(null);
  const [pwaEmProgresso, setPwaEmProgresso] = useState<string | null>(null);
  const [pwaAtivado, setPwaAtivado] = useState<{ user: UsuarioComSessao; email: string; password: string } | null>(null);
  const [conversaCom, setConversaCom] = useState<UsuarioComSessao | null>(null);

  async function carregar(): Promise<void> {
    setLoading(true);
    const dados = await ipcService.users.list();
    // Ativos primeiro, depois alfabético — bloqueados não desaparecem,
    // só afundam para o fim da lista.
    const secundarios = dados
      .filter((u) => u.role === 'user')
      .sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name));
    setUtilizadores(secundarios);
    setLoading(false);
  }

  useEffect(() => {
    if (!initialEditUserId || utilizadores.length === 0) return;
    const alvo = utilizadores.find((u) => u.id === initialEditUserId);
    if (alvo) setEditando(alvo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialEditUserId, utilizadores]);

  useEffect(() => {
    if (!initialConversaUserId || utilizadores.length === 0) return;
    const alvo = utilizadores.find((u) => u.id === initialConversaUserId);
    if (alvo) setConversaCom(alvo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialConversaUserId, utilizadores]);

  useEffect(() => {
    void carregar();
  }, []);

  const stats = useMemo(
    () => ({
      total: utilizadores.length,
      ativos: utilizadores.filter((u) => u.active).length,
      bloqueados: utilizadores.filter((u) => !u.active).length,
      pwa: utilizadores.filter((u) => u.pwaHabilitado).length,
    }),
    [utilizadores],
  );

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return utilizadores;
    return utilizadores.filter((u) => u.name.toLowerCase().includes(termo) || u.email.toLowerCase().includes(termo));
  }, [utilizadores, busca]);

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

  // Repõe a password PWA fixa e mostra o email/credenciais outra vez — sem
  // isto, uma vez fechado o PwaPasswordModal da 1ª ativação, o Admin não
  // tinha nenhuma forma de voltar a ver/entregar as credenciais ao
  // funcionário (ex: perdeu o papel onde as anotou).
  async function handleReporPwaPassword(u: UsuarioComSessao): Promise<void> {
    setPwaEmProgresso(u.id);
    try {
      const result = await ipcService.users.habilitarPwa(u.id);
      setPwaAtivado({ user: { ...u, pwaHabilitado: true, pwaAuthUid: result.user.pwaAuthUid }, email: result.pwaEmail, password: result.passwordTemporaria });
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
      <div className="mb-lg flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <UsersThree size={18} className="text-text-secondary" />
          <h2 className="text-[15px] font-semibold text-text-primary">Equipa</h2>
        </div>
        <button
          type="button"
          onClick={() => setNovoOpen(true)}
          className="flex items-center gap-1.5 rounded-control bg-primary px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-primary-hover"
        >
          <Plus size={16} /> Novo Utilizador
        </button>
      </div>

      {!loading && utilizadores.length > 0 ? (
        <div className="mb-md flex flex-wrap items-center gap-2 text-[12px]">
          <span className="rounded-pill bg-bg-app px-2.5 py-1 font-medium text-text-secondary">{stats.total} no total</span>
          <span className="rounded-pill bg-success/10 px-2.5 py-1 font-medium text-success">{stats.ativos} ativos</span>
          {stats.bloqueados > 0 ? (
            <span className="rounded-pill bg-text-tertiary/10 px-2.5 py-1 font-medium text-text-tertiary">{stats.bloqueados} bloqueados</span>
          ) : null}
          {stats.pwa > 0 ? (
            <span className="rounded-pill bg-primary/10 px-2.5 py-1 font-medium text-primary">{stats.pwa} com acesso PWA</span>
          ) : null}
        </div>
      ) : null}

      {!loading && utilizadores.length > 3 ? (
        <div className="mb-md">
          <FloatingLabelInput
            label="Pesquisar por nome ou email"
            icon={<MagnifyingGlass size={16} />}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
      ) : null}

      {loading ? (
        <p className="text-[13px] text-text-tertiary">A carregar...</p>
      ) : utilizadores.length === 0 ? (
        <p className="text-[13px] text-text-tertiary">Nenhum utilizador secundário criado ainda.</p>
      ) : filtrados.length === 0 ? (
        <p className="text-[13px] text-text-tertiary">Nenhum utilizador corresponde a "{busca}".</p>
      ) : (
        <div className="flex flex-col gap-2">
          {filtrados.map((u) => {
            const aberto = expandidoId === u.id;
            return (
              <div key={u.id} className={`overflow-hidden rounded-control border border-border bg-bg-surface ${!u.active ? 'opacity-60' : ''}`}>
                <button
                  type="button"
                  onClick={() => setExpandidoId(aberto ? null : u.id)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-bg-app"
                >
                  <UserAvatar avatar={u.avatar} size={36} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[14px] font-medium text-text-primary">{u.name}</span>
                      {u.pwaHabilitado ? (
                        <span className="rounded-pill bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium uppercase text-primary">PWA</span>
                      ) : null}
                      {!u.active ? (
                        <span className="rounded-pill bg-bg-app px-1.5 py-0.5 text-[10px] font-medium uppercase text-text-tertiary">
                          Bloqueado
                        </span>
                      ) : null}
                    </div>
                    <p className="truncate text-[12px] text-text-tertiary">{u.email}</p>
                  </div>
                  <span className="hidden shrink-0 text-[11px] text-text-tertiary sm:block">{formatUltimaSessao(u.ultimaSessao)}</span>
                  <CaretDown size={15} className={`shrink-0 text-text-tertiary transition-transform ${aberto ? 'rotate-180' : ''}`} />
                </button>

                {aberto ? (
                  <div className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-3">
                    <Switch
                      checked={u.pwaHabilitado}
                      disabled={pwaEmProgresso === u.id}
                      onChange={(checked) => void handleTogglePwa(u, checked)}
                      label="Acesso PWA"
                    />
                    {u.pwaHabilitado ? (
                      <button
                        type="button"
                        title="Repõe a password PWA para o valor inicial e mostra as credenciais"
                        disabled={pwaEmProgresso === u.id}
                        onClick={() => void handleReporPwaPassword(u)}
                        className="flex items-center gap-1.5 rounded-control border border-border px-2.5 py-1.5 text-[12px] font-medium text-text-secondary transition-colors hover:bg-bg-app disabled:opacity-50"
                      >
                        <KeyRound size={13} /> Repor password PWA
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setConversaCom(u)}
                      className="flex items-center gap-1.5 rounded-control border border-border px-2.5 py-1.5 text-[12px] font-medium text-text-secondary transition-colors hover:bg-bg-app"
                    >
                      <MessageCircle size={13} /> Enviar mensagem
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditando(u)}
                      className="rounded-control border border-border px-2.5 py-1.5 text-[12px] font-medium text-text-secondary transition-colors hover:bg-bg-app"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => setResetando(u)}
                      className="rounded-control border border-border px-2.5 py-1.5 text-[12px] font-medium text-text-secondary transition-colors hover:bg-bg-app"
                    >
                      Resetar Password
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleToggleActive(u)}
                      className="rounded-control border border-border px-2.5 py-1.5 text-[12px] font-medium text-text-secondary transition-colors hover:bg-bg-app"
                    >
                      {u.active ? 'Bloquear' : 'Reativar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEliminando(u)}
                      className="ml-auto rounded-control border border-error/30 px-2.5 py-1.5 text-[12px] font-medium text-error transition-colors hover:bg-error/10"
                    >
                      Eliminar
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
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
      <MensagemComposerModal open={conversaCom != null} onClose={() => setConversaCom(null)} utilizador={conversaCom} />

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
