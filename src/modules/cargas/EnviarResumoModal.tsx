import { useEffect, useState } from 'react';
import { HeaderBarModal } from '@/components/ui/HeaderBarModal';
import { ipcService } from '@/services/ipcService';
import { buildWhatsAppUrl } from '@/lib/whatsapp';
import { buildResumoMensagem, buildResumoAssunto } from '@/lib/resumoContacto';
import type { CargaComEmissor, ContactoComContagem } from '@/types';

interface EnviarResumoModalProps {
  open: boolean;
  onClose: () => void;
  canal: 'whatsapp' | 'email';
  contacto: ContactoComContagem | null;
  contentorId: string | null;
  cargas: CargaComEmissor[];
  onSent: () => void;
}

export function EnviarResumoModal({
  open,
  onClose,
  canal,
  contacto,
  contentorId,
  cargas,
  onSent,
}: EnviarResumoModalProps): React.JSX.Element | null {
  const [texto, setTexto] = useState('');
  const [assunto, setAssunto] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!open || !contacto) return;
    let cancelled = false;
    async function carregar(): Promise<void> {
      const [nomeSetting, contactoSetting] = await Promise.all([
        ipcService.settings.get('empresa_origem_nome'),
        ipcService.settings.get('empresa_origem_contacto'),
      ]);
      if (cancelled) return;
      const empresaNome = nomeSetting ?? 'Kraga Desktop';
      setTexto(buildResumoMensagem(contacto!.nome, cargas, empresaNome, contactoSetting ?? ''));
      setAssunto(buildResumoAssunto(empresaNome));
    }
    void carregar();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, contacto?.id, canal]);

  if (!open || !contacto) return null;

  async function handleEnviar(): Promise<void> {
    if (!contacto || !contentorId || !texto.trim()) return;
    setEnviando(true);
    try {
      if (canal === 'whatsapp') {
        await ipcService.shell.openExternal(buildWhatsAppUrl(contacto.telefone ?? '', texto));
      } else {
        const url = `mailto:${contacto.email ?? ''}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(texto)}`;
        await ipcService.shell.openExternal(url);
      }
      await ipcService.contactosNotificados.registar(contacto.id, contentorId, canal);
      onSent();
      onClose();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <HeaderBarModal
      open={open}
      onClose={onClose}
      title={canal === 'whatsapp' ? 'Enviar Resumo — WhatsApp' : 'Enviar Resumo — Email'}
      widthClassName="max-w-[520px]"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-control px-3 py-1.5 text-[13px] font-medium text-text-secondary transition-colors hover:bg-bg-app"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={enviando || !texto.trim()}
            onClick={() => void handleEnviar()}
            className="rounded-control bg-primary px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            Enviar
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-2">
        <p className="text-[12px] text-text-tertiary">
          Podes editar a mensagem antes de enviar. O envio abre {canal === 'whatsapp' ? 'o WhatsApp' : 'o cliente de email'}{' '}
          com este texto.
        </p>
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={14}
          className="w-full resize-none rounded-control border border-border bg-bg-app p-3 text-[13px] text-text-primary focus:border-primary focus:outline-none"
        />
      </div>
    </HeaderBarModal>
  );
}
