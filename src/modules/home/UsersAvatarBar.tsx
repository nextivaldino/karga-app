import { useEffect, useState } from 'react';
import { ArrowsClockwise, CaretDown, CaretRight, ChatCircle } from '@phosphor-icons/react';
import { HeaderBarModal } from '@/components/ui/HeaderBarModal';
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

interface UsersAvatarBarProps {
  // "pill" — junta-se aos outros stats de "Resumo do Sistema" na linha
  // compacta (fechada). "card" — a mesma informação, no formato dos
  // cards da grelha (aberta). Os dois só abrem o mesmo modal; não são
  // duas fontes de dados diferentes.
  variant: 'pill' | 'card';
}

// Widget "Equipa" do Resumo do Sistema — antes vivia na sub-barra da
// Home (competia por espaço com o seletor de contentor), depois como
// secção própria; agora é só mais um card ao lado de Cargas/Contentores/
// Valor Devido/Entregues, com a mesma linguagem visual. O número mostra
// cargas novas por sincronizar (a "notificação de chegada"); clicar
// abre a equipa toda num modal, cada pessoa expande in-place para ver a
// contribuição por contentor e os atalhos de mensagem/perfil.
export function UsersAvatarBar({ variant }: UsersAvatarBarProps): React.JSX.Element | null {
  const { navigate } = useNavigation();
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [expandidoId, setExpandidoId] = useState<string | null>(null);
  const [porContentorPorUser, setPorContentorPorUser] = useState<Record<string, CargasPorContentorLinha[]>>({});
  // Quantas cargas por sincronizar cada utilizador tem agora mesmo — id
  // local do utilizador é o mesmo usado como `inseridoPorUserId` na PWA
  // (ver `habilitarPwa`), por isso dá para comparar diretamente.
  const [pendentesPorUserId, setPendentesPorUserId] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    void ipcService.users.list().then((dados) => setUsers(dados.filter((u) => u.role !== 'root' && u.active)));
  }, []);

  useEffect(() => {
    async function carregarPendentes(): Promise<void> {
      try {
        const pendentes = await ipcService.sync.listPendentes();
        const contagem = new Map<string, number>();
        for (const p of pendentes) contagem.set(p.inseridoPorUserId, (contagem.get(p.inseridoPorUserId) ?? 0) + 1);
        setPendentesPorUserId(contagem);
      } catch {
        // silencioso — é só um indicador visual, não crítico
      }
    }
    void carregarPendentes();
    const interval = setInterval(() => void carregarPendentes(), 60_000);
    return () => clearInterval(interval);
  }, []);

  function toggleExpandido(user: PublicUser): void {
    if (expandidoId === user.id) {
      setExpandidoId(null);
      return;
    }
    setExpandidoId(user.id);
    if (!porContentorPorUser[user.id]) {
      void ipcService.cargas.countPorContentorParaUsuario(user.id).then((dados) => {
        setPorContentorPorUser((atual) => ({ ...atual, [user.id]: dados }));
      });
    }
  }

  if (users.length === 0) return null;

  const comPendentes = users.filter((u) => (pendentesPorUserId.get(u.id) ?? 0) > 0);
  const totalPendentes = [...pendentesPorUserId.values()].reduce((a, b) => a + b, 0);
  const destaque = comPendentes.length > 0 ? comPendentes : users;

  const avatares = (
    <div className="flex -space-x-2">
      {destaque.slice(0, 3).map((u) => (
        <span key={u.id} className="rounded-full ring-2 ring-bg-surface">
          <UserAvatar avatar={u.avatar} size={variant === 'pill' ? 18 : 24} />
        </span>
      ))}
    </div>
  );

  return (
    <>
      {variant === 'pill' ? (
        <button
          type="button"
          onClick={() => setModalAberto(true)}
          className={`flex items-center gap-2 rounded-pill px-3 py-1.5 text-[12px] transition-transform hover:scale-[1.03] ${
            totalPendentes > 0 ? 'bg-[#FFB400]/15' : 'bg-purple/10'
          }`}
        >
          {avatares}
          <span key={totalPendentes} className="animate-karga-fade font-semibold text-text-primary">
            {totalPendentes > 0 ? totalPendentes : users.length}
          </span>
          <span className="text-text-secondary">{totalPendentes > 0 ? 'novas · Equipa' : 'Equipa'}</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setModalAberto(true)}
          className={`flex flex-col items-start gap-2 rounded-surface p-lg text-left transition-transform hover:scale-[1.02] ${
            totalPendentes > 0 ? 'bg-[#FFB400]/15' : 'bg-purple/10'
          }`}
        >
          {avatares}
          <span key={totalPendentes} className="animate-karga-fade text-[22px] font-semibold text-text-primary">
            {totalPendentes > 0 ? totalPendentes : users.length}
          </span>
          <span className="text-[12px] text-text-secondary">{totalPendentes > 0 ? 'Cargas novas da equipa' : 'Equipa'}</span>
        </button>
      )}

      <HeaderBarModal open={modalAberto} onClose={() => setModalAberto(false)} title="Equipa" widthClassName="max-w-[440px]">
        <div className="flex flex-col gap-1">
          {users.map((u) => {
            const pendentes = pendentesPorUserId.get(u.id) ?? 0;
            const expandido = expandidoId === u.id;
            const porContentor = porContentorPorUser[u.id];
            return (
              <div key={u.id} className={`rounded-control ${expandido ? 'bg-bg-app' : ''}`}>
                <button
                  type="button"
                  onClick={() => toggleExpandido(u)}
                  className="flex w-full items-center gap-2.5 rounded-control px-2 py-2 text-left transition-colors hover:bg-bg-app"
                >
                  <span className="relative shrink-0">
                    <UserAvatar avatar={u.avatar} size={30} />
                    {pendentes > 0 ? (
                      <span
                        className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2"
                        style={{ backgroundColor: SYNC_HEADER_BG, borderColor: 'var(--bg-surface)' }}
                      >
                        <ArrowsClockwise size={8} weight="bold" className="text-[#241f31]" />
                      </span>
                    ) : null}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-text-primary">{u.name}</p>
                    <p className="truncate text-[11px] text-text-tertiary">
                      {pendentes > 0 ? `${pendentes} nova${pendentes === 1 ? '' : 's'}` : ROLE_LABEL[u.role]}
                    </p>
                  </div>
                  <CaretDown size={13} className={`shrink-0 text-text-tertiary transition-transform ${expandido ? 'rotate-180' : ''}`} />
                </button>

                {expandido ? (
                  <div className="flex flex-col gap-2 px-2 pb-3 pl-11">
                    <div>
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">
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
                    <div className="flex items-center gap-3">
                      {u.pwaHabilitado ? (
                        <button
                          type="button"
                          onClick={() => {
                            setModalAberto(false);
                            navigate('configuracoes', { mensagemDeUserId: u.id });
                          }}
                          className="flex items-center gap-1.5 text-[12px] font-medium text-text-primary hover:underline"
                        >
                          <ChatCircle size={13} /> Enviar mensagem
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => {
                          setModalAberto(false);
                          navigate('configuracoes', { userId: u.id });
                        }}
                        className="flex items-center gap-1 text-[12px] font-medium text-primary hover:underline"
                      >
                        Ver perfil <CaretRight size={11} />
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </HeaderBarModal>
    </>
  );
}
