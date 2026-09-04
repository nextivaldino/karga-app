import { useRef } from 'react';
import { UploadSimple as Upload, X } from '@phosphor-icons/react';
import { toast } from '@/components/ui/Toast';
import { UserAvatar } from '@/components/ui/UserAvatar';

// Predefinidos (por definição) — cobre o essencial sem exigir upload;
// tema ligado à logística marítima, mais alguns genéricos.
export const AVATARES_PREDEFINIDOS = ['👤', '🧑‍💼', '🧑‍✈️', '⚓', '🚢', '📦', '🌍', '⭐'];

const AVATAR_MAX_BYTES = 300_000;

function lerComoBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('Falha ao ler o ficheiro.'));
    reader.readAsDataURL(file);
  });
}

interface AvatarPickerProps {
  value: string | null;
  onChange: (avatar: string | null) => void;
}

export function AvatarPicker({ value, onChange }: AvatarPickerProps): React.JSX.Element {
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
      <UserAvatar avatar={value} size={56} />
      <div className="flex flex-1 flex-col gap-2">
        <div className="flex flex-wrap gap-1.5">
          {AVATARES_PREDEFINIDOS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => onChange(emoji)}
              className={`flex h-8 w-8 items-center justify-center rounded-control border text-[16px] transition-colors ${
                value === emoji ? 'border-primary bg-primary-light' : 'border-border bg-bg-surface hover:bg-bg-app'
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
            className="flex h-8 w-8 items-center justify-center rounded-control border border-dashed border-border text-text-tertiary transition-colors hover:bg-bg-app"
          >
            <Upload size={14} />
          </button>
          {value ? (
            <button
              type="button"
              title="Remover avatar"
              onClick={() => onChange(null)}
              className="flex h-8 w-8 items-center justify-center rounded-control border border-dashed border-border text-error transition-colors hover:bg-error/10"
            >
              <X size={14} />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
