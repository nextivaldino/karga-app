import { useEffect, useMemo, useState } from 'react';
import {
  Archive,
  ArrowCounterClockwise as ArchiveRestore,
  DownloadSimple,
  EnvelopeSimple as Mail,
  ChatCircle as MessageCircle,
  PencilSimple as Pencil,
  Plus,
  Receipt,
  MagnifyingGlass as Search,
  SquaresFour,
  ListBullets,
  UploadSimple,
  UserCircle,
} from '@phosphor-icons/react';
import { ContextToolbar } from '@/components/layout/ContextToolbar';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ViewSwitcher } from '@/components/ui/ViewSwitcher';
import { toast } from '@/components/ui/Toast';
import { cleanIpcError } from '@/lib/cleanIpcError';
import { formatRelativeTime } from '@/lib/formatRelativeTime';
import { buildWhatsAppUrl } from '@/lib/whatsapp';
import { useNavigation } from '@/hooks/useNavigation';
import { ipcService } from '@/services/ipcService';
import { ContactoFormModal } from '@/modules/contactos/ContactoFormModal';
import { TagPicker } from '@/modules/faturacao/TagPicker';
import { ImportarExcelModal } from './ImportarExcelModal';
import type { Contacto, Etiqueta } from '@/types';

type Vista = 'lista' | 'grelha';
type Ordenacao = 'nome' | 'recentes' | 'antigos';

function AcoesContacto({
  c,
  onEditar,
  onArquivar,
  onVerCargas,
}: {
  c: Contacto;
  onEditar: () => void;
  onArquivar: () => void;
  onVerCargas: () => void;
}): React.JSX.Element {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <button
        type="button"
        onClick={onVerCargas}
        title="Ver cargas e enviar recibo"
        className="flex h-7 w-7 items-center justify-center rounded-control text-text-secondary transition-colors hover:bg-bg-app"
      >
        <Receipt size={15} />
      </button>
      {c.telefone ? (
        <button
          type="button"
          onClick={() => void ipcService.shell.openExternal(buildWhatsAppUrl(c.telefone!))}
          title="WhatsApp"
          className="flex h-7 w-7 items-center justify-center rounded-control text-success transition-colors hover:bg-bg-app"
        >
          <MessageCircle size={15} />
        </button>
      ) : null}
      {c.email ? (
        <button
          type="button"
          onClick={() => void ipcService.shell.openExternal(`mailto:${c.email}`)}
          title="Email"
          className="flex h-7 w-7 items-center justify-center rounded-control text-text-secondary transition-colors hover:bg-bg-app"
        >
          <Mail size={15} />
        </button>
      ) : null}
      <button
        type="button"
        onClick={onEditar}
        title="Editar"
        className="flex h-7 w-7 items-center justify-center rounded-control text-text-secondary transition-colors hover:bg-bg-app"
      >
        <Pencil size={15} />
      </button>
      <button
        type="button"
        onClick={onArquivar}
        title={c.ativo ? 'Arquivar' : 'Reativar'}
        className="flex h-7 w-7 items-center justify-center rounded-control text-text-secondary transition-colors hover:bg-bg-app"
      >
        {c.ativo ? <Archive size={15} /> : <ArchiveRestore size={15} />}
      </button>
    </div>
  );
}

export function ContactosConfig(): React.JSX.Element {
  const { navigate } = useNavigation();
  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [etiquetasPorContacto, setEtiquetasPorContacto] = useState<Record<string, Etiqueta[]>>({});
  const [todasEtiquetas, setTodasEtiquetas] = useState<Etiqueta[]>([]);
  const [loading, setLoading] = useState(true);
  const [texto, setTexto] = useState('');
  const [mostrarArquivados, setMostrarArquivados] = useState(false);
  const [vista, setVista] = useState<Vista>('lista');
  const [ordenacao, setOrdenacao] = useState<Ordenacao>('nome');
  const [etiquetaFiltro, setEtiquetaFiltro] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingContacto, setEditingContacto] = useState<Contacto | null>(null);
  const [arquivando, setArquivando] = useState<Contacto | null>(null);
  const [importarOpen, setImportarOpen] = useState(false);
  const [exportando, setExportando] = useState(false);

  async function carregarEtiquetas(ids: string[]): Promise<void> {
    if (ids.length === 0) {
      setEtiquetasPorContacto({});
      return;
    }
    setEtiquetasPorContacto(await ipcService.etiquetas.listPorContactos(ids));
  }

  async function carregar(): Promise<void> {
    setLoading(true);
    const dados = await ipcService.contactos.list(mostrarArquivados, texto);
    setContactos(dados);
    await carregarEtiquetas(dados.map((c) => c.id));
    setLoading(false);
  }

  useEffect(() => {
    const timeout = setTimeout(() => void carregar(), 200);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto, mostrarArquivados]);

  useEffect(() => {
    void ipcService.etiquetas.list().then(setTodasEtiquetas);
  }, []);

  async function handleArquivar(): Promise<void> {
    if (!arquivando) return;
    try {
      if (arquivando.ativo) {
        await ipcService.contactos.archive(arquivando.id);
        toast.success(`Contacto ${arquivando.nome} arquivado.`);
      } else {
        await ipcService.contactos.reactivate(arquivando.id);
        toast.success(`Contacto ${arquivando.nome} reativado.`);
      }
      setArquivando(null);
      void carregar();
    } catch (err) {
      toast.error(cleanIpcError(err));
      setArquivando(null);
    }
  }

  async function handleExportar(): Promise<void> {
    setExportando(true);
    try {
      const result = await ipcService.settings.exportarContactos();
      if (!('canceled' in result)) toast.success(`Contactos exportados para: ${result.path}`);
    } catch (err) {
      toast.error(cleanIpcError(err));
    } finally {
      setExportando(false);
    }
  }

  const contactosOrdenados = useMemo(() => {
    let lista = contactos;
    if (etiquetaFiltro) {
      lista = lista.filter((c) => (etiquetasPorContacto[c.id] ?? []).some((e) => e.id === etiquetaFiltro));
    }
    const ordenados = [...lista];
    if (ordenacao === 'nome') ordenados.sort((a, b) => a.nome.localeCompare(b.nome));
    else if (ordenacao === 'recentes') ordenados.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    else ordenados.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return ordenados;
  }, [contactos, etiquetaFiltro, etiquetasPorContacto, ordenacao]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ContextToolbar>
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-pill bg-success px-4 text-[13px] font-medium text-white shadow-sm transition-colors hover:brightness-95"
        >
          <Plus size={18} /> Novo Contacto
        </button>
        <div className="relative flex h-9 w-[200px] shrink-0 items-center gap-2 rounded-pill border border-border bg-bg-input px-3 transition-[width] focus-within:w-[280px]">
          <Search size={15} className="shrink-0 text-text-tertiary" />
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Pesquisar contactos..."
            className="min-w-0 flex-1 bg-transparent text-[13px] text-text-primary outline-none placeholder:text-text-tertiary"
          />
        </div>

        <ViewSwitcher
          value={vista}
          onChange={setVista}
          options={[
            { value: 'lista', label: 'Lista', icon: <ListBullets size={15} /> },
            { value: 'grelha', label: 'Grelha', icon: <SquaresFour size={15} /> },
          ]}
        />

        <select
          value={ordenacao}
          onChange={(e) => setOrdenacao(e.target.value as Ordenacao)}
          className="h-9 shrink-0 rounded-control border border-border bg-bg-input px-2 text-[12px] text-text-primary outline-none"
        >
          <option value="nome">Nome (A–Z)</option>
          <option value="recentes">Mais recentes</option>
          <option value="antigos">Mais antigos</option>
        </select>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setImportarOpen(true)}
            title="Importar contactos (Excel)"
            className="flex h-9 w-9 items-center justify-center rounded-control text-text-secondary transition-colors hover:bg-bg-app"
          >
            <UploadSimple size={17} />
          </button>
          <button
            type="button"
            disabled={exportando}
            onClick={() => void handleExportar()}
            title="Exportar contactos (Excel)"
            className="flex h-9 w-9 items-center justify-center rounded-control text-text-secondary transition-colors hover:bg-bg-app disabled:opacity-50"
          >
            <DownloadSimple size={17} />
          </button>
        </div>

        <label className="ml-auto flex items-center gap-1.5 text-[13px] text-text-secondary">
          <input
            type="checkbox"
            checked={mostrarArquivados}
            onChange={(e) => setMostrarArquivados(e.target.checked)}
            className="h-3.5 w-3.5 accent-primary"
          />
          Mostrar arquivados
        </label>
      </ContextToolbar>

      {todasEtiquetas.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5 border-b border-border bg-bg-app px-lg py-2">
          <button
            type="button"
            onClick={() => setEtiquetaFiltro(null)}
            className={`rounded-pill border px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
              etiquetaFiltro === null ? 'border-primary bg-primary/10 text-primary' : 'border-border text-text-secondary hover:text-text-primary'
            }`}
          >
            Todas
          </button>
          {todasEtiquetas.map((etiqueta) => {
            const ativa = etiquetaFiltro === etiqueta.id;
            return (
              <button
                key={etiqueta.id}
                type="button"
                onClick={() => setEtiquetaFiltro(ativa ? null : etiqueta.id)}
                className="rounded-pill border px-2.5 py-0.5 text-[11px] font-medium transition-colors"
                style={
                  ativa
                    ? { backgroundColor: etiqueta.cor, borderColor: etiqueta.cor, color: '#fff' }
                    : { borderColor: `color-mix(in srgb, ${etiqueta.cor} 45%, transparent)`, color: etiqueta.cor }
                }
              >
                {etiqueta.nome}
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto p-lg">
        {loading ? (
          <p className="text-[13px] text-text-tertiary">A carregar...</p>
        ) : contactosOrdenados.length === 0 ? (
          <p className="text-[13px] text-text-tertiary">Nenhum contacto encontrado.</p>
        ) : vista === 'lista' ? (
          <div className="mx-auto flex max-w-[760px] flex-col gap-2">
            {contactosOrdenados.map((c) => (
              <div
                key={c.id}
                className={`flex items-center gap-3 rounded-control border border-border bg-bg-surface px-4 py-3 ${!c.ativo ? 'opacity-60' : ''}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <UserCircle size={16} className="shrink-0 text-text-tertiary" />
                    <span className="truncate text-[14px] font-medium text-text-primary">{c.nome}</span>
                    {!c.ativo ? (
                      <span className="rounded-pill bg-bg-app px-1.5 py-0.5 text-[10px] font-medium uppercase text-text-tertiary">
                        Arquivado
                      </span>
                    ) : null}
                    {(etiquetasPorContacto[c.id] ?? []).map((e) => (
                      <span
                        key={e.id}
                        className="rounded-pill px-1.5 py-0.5 text-[10px] font-medium"
                        style={{ backgroundColor: `color-mix(in srgb, ${e.cor} 18%, transparent)`, color: e.cor }}
                      >
                        {e.nome}
                      </span>
                    ))}
                  </div>
                  <div className="truncate pl-[24px] text-[12px] text-text-tertiary">
                    {[c.telefone, c.email, c.morada].filter(Boolean).join(' · ') || '—'}
                    {' · Criado '}
                    {formatRelativeTime(c.createdAt)}
                  </div>
                </div>
                <TagPicker contactoId={c.id} etiquetasDoContacto={etiquetasPorContacto[c.id] ?? []} todasEtiquetas={todasEtiquetas} onChange={() => void carregarEtiquetas(contactos.map((x) => x.id))} />
                <AcoesContacto
                  c={c}
                  onEditar={() => setEditingContacto(c)}
                  onArquivar={() => setArquivando(c)}
                  onVerCargas={() => navigate('cargas', { contactoId: c.id })}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {contactosOrdenados.map((c) => (
              <div
                key={c.id}
                className={`flex flex-col gap-2 rounded-surface border border-border bg-bg-surface p-4 ${!c.ativo ? 'opacity-60' : ''}`}
              >
                <div className="flex items-center gap-2.5">
                  <UserCircle size={32} className="shrink-0 text-text-tertiary" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium text-text-primary">{c.nome}</p>
                    <p className="truncate text-[11px] text-text-tertiary">{formatRelativeTime(c.createdAt)}</p>
                  </div>
                </div>
                {(etiquetasPorContacto[c.id] ?? []).length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {(etiquetasPorContacto[c.id] ?? []).map((e) => (
                      <span
                        key={e.id}
                        className="rounded-pill px-1.5 py-0.5 text-[10px] font-medium"
                        style={{ backgroundColor: `color-mix(in srgb, ${e.cor} 18%, transparent)`, color: e.cor }}
                      >
                        {e.nome}
                      </span>
                    ))}
                  </div>
                ) : null}
                <p className="truncate text-[12px] text-text-tertiary">
                  {[c.telefone, c.email].filter(Boolean).join(' · ') || '—'}
                </p>
                <div className="mt-auto flex items-center justify-between border-t border-border pt-2">
                  <TagPicker contactoId={c.id} etiquetasDoContacto={etiquetasPorContacto[c.id] ?? []} todasEtiquetas={todasEtiquetas} onChange={() => void carregarEtiquetas(contactos.map((x) => x.id))} />
                  <AcoesContacto
                  c={c}
                  onEditar={() => setEditingContacto(c)}
                  onArquivar={() => setArquivando(c)}
                  onVerCargas={() => navigate('cargas', { contactoId: c.id })}
                />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ContactoFormModal open={formOpen} onClose={() => setFormOpen(false)} onSaved={() => void carregar()} />
      <ContactoFormModal
        open={editingContacto != null}
        onClose={() => setEditingContacto(null)}
        editingContacto={editingContacto}
        onSaved={() => void carregar()}
      />
      <ImportarExcelModal open={importarOpen} onClose={() => setImportarOpen(false)} onImportado={() => void carregar()} />

      <ConfirmDialog
        open={arquivando != null}
        title={arquivando?.ativo ? 'Arquivar Contacto' : 'Reativar Contacto'}
        message={
          arquivando?.ativo
            ? `Arquivar "${arquivando?.nome}"? Deixa de aparecer nas pesquisas normais, mas os dados não são apagados.`
            : `Reativar "${arquivando?.nome}"?`
        }
        tone={arquivando?.ativo ? 'warning' : 'default'}
        confirmLabel={arquivando?.ativo ? 'Arquivar' : 'Reativar'}
        onConfirm={() => void handleArquivar()}
        onCancel={() => setArquivando(null)}
      />
    </div>
  );
}
