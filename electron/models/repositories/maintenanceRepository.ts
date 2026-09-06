import { getDatabase } from '../database';

function limparDadosDeNegocioSql(db: ReturnType<typeof getDatabase>): void {
  db.exec('DELETE FROM contacto_etiquetas');
  db.exec('DELETE FROM contactos_notificados');
  db.exec('DELETE FROM carga_destinatarios');
  db.exec('DELETE FROM cargas');
  db.exec('DELETE FROM contentores');
  db.exec('DELETE FROM contactos');
}

function limparDadosDeNegocio(): void {
  const db = getDatabase();
  const run = db.transaction(() => limparDadosDeNegocioSql(db));
  run();
}

function resetTotal(): void {
  const db = getDatabase();
  const run = db.transaction(() => {
    limparDadosDeNegocioSql(db);
    db.exec('DELETE FROM settings');
    db.exec('DELETE FROM permissoes');
    db.exec('DELETE FROM sessoes');
    db.exec('DELETE FROM auditoria');
    db.exec('DELETE FROM users');
  });
  run();
}

export const maintenanceRepository = { limparDadosDeNegocio, resetTotal };
