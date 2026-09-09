import { useEffect, useMemo, useState } from 'react';
import {
  ArrowsClockwise,
  CalendarBlank,
  CheckCircle,
  CubeFocus,
  DeviceMobile,
  Eye,
  Key,
  Lock,
  MagnifyingGlass,
  Package,
  Scales,
  Trash,
  UserCircle,
  WarningCircle,
  XCircle,
} from '@phosphor-icons/react';
import { FloatingLabelInput } from '@/components/ui/FloatingLabelInput';
import { Switch } from '@/components/ui/Switch';
import { HeaderBarModal } from '@/components/ui/HeaderBarModal';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { toast } from '@/components/ui/Toast';
import { cleanIpcError } from '@/lib/cleanIpcError';
import { ipcService } from '@/services/ipcService';
import type { CargaPendente, DiagnosticoPosto, PostoDisponivel, UsuarioComSessao } from '@/types';

// ─── Formatters ────────────────────────────────────────────────────────────

function formatData(iso: string): string {
  return new Intl.DateTimeFormat('pt-PT', { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(iso),
  );
}

function formatValor(v: number | null): string {
  if (v == null) return '—';
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(v);
}

function formatDimensoes(c: CargaPendente): string {
  const partes = [
    c.comprimentoCm != null ? `${c.comprimentoCm}cm` : null,
    c.larguraCm != null ? `${c.larguraCm}cm` : null,
    c.alturaCm != null ? `${c.alturaCm}cm` : null,
  ].filter(Boolean);
  return partes.length > 0 ? partes.join(' × ') : '—';
}

// ─── Chave de localStorage para o toggle "aceitar cargas" ──────────────────
// Campo ainda não persistido no backend — guardado localmente por utilizador.
function getAceitarKey(userId: string): string {
  return `sync.aceitar_cargas.${userId}`;
}

function loadAceitar(userId: string): boolean {
  try {
    const val = localStorage.getItem(getAceitarKey(userId));
    return val !== 'false'; // default: aceitar
  } catch {
    return true;
  }
}

function saveAceitar(userId: string, valor: boolean): void {
  try {
    localStorage.setItem(getAceitarKey(userId), String(valor));
  } catch {
    // silencioso
  }
}

// ─── Carga em quarentena (card) ─────────────────────────────────────────────

interface CargaQuarentenaCardProps {
  carga: CargaPendente;
  onRejeitar: (carga: CargaPendente) => void;
}

function CargaQuarentenaCard({ carga, onRejeitar }: CargaQuarentenaCardProps): React.JSX.Element {
  return (
    <div className="rounded-control border border-border bg-bg-app p-3">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-text-primary">{carga.nomeCarga}</p>
          <p className="mt-0.5 truncate text-[11px] text-text-tertiary">
            {carga.emissorNome} → {carga.recetorNome}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 text-[11px] text-text-tertiary">
          <CalendarBlank size={11} />
          {formatData(carga.createdAt)}
        </div>
      </div>

      {/* Metadados da carga */}
      <div className="mt-2 flex flex-wrap gap-2">
        {carga.pesoKg != null ? (
          <span className="flex items-center gap-1 rounded-pill bg-bg-surface px-2 py-0.5 text-[11px] text-text-secondary">
            <Scales size={11} />
            {carga.pesoKg} kg
          </span>
        ) : null}
        {formatDimensoes(carga) !== '—' ? (
          <span className="flex items-center gap-1 rounded-pill bg-bg-surface px-2 py-0.5 text-[11px] text-text-secondary">
            <CubeFocus size={11} />
            {formatDimensoes(carga)}
          </span>
        ) : null}
        {carga.valor != null ? (
          <span className="flex items-center gap-1 rounded-pill bg-bg-surface px-2 py-0.5 text-[11px] text-text-secondary">
            <span className="font-bold">€</span>
            {formatValor(carga.valor)}
          </span>
        ) : null}
        <span
          className={`flex items-center gap-1 rounded-pill px-2 py-0.5 text-[11px] font-medium ${
            carga.pago ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
          }`}
        >
          {carga.pago ? <CheckCircle size={11} weight="fill" /> : <WarningCircle size={11} />}
          {carga.pago ? 'Pago' : 'Não pago'}
        </span>
        {carga.estado === 'rejeitada' ? (
          <span className="flex items-center gap-1 rounded-pill bg-error/10 px-2 py-0.5 text-[11px] font-medium text-error">
            <XCircle size={11} weight="fill" />
            Rejeitada
            {carga.motivoRejeicao ? ` — ${carga.motivoRejeicao}` : ''}
          </span>
        ) : null}
      </div>

      {carga.notas ? (
        <p className="mt-2 text-[11px] italic text-text-tertiary">"{carga.notas}"</p>
      ) : null}

      {/* Ação rejeitar (só para pendentes) */}
      {carga.estado === 'pendente' ? (
        <div className="mt-2.5 flex justify-end">
          <button
            type="button"
            onClick={() => onRejeitar(carga)}
            className="flex items-center gap-1.5 rounded-control px-2.5 py-1 text-[11px] font-medium text-error transition-colors hover:bg-error/10"
          >
            <Trash size={12} />
            Rejeitar
          </button>
        </div>
      ) : null}
    </div>
  );
}

// ─── Modal de rejeição individual ──────────────────────────────────────────

interface RejeitarModalProps {
  carga: CargaPendente | null;
  onClose: () => void;
  onConfirm: (motivo: string) => void;
  submitting: boolean;
}

function RejeitarModal({ carga, onClose, onConfirm, submitting }: RejeitarModalProps): React.JSX.Element {
  const [motivo, setMotivo] = useState('');

  // Reset ao abrir
  useEffect(() => {
    if (carga) setMotivo('');
  }, [carga]);

  return (
    <HeaderBarModal
      open={carga != null}
      onClose={onClose}
      title="Rejeitar carga"
      widthClassName="max-w-[420px]"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-control px-4 py-2 text-[13px] font-medium text-text-secondary transition-colors hover:bg-bg-app"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={submitting || !motivo.trim()}
            onClick={() => onConfirm(motivo.trim())}
            className="rounded-control bg-error px-4 py-2 text-[13px] font-medium text-white transition-colors hover:brightness-95 disabled:opacity-60"
          >
            {submitting ? 'A rejeitar...' : 'Confirmar'}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {carga ? (
          <p className="text-[13px] text-text-secondary">
            A rejeitar "{carga.nomeCarga}" de {carga.inseridoPorNome}.
          </p>
        ) : null}
        <FloatingLabelInput
          as="textarea"
          label="Motivo da rejeição"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
        />
      </div>
    </HeaderBarModal>
  );
}

// ─── Painel lateral de cargas de um utilizador ─────────────────────────────

interface PainelCargasUserProps {
  utilizador: UsuarioComSessao;
  onClose: () => void;
}

function PainelCargasUser({ utilizador, onClose }: PainelCargasUserProps): React.JSX.Element {
  const [cargas, setCargas] = useState<CargaPendente[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejeitando, setRejeitando] = useState<CargaPendente | null>(null);
  const [submittingRejeitar, setSubmittingRejeitar] = useState(false);

  async function carregar(): Promise<void> {
    setLoading(true);
    try {
      // Busca todo o histórico — inclui pendentes, importadas e rejeitadas
      const hist = await ipcService.sync.listarHistorico();
      setCargas(hist.filter((c) => c.inseridoPorUserId === utilizador.id));
    } catch {
      setCargas([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void carregar();
  }, [utilizador.id]);

  async function handleRejeitar(motivo: string): Promise<void> {
    if (!rejeitando) return;
    setSubmittingRejeitar(true);
    try {
      await ipcService.sync.rejeitarCarga(rejeitando.id, motivo);
      toast.success('Carga rejeitada.');
      setRejeitando(null);
      void carregar();
    } catch (err) {
      toast.error(cleanIpcError(err));
    } finally {
      setSubmittingRejeitar(false);
    }
  }

  const pendentes = cargas.filter((c) => c.estado === 'pendente');
  const importadas = cargas.filter((c) => c.estado === 'importada');
  const rejeitadas = cargas.filter((c) => c.estado === 'rejeitada');

  return (
    <>
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex items-center gap-2.5 border-b border-border p-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-control p-1 text-text-secondary transition-colors hover:bg-bg-app"
          >
            ← Voltar
          </button>
          <UserAvatar avatar={utilizador.avatar} size={32} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-semibold text-text-primary">{utilizador.name}</p>
            <p className="text-[11px] text-text-tertiary">{utilizador.email}</p>
          </div>
          <button
            type="button"
            onClick={() => void carregar()}
            className="rounded-control p-1.5 text-text-secondary transition-colors hover:bg-bg-app"
            title="Atualizar"
          >
            <ArrowsClockwise size={15} />
          </button>
        </div>

        {/* Stats rápidas */}
        <div className="flex gap-3 border-b border-border p-4">
          <div className="flex flex-col items-center gap-0.5 rounded-control border border-border bg-bg-app px-3 py-2 text-center">
            <span className="text-[18px] font-bold text-warning">{pendentes.length}</span>
            <span className="text-[10px] text-text-tertiary">Pendentes</span>
          </div>
          <div className="flex flex-col items-center gap-0.5 rounded-control border border-border bg-bg-app px-3 py-2 text-center">
            <span className="text-[18px] font-bold text-success">{importadas.length}</span>
            <span className="text-[10px] text-text-tertiary">Importadas</span>
          </div>
          <div className="flex flex-col items-center gap-0.5 rounded-control border border-border bg-bg-app px-3 py-2 text-center">
            <span className="text-[18px] font-bold text-error">{rejeitadas.length}</span>
            <span className="text-[10px] text-text-tertiary">Rejeitadas</span>
          </div>
          <div className="flex flex-col items-center gap-0.5 rounded-control border border-border bg-bg-app px-3 py-2 text-center">
            <span className="text-[18px] font-bold text-text-primary">{cargas.length}</span>
            <span className="text-[10px] text-text-tertiary">Total</span>
          </div>
        </div>

        {/* Lista de cargas */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <p className="text-[13px] text-text-tertiary">A carregar...</p>
          ) : cargas.length === 0 ? (
            <p className="text-[13px] text-text-tertiary">
              Este utilizador ainda não inseriu nenhuma carga.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {pendentes.length > 0 ? (
                <div>
                  <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-warning">
                    Pendentes ({pendentes.length})
                  </h3>
                  <div className="flex flex-col gap-2">
                    {pendentes.map((c) => (
                      <CargaQuarentenaCard key={c.id} carga={c} onRejeitar={setRejeitando} />
                    ))}
                  </div>
                </div>
              ) : null}

              {importadas.length > 0 ? (
                <div>
                  <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-success">
                    Importadas ({importadas.length})
                  </h3>
                  <div className="flex flex-col gap-2">
                    {importadas.map((c) => (
                      <CargaQuarentenaCard key={c.id} carga={c} onRejeitar={setRejeitando} />
                    ))}
                  </div>
                </div>
              ) : null}

              {rejeitadas.length > 0 ? (
                <div>
                  <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-error">
                    Rejeitadas ({rejeitadas.length})
                  </h3>
                  <div className="flex flex-col gap-2">
                    {rejeitadas.map((c) => (
                      <CargaQuarentenaCard key={c.id} carga={c} onRejeitar={setRejeitando} />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <RejeitarModal
        carga={rejeitando}
        onClose={() => setRejeitando(null)}
        onConfirm={(motivo) => void handleRejeitar(motivo)}
        submitting={submittingRejeitar}
      />
    </>
  );
}

// ─── Card "Ativar posto por código" ─────────────────────────────────────────
// Caminho recomendado (doc 23 §2): o Root gera um código de utilização
// única por posto no painel Root (Mobile); o Admin resgata-o aqui, uma
// vez, na instalação certa. Evita o erro humano de escolher o posto
// errado no dropdown manual abaixo (que continua a existir como reserva).

interface AtivarPostoCardProps {
  onAtivado: (postoId: string) => void;
}

function AtivarPostoCard({ onAtivado }: AtivarPostoCardProps): React.JSX.Element {
  const [codigo, setCodigo] = useState('');
  const [ativando, setAtivando] = useState(false);

  async function handleAtivar(): Promise<void> {
    if (!codigo.trim()) return;
    setAtivando(true);
    try {
      const posto = await ipcService.sync.ativarPosto(codigo.trim());
      toast.success(`Instalação ligada ao posto "${posto.nome}".`);
      setCodigo('');
      onAtivado(posto.id);
    } catch (err) {
      toast.error(cleanIpcError(err));
    } finally {
      setAtivando(false);
    }
  }

  return (
    <div className="rounded-surface border border-border bg-bg-surface p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-primary/15">
          <Key size={18} weight="fill" className="text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-text-primary">Ativar posto por código</p>
          <p className="mt-0.5 text-[12px] text-text-tertiary">
            Cola aqui o código de ativação gerado pelo Root para o posto desta instalação — evita ter de escolher o posto certo à mão.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="w-full sm:max-w-[320px]">
              <FloatingLabelInput
                label="Código de ativação"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                className="uppercase"
              />
            </div>
            <button
              type="button"
              disabled={ativando || !codigo.trim()}
              onClick={() => void handleAtivar()}
              className="shrink-0 rounded-control bg-primary px-3.5 py-2 text-[13px] font-medium text-white transition-colors hover:brightness-95 disabled:opacity-50"
            >
              {ativando ? 'A ativar...' : 'Ativar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Card "Posto desta instalação" ──────────────────────────────────────────
// Só aparece se existirem postos no Supabase — instalações que ainda não
// usam a arquitetura multi-posto não veem nada aqui.

interface PostoInstalacaoCardProps {
  postos: PostoDisponivel[];
  postoAtual: string | null;
  diagnostico: DiagnosticoPosto | null;
  onGuardado: (postoId: string) => void;
}

function PostoInstalacaoCard({
  postos,
  postoAtual,
  diagnostico,
  onGuardado,
}: PostoInstalacaoCardProps): React.JSX.Element {
  const [selecionado, setSelecionado] = useState(postoAtual ?? '');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    setSelecionado(postoAtual ?? '');
  }, [postoAtual]);

  async function handleGuardar(): Promise<void> {
    if (!selecionado) return;
    setGuardando(true);
    try {
      await ipcService.settings.set('posto_id', selecionado);
      toast.success('Posto desta instalação atualizado.');
      onGuardado(selecionado);
    } catch (err) {
      toast.error(cleanIpcError(err));
    } finally {
      setGuardando(false);
    }
  }

  const configurado = diagnostico?.estado === 'ok';

  return (
    <div className="rounded-surface border border-border bg-bg-surface p-4">
      <div className="flex items-start gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-control ${
            configurado ? 'bg-success/15' : 'bg-warning/15'
          }`}
        >
          {configurado ? (
            <CheckCircle size={18} weight="fill" className="text-success" />
          ) : (
            <WarningCircle size={18} weight="fill" className="text-warning" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-[14px] font-semibold text-text-primary">Posto desta instalação</p>
            <span
              className={`shrink-0 rounded-pill px-2 py-0.5 text-[10px] font-medium ${
                configurado ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'
              }`}
            >
              {configurado ? 'Configurado' : 'Escolhe o posto'}
            </span>
          </div>
          <p className="mt-0.5 text-[12px] text-text-tertiary">
            {configurado
              ? 'A sincronização de cargas, contentores e utilizadores PWA está limitada a este posto.'
              : 'Existe mais de um posto ativo (ou nenhum) — escolhe manualmente a que posto esta instalação pertence.'}
          </p>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              value={selecionado}
              onChange={(e) => setSelecionado(e.target.value)}
              className="w-full rounded-control border border-border bg-bg-app px-3 py-2 text-[13px] text-text-primary sm:max-w-[320px]"
            >
              <option value="" disabled>
                Seleciona um posto...
              </option>
              {postos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                  {p.pais ? ` — ${p.pais}` : ''} ({p.estado})
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={guardando || !selecionado || selecionado === postoAtual}
              onClick={() => void handleGuardar()}
              className="shrink-0 rounded-control bg-primary px-3.5 py-2 text-[13px] font-medium text-white transition-colors hover:brightness-95 disabled:opacity-50"
            >
              {guardando ? 'A guardar...' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Card de utilizador PWA ─────────────────────────────────────────────────

interface UserPwaCardProps {
  utilizador: UsuarioComSessao;
  aceitarCargas: boolean;
  onToggleAceitar: (userId: string, valor: boolean) => void;
  onVerCargas: (utilizador: UsuarioComSessao) => void;
  pendentesCount: number;
}

function UserPwaCard({
  utilizador,
  aceitarCargas,
  onToggleAceitar,
  onVerCargas,
  pendentesCount,
}: UserPwaCardProps): React.JSX.Element {
  return (
    <div
      className={`rounded-surface border bg-bg-surface transition-all ${
        !aceitarCargas
          ? 'border-error/40 bg-error/[0.03]'
          : utilizador.active
            ? 'border-border'
            : 'border-border opacity-60'
      }`}
    >
      {/* Cabeçalho do card */}
      <div className="flex items-center gap-3 p-4">
        <div className="relative shrink-0">
          <UserAvatar avatar={utilizador.avatar} size={40} />
          {/* Indicador PWA */}
          <span
            className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-white"
            title="Utilizador PWA"
          >
            <DeviceMobile size={9} weight="fill" />
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-[14px] font-semibold text-text-primary">{utilizador.name}</p>
            {!utilizador.active ? (
              <span className="shrink-0 rounded-pill bg-text-tertiary/10 px-1.5 py-0.5 text-[10px] font-medium text-text-tertiary">
                Bloqueado
              </span>
            ) : null}
          </div>
          <p className="truncate text-[11px] text-text-tertiary">{utilizador.email}</p>
          {utilizador.ultimaSessao ? (
            <p className="mt-0.5 text-[10px] text-text-tertiary">
              Última sessão: {new Intl.DateTimeFormat('pt-PT', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(utilizador.ultimaSessao))}
            </p>
          ) : null}
        </div>

        {/* Badges de cargas */}
        {pendentesCount > 0 ? (
          <span className="shrink-0 rounded-pill bg-warning/15 px-2 py-0.5 text-[11px] font-semibold text-warning">
            {pendentesCount} pendente{pendentesCount !== 1 ? 's' : ''}
          </span>
        ) : null}
      </div>

      {/* Controles */}
      <div className="flex items-center justify-between gap-3 border-t border-border bg-bg-app px-4 py-3">
        {/* Toggle aceitar cargas */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Switch
            checked={aceitarCargas}
            onChange={(v) => onToggleAceitar(utilizador.id, v)}
            label=""
          />
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-text-primary">
              {aceitarCargas ? 'A aceitar cargas' : 'Cargas bloqueadas'}
            </p>
            <p className="text-[11px] text-text-tertiary">
              {aceitarCargas
                ? 'As cargas deste utilizador entram na fila de revisão normal.'
                : 'As cargas ficam em quarentena e não aparecem na revisão.'}
            </p>
          </div>
        </div>

        {/* Botão ver cargas */}
        <button
          type="button"
          onClick={() => onVerCargas(utilizador)}
          className="flex shrink-0 items-center gap-1.5 rounded-control px-3 py-1.5 text-[12px] font-medium text-text-secondary transition-colors hover:bg-bg-surface"
        >
          <Eye size={14} />
          Ver cargas
        </button>
      </div>

      {/* Banner de quarentena */}
      {!aceitarCargas ? (
        <div className="flex items-center gap-2 border-t border-error/20 bg-error/[0.06] px-4 py-2.5">
          <Lock size={13} className="shrink-0 text-error" weight="fill" />
          <p className="text-[12px] text-error">
            As cargas que este utilizador inserir ficam retidas em quarentena e não chegam à revisão. Podes vê-las clicando em "Ver cargas".
          </p>
        </div>
      ) : null}
    </div>
  );
}

// ─── Componente principal ──────────────────────────────────────────────────

export function SincronizacaoConfig(): React.JSX.Element {
  const [utilizadores, setUtilizadores] = useState<UsuarioComSessao[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [aceitarMap, setAceitarMap] = useState<Record<string, boolean>>({});
  const [pendentesMap, setPendentesMap] = useState<Record<string, number>>({});
  const [userAberto, setUserAberto] = useState<UsuarioComSessao | null>(null);
  const [postos, setPostos] = useState<PostoDisponivel[]>([]);
  const [postoAtual, setPostoAtual] = useState<string | null>(null);
  const [diagnosticoPosto, setDiagnosticoPosto] = useState<DiagnosticoPosto | null>(null);

  async function carregar(): Promise<void> {
    setLoading(true);
    try {
      const todos = await ipcService.users.list();
      const pwas = todos.filter((u) => u.pwaHabilitado);
      setUtilizadores(pwas);

      // Carregar estado local de "aceitar cargas"
      const mapa: Record<string, boolean> = {};
      for (const u of pwas) {
        mapa[u.id] = loadAceitar(u.id);
      }
      setAceitarMap(mapa);

      // Contar cargas pendentes por utilizador
      try {
        const pendentes = await ipcService.sync.listPendentes();
        const contagem: Record<string, number> = {};
        for (const p of pendentes) {
          contagem[p.inseridoPorUserId] = (contagem[p.inseridoPorUserId] ?? 0) + 1;
        }
        setPendentesMap(contagem);
      } catch {
        // Silencioso — contagem de pendentes é opcional
      }

      // Posto desta instalação — só relevante se o Supabase já tiver a
      // tabela `postos` populada (arquitetura multi-posto em uso).
      try {
        const [lista, atual, diag] = await Promise.all([
          ipcService.sync.listarPostos(),
          ipcService.settings.get('posto_id'),
          ipcService.sync.diagnosticoPosto(),
        ]);
        setPostos(lista);
        setPostoAtual(atual);
        setDiagnosticoPosto(diag);
      } catch {
        setPostos([]);
      }
    } catch (err) {
      toast.error(cleanIpcError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void carregar();
  }, []);

  function handleToggleAceitar(userId: string, valor: boolean): void {
    saveAceitar(userId, valor);
    setAceitarMap((m) => ({ ...m, [userId]: valor }));
    toast.success(
      valor
        ? 'Cargas do utilizador voltarão a entrar na fila de revisão.'
        : 'Cargas do utilizador ficarão em quarentena.',
    );
  }

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return utilizadores;
    return utilizadores.filter(
      (u) => u.name.toLowerCase().includes(termo) || u.email.toLowerCase().includes(termo),
    );
  }, [utilizadores, busca]);

  const bloqueados = utilizadores.filter((u) => !aceitarMap[u.id]);
  const totalPendentes = Object.values(pendentesMap).reduce((a, b) => a + b, 0);

  // ── Painel lateral de cargas de um utilizador ──────────────────────────
  if (userAberto) {
    return <PainelCargasUser utilizador={userAberto} onClose={() => setUserAberto(null)} />;
  }

  return (
    <div className="flex-1 overflow-y-auto p-xl">
      <div className="mx-auto flex max-w-[720px] flex-col gap-lg">
        {/* Cabeçalho */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-control bg-[#FFB400]/15">
            <ArrowsClockwise size={20} weight="fill" className="text-[#B07800]" />
          </div>
          <div>
            <h1 className="text-[16px] font-bold text-text-primary">Configuração de Sincronização</h1>
            <p className="text-[12px] text-text-tertiary">
              Gere os utilizadores com acesso PWA e controla quais as cargas que entram na revisão.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void carregar()}
            className="ml-auto rounded-control p-2 text-text-secondary transition-colors hover:bg-bg-surface"
            title="Atualizar"
          >
            <ArrowsClockwise size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Posto desta instalação (só aparece se multi-posto estiver em uso) */}
        {postos.length > 0 ? (
          <AtivarPostoCard
            onAtivado={(id) => {
              setPostoAtual(id);
              void carregar();
            }}
          />
        ) : null}
        {postos.length > 0 ? (
          <PostoInstalacaoCard
            postos={postos}
            postoAtual={postoAtual}
            diagnostico={diagnosticoPosto}
            onGuardado={(id) => {
              setPostoAtual(id);
              void ipcService.sync.diagnosticoPosto().then(setDiagnosticoPosto);
            }}
          />
        ) : null}

        {/* Banner de resumo */}
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 rounded-control border border-border bg-bg-surface px-3 py-2.5">
            <DeviceMobile size={16} className="text-primary" weight="fill" />
            <div>
              <p className="text-[13px] font-semibold text-text-primary">{utilizadores.length}</p>
              <p className="text-[10px] text-text-tertiary">Utilizadores PWA</p>
            </div>
          </div>

          {totalPendentes > 0 ? (
            <div className="flex items-center gap-2 rounded-control border border-warning/30 bg-warning/5 px-3 py-2.5">
              <Package size={16} className="text-warning" weight="fill" />
              <div>
                <p className="text-[13px] font-semibold text-warning">{totalPendentes}</p>
                <p className="text-[10px] text-text-tertiary">Cargas pendentes</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-control border border-success/30 bg-success/5 px-3 py-2.5">
              <CheckCircle size={16} className="text-success" weight="fill" />
              <div>
                <p className="text-[13px] font-semibold text-success">0</p>
                <p className="text-[10px] text-text-tertiary">Pendentes</p>
              </div>
            </div>
          )}

          {bloqueados.length > 0 ? (
            <div className="flex items-center gap-2 rounded-control border border-error/30 bg-error/5 px-3 py-2.5">
              <Lock size={16} className="text-error" weight="fill" />
              <div>
                <p className="text-[13px] font-semibold text-error">{bloqueados.length}</p>
                <p className="text-[10px] text-text-tertiary">Em quarentena</p>
              </div>
            </div>
          ) : null}
        </div>

        {/* Pesquisa */}
        {utilizadores.length > 3 ? (
          <FloatingLabelInput
            label="Pesquisar utilizador"
            icon={<MagnifyingGlass size={16} />}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        ) : null}

        {/* Lista de utilizadores */}
        {loading ? (
          <p className="text-[13px] text-text-tertiary">A carregar utilizadores PWA...</p>
        ) : utilizadores.length === 0 ? (
          <div className="rounded-surface border border-border bg-bg-surface p-8 text-center">
            <DeviceMobile size={36} className="mx-auto mb-3 text-text-tertiary" />
            <p className="text-[14px] font-medium text-text-primary">Sem utilizadores PWA</p>
            <p className="mt-1 text-[12px] text-text-tertiary">
              Para habilitar um utilizador para a app móvel, vai a Utilizadores e Permissões e
              ativa o toggle "Pode sincronizar via PWA".
            </p>
          </div>
        ) : filtrados.length === 0 ? (
          <p className="text-[13px] text-text-tertiary">
            Nenhum utilizador corresponde a "{busca}".
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {/* Utilizadores com cargas bloqueadas primeiro */}
            {filtrados
              .slice()
              .sort((a, b) => {
                const aBlock = !aceitarMap[a.id] ? -1 : 0;
                const bBlock = !aceitarMap[b.id] ? -1 : 0;
                const aPend = pendentesMap[a.id] ?? 0;
                const bPend = pendentesMap[b.id] ?? 0;
                return aBlock - bBlock || bPend - aPend || a.name.localeCompare(b.name);
              })
              .map((u) => (
                <UserPwaCard
                  key={u.id}
                  utilizador={u}
                  aceitarCargas={aceitarMap[u.id] ?? true}
                  onToggleAceitar={handleToggleAceitar}
                  onVerCargas={setUserAberto}
                  pendentesCount={pendentesMap[u.id] ?? 0}
                />
              ))}
          </div>
        )}

        {/* Nota informativa */}
        <div className="rounded-control border border-border bg-bg-app p-3">
          <div className="flex items-start gap-2">
            <UserCircle size={15} className="mt-0.5 shrink-0 text-text-tertiary" />
            <p className="text-[12px] text-text-tertiary">
              <strong className="text-text-secondary">Quarentena local:</strong> bloquear as cargas de um utilizador
              não o impede de usar a app móvel — apenas retém as suas cargas nesta página.
              Mesmo que o utilizador seja bloqueado no sistema, as cargas que inseriu antes
              do bloqueio ficam visíveis aqui para revisão ou rejeição.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
