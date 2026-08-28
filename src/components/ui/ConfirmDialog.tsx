import { HeaderBarModal } from './HeaderBarModal';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'default' | 'warning' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
}

const toneButtonClasses: Record<NonNullable<ConfirmDialogProps['tone']>, string> = {
  default: 'bg-primary hover:bg-primary-hover',
  warning: 'bg-warning hover:brightness-95',
  danger: 'bg-error hover:brightness-95',
};

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  tone = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps): React.JSX.Element | null {
  return (
    <HeaderBarModal
      open={open}
      onClose={onCancel}
      title={title}
      widthClassName="max-w-[400px]"
      footer={
        <>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-control px-4 py-2 text-[13px] font-medium text-text-secondary transition-colors hover:bg-bg-app"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-control px-4 py-2 text-[13px] font-medium text-white transition-colors ${toneButtonClasses[tone]}`}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-[14px] text-text-primary">{message}</p>
    </HeaderBarModal>
  );
}
