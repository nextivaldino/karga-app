import { useEffect, useRef, useState } from 'react';
import { ArrowsClockwise, CaretRight, ChatCircle } from '@phosphor-icons/react';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { useNavigation } from '@/hooks/useNavigation';
import { ipcService } from '@/services/ipcService';
import { SYNC_HEADER_BG } from '@/modules/sync/syncVisual';
import type { CargasPorContentorLinha, PublicUser } from '@/types';

const ROLE_LABEL: Record<PublicUser['role'], string> = {
  root: 'Root',
  admin: 'Admin',
  user: 'Utilizador',
};

// Roster dos utilizadores do desktop (Admin + secundários — Root fica de
// fora, não mexe em dados de cargas no dia-a-dia). Vive na sub-barra da
// Home, ao lado do seletor de contentor — clicar num avatar abre um
// mini-perfil com a contribuição PWA desse utilizador por contentor, e
// um atalho direto para a ficha dele em Definições → Utilizadores. O
// popover usa o mesmo tema invertido e a mesma linguagem visual
// (cantos, borda, sombra) do menu de seleção de contentor, para ler
// como o mesmo sistema de "menus de topo" da app.
export function UsersAvatarBar(): React.JSX.Element | null {
  const { navigate } = useNavigation();
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [abertoId, setAbertoId] = useState<string | null>(null);
  const [porContentor, setPorContentor] = useState<CargasPorContentorLinha[] | null>(null);
  // Quem tem cargas por sincronizar agora mesmo — id local do utilizador
  // é o mesmo id usado como `inseridoPorUserId` na PWA (ver
  // `habilitarPwa`), por isso dá para comparar diretamente sem tabela
  // de mapeamento.
  const [pendentesPorUserId, setPendentesPorUserId] = useState<Set<string>>(new Set());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void ipcService.users.list().then((dados) => setUsers(dados.filter((u) => u.role !== 'root' && u.active)));
  }, []);

  useEffect(() => {
    async function carregarPendentes(): Promise<void> {
      try {
        const pendentes = await ipcService.sync.listPendentes();
        setPendentesPorUserId(new Set(pendentes.map((p) => p.inseridoPorUserId)));
      } catch {
        // silencioso — é só um indicador visual, não crítico
      }
    }
    void carregarPendentes();
    const interval = setInterval(() => void carregarPendentes(), 60_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!abertoId) return;
    function onClickOutside(e: MouseEvent): void {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbertoId(null);
    }
    function onKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') setAbertoId(null);
    }
    window.addEventListener('mousedown', onClickOutside);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('mousedown', onClickOutside);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [abertoId]);

  function handleToggle(user: PublicUser): void {
    if (abertoId === user.id) {
      setAbertoId(null);
      return;
    }
    setAbertoId(user.id);
    setPorContentor(null);
    void ipcService.cargas.countPorContentorParaUsuario(user.id).then(setPorContentor);
  }

  if (users.length === 0) return null;

  const utilizadorAberto = users.find((u) => u.id === abertoId) ?? null;

  return (
    <div ref={ref} className="flex h-9 items-center gap-2">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">Equipa</span>
      {users.map((u) => {
        const aberto = abertoId === u.id;
        const aSincronizar = pendentesPorUserId.has(u.id);
        return (
          <div key={u.id} className="relative">
            <div className={aberto ? 'theme-invert' : ''}>
              <button
                type="button"
                title={aSincronizar ? `${u.name} · cargas por sincronizar` : u.name}
                onClick={() => handleToggle(u)}
                className={`rounded-full transition-transform hover:scale-105 ${aberto ? 'ring-2 ring-primary ring-offset-2 ring-offset-toolbar-bg' : ''}`}
              >
                <UserAvatar avatar={u.avatar} size={30} />
              </button>
            </div>

            {aSincronizar ? (
              <span
                className="pointer-events-none absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2"
                style={{ backgroundColor: SYNC_HEADER_BG, borderColor: 'var(--toolbar-bg)' }}
              >
                <ArrowsClockwise size={8} weight="bold" className="text-[#241f31]" />
              </span>
            ) : null}

            {aberto && utilizadorAberto ? (
              <div className="theme-invert absolute right-0 top-full z-50 mt-1.5 w-72 overflow-hidden rounded-surface border border-border bg-bg-surface shadow-lg">
                <div className="flex items-center gap-2.5 border-b border-border px-3.5 py-3">
                  <UserAvatar avatar={utilizadorAberto.avatar} size={36} />
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-text-primary">{utilizadorAberto.name}</p>
                    <p className="truncate text-[11px] text-text-tertiary">{ROLE_LABEL[utilizadorAberto.role]}</p>
                  </div>
                </div>

                <div className="max-h-52 overflow-y-auto px-3.5 py-2.5">
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">
                    Cargas enviadas por contentor
                  </p>
                  {porContentor == null ? (
                    <p className="text-[12px] text-text-tertiary">A carregar...</p>
                  ) : porContentor.length === 0 ? (
                    <p className="text-[12px] text-text-tertiary">Ainda sem cargas enviadas via PWA.</p>
                  ) : (
                    <div className="flex flex-col gap-1">
                      {porContentor.map((linha) => (
                        <div key={linha.contentorId} className="flex items-center justify-between gap-2 text-[12px]">
                          <span className="truncate text-text-secondary">
                            {linha.contentorCodigo} — {linha.contentorNome}
                          </span>
                          <span className="shrink-0 font-medium text-text-primary">{linha.total}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {utilizadorAberto.pwaHabilitado ? (
                  <button
                    type="button"
                    onClick={() => {
                      setAbertoId(null);
                      navigate('configuracoes', { mensagemDeUserId: utilizadorAberto.id });
                    }}
                    className="flex w-full items-center gap-2 border-t border-border px-3.5 py-2.5 text-left text-[13px] font-medium text-text-primary transition-colors hover:bg-bg-app"
                  >
                    <ChatCircle size={15} /> Enviar mensagem
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    setAbertoId(null);
                    navigate('configuracoes', { userId: utilizadorAberto.id });
                  }}
                  className="flex w-full items-center justify-between gap-2 border-t border-border px-3.5 py-2.5 text-left text-[13px] font-medium text-primary transition-colors hover:bg-bg-app"
                >
                  Ver perfil e definições
                  <CaretRight size={13} />
                </button>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
