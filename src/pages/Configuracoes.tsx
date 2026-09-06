import { useEffect, useState } from 'react';
import { Bell, ChartBar, Buildings, ArrowsClockwise, FileArrowDown, MagnifyingGlass, Palette, ShieldCheck, User, Users } from '@phosphor-icons/react';
import { ModuleIcon } from '@/components/icons/ModuleIcon';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { ContextToolbar } from '@/components/layout/ContextToolbar';
import { FloatingLabelInput } from '@/components/ui/FloatingLabelInput';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { AparenciaConfig } from '@/modules/configuracoes/AparenciaConfig';
import { BackupSegurancaConfig } from '@/modules/configuracoes/BackupSegurancaConfig';
import { ContactosConfig } from '@/modules/configuracoes/ContactosConfig';
import { ContentoresConfig } from '@/modules/configuracoes/ContentoresConfig';
import { EmpresaConfig } from '@/modules/configuracoes/EmpresaConfig';
import { ExportacaoConfig } from '@/modules/configuracoes/ExportacaoConfig';
import { NotificacoesConfig } from '@/modules/configuracoes/NotificacoesConfig';
import { RelatoriosConfig } from '@/modules/configuracoes/RelatoriosConfig';
import { SincronizacaoConfig } from '@/modules/configuracoes/SincronizacaoConfig';
import { UtilizadoresConfig } from '@/modules/configuracoes/UtilizadoresConfig';
import { PwaDevicesStub } from '@/modules/pwa-devices/PwaDevicesStub';
import { useAuth } from '@/modules/auth/AuthContext';
import { useNavigation } from '@/hooks/useNavigation';
import { ipcService } from '@/services/ipcService';
import type { UserRole } from '@/types';

type Secao =
  | 'empresa'
  | 'contactos'
  | 'contentores'
  | 'utilizadores'
  | 'aparencia'
  | 'backup'
  | 'pwa'
  | 'relatorios'
  | 'notificacoes'
  | 'sincronizacao'
  | 'exportacao';

const SECAO_TITULO: Record<Secao, string> = {
  empresa: 'Empresa',
  contactos: 'Contactos',
  contentores: 'Contentores e Códigos',
  utilizadores: 'Utilizadores e Permissões',
  aparencia: 'Aparência',
  backup: 'Backup, Exportação e Segurança',
  pwa: 'Dispositivos PWA',
  relatorios: 'Relatórios',
  notificacoes: 'Notificações',
  sincronizacao: 'Sincronização',
  exportacao: 'Exportação',
};

const ROLE_LABEL: Record<UserRole, string> = {
  root: 'Root',
  admin: 'Admin',
  user: 'Utilizador',
};

interface GrupoNav {
  titulo: string;
  itens: { secao: Secao; icon: React.ReactNode; badge?: number }[];
}

// Ícone colorido solto (sem quadrado por trás) + nome, sem subtítulo —
// assinatura visual do System Settings do macOS. `BoxedListRow`
// continua viva só dentro de RelatoriosConfig.
function buildGrupos(naoLidas: number): GrupoNav[] {
  return [
    {
      titulo: 'Geral',
      itens: [
        { secao: 'empresa', icon: <Buildings size={20} weight="fill" className="text-primary" /> },
        { secao: 'contactos', icon: <Users size={20} weight="fill" className="text-success" /> },
      ],
    },
    {
      titulo: 'Cargas e Contentores',
      itens: [
        { secao: 'contentores', icon: <ModuleIcon module="contentores" size={20} /> },
        { secao: 'relatorios', icon: <ChartBar size={20} weight="fill" className="text-primary" /> },
        { secao: 'exportacao', icon: <FileArrowDown size={20} weight="fill" className="text-purple" /> },
      ],
    },
    {
      titulo: 'Conta e Acesso',
      itens: [
        { secao: 'utilizadores', icon: <User size={20} weight="fill" className="text-warning" /> },
        { secao: 'pwa', icon: <ModuleIcon module="dispositivos" size={20} /> },
        { secao: 'sincronizacao', icon: <ArrowsClockwise size={20} weight="fill" style={{ color: '#B07800' }} /> },
      ],
    },
    {
      titulo: 'Sistema',
      itens: [
        { secao: 'aparencia', icon: <Palette size={20} weight="fill" className="text-success" /> },
        { secao: 'notificacoes', icon: <Bell size={20} weight="fill" className="text-error" />, badge: naoLidas },
        { secao: 'backup', icon: <ShieldCheck size={20} weight="fill" className="text-text-tertiary" /> },
      ],
    },
  ];
}

export function Configuracoes(): React.JSX.Element {
  const { user } = useAuth();
  const [secao, setSecao] = useState<Secao>('empresa');
  const [busca, setBusca] = useState('');
  const [naoLidas, setNaoLidas] = useState(0);
  const { page, params } = useNavigation();

  useEffect(() => {
    if (page !== 'configuracoes') return;
    if (params?.userId || params?.mensagemDeUserId) setSecao('utilizadores');
    else if (params?.secao && params.secao in SECAO_TITULO) setSecao(params.secao as Secao);
  }, [page, params]);

  // Contagem viva na barra lateral — a mesma fonte de dados que já
  // alimenta o sino do cabeçalho, para a navegação de Definições
  // refletir o estado real da app, não só um rótulo estático.
  useEffect(() => {
    async function carregar(): Promise<void> {
      const notifs = await ipcService.notificacoes.list(50);
      setNaoLidas(notifs.filter((n) => !n.lida).length);
    }
    void carregar();
    const interval = setInterval(() => void carregar(), 60_000);
    return () => clearInterval(interval);
  }, []);

  const grupos = buildGrupos(naoLidas);
  const termo = busca.trim().toLowerCase();
  const gruposFiltrados = termo
    ? grupos
        .map((grupo) => ({ ...grupo, itens: grupo.itens.filter((item) => SECAO_TITULO[item.secao].toLowerCase().includes(termo)) }))
        .filter((grupo) => grupo.itens.length > 0)
    : grupos;

  return (
    <div className="flex h-full">
      <aside className="flex w-[260px] shrink-0 flex-col border-r border-border bg-bg-surface">
        <div className="p-3 pb-2">
          <FloatingLabelInput
            label="Pesquisar"
            icon={<MagnifyingGlass size={16} />}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        {user ? (
          <button
            type="button"
            onClick={() => setSecao('utilizadores')}
            className={`mx-3 mb-2 flex items-center gap-2.5 rounded-control px-2.5 py-2 text-left transition-colors ${
              secao === 'utilizadores' ? 'bg-primary/10' : 'hover:bg-bg-app'
            }`}
          >
            <UserAvatar avatar={user.avatar} size={32} />
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium text-text-primary">{user.name}</p>
              <p className="truncate text-[11px] text-text-tertiary">{ROLE_LABEL[user.role]}</p>
            </div>
          </button>
        ) : null}

        <nav className="flex-1 overflow-y-auto px-3 pb-3">
          {gruposFiltrados.length === 0 ? (
            <p className="px-1 py-4 text-center text-[12px] text-text-tertiary">Nada corresponde a "{busca}".</p>
          ) : (
            gruposFiltrados.map((grupo) => (
              <div key={grupo.titulo} className="mb-3">
                <h2 className="mb-1 px-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">{grupo.titulo}</h2>
                <div className="flex flex-col gap-0.5">
                  {grupo.itens.map((item) => (
                    <button
                      key={item.secao}
                      type="button"
                      onClick={() => setSecao(item.secao)}
                      className={`flex items-center gap-2.5 rounded-control px-1.5 py-1.5 text-left text-[13px] transition-colors ${
                        secao === item.secao ? 'bg-primary/10 font-medium text-primary' : 'text-text-primary hover:bg-bg-app'
                      }`}
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center">{item.icon}</span>
                      <span className="min-w-0 flex-1 truncate">{SECAO_TITULO[item.secao]}</span>
                      {item.badge ? (
                        <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-pill bg-error px-1 text-[10px] font-semibold text-white">
                          {item.badge > 99 ? '99+' : item.badge}
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <ContextToolbar variant="breadcrumb">
          <Breadcrumb items={[{ label: SECAO_TITULO[secao] }]} />
        </ContextToolbar>

        {secao === 'empresa' ? <EmpresaConfig /> : null}
        {secao === 'contactos' ? <ContactosConfig /> : null}
        {secao === 'contentores' ? <ContentoresConfig /> : null}
        {secao === 'utilizadores' ? (
          <UtilizadoresConfig initialEditUserId={params?.userId} initialConversaUserId={params?.mensagemDeUserId} />
        ) : null}
        {secao === 'aparencia' ? <AparenciaConfig /> : null}
        {secao === 'notificacoes' ? <NotificacoesConfig /> : null}
        {secao === 'backup' ? <BackupSegurancaConfig /> : null}
        {secao === 'pwa' ? <PwaDevicesStub /> : null}
        {secao === 'relatorios' ? <RelatoriosConfig /> : null}
        {secao === 'sincronizacao' ? <SincronizacaoConfig /> : null}
        {secao === 'exportacao' ? <ExportacaoConfig /> : null}
      </div>
    </div>
  );
}
