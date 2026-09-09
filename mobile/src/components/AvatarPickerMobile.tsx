import { useRef } from 'react';
import { UploadSimple as Upload, X } from '@phosphor-icons/react';
import { toast } from '@/components/ui/Toast';

// Mesmo padrão do AvatarPicker do Desktop (src/components/ui/AvatarPicker.tsx)
// — emojis predefinidos + upload lido como base64 no cliente, guardado
// direto na BD (mesmo formato que o Desktop já usa, sem Storage remoto).
const AVATARES_PREDEFINIDOS = ['👤', '🧑‍💼', '🧑‍✈️', '⚓', '🚢', '📦', '🌍', '⭐'];
const AVATAR_MAX_BYTES = 300_000;

function ehImagem(avatar: string | null | undefined): boolean {
  return Boolean(avatar?.startsWith('data:image'));
}

function lerComoBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('Falha ao ler o ficheiro.'));
    reader.readAsDataURL(file);
  });
}

interface AvatarPickerMobileProps {
  value: string | null;
  onChange: (avatar: string | null) => void;
}

export function AvatarPickerMobile({ value, onChange }: AvatarPickerMobileProps): React.JSX.Element {
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFicheiro(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Escolhe um ficheiro de imagem.');
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      toast.error('Imagem demasiado grande — usa uma até ~250 KB.');
      return;
    }
    try {
      onChange(await lerComoBase64(file));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao ler a imagem.');
    }
  }

  return (
    <div className="flex items-center gap-4">
      <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-bg-app text-[28px]">
        {ehImagem(value) ? (
          <img src={value ?? ''} alt="" className="h-full w-full object-cover" />
        ) : (
          (value ?? '👤')
        )}
      </span>
      <div className="flex flex-1 flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          {AVATARES_PREDEFINIDOS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => onChange(emoji)}
              className={`flex h-10 w-10 items-center justify-center rounded-control border text-[18px] transition-colors ${
                value === emoji ? 'border-primary bg-primary-light' : 'border-border bg-bg-surface active:bg-bg-app'
              }`}
            >
              {emoji}
            </button>
          ))}
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => void handleFicheiro(e)} />
          <button
            type="button"
            title="Carregar imagem"
            onClick={() => fileInputRef.current?.click()}
            className="flex h-10 w-10 items-center justify-center rounded-control border border-dashed border-border text-text-tertiary transition-colors active:bg-bg-app"
          >
            <Upload size={16} />
          </button>
          {value ? (
            <button
              type="button"
              title="Remover avatar"
              onClick={() => onChange(null)}
              className="flex h-10 w-10 items-center justify-center rounded-control border border-dashed border-border text-error transition-colors active:bg-error/10"
            >
              <X size={16} />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
