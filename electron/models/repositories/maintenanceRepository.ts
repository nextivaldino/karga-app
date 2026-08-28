import { getDatabase } from '../database';

function limparDadosDeNegocio(): void {
  const db = getDatabase();
  const run = db.transaction(() => {
    db.exec('DELETE FROM carga_destinatarios');
    db.exec('DELETE FROM cargas');
    db.exec('DELETE FROM contentores');
    db.exec('DELETE FROM contactos');
  });
  run();
}

function resetTotal(): void {
  const db = getDatabase();
  const run = db.transaction(() => {
    db.exec('DELETE FROM carga_destinatarios');
    db.exec('DELETE FROM cargas');
    db.exec('DELETE FROM contentores');
    db.exec('DELETE FROM contactos');
    db.exec('DELETE FROM settings');
    db.exec('DELETE FROM users');
  });
  run();
}

export const maintenanceRepository = { limparDadosDeNegocio, resetTotal };
