import { DeviceMobile as Smartphone } from '@phosphor-icons/react';

export function PwaDevicesStub(): React.JSX.Element {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-xl text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-surface bg-purple/10 text-purple">
        <Smartphone size={28} />
      </div>
      <h2 className="text-[16px] font-semibold text-text-primary">Dispositivos PWA</h2>
      <p className="max-w-[360px] text-[13px] text-text-secondary">
        Nenhum dispositivo PWA conectado (funcionalidade em desenvolvimento). Esta secção vai permitir gerir os
        dispositivos que sincronizam com a futura aplicação Progressive Web App.
      </p>
    </div>
  );
}
