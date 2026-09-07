import { useEffect, useMemo, useState } from 'react';
import {
  ArrowsClockwise,
  Bell,
  Buildings,
  CaretRight,
  Check,
  CheckCircle,
  Gear,
  Key,
  LockKey,
  MagnifyingGlass,
  Plus,
  ShieldCheck,
  SignOut,
  SlidersHorizontal,
  UserCircle,
  UsersThree,
  X,
} from '@phosphor-icons/react';
import { alterarEstadoPostoRoot, criarPostoRoot, listarPostosRoot } from '@/lib/data';
import type { Posto as PostoRemoto } from '@/types';

type PostoEstado = 'ativo' | 'pendente' | 'suspenso';
type Secao = 'rede' | 'postos' | 'utilizadores' | 'seguranca' | 'auditoria';

interface Posto {
  id: string | number;
  nome: string;
  pais: string;
  estado: PostoEstado;
  utilizadores: number;
  ultimaAtividade: string;
  codigo?: string;
}

const ESTADO: Record<PostoEstado, { label: string; className: string }> = {
  ativo: { label: 'Ativo', className: 'bg-success/10 text-success' },
  pendente: { label: 'Pendente', className: 'bg-warning/10 text-warning' },
  suspenso: { label: 'Suspenso', className: 'bg-error/10 text-error' },
};

const POSTOS_INICIAIS: Posto[] = [
  { id: 1, nome: 'Luxemburgo Central', pais: 'Luxemburgo', estado: 'ativo', utilizadores: 8, ultimaAtividade: 'há 4 min' },
  { id: 2, nome: 'Praia · Achada Grande', pais: 'Cabo Verde', estado: 'ativo', utilizadores: 5, ultimaAtividade: 'há 18 min' },
  { id: 3, nome: 'Mindelo', pais: 'Cabo Verde', estado: 'pendente', utilizadores: 0, ultimaAtividade: 'aguarda ativação', codigo: 'KG-7F2Q-91LM' },
];

function EstadoBadge({ estado }: { estado: PostoEstado }): React.JSX.Element {
  const detalhe = ESTADO[estado];
  return <span className={`inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-[11px] font-semibold ${detalhe.className}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{detalhe.label}</span>;
}

function NavItem({ active, icon, label, onClick, badge }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void; badge?: number }): React.JSX.Element {
  return <button type="button" onClick={onClick} className={`flex w-full items-center gap-2.5 rounded-control px-2 py-2 text-left text-[13px] transition-colors ${active ? 'bg-primary/10 font-medium text-primary' : 'text-text-primary hover:bg-bg-app'}`}><span className="flex h-6 w-6 shrink-0 items-center justify-center">{icon}</span><span className="min-w-0 flex-1 truncate">{label}</span>{badge ? <span className="flex h-5 min-w-5 items-center justify-center rounded-pill bg-error px-1 text-[10px] font-semibold text-white">{badge}</span> : null}</button>;
}

function converterPostoRemoto(posto: PostoRemoto): Posto {
  return {
    id: posto.id,
    nome: posto.nome,
    pais: posto.pais,
    estado: posto.estado === 'bloqueado' ? 'suspenso' : posto.estado,
    utilizadores: 0,
    ultimaAtividade: posto.ativadoEm ? new Date(posto.ativadoEm).toLocaleDateString('pt-PT') : 'aguarda ativação',
    codigo: posto.codigoAtivacao ?? undefined,
  };
}

export function RootPanelPage({ demo = false }: { demo?: boolean }): React.JSX.Element {
  const [postos, setPostos] = useState<Posto[]>(demo ? POSTOS_INICIAIS : []);
  const [secao, setSecao] = useState<Secao>('rede');
  const [pesquisa, setPesquisa] = useState('');
  const [novoAberto, setNovoAberto] = useState(false);
  const [nomeNovo, setNomeNovo] = useState('');
  const [paisNovo, setPaisNovo] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [aCarregar, setACarregar] = useState(!demo);
  const postosFiltrados = useMemo(() => postos.filter((posto) => `${posto.nome} ${posto.pais}`.toLowerCase().includes(pesquisa.toLowerCase())), [postos, pesquisa]);

  useEffect(() => {
    if (demo) return;
    void listarPostosRoot()
      .then((resultado) => setPostos(resultado.map(converterPostoRemoto)))
      .catch((error: unknown) => avisar(error instanceof Error ? error.message : 'Falha ao carregar Postos.'))
      .finally(() => setACarregar(false));
  }, [demo]);

  function avisar(mensagem: string): void {
    setToast(mensagem);
    window.setTimeout(() => setToast(null), 2600);
  }

  async function criarPosto(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!nomeNovo.trim() || !paisNovo.trim()) return;
    try {
      if (demo) {
        const codigo = `KG-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
        setPostos((atuais) => [...atuais, { id: Date.now(), nome: nomeNovo.trim(), pais: paisNovo.trim(), estado: 'pendente', utilizadores: 0, ultimaAtividade: 'aguarda ativação', codigo }]);
      } else {
        const criado = await criarPostoRoot(nomeNovo, paisNovo);
        setPostos((atuais) => [converterPostoRemoto(criado), ...atuais]);
      }
      setNomeNovo(''); setPaisNovo(''); setNovoAberto(false); setSecao('postos'); avisar('Posto criado. Código de ativação gerado.');
    } catch (error) {
      avisar(error instanceof Error ? error.message : 'Falha ao criar Posto.');
    }
  }

  async function alternarEstado(posto: Posto): Promise<void> {
    const estado = posto.estado === 'suspenso' ? 'ativo' : 'suspenso';
    try {
      if (!demo && typeof posto.id === 'string') await alterarEstadoPostoRoot(posto.id, estado);
      setPostos((atuais) => atuais.map((item) => item.id === posto.id ? { ...item, estado } : item));
      avisar('Estado do posto atualizado.');
    } catch (error) {
      avisar(error instanceof Error ? error.message : 'Falha ao atualizar o Posto.');
    }
  }

  const ativos = postos.filter((posto) => posto.estado === 'ativo').length;
  const pendentes = postos.filter((posto) => posto.estado === 'pendente').length;
  const utilizadores = postos.reduce((total, posto) => total + posto.utilizadores, 0);
  const titulo: Record<Secao, string> = { rede: 'Visão geral', postos: 'Postos', utilizadores: 'Utilizadores Mobile', seguranca: 'Segurança e Acesso', auditoria: 'Auditoria' };

  return (
    <div className="root-panel-theme flex min-h-full bg-bg-app text-text-primary">
      <aside className="root-panel-sidebar flex w-[260px] shrink-0 flex-col border-r border-border bg-bg-surface">
        <div className="flex items-center gap-2.5 border-b border-border px-4 py-4"><span className="flex h-9 w-9 items-center justify-center rounded-control bg-text-primary text-[#f6c945]"><ShieldCheck size={20} weight="fill" /></span><div><p className="text-[15px] font-bold tracking-tight">KARGA <span className="font-normal text-text-tertiary">/ Root</span></p><p className="text-[10px] text-text-tertiary">Centro de controlo global</p></div></div>
        <div className="p-3 pb-2"><div className="flex items-center gap-2 rounded-control border border-border bg-bg-input px-2.5"><MagnifyingGlass size={16} className="text-text-tertiary" /><input value={pesquisa} onChange={(e) => setPesquisa(e.target.value)} className="h-10 min-w-0 flex-1 bg-transparent text-[13px] outline-none" placeholder="Pesquisar" /></div></div>
        <button type="button" onClick={() => setSecao('seguranca')} className={`mx-3 mb-3 flex items-center gap-2.5 rounded-control px-2.5 py-2 text-left ${secao === 'seguranca' ? 'bg-primary/10' : 'hover:bg-bg-app'}`}><UserCircle size={28} className="text-text-secondary" /><div className="min-w-0"><p className="truncate text-[13px] font-medium">Root Administrator</p><p className="text-[11px] text-text-tertiary">Root · 2FA ativo</p></div></button>
        <nav className="flex-1 overflow-y-auto px-3 pb-4"><p className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">Rede KARGA</p><div className="mb-4 flex flex-col gap-0.5"><NavItem active={secao === 'rede'} icon={<Buildings size={20} weight="fill" className="text-primary" />} label="Visão geral" onClick={() => setSecao('rede')} /><NavItem active={secao === 'postos'} icon={<Buildings size={20} weight="fill" className="text-success" />} label="Postos" onClick={() => setSecao('postos')} badge={pendentes} /><NavItem active={secao === 'utilizadores'} icon={<UsersThree size={20} weight="fill" className="text-warning" />} label="Utilizadores Mobile" onClick={() => setSecao('utilizadores')} /></div><p className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">Sistema</p><div className="flex flex-col gap-0.5"><NavItem active={secao === 'seguranca'} icon={<ShieldCheck size={20} weight="fill" className="text-text-tertiary" />} label="Segurança e Acesso" onClick={() => setSecao('seguranca')} /><NavItem active={secao === 'auditoria'} icon={<SlidersHorizontal size={20} weight="fill" className="text-text-tertiary" />} label="Auditoria" onClick={() => setSecao('auditoria')} /></div></nav>
        <div className="border-t border-border p-3"><button type="button" onClick={() => avisar('Sessão de teste: sair desativado.')} className="flex w-full items-center gap-2 rounded-control px-2 py-2 text-[12px] text-text-secondary hover:bg-bg-app"><SignOut size={18} /> Sair do painel</button></div>
      </aside>

      <main className="min-w-0 flex-1"><header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-bg-header px-4 py-3 backdrop-blur-xl sm:px-7"><div className="flex items-center gap-2 text-[13px]"><span className="font-semibold text-text-primary">Configurações</span><CaretRight size={14} className="text-text-tertiary" /><span className="text-text-secondary">{titulo[secao]}</span></div><div className="flex items-center gap-1"><button type="button" title="Notificações" className="relative flex h-9 w-9 items-center justify-center rounded-control text-text-secondary hover:bg-bg-app"><Bell size={19} /></button><button type="button" title="Definições" onClick={() => setSecao('seguranca')} className="flex h-9 w-9 items-center justify-center rounded-control text-text-secondary hover:bg-bg-app"><Gear size={19} /></button></div></header>
        <div className="mx-auto max-w-[980px] px-4 pb-12 pt-7 sm:px-8 sm:pt-9"><div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="mb-1 text-[12px] text-text-tertiary">Configurações / {titulo[secao]}</p><h1 className="text-[24px] font-bold tracking-tight sm:text-[28px]">{titulo[secao]}</h1></div>{secao === 'postos' ? <button type="button" onClick={() => setNovoAberto(true)} className="flex min-h-touch items-center justify-center gap-2 rounded-control bg-[#f6c945] px-4 text-[13px] font-bold text-[#18232d] shadow-soft"><Plus size={17} weight="bold" /> Novo posto</button> : null}</div>
          {secao === 'rede' ? <><section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4"><div className="card-surface p-4"><Buildings size={20} className="mb-5 text-primary" /><p className="text-[25px] font-bold">{postos.length}</p><p className="text-[11px] text-text-tertiary">Postos registados</p></div><div className="card-surface p-4"><ArrowsClockwise size={20} className="mb-5 text-success" /><p className="text-[25px] font-bold">{ativos}</p><p className="text-[11px] text-text-tertiary">A operar agora</p></div><div className="card-surface p-4"><Key size={20} className="mb-5 text-warning" /><p className="text-[25px] font-bold">{pendentes}</p><p className="text-[11px] text-text-tertiary">A aguardar ativação</p></div><div className="card-surface p-4"><UsersThree size={20} className="mb-5 text-text-secondary" /><p className="text-[25px] font-bold">{utilizadores}</p><p className="text-[11px] text-text-tertiary">Utilizadores Mobile</p></div></section><section className="card-surface p-5 sm:p-6"><div className="mb-5 flex items-center justify-between"><div><h2 className="text-[15px] font-semibold">Rede de Postos</h2><p className="mt-1 text-[12px] text-text-tertiary">Estado atual das instalações KARGA</p></div><button type="button" onClick={() => setSecao('postos')} className="text-[12px] font-semibold text-primary">Ver todos</button></div><div className="space-y-1">{postos.map((posto) => <button key={posto.id} type="button" onClick={() => setSecao('postos')} className="flex w-full items-center gap-3 rounded-control px-2 py-2.5 text-left hover:bg-bg-app"><Buildings size={19} className="shrink-0 text-text-tertiary" /><span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-medium">{posto.nome}</span><span className="text-[11px] text-text-tertiary">{posto.pais} · {posto.utilizadores} utilizadores</span></span><EstadoBadge estado={posto.estado} /></button>)}</div></section></> : null}
          {secao === 'postos' ? <section className="card-surface p-5 sm:p-6"><div className="mb-5 flex items-center gap-2 rounded-control border border-border bg-bg-input px-2.5"><MagnifyingGlass size={16} className="text-text-tertiary" /><input value={pesquisa} onChange={(e) => setPesquisa(e.target.value)} className="h-11 min-w-0 flex-1 bg-transparent text-[13px] outline-none" placeholder="Pesquisar posto ou país" /></div>{aCarregar ? <p className="py-8 text-center text-[12px] text-text-tertiary">A carregar Postos...</p> : <div className="space-y-3">{postosFiltrados.map((posto) => <article key={posto.id} className="rounded-control border border-border p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center"><div className="flex min-w-0 flex-1 items-center gap-3"><Buildings size={20} className="shrink-0 text-text-tertiary" /><div className="min-w-0"><h3 className="truncate text-[13px] font-semibold">{posto.nome}</h3><p className="text-[11px] text-text-tertiary">{posto.pais} · última atividade {posto.ultimaAtividade}</p></div></div><div className="flex items-center justify-between gap-3 sm:justify-end"><EstadoBadge estado={posto.estado} /><span className="text-[11px] text-text-tertiary">{posto.utilizadores} users</span>{posto.estado !== 'pendente' ? <button type="button" onClick={() => void alternarEstado(posto)} className="rounded-control border border-border px-3 py-2 text-[11px] font-medium text-text-secondary">{posto.estado === 'suspenso' ? 'Reativar' : 'Suspender'}</button> : <button type="button" onClick={() => avisar(`Código ${posto.codigo} copiado para teste.`)} className="flex items-center gap-1 rounded-control border border-border px-3 py-2 text-[11px] font-medium text-text-secondary"><Key size={14} /> Código</button>}</div></div>{posto.codigo ? <p className="mt-3 flex items-center gap-2 rounded-control bg-warning/10 px-3 py-2 text-[11px] text-warning"><Key size={14} /> Código de ativação: <strong>{posto.codigo}</strong></p> : null}</article>)}</div>}</section> : null}
          {secao === 'utilizadores' ? <section className="card-surface p-5 sm:p-6"><div className="mb-5 flex items-center gap-3"><UsersThree size={23} className="text-warning" /><div><h2 className="text-[15px] font-semibold">Utilizadores Mobile</h2><p className="text-[12px] text-text-tertiary">Identidades geridas por cada Posto.</p></div></div><div className="space-y-2">{postos.filter((posto) => posto.estado === 'ativo').map((posto) => <div key={posto.id} className="flex items-center gap-3 rounded-control border border-border p-3"><Buildings size={18} className="text-text-tertiary" /><span className="flex-1 text-[13px]">{posto.nome}</span><span className="text-[12px] text-text-tertiary">{posto.utilizadores} utilizadores</span><CaretRight size={16} className="text-text-tertiary" /></div>)}</div></section> : null}
          {secao === 'seguranca' ? <section className="card-surface max-w-[680px] p-5 sm:p-6"><div className="mb-6 flex items-center gap-3"><LockKey size={23} className="text-text-secondary" /><div><h2 className="text-[15px] font-semibold">Segurança e Acesso</h2><p className="text-[12px] text-text-tertiary">Proteções obrigatórias do painel Root.</p></div></div><div className="divide-y divide-border"><div className="flex items-center gap-3 py-4"><ShieldCheck size={21} className="text-success" /><div className="flex-1"><p className="text-[13px] font-medium">Autenticação de dois fatores</p><p className="text-[11px] text-text-tertiary">Obrigatória para todas as sessões Root.</p></div><span className="flex items-center gap-1 text-[11px] font-semibold text-success"><CheckCircle size={16} weight="fill" /> Ativo</span></div><div className="flex items-center gap-3 py-4"><Key size={21} className="text-warning" /><div className="flex-1"><p className="text-[13px] font-medium">Códigos de ativação</p><p className="text-[11px] text-text-tertiary">Utilização única, associados a um Posto.</p></div><span className="text-[11px] text-text-tertiary">{pendentes} pendente{pendentes === 1 ? '' : 's'}</span></div></div></section> : null}
          {secao === 'auditoria' ? <section className="card-surface max-w-[760px] p-5 sm:p-6"><div className="mb-5 flex items-center gap-3"><SlidersHorizontal size={22} className="text-text-secondary" /><div><h2 className="text-[15px] font-semibold">Auditoria</h2><p className="text-[12px] text-text-tertiary">Registo das ações administrativas do Root.</p></div></div>{['Sessão Root iniciada com 2FA', 'Posto Praia · estado verificado', 'Código de ativação criado para Mindelo', 'Política de segurança consultada'].map((evento, index) => <div key={evento} className="flex items-center gap-3 border-b border-border py-3 last:border-0"><Check size={15} className="text-success" /><span className="flex-1 text-[13px]">{evento}</span><span className="text-[11px] text-text-tertiary">{index + 1}h atrás</span></div>)}</section> : null}
        </div>
      </main>

      {demo ? <div className="fixed bottom-4 left-1/2 z-30 -translate-x-1/2 rounded-pill bg-text-primary px-4 py-2 text-[11px] font-semibold text-[#f6c945] shadow-medium">MODO DE TESTE · dados locais simulados</div> : null}{toast ? <div className="fixed right-4 top-20 z-40 rounded-control bg-text-primary px-4 py-3 text-[12px] font-semibold text-white shadow-medium">{toast}</div> : null}
      {novoAberto ? <div className="fixed inset-0 z-50 flex items-end justify-center bg-text-primary/35 p-0 sm:items-center sm:p-4"><form onSubmit={criarPosto} className="w-full max-w-[460px] rounded-t-surface bg-bg-surface p-5 shadow-medium sm:rounded-surface sm:p-6"><div className="mb-6 flex items-center justify-between"><div><p className="text-[11px] font-bold uppercase tracking-wide text-warning">Provisionamento</p><h2 className="mt-1 text-[19px] font-semibold">Criar novo Posto</h2></div><button type="button" title="Fechar" onClick={() => setNovoAberto(false)} className="flex h-9 w-9 items-center justify-center rounded-control text-text-secondary hover:bg-bg-app"><X size={19} /></button></div><label className="mb-4 block text-[12px] font-medium text-text-secondary">Nome do posto<input value={nomeNovo} onChange={(e) => setNomeNovo(e.target.value)} required className="mt-1 h-11 w-full rounded-control border border-border bg-bg-input px-3 text-[14px] outline-none focus:border-primary" placeholder="Ex.: Porto Novo" /></label><label className="mb-6 block text-[12px] font-medium text-text-secondary">País<input value={paisNovo} onChange={(e) => setPaisNovo(e.target.value)} required className="mt-1 h-11 w-full rounded-control border border-border bg-bg-input px-3 text-[14px] outline-none focus:border-primary" placeholder="Ex.: Cabo Verde" /></label><button type="submit" className="flex min-h-touch w-full items-center justify-center gap-2 rounded-control bg-[#f6c945] text-[13px] font-bold text-text-primary"><Key size={17} /> Gerar posto e código</button></form></div> : null}
    </div>
  );
}
