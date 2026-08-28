import { useState } from 'react';
import { Bell, LogOut, MessageCircle, Moon, Sun } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useNavigation } from '@/hooks/useNavigation';
import { BoxedList, BoxedListRow } from '@/components/ui/BoxedList';
import { FloatingLabelInput } from '@/components/ui/FloatingLabelInput';
import { toast } from '@/components/ui/Toast';

export function ConfiguracoesPage(): React.JSX.Element {
  const { pwaUser, logout, changePassword } = useAuth();
  const { theme, setTheme } = useTheme();
  const { navigate } = useNavigation();
  const [trocarOpen, setTrocarOpen] = useState(false);
  const [novaPassword, setNovaPassword] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleTrocarPassword(): Promise<void> {
    if (novaPassword.length < 6) {
      toast.error('A password tem de ter pelo menos 6 caracteres.');
      return;
    }
    if (novaPassword !== confirmar) {
      toast.error('As passwords não coincidem.');
      return;
    }
    setSubmitting(true);
    try {
      await changePassword(novaPassword);
      toast.success('Password atualizada.');
      setTrocarOpen(false);
      setNovaPassword('');
      setConfirmar('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao alterar a password.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-[20px] font-semibold text-text-primary">Configurações</h1>

      <div>
        <p className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-text-tertiary">{pwaUser?.nome}</p>
        <p className="text-[13px] text-text-tertiary">{pwaUser?.email}</p>
      </div>

      <BoxedList>
        <BoxedListRow
          icon={theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
          iconColorClass="text-warning"
          title="Aparência"
          subtitle={theme === 'dark' ? 'Escuro' : 'Claro'}
          trailing={
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`min-h-touch rounded-control px-3 text-[13px] font-medium ${theme === 'light' ? 'bg-primary text-white' : 'bg-bg-app text-text-secondary'}`}
              >
                Claro
              </button>
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`min-h-touch rounded-control px-3 text-[13px] font-medium ${theme === 'dark' ? 'bg-primary text-white' : 'bg-bg-app text-text-secondary'}`}
              >
                Escuro
              </button>
            </div>
          }
        />
        <BoxedListRow
          icon={<MessageCircle size={18} />}
          iconColorClass="text-purple"
          title="Mensagens"
          subtitle="Ver histórico completo"
          onClick={() => navigate('mensagens')}
        />
        <BoxedListRow
          icon={<Bell size={18} />}
          iconColorClass="text-text-tertiary"
          title="Notificações"
          subtitle="Em breve"
        />
        <BoxedListRow title="Trocar Password" onClick={() => setTrocarOpen((v) => !v)} />
      </BoxedList>

      {trocarOpen ? (
        <div className="flex flex-col gap-3 rounded-surface border border-border bg-bg-surface p-4">
          <FloatingLabelInput
            label="Nova password"
            type="password"
            autoComplete="new-password"
            value={novaPassword}
            onChange={(e) => setNovaPassword(e.target.value)}
          />
          <FloatingLabelInput
            label="Confirmar nova password"
            type="password"
            autoComplete="new-password"
            value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)}
          />
          <button
            type="button"
            disabled={submitting}
            onClick={() => void handleTrocarPassword()}
            className="min-h-touch rounded-control bg-primary text-[15px] font-medium text-white active:bg-primary-hover disabled:opacity-60"
          >
            {submitting ? 'A gravar...' : 'Guardar'}
          </button>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => void logout()}
        className="flex min-h-touch items-center justify-center gap-2 rounded-control border border-error text-[15px] font-medium text-error active:bg-error/10"
      >
        <LogOut size={18} /> Sair
      </button>
    </div>
  );
}
