import bcrypt from 'bcryptjs';
import { userRepository } from '../models/repositories/userRepository';
import { permissaoRepository } from '../models/repositories/permissaoRepository';
import { sessaoRepository } from '../models/repositories/sessaoRepository';
import {
  atualizarEmailUtilizadorPwaAuth,
  criarUtilizadorPwaAuth,
  desativarUtilizadorPwaAuth,
  obterEmailUtilizadorPwaAuth,
  reativarUtilizadorPwaAuth,
  resolverPostoId,
  upsertPwaUser,
} from '../lib/supabaseClient';
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

export async function editarUsuario(
  requestedByRole: UserRole,
  userId: string,
  changes: { name: string; email: string },
): Promise<PublicUser> {
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
  if (!updated) throw new Error('Utilizador não encontrado.');

  // O email do perfil é também o login do PWA — se mudou e o acesso PWA
  // já está ativo, a conta no Supabase Auth tem de acompanhar.
  if (updated.pwaHabilitado && updated.pwaAuthUid && email !== existing.email) {
    await atualizarEmailUtilizadorPwaAuth(updated.pwaAuthUid, email);
    await upsertPwaUser({
      id: updated.id,
      nome: updated.name,
      email,
      ativo: true,
      authUid: updated.pwaAuthUid,
      contentorPadraoId: updated.contentorPadraoId,
      postoId: await resolverPostoId(),
    });
  }

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
  userRepository.limparPedidoResetPassword(targetUserId);
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

// Doc 19 §2 — password inicial fixa e igual para todos, mais simples de
// comunicar verbalmente a um funcionário de campo do que uma gerada ao
// acaso. A troca deixou de ser obrigatória (banner dispensável no mobile),
// por isso previsibilidade aqui pesa mais do que aleatoriedade.
const PASSWORD_PWA_INICIAL = '1234567';

export async function habilitarPwa(requestedByRole: UserRole, userId: string): Promise<HabilitarPwaResult> {
  if (requestedByRole !== 'admin') throw new Error('Só um Admin pode ativar o acesso PWA.');
  const existing = userRepository.findById(userId);
  if (!existing) throw new Error('Utilizador não encontrado.');
  if (existing.role !== 'user') throw new Error('Só utilizadores do tipo "user" podem ter acesso PWA.');

  // O login do PWA é o email real do perfil (o que o Admin já pôs em
  // Configurações → Utilizadores) — mais fácil do funcionário se lembrar
  // do que um userNN@karga.com sem qualquer ligação a quem é a pessoa.
  const pwaEmail = existing.email;
  let authUid = existing.pwaAuthUid;
  if (authUid) {
    // Reativação — sincroniza a password e o email (pode ter mudado
    // entretanto) com o que está no perfil local.
    await reativarUtilizadorPwaAuth(authUid, PASSWORD_PWA_INICIAL, pwaEmail);
  } else {
    authUid = await criarUtilizadorPwaAuth(pwaEmail, PASSWORD_PWA_INICIAL);
  }
  await upsertPwaUser({ id: existing.id, nome: existing.name, email: pwaEmail, ativo: true, authUid, contentorPadraoId: existing.contentorPadraoId, postoId: await resolverPostoId() });

  const updated = userRepository.setPwaStatus(userId, true, authUid);
  return { user: toPublicUser(updated), passwordTemporaria: PASSWORD_PWA_INICIAL, pwaEmail };
}

export async function desabilitarPwa(requestedByRole: UserRole, userId: string): Promise<PublicUser> {
  if (requestedByRole !== 'admin') throw new Error('Só um Admin pode desativar o acesso PWA.');
  const existing = userRepository.findById(userId);
  if (!existing) throw new Error('Utilizador não encontrado.');
  if (existing.role !== 'user') throw new Error('Só utilizadores do tipo "user" podem ter acesso PWA.');

  if (existing.pwaAuthUid) {
    const pwaEmail = await obterEmailUtilizadorPwaAuth(existing.pwaAuthUid);
    await desativarUtilizadorPwaAuth(existing.pwaAuthUid);
    await upsertPwaUser({ id: existing.id, nome: existing.name, email: pwaEmail, ativo: false, authUid: existing.pwaAuthUid, contentorPadraoId: existing.contentorPadraoId, postoId: await resolverPostoId() });
  }

  // Mantém pwa_auth_uid (não o limpa) — a conta no Supabase Auth só é
  // banida, nunca eliminada, para permitir reativação sem duplicar a conta.
  const updated = userRepository.setPwaStatus(userId, false, existing.pwaAuthUid);
  return toPublicUser(updated);
}

// Self-service OU Admin sobre um "user" — nunca um Admin a mexer noutro
// Admin, nem um "user" a mexer em outra conta que não a sua própria.
function podeGerirConta(actor: { id: string; role: UserRole }, targetUserId: string, target: { role: UserRole }): boolean {
  if (actor.id === targetUserId) return true;
  return actor.role === 'admin' && target.role === 'user';
}

export function setAvatar(actor: { id: string; role: UserRole }, targetUserId: string, avatar: string | null): PublicUser {
  const existing = userRepository.findById(targetUserId);
  if (!existing) throw new Error('Utilizador não encontrado.');
  if (!podeGerirConta(actor, targetUserId, existing)) {
    throw new Error('Não tens permissão para alterar o avatar deste utilizador.');
  }
  const updated = userRepository.setAvatar(targetUserId, avatar);
  if (!updated) throw new Error('Utilizador não encontrado.');
  return toPublicUser(updated);
}

export function setLoginSemPassword(actor: { id: string; role: UserRole }, targetUserId: string, valor: boolean): PublicUser {
  const existing = userRepository.findById(targetUserId);
  if (!existing) throw new Error('Utilizador não encontrado.');
  if (!podeGerirConta(actor, targetUserId, existing)) {
    throw new Error('Não tens permissão para alterar esta definição deste utilizador.');
  }
  const updated = userRepository.setLoginSemPassword(targetUserId, valor);
  if (!updated) throw new Error('Utilizador não encontrado.');
  return toPublicUser(updated);
}

// Contentor padrão para onde as cargas deste utilizador PWA caem por
// omissão (tem prioridade sobre o padrão global do sistema). Decisão do
// Admin, não self-service — ao contrário de avatar/login-sem-password,
// isto afeta onde os dados de negócio de outra pessoa vão parar.
export async function setContentorPadraoPwa(
  requestedByRole: UserRole,
  targetUserId: string,
  contentorId: string | null,
): Promise<PublicUser> {
  if (requestedByRole !== 'admin') throw new Error('Só um Admin pode definir o contentor padrão de um utilizador.');
  const existing = userRepository.findById(targetUserId);
  if (!existing) throw new Error('Utilizador não encontrado.');

  const updated = userRepository.setContentorPadrao(targetUserId, contentorId);
  if (!updated) throw new Error('Utilizador não encontrado.');

  if (updated.pwaHabilitado && updated.pwaAuthUid) {
    const pwaEmail = await obterEmailUtilizadorPwaAuth(updated.pwaAuthUid);
    await upsertPwaUser({
      id: updated.id,
      nome: updated.name,
      email: pwaEmail,
      ativo: true,
      authUid: updated.pwaAuthUid,
      contentorPadraoId: updated.contentorPadraoId,
      postoId: await resolverPostoId(),
    });
  }

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
