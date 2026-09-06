import { useCallback, useEffect, useState } from 'react';

// ── Chaves de localStorage ───────────────────────────────────────────────────
const KEY_BADGE_PULSE  = 'karga.pref.badge_pulse';
const KEY_NOTIF_SOUND  = 'karga.pref.notif_sound';
const KEY_AUTO_SYNC    = 'karga.pref.auto_sync';

function readBool(key: string, defaultValue: boolean): boolean {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? defaultValue : raw === 'true';
  } catch {
    return defaultValue;
  }
}

function writeBool(key: string, value: boolean): void {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // quota exceeded ou contexto sem storage — ignorar silenciosamente
  }
}

interface PreferenciasUI {
  /** Anima o badge de sincronização com pulse lento (3 s). ON por defeito. */
  badgePulse: boolean;
  setBadgePulse: (value: boolean) => void;
  /** Reproduz um ding suave ao receber novas cargas da PWA. ON por defeito. */
  notifSound: boolean;
  setNotifSound: (value: boolean) => void;
  /**
   * Sincroniza sozinho as cargas sem conflito assim que chegam, em vez de
   * esperar um clique em "Sincronizar" — só corre enquanto a página Sync
   * está aberta. OFF por defeito: importar dados sem confirmação explícita
   * é um comportamento a mais para ligar por escolha, não a assumir.
   */
  autoSincronizar: boolean;
  setAutoSincronizar: (value: boolean) => void;
}

/**
 * Lê/escreve as preferências de UI do Karga Desktop no localStorage.
 * Mantém o estado sincronizado entre múltiplos consumidores dentro da
 * mesma sessão via evento custom `karga-pref-change`.
 */
export function usePreferenciasUI(): PreferenciasUI {
  const [badgePulse, setBadgePulseState] = useState(() => readBool(KEY_BADGE_PULSE, true));
  const [notifSound, setNotifSoundState]  = useState(() => readBool(KEY_NOTIF_SOUND, true));
  const [autoSincronizar, setAutoSincronizarState] = useState(() => readBool(KEY_AUTO_SYNC, false));

  // Sincroniza se outra instância do hook alterar o valor na mesma sessão.
  useEffect(() => {
    function onPrefChange(): void {
      setBadgePulseState(readBool(KEY_BADGE_PULSE, true));
      setNotifSoundState(readBool(KEY_NOTIF_SOUND, true));
      setAutoSincronizarState(readBool(KEY_AUTO_SYNC, false));
    }
    window.addEventListener('karga-pref-change', onPrefChange);
    return () => window.removeEventListener('karga-pref-change', onPrefChange);
  }, []);

  const setBadgePulse = useCallback((value: boolean) => {
    writeBool(KEY_BADGE_PULSE, value);
    setBadgePulseState(value);
    window.dispatchEvent(new Event('karga-pref-change'));
  }, []);

  const setNotifSound = useCallback((value: boolean) => {
    writeBool(KEY_NOTIF_SOUND, value);
    setNotifSoundState(value);
    window.dispatchEvent(new Event('karga-pref-change'));
  }, []);

  const setAutoSincronizar = useCallback((value: boolean) => {
    writeBool(KEY_AUTO_SYNC, value);
    setAutoSincronizarState(value);
    window.dispatchEvent(new Event('karga-pref-change'));
  }, []);

  return { badgePulse, setBadgePulse, notifSound, setNotifSound, autoSincronizar, setAutoSincronizar };
}
