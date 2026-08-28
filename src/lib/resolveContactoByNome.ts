import { ipcService } from '@/services/ipcService';

export async function resolveContactoByNome(nome: string): Promise<string | null> {
  const trimmed = nome.trim();
  if (!trimmed) return null;

  const matches = await ipcService.contactos.search(trimmed, 5);
  const exact = matches.find((m) => m.nome.toLowerCase() === trimmed.toLowerCase());
  if (exact) return exact.id;

  const created = await ipcService.contactos.create({ nome: trimmed });
  return created.id;
}
