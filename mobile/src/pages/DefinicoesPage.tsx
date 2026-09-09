import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Bell,
  CaretRight as ChevronRight,
  Info,
  Key as KeyRound,
  SignOut as LogOut,
  MapPin,
  Moon,
  ShieldCheck,
  Sun,
} from '@phosphor-icons/react';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useTopBarSlot } from '@/hooks/useTopBarSlot';
import { Switch } from '@/components/ui/Switch';
import { AvatarPickerMobile } from '@/components/AvatarPickerMobile';
import { toast } from '@/components/ui/Toast';
import { obterMeuPosto } from '@/lib/data';
import {
  definirPreferenciaNotificacao,
  lerPreferenciasNotificacoes,
  type TipoNotificacaoConfiguravel,
} from '@/lib/preferenciasNotificacoes';
import { definirPin, pinConfigurado, removerPin, verificarPin } from '@/lib/pinLocal';
import type { MeuPostoInfo } from '@/types';

function Grupo({ titulo, children }: { titulo?: string; children: ReactNode }): React.JSX.Element {
  return (
    <div className="flex flex-col gap-1.5">
      {titulo ? <p className="px-4 text-[12px] font-semibold uppercase tracking-wide text-text-tertiary">{titulo}</p> : null}
      <div className="card-surface overflow-hidden">{children}</div>
    </div>
  );
}

function Linha({
  icon: Icon,
  iconClassName,
  label,
  onClick,
  right,
  destrutiva,
  ultima,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  iconClassName?: string;
  label: string;
  onClick?: () => void;
  right?: ReactNode;
  destrutiva?: boolean;
  ultima?: boolean;
}): React.JSX.Element {
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`flex min-h-touch w-full items-center gap-3 px-4 text-left ${!ultima ? 'border-b border-border' : ''} ${
        onClick ? (destrutiva ? 'active:bg-error/10' : 'active:bg-bg-app') : ''
      }`}
    >
      <Icon size={18} className={iconClassName ?? 'text-text-secondary'} />
      <span className={`flex-1 text-[14px] ${destrutiva ? 'text-error' : 'text-text-primary'}`}>{label}</span>
      {right ?? (onClick ? <ChevronRight size={15} className="text-text-tertiary" /> : null)}
    </Comp>
  );
}

const CAMPO_PIN = 'min-h-touch rounded-control border border-border bg-bg-input px-3 text-center text-[16px] tracking-[0.3em] text-text-primary outline-none focus:border-primary';

// Folha única para as 3 ações de PIN (configurar/alterar/desativar) — em
// vez de um wizard multi-passo, mostra só os campos relevantes de cada
// vez (no máximo 3 campos, PIN é só 4-6 dígitos, não pesa mostrar tudo
// junto).
function PinSheet({
  acao,
  onClose,
  onDone,
}: {
  acao: 'configurar' | 'alterar' | 'desativar';
  onClose: () => void;
  onDone: () => void;
}): React.JSX.Element {
  const [atual, setAtual] = useState('');
  const [novo, setNovo] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [aGuardar, setAGuardar] = useState(false);

  async function handleSubmit(): Promise<void> {
    if (acao !== 'configurar') {
      const ok = await verificarPin(atual);
      if (!ok) {
        toast.error('PIN atual incorreto.');
        return;
      }
    }
    if (acao === 'desativar') {
      removerPin();
      toast.success('PIN desativado.');
      onDone();
      return;
    }
    if (novo.length < 4) {
      toast.error('O PIN precisa de pelo menos 4 dígitos.');
      return;
    }
    if (novo !== confirmar) {
      toast.error('Os PIN não coincidem.');
      return;
    }
    setAGuardar(true);
    await definirPin(novo);
    setAGuardar(false);
    toast.success(acao === 'configurar' ? 'PIN configurado.' : 'PIN alterado.');
    onDone();
  }

  const titulo = acao === 'configurar' ? 'Configurar PIN' : acao === 'alterar' ? 'Alterar PIN' : 'Desativar PIN';

  return (
    <div className="fixed inset-0 z-[60] flex items-end bg-black/40" onClick={onClose}>
      <div
        className="w-full rounded-t-surface border-t border-border bg-bg-surface p-5 pb-[calc(env(safe-area-inset-bottom)+20px)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="mb-4 text-[15px] font-semibold text-text-primary">{titulo}</p>
        <div className="flex flex-col gap-3">
          {acao !== 'configurar' ? (
            <input
              type="password"
              inputMode="numeric"
              autoFocus
              placeholder="PIN atual"
              value={atual}
              onChange={(e) => setAtual(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className={CAMPO_PIN}
            />
          ) : null}
          {acao !== 'desativar' ? (
            <>
              <input
                type="password"
                inputMode="numeric"
                placeholder="Novo PIN"
                value={novo}
                onChange={(e) => setNovo(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className={CAMPO_PIN}
              />
              <input
                type="password"
                inputMode="numeric"
                placeholder="Confirmar PIN"
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className={CAMPO_PIN}
              />
            </>
          ) : null}
        </div>
        <button
          type="button"
          disabled={aGuardar}
          onClick={() => void handleSubmit()}
          className={`btn-primary mt-4 w-full disabled:opacity-60 ${acao === 'desativar' ? 'bg-error' : ''}`}
        >
          {aGuardar ? 'A guardar...' : titulo}
        </button>
      </div>
    </div>
  );
}

// Painel próprio (em vez do antigo menu-popover) para as definições do
// sistema — estilo "Definições" do iOS: grupos de linhas dentro de
// cartões arredondados. Secções: Perfil · Posto · Notificações ·
// Segurança · Sobre (docs/25).
export function DefinicoesPage({ onTrocarPassword }: { onTrocarPassword: () => void }): React.JSX.Element {
  const { theme, setTheme } = useTheme();
  const { logout, pwaUser, atualizarPerfil } = useAuth();

  useTopBarSlot(<span className="text-[16px] font-semibold text-text-primary">Definições</span>);

  const [nome, setNome] = useState(pwaUser?.nome ?? '');
  const [avatar, setAvatar] = useState<string | null>(pwaUser?.avatar ?? null);
  const [aGuardarPerfil, setAGuardarPerfil] = useState(false);
  const perfilAlterado = nome.trim() !== (pwaUser?.nome ?? '') || avatar !== (pwaUser?.avatar ?? null);

  async function handleGuardarPerfil(): Promise<void> {
    if (!nome.trim()) {
      toast.error('O nome não pode ficar vazio.');
      return;
    }
    setAGuardarPerfil(true);
    try {
      await atualizarPerfil(nome.trim(), avatar);
      toast.success('Perfil atualizado.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao guardar perfil.');
    } finally {
      setAGuardarPerfil(false);
    }
  }

  const [posto, setPosto] = useState<MeuPostoInfo | null | undefined>(undefined);
  useEffect(() => {
    void obterMeuPosto()
      .then(setPosto)
      .catch(() => setPosto(null));
  }, []);

  const [prefs, setPrefs] = useState(() => lerPreferenciasNotificacoes());
  function handleTogglePref(tipo: TipoNotificacaoConfiguravel, valor: boolean): void {
    definirPreferenciaNotificacao(tipo, valor);
    setPrefs((prev) => ({ ...prev, [tipo]: valor }));
  }

  const [pinAtivo, setPinAtivo] = useState(pinConfigurado());
  const [sheetPin, setSheetPin] = useState<'configurar' | 'alterar' | 'desativar' | null>(null);

  return (
    <div className="flex flex-col gap-5 px-4 py-4">
      <Grupo titulo="Perfil">
        <div className="p-4">
          <AvatarPickerMobile value={avatar} onChange={setAvatar} />
          <div className="mt-4 flex flex-col gap-1">
            <label className="text-[11px] font-medium text-text-tertiary">Nome</label>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="min-h-touch rounded-control border border-border bg-bg-input px-3 text-[15px] text-text-primary outline-none focus:border-primary"
            />
          </div>
          <p className="mt-2 text-[12px] text-text-tertiary">{pwaUser?.email}</p>
          {perfilAlterado ? (
            <button
              type="button"
              disabled={aGuardarPerfil}
              onClick={() => void handleGuardarPerfil()}
              className="btn-primary mt-3 w-full disabled:opacity-60"
            >
              {aGuardarPerfil ? 'A guardar...' : 'Guardar alterações'}
            </button>
          ) : null}
        </div>
      </Grupo>

      <Grupo titulo="Posto">
        <div className="flex min-h-touch items-center gap-3 px-4 py-2.5">
          <MapPin size={18} className="shrink-0 text-text-secondary" />
          {posto === undefined ? (
            <span className="text-[13px] text-text-tertiary">A carregar...</span>
          ) : posto ? (
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] text-text-primary">{posto.nome}</p>
              {posto.pais ? <p className="truncate text-[12px] text-text-tertiary">{posto.pais}</p> : null}
            </div>
          ) : (
            <span className="text-[13px] text-text-tertiary">Sem posto associado.</span>
          )}
        </div>
      </Grupo>

      <Grupo titulo="Notificações">
        <Linha
          icon={Bell}
          label="Carga importada"
          right={<Switch checked={prefs.carga_importada} onChange={(v) => handleTogglePref('carga_importada', v)} />}
        />
        <Linha icon={Bell} label="Carga rejeitada" right={<span className="text-[11px] text-text-tertiary">Sempre ativo</span>} />
        <Linha
          icon={Bell}
          label="Mensagem nova"
          right={<Switch checked={prefs.mensagem} onChange={(v) => handleTogglePref('mensagem', v)} />}
        />
        <Linha icon={Bell} label="Falha no envio" right={<span className="text-[11px] text-text-tertiary">Sempre ativo</span>} ultima />
      </Grupo>

      <Grupo titulo="Aparência">
        <Linha
          icon={theme === 'light' ? Sun : Moon}
          label={`Tema ${theme === 'light' ? 'claro' : 'escuro'}`}
          right={<Switch checked={theme === 'dark'} onChange={(v) => setTheme(v ? 'dark' : 'light')} />}
          ultima
        />
      </Grupo>

      <Grupo titulo="Segurança">
        <Linha icon={KeyRound} label="Trocar Password" onClick={onTrocarPassword} />
        <Linha
          icon={ShieldCheck}
          label={pinAtivo ? 'Alterar PIN' : 'Configurar PIN'}
          onClick={() => setSheetPin(pinAtivo ? 'alterar' : 'configurar')}
          ultima={!pinAtivo}
        />
        {pinAtivo ? (
          <Linha
            icon={ShieldCheck}
            iconClassName="text-error"
            label="Desativar PIN"
            destrutiva
            onClick={() => setSheetPin('desativar')}
            ultima
          />
        ) : null}
      </Grupo>

      <Grupo titulo="Sobre">
        <Linha
          icon={Info}
          label="Sobre o Karga"
          right={<span className="text-[12px] text-text-tertiary">v0.1.0</span>}
          ultima
        />
      </Grupo>

      <button
        type="button"
        onClick={() => void logout()}
        className="flex min-h-touch items-center justify-center gap-2 rounded-control text-[14px] font-medium text-error active:bg-error/10"
      >
        <LogOut size={16} /> Sair
      </button>

      <div className="px-2 text-center">
        <p className="text-[11px] text-text-tertiary">
          Desenvolvido pela <span className="font-semibold text-text-secondary">NEXT-LABS</span>
        </p>
        <p className="text-[11px] text-text-tertiary">Ivaldino Fortes · 2026</p>
      </div>

      {sheetPin ? (
        <PinSheet
          acao={sheetPin}
          onClose={() => setSheetPin(null)}
          onDone={() => {
            setSheetPin(null);
            setPinAtivo(pinConfigurado());
          }}
        />
      ) : null}
    </div>
  );
}
