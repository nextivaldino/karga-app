import bcrypt from 'bcryptjs';
import { userRepository } from '../models/repositories/userRepository';
import { sessaoRepository } from '../models/repositories/sessaoRepository';
import { settingsRepository } from '../models/repositories/settingsRepository';
import { hashPassword, validarTamanhoPassword } from '../lib/passwordPolicy';
import type { PublicUser, QuickLoginUser, SetupInput, User } from '../../src/types';

// Sessão fica ativa até logout explícito — decisão do utilizador (não é
// um esquecimento): app desktop de instalação única, dispositivo
// confiável, prioridade é nunca obrigar a reautenticar à toa (sair do
// repouso, reiniciar a app). Guardamos qual foi o último utilizador
// autenticado para restaurar a sessão automaticamente em cada arranque
// — só é limpo por um logout() explícito.
const SETTING_SESSAO_USER_ID = 'sessao_user_id';

let currentUser: PublicUser | null = null;
let currentSessaoId: string | null = null;

function toPublicUser(user: User): PublicUser {
  const { passwordHash: _passwordHash, ...publicUser } = user;
  return publicUser;
}

function iniciarSessao(user: User): PublicUser {
  currentUser = toPublicUser(user);
  currentSessaoId = sessaoRepository.iniciar(user.id).id;
  settingsRepository.set(SETTING_SESSAO_USER_ID, user.id);
  return currentUser;
}

// Chamado uma vez no arranque do processo principal (antes de a janela
// carregar), para o ecrã de login nem chegar a aparecer se já havia
// alguém autenticado da última vez que a app correu.
export function restaurarSessaoPersistida(): void {
  const userId = settingsRepository.get(SETTING_SESSAO_USER_ID);
  if (!userId) return;

  const user = userRepository.findById(userId);
  if (!user || !user.active) {
    settingsRepository.remove(SETTING_SESSAO_USER_ID);
    return;
  }

  iniciarSessao(user);
}

export function setupNeeded(): boolean {
  return userRepository.count() === 0;
}

export async function completeSetup(input: SetupInput): Promise<PublicUser> {
  if (!setupNeeded()) {
    throw new Error('Setup já foi concluído — já existe um utilizador registado.');
  }
  if (!input.rootName.trim() || !input.rootEmail.trim() || input.rootPassword.length < 6) {
    throw new Error('Dados do Root inválidos: nome e email obrigatórios, password com pelo menos 6 caracteres.');
  }
  if (!input.adminName.trim() || !input.adminEmail.trim() || input.adminPassword.length < 6) {
    throw new Error('Dados do Admin inválidos: nome e email obrigatórios, password com pelo menos 6 caracteres.');
  }
  if (input.rootEmail.toLowerCase().trim() === input.adminEmail.toLowerCase().trim()) {
    throw new Error('O Root e o Admin não podem usar o mesmo email.');
  }

  const rootHash = await hashPassword(input.rootPassword);
  userRepository.create({
    name: input.rootName.trim(),
    email: input.rootEmail.toLowerCase().trim(),
    passwordHash: rootHash,
    role: 'root',
  });

  const adminHash = await hashPassword(input.adminPassword);
  const admin = userRepository.create({
    name: input.adminName.trim(),
    email: input.adminEmail.toLowerCase().trim(),
    passwordHash: adminHash,
    role: 'admin',
  });

  return iniciarSessao(admin);
}

export async function login(identifier: string, password: string): Promise<PublicUser> {
  const normalizedIdentifier = identifier.trim();
  const user = normalizedIdentifier.includes('@')
    ? userRepository.findByEmail(normalizedIdentifier.toLowerCase())
    : userRepository.findByName(normalizedIdentifier);
  if (!user || !user.active) {
    throw new Error('Credenciais inválidas.');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new Error('Credenciais inválidas.');
  }

  return iniciarSessao(user);
}

export function listQuickLogin(): QuickLoginUser[] {
  return userRepository.listQuickLogin();
}

// Sem password — só entra quem o Admin (ou o próprio, na sua sessão)
// marcou explicitamente como "login sem password". Continua a exigir que
// o utilizador esteja ativo, exatamente como o login normal.
export async function loginSemPassword(userId: string): Promise<PublicUser> {
  const user = userRepository.findById(userId);
  if (!user || !user.active || !user.loginSemPassword) {
    throw new Error('Este utilizador não tem login sem password ativado.');
  }

  return iniciarSessao(user);
}

// Chamado a partir do ecrã de login, sem sessão — um Admin que se
// esqueceu da password avisa o Root sem precisar de outro canal. Nunca
// revela se o email existe ou é de um Admin (resolve sempre em silêncio),
// para não dar pistas a quem tentar adivinhar contas por tentativa e erro.
export function solicitarResetPasswordAdmin(email: string): void {
  const user = userRepository.findByEmail(email.toLowerCase().trim());
  if (!user || user.role !== 'admin' || !user.active) return;
  userRepository.marcarPedidoResetPassword(user.id);
}

export function logout(): void {
  if (currentSessaoId) sessaoRepository.terminar(currentSessaoId);
  currentUser = null;
  currentSessaoId = null;
  settingsRepository.remove(SETTING_SESSAO_USER_ID);
}

export function getSession(): PublicUser | null {
  return currentUser;
}

export function updateProfile(userId: string, changes: { name: string; email: string }): PublicUser {
  if (!changes.name.trim() || !changes.email.trim()) {
    throw new Error('Nome e email são obrigatórios.');
  }
  const existing = userRepository.findById(userId);
  if (!existing) throw new Error('Utilizador não encontrado.');

  const email = changes.email.toLowerCase().trim();
  const emailEmUso = userRepository.findByEmail(email);
  if (emailEmUso && emailEmUso.id !== userId) {
    throw new Error('Já existe um utilizador com este email.');
  }

  const updated = userRepository.update(userId, { name: changes.name.trim(), email });
  if (!updated) throw new Error('Utilizador não encontrado.');

  const publicUser = toPublicUser(updated);
  if (currentUser?.id === userId) currentUser = publicUser;
  return publicUser;
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
  validarTamanhoPassword(newPassword);
  const existing = userRepository.findById(userId);
  if (!existing) throw new Error('Utilizador não encontrado.');

  const valid = await bcrypt.compare(currentPassword, existing.passwordHash);
  if (!valid) throw new Error('Password atual incorreta.');

  const passwordHash = await hashPassword(newPassword);
  userRepository.update(userId, { passwordHash });
}

export async function verifyCurrentPassword(password: string): Promise<void> {
  if (!currentUser) throw new Error('Sessão inválida — inicia sessão novamente.');
  const existing = userRepository.findById(currentUser.id);
  if (!existing) throw new Error('Sessão inválida — inicia sessão novamente.');

  const valid = await bcrypt.compare(password, existing.passwordHash);
  if (!valid) throw new Error('Password incorreta.');
}
