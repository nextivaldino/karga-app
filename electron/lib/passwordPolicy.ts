import bcrypt from 'bcryptjs';

// Fonte única destas duas constantes/regras — antes viviam duplicadas em
// electron/main/auth.ts e electron/main/userManagement.ts, com risco de
// divergirem (ex: um sítio exigir 6 caracteres e outro passar a exigir 8
// sem o outro acompanhar).
export const SALT_ROUNDS = 10;
export const MIN_PASSWORD_LENGTH = 6;

export function validarTamanhoPassword(password: string): void {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`A password tem de ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`);
  }
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}
