import { createHmac } from 'node:crypto';
import os from 'node:os';
import { settingsRepository } from '../models/repositories/settingsRepository';

// Segredo fixo embutido na aplicação — licenciamento simples e local, sem
// servidor nem verificação online, conforme decidido no doc 07. Não é à prova
// de bala (o segredo pode ser extraído do binário), mas cumpre o objetivo de
// "impedir cópia trivial", não o de segurança forte tipo DRM.
const LICENSE_SECRET = 'kraga-desktop-license-v1';
const SETTINGS_KEY = 'license_key';

export function getMachineId(): string {
  return `${os.hostname()}|${process.platform}|${process.arch}`;
}

export function generateLicenseKey(machineId: string): string {
  const hash = createHmac('sha256', LICENSE_SECRET).update(machineId).digest('hex').toUpperCase();
  const raw = hash.slice(0, 16);
  return raw.match(/.{1,4}/g)!.join('-');
}

export function isActivated(): boolean {
  const stored = settingsRepository.get(SETTINGS_KEY);
  if (!stored) return false;
  return stored === generateLicenseKey(getMachineId());
}

export function activate(key: string): boolean {
  const normalizado = key.trim().toUpperCase();
  const esperado = generateLicenseKey(getMachineId());
  if (normalizado !== esperado) return false;

  settingsRepository.set(SETTINGS_KEY, normalizado);
  return true;
}
