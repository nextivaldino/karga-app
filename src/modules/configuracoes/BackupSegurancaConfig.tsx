import { useState } from 'react';
import { toast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ipcService } from '@/services/ipcService';
import { ImportarExcelModal } from './ImportarExcelModal';
import { PasswordConfirmDialog } from './PasswordConfirmDialog';

type AcaoPassword = 'backup' | 'restore' | 'exportarTudo' | 'limpar' | 'reset' | null;

interface DialogConfig {
  title: string;
  message: string;
  confirmLabel: string;
  requireWord?: string;
  countdownSeconds?: number;
}

const DIALOG_CONFIG: Record<Exclude<AcaoPassword, null>, DialogConfig> = {
  backup: {
    title: 'Fazer Backup Agora',
    message: 'Vais escolher uma pasta para guardar uma cópia da base de dados atual.',
    confirmLabel: 'Continuar',
  },
  restore: {
    title: 'Restaurar Backup',
    message:
      'Isto substitui TODOS os dados atuais pelos do ficheiro de backup escolhido. A aplicação reinicia de seguida. Esta ação não pode ser desfeita.',
    confirmLabel: 'Restaurar',
  },
  exportarTudo: {
    title: 'Exportar Tudo',
    message: 'Vais gerar um ficheiro Excel com todas as cargas, contentores e contactos do sistema.',
    confirmLabel: 'Exportar',
  },
  limpar: {
    title: 'Limpar Dados de Teste',
    message:
      'Isto apaga definitivamente todas as cargas, contentores e contactos. Utilizadores e configurações mantêm-se. Esta ação não pode ser desfeita.',
    confirmLabel: 'Limpar Tudo',
  },
  reset: {
    title: 'Repor Aplicação',
    message:
      'Isto apaga TODA a base de dados (incluindo utilizadores) e volta ao assistente de configuração inicial. Esta é a ação mais perigosa do sistema e não pode ser desfeita.',
    confirmLabel: 'Repor Aplicação',
    requireWord: 'ELIMINAR',
    countdownSeconds: 5,
  },
};

interface AcaoRowProps {
  titulo: string;
  descricao: string;
  botaoLabel: string;
  tone?: 'default' | 'danger';
  onClick: () => void;
}

function AcaoRow({ titulo, descricao, botaoLabel, tone = 'default', onClick }: AcaoRowProps): React.JSX.Element {
  return (
    <div className="flex items-center justify-between gap-4 rounded-control border border-border bg-bg-surface p-md">
      <div className="min-w-0">
        <p className="text-[14px] font-medium text-text-primary">{titulo}</p>
        <p className="text-[12px] text-text-tertiary">{descricao}</p>
      </div>
      <button
        type="button"
        onClick={onClick}
        className={`shrink-0 rounded-control px-3 py-1.5 text-[13px] font-medium text-white transition-colors ${
          tone === 'danger' ? 'bg-error hover:brightness-95' : 'bg-primary hover:bg-primary-hover'
        }`}
      >
        {botaoLabel}
      </button>
    </div>
  );
}

export function BackupSegurancaConfig(): React.JSX.Element {
  const [acaoPassword, setAcaoPassword] = useState<AcaoPassword>(null);
  const [limparPreConfirmOpen, setLimparPreConfirmOpen] = useState(false);
  const [importarOpen, setImportarOpen] = useState(false);

  async function executarAcaoPassword(password: string): Promise<void> {
    switch (acaoPassword) {
      case 'backup': {
        const result = await ipcService.settings.backup(password);
        if (!('canceled' in result)) toast.success(`Backup guardado em: ${result.path}`);
        break;
      }
      case 'restore': {
        const result = await ipcService.settings.restore(password);
        if (!('canceled' in result)) toast.info('A reiniciar a aplicação para aplicar o backup restaurado...');
        break;
      }
      case 'exportarTudo': {
        const result = await ipcService.settings.exportarTudo(password);
        if (!('canceled' in result)) toast.success(`Exportação completa guardada em: ${result.path}`);
        break;
      }
      case 'limpar': {
        await ipcService.settings.limparDadosTeste(password);
        toast.success('Dados de cargas, contentores e contactos removidos.');
        setAcaoPassword(null);
        window.location.reload();
        return;
      }
      case 'reset': {
        await ipcService.settings.resetTotal(password);
        toast.info('A repor a aplicação...');
        break;
      }
      case null:
        break;
    }
    setAcaoPassword(null);
  }

  const dialogConfig = acaoPassword ? DIALOG_CONFIG[acaoPassword] : null;

  return (
    <div className="flex-1 overflow-y-auto p-xl">
      <div className="mx-auto flex max-w-[640px] flex-col gap-md">
        <AcaoRow
          titulo="Fazer Backup Agora"
          descricao="Copia a base de dados atual para uma pasta à tua escolha."
          botaoLabel="Fazer Backup"
          onClick={() => setAcaoPassword('backup')}
        />
        <AcaoRow
          titulo="Restaurar Backup"
          descricao="Substitui a base de dados atual por um ficheiro de backup escolhido."
          botaoLabel="Restaurar"
          tone="danger"
          onClick={() => setAcaoPassword('restore')}
        />
        <AcaoRow
          titulo="Importar Excel"
          descricao='Importa contactos em massa a partir de um ficheiro .xlsx (colunas: nome, telefone, email, morada, nif).'
          botaoLabel="Importar..."
          onClick={() => setImportarOpen(true)}
        />
        <AcaoRow
          titulo="Exportar Tudo"
          descricao="Gera um ficheiro Excel com todas as cargas, contentores e contactos do sistema."
          botaoLabel="Exportar Tudo"
          onClick={() => setAcaoPassword('exportarTudo')}
        />
        <AcaoRow
          titulo="Limpar Dados de Teste"
          descricao="Remove todas as cargas, contentores e contactos. Utilizadores e configurações mantêm-se."
          botaoLabel="Limpar"
          tone="danger"
          onClick={() => setLimparPreConfirmOpen(true)}
        />
        <AcaoRow
          titulo="Repor Aplicação (Reset Total)"
          descricao="Apaga toda a base de dados, incluindo utilizadores, e volta ao assistente de configuração inicial."
          botaoLabel="Repor Aplicação"
          tone="danger"
          onClick={() => setAcaoPassword('reset')}
        />
      </div>

      <ImportarExcelModal open={importarOpen} onClose={() => setImportarOpen(false)} onImportado={() => {}} />

      <ConfirmDialog
        open={limparPreConfirmOpen}
        title="Limpar Dados de Teste"
        message="Tens a certeza que queres apagar TODAS as cargas, contentores e contactos do sistema? Vais ter de confirmar com a tua password a seguir."
        tone="warning"
        confirmLabel="Continuar"
        onConfirm={() => {
          setLimparPreConfirmOpen(false);
          setAcaoPassword('limpar');
        }}
        onCancel={() => setLimparPreConfirmOpen(false)}
      />

      {dialogConfig ? (
        <PasswordConfirmDialog
          open={acaoPassword != null}
          title={dialogConfig.title}
          message={dialogConfig.message}
          confirmLabel={dialogConfig.confirmLabel}
          requireWord={dialogConfig.requireWord}
          countdownSeconds={dialogConfig.countdownSeconds}
          onConfirm={executarAcaoPassword}
          onCancel={() => setAcaoPassword(null)}
        />
      ) : null}
    </div>
  );
}
