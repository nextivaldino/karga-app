import { useEffect, useState } from 'react';
import { BarChart3, Building2, Package, Palette, RefreshCw, ShieldCheck, Smartphone, User, Users } from 'lucide-react';
import { ContextToolbar } from '@/components/layout/ContextToolbar';
import { BoxedList, BoxedListRow } from '@/components/ui/BoxedList';
import { AparenciaConfig } from '@/modules/configuracoes/AparenciaConfig';
import { BackupSegurancaConfig } from '@/modules/configuracoes/BackupSegurancaConfig';
import { ContactosConfig } from '@/modules/configuracoes/ContactosConfig';
import { ContentoresConfig } from '@/modules/configuracoes/ContentoresConfig';
import { EmpresaConfig } from '@/modules/configuracoes/EmpresaConfig';
import { RelatoriosConfig } from '@/modules/configuracoes/RelatoriosConfig';
import { UtilizadoresConfig } from '@/modules/configuracoes/UtilizadoresConfig';
import { PwaDevicesStub } from '@/modules/pwa-devices/PwaDevicesStub';
import { SincronizacaoView } from '@/modules/sync/SincronizacaoView';
import { useNavigation } from '@/hooks/useNavigation';

type Secao =
  | 'empresa'
  | 'contactos'
  | 'contentores'
  | 'utilizadores'
  | 'aparencia'
  | 'backup'
  | 'pwa'
  | 'relatorios'
  | 'sync'
  | null;

const SECAO_TITULO: Record<Exclude<Secao, null>, string> = {
  empresa: 'Empresa',
  contactos: 'Contactos',
  contentores: 'Contentores e Códigos',
  utilizadores: 'Utilizadores e Permissões',
  aparencia: 'Aparência',
  backup: 'Backup, Exportação e Segurança',
  pwa: 'Dispositivos PWA',
  relatorios: 'Relatórios',
  sync: 'Sincronização',
};

export function Configuracoes(): React.JSX.Element {
  const [secao, setSecao] = useState<Secao>(null);
  const { page, params } = useNavigation();

  useEffect(() => {
    if (page === 'configuracoes' && params?.entidadeId) {
      setSecao('sync');
    }
  }, [page, params]);

  if (secao) {
    return (
      <div className="flex h-full flex-col">
        <ContextToolbar>
          <button type="button" onClick={() => setSecao(null)} className="text-[13px] font-medium text-primary">
            ‹ Configurações
          </button>
          <span className="text-[13px] font-medium text-text-secondary">/ {SECAO_TITULO[secao]}</span>
        </ContextToolbar>
        {secao === 'empresa' ? <EmpresaConfig /> : null}
        {secao === 'contactos' ? <ContactosConfig /> : null}
        {secao === 'contentores' ? <ContentoresConfig /> : null}
        {secao === 'utilizadores' ? <UtilizadoresConfig /> : null}
        {secao === 'aparencia' ? <AparenciaConfig /> : null}
        {secao === 'backup' ? <BackupSegurancaConfig /> : null}
        {secao === 'pwa' ? <PwaDevicesStub /> : null}
        {secao === 'relatorios' ? <RelatoriosConfig /> : null}
        {secao === 'sync' ? (
          <div className="flex-1 overflow-y-auto p-xl">
            <div className="mx-auto max-w-[640px]">
              <SincronizacaoView />
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <ContextToolbar>
        <span className="text-[13px] font-medium text-text-secondary">Configurações</span>
      </ContextToolbar>
      <div className="flex-1 overflow-y-auto p-xl">
        <div className="mx-auto max-w-[560px]">
          <BoxedList>
            <BoxedListRow
              title="🏢 Empresa"
              subtitle="Dados de origem/destino, moeda"
              icon={<Building2 size={18} />}
              iconColorClass="text-primary"
              onClick={() => setSecao('empresa')}
            />
            <BoxedListRow
              title="👥 Contactos"
              subtitle="CRUD global de contactos"
              icon={<Users size={18} />}
              iconColorClass="text-success"
              onClick={() => setSecao('contactos')}
            />
            <BoxedListRow
              title="📦 Contentores e Códigos"
              subtitle="Prefixos, alerta de parado, novo contentor"
              icon={<Package size={18} />}
              iconColorClass="text-primary"
              onClick={() => setSecao('contentores')}
            />
            <BoxedListRow
              title="👤 Utilizadores e Permissões"
              subtitle="O teu perfil e password"
              icon={<User size={18} />}
              iconColorClass="text-warning"
              onClick={() => setSecao('utilizadores')}
            />
            <BoxedListRow
              title="🎨 Aparência"
              subtitle="Tema claro/escuro"
              icon={<Palette size={18} />}
              iconColorClass="text-warning"
              onClick={() => setSecao('aparencia')}
            />
            <BoxedListRow
              title="💾 Backup, Exportação e Segurança"
              subtitle="Ações protegidas por password"
              icon={<ShieldCheck size={18} />}
              iconColorClass="text-error"
              onClick={() => setSecao('backup')}
            />
            <BoxedListRow
              title="📱 Dispositivos PWA"
              subtitle="Stub disponível"
              onClick={() => setSecao('pwa')}
              icon={<Smartphone size={18} />}
              iconColorClass="text-purple"
            />
            <BoxedListRow
              title="📊 Relatórios"
              subtitle="5 relatórios com exportação Excel/PDF"
              icon={<BarChart3 size={18} />}
              iconColorClass="text-primary"
              onClick={() => setSecao('relatorios')}
            />
            <BoxedListRow
              title="🔄 Sincronização"
              subtitle="Rever e importar cargas pendentes da PWA"
              icon={<RefreshCw size={18} />}
              iconColorClass="text-success"
              onClick={() => setSecao('sync')}
            />
          </BoxedList>
        </div>
      </div>
    </div>
  );
}
