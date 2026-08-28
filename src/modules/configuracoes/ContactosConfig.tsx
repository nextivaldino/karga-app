import { useEffect, useState } from 'react';
import { Archive, ArchiveRestore, Mail, MessageCircle, Pencil, Plus, Search } from 'lucide-react';
import { ContextToolbar } from '@/components/layout/ContextToolbar';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { toast } from '@/components/ui/Toast';
import { cleanIpcError } from '@/lib/cleanIpcError';
import { buildWhatsAppUrl } from '@/lib/whatsapp';
import { ipcService } from '@/services/ipcService';
import { ContactoFormModal } from '@/modules/contactos/ContactoFormModal';
import type { Contacto } from '@/types';

export function ContactosConfig(): React.JSX.Element {
  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [loading, setLoading] = useState(true);
  const [texto, setTexto] = useState('');
  const [mostrarArquivados, setMostrarArquivados] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingContacto, setEditingContacto] = useState<Contacto | null>(null);
  const [arquivando, setArquivando] = useState<Contacto | null>(null);

  async function carregar(): Promise<void> {
    setLoading(true);
    const dados = await ipcService.contactos.list(mostrarArquivados, texto);
    setContactos(dados);
    setLoading(false);
  }

  useEffect(() => {
    const timeout = setTimeout(() => void carregar(), 200);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto, mostrarArquivados]);

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

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ContextToolbar>
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          className="flex items-center gap-1.5 rounded-control bg-primary px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-primary-hover"
        >
          <Plus size={16} /> Novo Contacto
        </button>
        <div className="relative">
          <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Pesquisar..."
            className="w-56 rounded-control border border-border bg-bg-input py-1.5 pl-8 pr-3 text-[13px] text-text-primary outline-none focus:border-primary"
          />
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

      <div className="min-h-0 flex-1 overflow-y-auto p-lg">
        {loading ? (
          <p className="text-[13px] text-text-tertiary">A carregar...</p>
        ) : contactos.length === 0 ? (
          <p className="text-[13px] text-text-tertiary">Nenhum contacto encontrado.</p>
        ) : (
          <div className="mx-auto flex max-w-[720px] flex-col gap-2">
            {contactos.map((c) => (
              <div
                key={c.id}
                className={`flex items-center gap-3 rounded-control border border-border bg-bg-surface px-4 py-3 ${
                  !c.ativo ? 'opacity-60' : ''
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[14px] font-medium text-text-primary">{c.nome}</span>
                    {!c.ativo ? (
                      <span className="rounded-pill bg-bg-app px-1.5 py-0.5 text-[10px] font-medium uppercase text-text-tertiary">
                        Arquivado
                      </span>
                    ) : null}
                  </div>
                  <div className="truncate text-[12px] text-text-tertiary">
                    {[c.telefone, c.email, c.morada].filter(Boolean).join(' · ') || '—'}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
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
                    onClick={() => setEditingContacto(c)}
                    title="Editar"
                    className="flex h-7 w-7 items-center justify-center rounded-control text-text-secondary transition-colors hover:bg-bg-app"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setArquivando(c)}
                    title={c.ativo ? 'Arquivar' : 'Reativar'}
                    className="flex h-7 w-7 items-center justify-center rounded-control text-text-secondary transition-colors hover:bg-bg-app"
                  >
                    {c.ativo ? <Archive size={15} /> : <ArchiveRestore size={15} />}
                  </button>
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
