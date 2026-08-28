import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { userRepository } from '../models/repositories/userRepository';
import { permissaoRepository } from '../models/repositories/permissaoRepository';
import { sessaoRepository } from '../models/repositories/sessaoRepository';
import { criarUtilizadorPwaAuth, desativarUtilizadorPwaAuth, reativarUtilizadorPwaAuth, upsertPwaUser } from '../lib/supabaseClient';
import type { CreateUserInput, HabilitarPwaResult, PermissaoInput, PublicUser, UserRole, UsuarioComSessao } from '../../src/types';

const SALT_ROUNDS = 10;

function toPublicUser(user: Awaited<ReturnType<typeof userRepository.findById>>): PublicUser {
  if (!user) throw new Error('Utilizador não encontrado.');
  const { passwordHash: _passwordHash, ...publicUser } = user;
  return publicUser;
}

export function listUsuariosComSessao(): UsuarioComSessao[] {
  const usuarios = userRepository.list();
  const ultimasSessoes = sessaoRepository.ultimaSessaoPorUser();
  return usuarios.map((u) => {
    const { passwordHash: _passwordHash, ...publicUser } = u;
    return { ...publicUser, ultimaSessao: ultimasSessoes[u.id] ?? null };
  });
}

export async function criarUsuario(
  requestedByRole: UserRole,
  input: CreateUserInput,
): Promise<PublicUser> {
  if (requestedByRole !== 'admin') {
    throw new Error('Só um Admin pode criar utilizadores.');
  }
  if (input.role !== 'user') {
    throw new Error('Um Admin só pode criar utilizadores do tipo "user".');
  }
  if (!input.name.trim() || !input.email.trim() || input.password.length < 6) {
    throw new Error('Dados inválidos: nome e email são obrigatórios, password com pelo menos 6 caracteres.');
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  const user = userRepository.create({
    name: input.name.trim(),
    email: input.email.toLowerCase().trim(),
    passwordHash,
    role: 'user',
  });

  if (input.permissoes?.length) {
    permissaoRepository.setBulk(user.id, input.permissoes);
  }

  return toPublicUser(user);
}

export function editarUsuario(
  requestedByRole: UserRole,
  userId: string,
  changes: { name: string; email: string },
): PublicUser {
  if (requestedByRole !== 'admin') throw new Error('Só um Admin pode editar utilizadores.');

  const existing = userRepository.findById(userId);
  if (!existing) throw new Error('Utilizador não encontrado.');
  if (existing.role !== 'user') throw new Error('Um Admin só pode editar utilizadores do tipo "user".');

  const email = changes.email.toLowerCase().trim();
  const emailEmUso = userRepository.findByEmail(email);
  if (emailEmUso && emailEmUso.id !== userId) {
    throw new Error('Já existe um utilizador com este email.');
  }

  const updated = userRepository.update(userId, { name: changes.name.trim(), email });
  return toPublicUser(updated);
}

export function definirPermissoes(requestedByRole: UserRole, userId: string, permissoes: PermissaoInput[]): void {
  if (requestedByRole !== 'admin') throw new Error('Só um Admin pode alterar permissões.');
  const existing = userRepository.findById(userId);
  if (!existing || existing.role !== 'user') throw new Error('Utilizador não encontrado.');
  permissaoRepository.setBulk(userId, permissoes);
}

export function bloquearUsuario(requestedByRole: UserRole, userId: string): PublicUser {
  if (requestedByRole !== 'admin') throw new Error('Só um Admin pode bloquear utilizadores.');
  const existing = userRepository.findById(userId);
  if (!existing) throw new Error('Utilizador não encontrado.');
  if (existing.role !== 'user') throw new Error('Um Admin só pode bloquear utilizadores do tipo "user".');

  const updated = userRepository.update(userId, { active: false });
  return toPublicUser(updated);
}

export function reativarUsuario(requestedByRole: UserRole, userId: string): PublicUser {
  if (requestedByRole !== 'admin') throw new Error('Só um Admin pode reativar utilizadores.');
  const existing = userRepository.findById(userId);
  if (!existing) throw new Error('Utilizador não encontrado.');
  if (existing.role !== 'user') throw new Error('Um Admin só pode reativar utilizadores do tipo "user".');

  const updated = userRepository.update(userId, { active: true });
  return toPublicUser(updated);
}

export function eliminarUsuario(requestedByRole: UserRole, userId: string): void {
  if (requestedByRole !== 'admin') throw new Error('Só um Admin pode eliminar utilizadores.');
  const existing = userRepository.findById(userId);
  if (!existing) throw new Error('Utilizador não encontrado.');
  if (existing.role !== 'user') throw new Error('Um Admin só pode eliminar utilizadores do tipo "user".');

  userRepository.update(userId, { active: false });
}

export async function resetPasswordAdmin(
  requestedByRole: UserRole,
  targetUserId: string,
  newPassword: string,
): Promise<void> {
  if (requestedByRole !== 'root') throw new Error('Só o Root pode resetar password de um Admin por aqui.');
  const target = userRepository.findById(targetUserId);
  if (!target) throw new Error('Utilizador não encontrado.');
  if (target.role !== 'admin') throw new Error('O Root só pode resetar password de utilizadores Admin.');
  if (newPassword.length < 6) throw new Error('A nova password tem de ter pelo menos 6 caracteres.');

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  userRepository.update(targetUserId, { passwordHash });
}

export async function resetPasswordUser(
  requestedByRole: UserRole,
  targetUserId: string,
  newPassword: string,
): Promise<void> {
  if (requestedByRole !== 'admin') throw new Error('Só um Admin pode resetar password de utilizadores.');
  const target = userRepository.findById(targetUserId);
  if (!target) throw new Error('Utilizador não encontrado.');
  if (target.role !== 'user') throw new Error('Um Admin só pode resetar password de utilizadores do tipo "user".');
  if (newPassword.length < 6) throw new Error('A nova password tem de ter pelo menos 6 caracteres.');

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  userRepository.update(targetUserId, { passwordHash });
}

function gerarPasswordTemporaria(): string {
  return randomBytes(9).toString('base64url');
}

export async function habilitarPwa(requestedByRole: UserRole, userId: string): Promise<HabilitarPwaResult> {
  if (requestedByRole !== 'admin') throw new Error('Só um Admin pode ativar o acesso PWA.');
  const existing = userRepository.findById(userId);
  if (!existing) throw new Error('Utilizador não encontrado.');
  if (existing.role !== 'user') throw new Error('Só utilizadores do tipo "user" podem ter acesso PWA.');

  const passwordTemporaria = gerarPasswordTemporaria();
  let authUid = existing.pwaAuthUid;
  if (authUid) {
    await reativarUtilizadorPwaAuth(authUid, passwordTemporaria);
  } else {
    authUid = await criarUtilizadorPwaAuth(existing.email, passwordTemporaria);
  }
  await upsertPwaUser({ id: existing.id, nome: existing.name, email: existing.email, ativo: true, authUid });

  const updated = userRepository.setPwaStatus(userId, true, authUid);
  return { user: toPublicUser(updated), passwordTemporaria };
}

export async function desabilitarPwa(requestedByRole: UserRole, userId: string): Promise<PublicUser> {
  if (requestedByRole !== 'admin') throw new Error('Só um Admin pode desativar o acesso PWA.');
  const existing = userRepository.findById(userId);
  if (!existing) throw new Error('Utilizador não encontrado.');
  if (existing.role !== 'user') throw new Error('Só utilizadores do tipo "user" podem ter acesso PWA.');

  if (existing.pwaAuthUid) {
    await desativarUtilizadorPwaAuth(existing.pwaAuthUid);
    await upsertPwaUser({ id: existing.id, nome: existing.name, email: existing.email, ativo: false, authUid: existing.pwaAuthUid });
  }

  const updated = userRepository.setPwaStatus(userId, false, null);
  return toPublicUser(updated);
}

export function listAdmins(): PublicUser[] {
  return userRepository
    .list()
    .filter((u) => u.role === 'admin')
    .map((u) => {
      const { passwordHash: _passwordHash, ...publicUser } = u;
      return publicUser;
    });
}
