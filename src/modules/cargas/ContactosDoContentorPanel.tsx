import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, ChevronDown, Mail, MessageCircle, Pencil, User, UserPlus, X } from 'lucide-react';
import { ipcService } from '@/services/ipcService';
import { formatValorMoeda } from '@/lib/resumoContacto';
import { formatRelativo } from '@/lib/formatRelativo';
import { ContactoFormModal } from '@/modules/contactos/ContactoFormModal';
import { EnviarResumoModal } from './EnviarResumoModal';
import { useContactosDoContentor } from './useContactosDoContentor';
import type { CargaComEmissor, Contacto, ContactoComContagem, ContactoNotificado } from '@/types';

interface ContactosDoContentorPanelProps {
  open: boolean;
  onClose: () => void;
  contentorId: string | null;
}

export function ContactosDoContentorPanel({ open, onClose, contentorId }: ContactosDoContentorPanelProps): React.JSX.Element | null {
  const { contactos, loading, refresh } = useContactosDoContentor(contentorId);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [cargasPorContacto, setCargasPorContacto] = useState<Record<string, CargaComEmissor[]>>({});
  const [loadingCargasId, setLoadingCargasId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingContacto, setEditingContacto] = useState<Contacto | null>(null);
  const [envioModal, setEnvioModal] = useState<{ contacto: ContactoComContagem; canal: 'whatsapp' | 'email' } | null>(
    null,
  );
  const [notificados, setNotificados] = useState<Record<string, ContactoNotificado>>({});

  async function carregarNotificados(): Promise<void> {
    if (!contentorId) return;
    const dados = await ipcService.contactosNotificados.listPorContentor(contentorId);
    setNotificados(dados);
  }

  useEffect(() => {
    if (open && contentorId) void carregarNotificados();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, contentorId]);

  if (!open) return null;

  async function handleToggle(contacto: ContactoComContagem): Promise<void> {
    if (expandedId === contacto.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(contacto.id);
    if (!contentorId || cargasPorContacto[contacto.id]) return;

    setLoadingCargasId(contacto.id);
    const cargas = await ipcService.cargas.list({ contentorId, emissorId: contacto.id });
    setCargasPorContacto((prev) => ({ ...prev, [contacto.id]: cargas }));
    setLoadingCargasId(null);
  }

  function handleContactoSaved(): void {
    setCargasPorContacto({});
    refresh();
  }

  function handleNovoContacto(): void {
    setEditingContacto(null);
    setFormOpen(true);
  }

  function handleEditarContacto(contacto: Contacto): void {
    setEditingContacto(contacto);
    setFormOpen(true);
  }

  async function handleMarcarContactado(contacto: ContactoComContagem): Promise<void> {
    if (!contentorId) return;
    await ipcService.contactosNotificados.registar(contacto.id, contentorId, 'manual');
    void carregarNotificados();
  }

  return createPortal(
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
      <div
        className="fixed bottom-0 right-0 top-12 z-40 flex w-96 flex-col border-l-4 shadow-2xl"
        style={{ backgroundColor: 'var(--panel-paper-bg)', borderLeftColor: 'var(--panel-paper-border)' }}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-lg py-3">
          <h2 className="flex items-center gap-2 text-[14px] font-semibold text-text-primary">
            <User size={18} /> Contactos deste Contentor
          </h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleNovoContacto}
              title="Novo Contacto"
              className="flex h-7 w-7 items-center justify-center rounded-control text-text-secondary transition-colors hover:bg-bg-app"
            >
              <UserPlus size={16} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-control text-text-secondary transition-colors hover:bg-bg-app"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-lg text-center text-[13px] text-text-tertiary">A carregar...</div>
          ) : contactos.length === 0 ? (
            <div className="p-lg text-center text-[13px] text-text-tertiary">
              Nenhum emissor com cargas neste contentor.
            </div>
          ) : (
            contactos.map((contacto) => {
              const expanded = expandedId === contacto.id;
              const notificado = notificados[contacto.id];
              return (
                <div key={contacto.id} className="border-b border-border">
                  <button
                    type="button"
                    onClick={() => void handleToggle(contacto)}
                    className="flex w-full items-center gap-2 px-lg py-3 text-left transition-colors hover:bg-bg-app"
                  >
                    <User size={16} className="shrink-0 text-text-tertiary" />
                    <span
                      title={contacto.valorDevido > 0 ? 'Tem valor em dívida' : 'Sem valor em dívida'}
                      className={`h-2 w-2 shrink-0 rounded-pill ${contacto.valorDevido > 0 ? 'bg-warning' : 'bg-success'}`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] text-text-primary">{contacto.nome}</span>
                      {notificado ? (
                        <span className="flex items-center gap-1 text-[10px] text-success">
                          <CheckCircle2 size={10} /> Contactado {formatRelativo(notificado.contactadoEm)}
                        </span>
                      ) : null}
                    </span>
                    <span className="shrink-0 text-[12px] text-text-tertiary">
                      {contacto.totalCargas} {contacto.totalCargas === 1 ? 'carga' : 'cargas'}
                    </span>
                    <ChevronDown size={14} className={`shrink-0 text-text-tertiary transition-transform ${expanded ? 'rotate-180' : ''}`} />
                  </button>

                  {expanded ? (
                    <div className="flex flex-col gap-2 px-lg py-3" style={{ backgroundColor: 'var(--panel-paper-bg-alt)' }}>
                      {loadingCargasId === contacto.id ? (
                        <p className="text-[12px] text-text-tertiary">A carregar cargas...</p>
                      ) : (
                        (cargasPorContacto[contacto.id] ?? []).map((carga) => (
                          <div key={carga.id} className="flex items-center justify-between text-[12px] text-text-secondary">
                            <span className="truncate">
                              {carga.codigo} — {carga.nome}
                            </span>
                            <span className="shrink-0">{formatValorMoeda(carga.valor, carga.moeda)}</span>
                          </div>
                        ))
                      )}

                      <div className="mt-1 grid grid-cols-4 gap-2">
                        <button
                          type="button"
                          disabled={!contacto.telefone}
                          onClick={() => setEnvioModal({ contacto, canal: 'whatsapp' })}
                          title={contacto.telefone ? undefined : 'Sem telefone registado'}
                          className="flex items-center justify-center gap-1 rounded-control border border-border bg-bg-surface px-1.5 py-1 text-[11px] font-medium transition-colors hover:bg-bg-app disabled:cursor-not-allowed disabled:border-border disabled:text-text-tertiary disabled:opacity-40 disabled:hover:bg-bg-surface"
                          style={contacto.telefone ? { color: '#25D366' } : undefined}
                        >
                          <MessageCircle size={12} /> WhatsApp
                        </button>
                        <button
                          type="button"
                          disabled={!contacto.email}
                          onClick={() => setEnvioModal({ contacto, canal: 'email' })}
                          title={contacto.email ? undefined : 'Sem email registado'}
                          className="flex items-center justify-center gap-1 rounded-control border border-border bg-bg-surface px-1.5 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-bg-app disabled:cursor-not-allowed disabled:border-border disabled:text-text-tertiary disabled:opacity-40 disabled:hover:bg-bg-surface"
                        >
                          <Mail size={12} /> Email
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleMarcarContactado(contacto)}
                          className={`flex items-center justify-center gap-1 rounded-control border border-border bg-bg-surface px-1.5 py-1 text-[11px] font-medium transition-colors hover:bg-bg-app ${
                            notificado ? 'text-text-secondary' : 'text-success'
                          }`}
                        >
                          <CheckCircle2 size={12} fill={notificado ? 'currentColor' : 'none'} />
                          {notificado ? 'Contactado' : 'Marcar Contactado'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEditarContacto(contacto)}
                          className="flex items-center justify-center gap-1 rounded-control border border-border bg-bg-surface px-1.5 py-1 text-[11px] font-medium text-text-secondary transition-colors hover:bg-bg-app"
                        >
                          <Pencil size={12} /> Editar
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </div>

      <ContactoFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        editingContacto={editingContacto}
        onSaved={handleContactoSaved}
      />

      <EnviarResumoModal
        open={envioModal != null}
        onClose={() => setEnvioModal(null)}
        canal={envioModal?.canal ?? 'whatsapp'}
        contacto={envioModal?.contacto ?? null}
        contentorId={contentorId}
        cargas={envioModal ? (cargasPorContacto[envioModal.contacto.id] ?? []) : []}
        onSent={() => void carregarNotificados()}
      />
    </>,
    document.body,
  );
}
