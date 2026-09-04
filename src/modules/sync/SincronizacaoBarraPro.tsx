import { useState } from 'react';
import {
  ArrowsClockwise,
  CaretDown,
  CheckCircle,
  CircleDashed,
  ListPlus,
  UsersThree,
  XCircle,
} from '@phosphor-icons/react';
import { ContainerPickerButton } from '@/components/ui/ContainerPickerButton';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { NovoContentorModal } from '@/modules/contentores/NovoContentorModal';
import { useAvatarPorUsuario } from '@/hooks/useAvatarPorUsuario';
import { useSincronizacaoRapida } from '@/modules/cargas/useSincronizacaoRapida';
import {
  SYNC_DIVIDER as DIVIDER,
  SYNC_HEADER_BG as HEADER_BG,
  SYNC_INK as INK,
  SYNC_INK_SOFT as INK_SOFT,
  SYNC_GREEN as GREEN,
} from './syncVisual';
import type { Contentor } from '@/types';

// Histórico/Atualizar — no tom neutro da barra secundária (cinza-claro
// padrão, não amarelo), sempre no canto direito, disponíveis em
// qualquer estado da barra que tenha essa segunda linha.
function HistoricoAtualizarBotoes({
  historicoAberto,
  onToggleHistorico,
  onAtualizar,
}: {
  historicoAberto: boolean;
  onToggleHistorico: () => void;
  onAtualizar: () => void;
}): React.JSX.Element {
  return (
    <div className="ml-auto flex shrink-0 items-center gap-1">
      <button
        type="button"
        onClick={onToggleHistorico}
        className="flex items-center gap-1.5 rounded-control px-2.5 py-1.5 text-[12px] font-medium text-text-secondary transition-colors hover:bg-[var(--toolbar-hover)]"
      >
        Histórico <CaretDown size={12} className={`transition-transform ${historicoAberto ? 'rotate-180' : ''}`} />
      </button>
      <button
        type="button"
        onClick={onAtualizar}
        className="flex items-center gap-1.5 rounded-control px-2.5 py-1.5 text-[12px] font-medium text-text-secondary transition-colors hover:bg-[var(--toolbar-hover)]"
      >
        <ArrowsClockwise size={13} /> Atualizar
      </button>
    </div>
  );
}

interface SincronizacaoBarraProProps {
  contentoresAbertos: Contentor[];
  selectedContentorId: string | null;
  onSelectContentor: (id: string) => void;
  loadingContentores: boolean;
  onImported?: () => void;
  // Histórico/Atualizar mudaram-se para aqui (tom mais claro, canto
  // direito) — deixaram de viver dentro de `SincronizacaoView`, que
  // agora só desenha o painel de histórico a partir destes valores.
  historicoAberto: boolean;
  onToggleHistorico: () => void;
  onAtualizar: () => void;
}

// Versão "pro" do cartão amarelo de sincronização — em vez de um popup
// compacto que se abre por cima do conteúdo, esta é a barra de topo
// inteira da página Sync: sempre aberta, com o seletor de contentor/lista,
// estatísticas por utilizador (cada uma já um botão de sincronizar só
// aquele lote) e o atalho para criar uma lista nova, tudo no mesmo tom
// amarelo. Reaproveita a mesma lógica de dados do cartão compacto via
// `useSincronizacaoRapida` — só a apresentação é diferente.
export function SincronizacaoBarraPro({
  contentoresAbertos,
  selectedContentorId,
  onSelectContentor,
  loadingContentores,
  onImported,
  historicoAberto,
  onToggleHistorico,
  onAtualizar,
}: SincronizacaoBarraProProps): React.JSX.Element {
  const avatarPorUsuario = useAvatarPorUsuario();
  const { semConflito, comConflito, utilizadores, count, importacao, contentoresDisponiveis, selecionado, handleSincronizarEm } =
    useSincronizacaoRapida(contentoresAbertos, selectedContentorId, onImported);
  const [novoContentorOpen, setNovoContentorOpen] = useState(false);
  const [sincronizando, setSincronizando] = useState<string | null>(null);

  async function sincronizarLote(userId: string | null): Promise<void> {
    if (!selecionado) return;
    const itens = userId == null ? undefined : semConflito.filter((r) => (r.pendente.inseridoPorUserId || r.pendente.inseridoPorNome) === userId);
    setSincronizando(userId ?? 'todos');
    await handleSincronizarEm(selecionado, itens);
    setSincronizando(null);
  }

  if (importacao) {
    return (
      <div style={{ backgroundColor: 'var(--toolbar-bg)' }}>
        <div className="flex min-h-[var(--chrome-toolbar-h)] items-center gap-3 px-lg py-2" style={{ backgroundColor: HEADER_BG }}>
          <span className="min-w-0 flex-1 truncate text-[13px] font-semibold tracking-wide" style={{ color: INK }}>
            A carregar para {importacao.contentorLabel}...
          </span>
          <ArrowsClockwise size={18} weight="bold" className="shrink-0 animate-spin" style={{ color: GREEN }} />
        </div>
        <div className="max-h-[160px] overflow-y-auto px-lg py-2" style={{ borderTop: `1px solid ${DIVIDER}` }}>
          {importacao.itens.map((it) => (
            <div key={it.id} className="flex items-center gap-2 py-1.5">
              <span className="min-w-0 flex-1 truncate text-[13px]" style={{ color: INK_SOFT }}>
                {it.nome}
              </span>
              {it.status === 'pendente' ? <CircleDashed size={15} style={{ color: INK_SOFT }} /> : null}
              {it.status === 'ok' ? <CheckCircle size={15} weight="fill" style={{ color: GREEN }} /> : null}
              {it.status === 'erro' ? (
                <span title={it.erro} className="text-[#dc2626]">
                  <XCircle size={15} weight="fill" />
                </span>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (count === 0) {
    const selecionadoAtual = contentoresDisponiveis.find((c) => c.id === selectedContentorId) ?? null;
    return (
      <div className="flex min-h-[var(--chrome-toolbar-h)] flex-wrap items-center gap-3 bg-success/[0.08] px-lg py-2">
        <CheckCircle size={18} weight="fill" className="shrink-0 text-success" />
        <span className="text-[13px] font-medium text-text-primary">
          {comConflito > 0
            ? `${comConflito} ${comConflito === 1 ? 'carga precisa' : 'cargas precisam'} de revisão manual — vê a lista abaixo`
            : 'Tudo sincronizado. Sem cargas novas da PWA.'}
        </span>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <ContainerPickerButton
            contentores={contentoresAbertos}
            selectedId={selectedContentorId}
            onSelect={onSelectContentor}
            loading={loadingContentores}
          />
        </div>
        {selecionadoAtual ? (
          <span className="shrink-0 rounded-pill bg-success/15 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-success">
            {selecionadoAtual.nome} ativo
          </span>
        ) : null}
        <HistoricoAtualizarBotoes historicoAberto={historicoAberto} onToggleHistorico={onToggleHistorico} onAtualizar={onAtualizar} />
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: 'var(--toolbar-bg)' }}>
      <div className="flex min-h-[var(--chrome-toolbar-h)] flex-wrap items-center gap-3 px-lg py-2" style={{ backgroundColor: HEADER_BG }}>
        <span
          className="flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full px-1.5 text-[13px] font-bold text-white"
          style={{ backgroundColor: GREEN }}
        >
          {count}
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[14px] font-semibold tracking-wide" style={{ color: INK }}>
            {count} carga{count === 1 ? '' : 's'} nova{count === 1 ? '' : 's'} da PWA
          </span>
          <span className="flex items-center gap-1 truncate text-[11px]" style={{ color: INK_SOFT }}>
            <UsersThree size={12} /> {utilizadores.length} contribuinte{utilizadores.length === 1 ? '' : 's'}
          </span>
        </div>

        <ContainerPickerButton
          contentores={contentoresAbertos}
          selectedId={selectedContentorId}
          onSelect={onSelectContentor}
          loading={loadingContentores}
        />

        <button
          type="button"
          onClick={() => setNovoContentorOpen(true)}
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-control px-3 text-[13px] font-medium transition-colors hover:brightness-95"
          style={{ color: INK, backgroundColor: 'rgba(255,255,255,0.5)' }}
        >
          <ListPlus size={15} /> Criar Lista
        </button>

        <button
          type="button"
          disabled={!selecionado || sincronizando != null}
          title={selecionado ? undefined : 'Escolhe um contentor ou lista primeiro'}
          onClick={() => void sincronizarLote(null)}
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-control px-4 text-[13px] font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-40"
          style={{ backgroundColor: GREEN }}
        >
          <ArrowsClockwise size={15} weight="bold" className={sincronizando === 'todos' ? 'animate-spin' : ''} />
          Sincronizar tudo{selecionado ? ` em ${selecionado.nome}` : ''}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 px-lg py-2.5" style={{ borderTop: `1px solid ${DIVIDER}` }}>
        {utilizadores.map((u) => (
          <button
            key={u.userId || u.nome}
            type="button"
            disabled={!selecionado || sincronizando != null}
            title={selecionado ? `Sincronizar só as cargas de ${u.nome}` : 'Escolhe um contentor ou lista primeiro'}
            onClick={() => void sincronizarLote(u.userId)}
            className="flex items-center gap-2 rounded-pill py-1.5 pl-1.5 pr-3 text-[12px] font-medium transition-colors hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
            style={{ backgroundColor: 'rgba(255,255,255,0.55)', color: INK }}
          >
            <UserAvatar avatar={avatarPorUsuario.get(u.userId)} size={22} />
            <span className="max-w-[140px] truncate">{u.nome}</span>
            <span className="shrink-0 rounded-pill px-1.5 py-0.5 text-[10px] font-bold text-white" style={{ backgroundColor: GREEN }}>
              {u.count}
            </span>
            <ArrowsClockwise size={12} className={sincronizando === u.userId ? 'animate-spin' : ''} />
          </button>
        ))}
        <HistoricoAtualizarBotoes historicoAberto={historicoAberto} onToggleHistorico={onToggleHistorico} onAtualizar={onAtualizar} />
      </div>

      <NovoContentorModal
        open={novoContentorOpen}
        onClose={() => setNovoContentorOpen(false)}
        categoriaInicial="Lista"
        onSaved={(contentor) => {
          onSelectContentor(contentor.id);
          void handleSincronizarEm(contentor);
        }}
      />
    </div>
  );
}
