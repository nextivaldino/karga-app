import { app, dialog } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import * as auth from './auth';
import { closeDatabase, getDatabase } from '../models/database';
import { cargaRepository } from '../models/repositories/cargaRepository';
import { contentorRepository } from '../models/repositories/contentorRepository';
import { contactoRepository } from '../models/repositories/contactoRepository';
import { maintenanceRepository } from '../models/repositories/maintenanceRepository';
import { parseContactosExcel, type ImportPreviewResult } from '../lib/excelImport';
import { buildContactosWorkbook, buildExportarTudoWorkbook } from '../lib/exportarTudoService';
import { criarNotificacao } from './notifications';
import type { CreateContactoInput } from '../../src/types';

function dbPath(): string {
  return path.join(app.getPath('userData'), 'kraga.db');
}

export async function getSystemInfo(): Promise<{ dbSizeBytes: number; appVersion: string }> {
  const stat = await fs.stat(dbPath()).catch(() => null);
  return { dbSizeBytes: stat?.size ?? 0, appVersion: app.getVersion() };
}

async function removeSidecarFiles(target: string): Promise<void> {
  for (const suffix of ['-wal', '-shm']) {
    await fs.rm(`${target}${suffix}`, { force: true });
  }
}

function relaunchApp(): void {
  setTimeout(() => {
    app.relaunch();
    app.exit(0);
  }, 300);
}

export async function backup(passwordConfirmacao: string): Promise<{ path: string } | { canceled: true }> {
  await auth.verifyCurrentPassword(passwordConfirmacao);

  const result = await dialog.showSaveDialog({
    title: 'Fazer Backup Agora',
    defaultPath: `kraga-backup-${new Date().toISOString().slice(0, 10)}.db`,
    filters: [{ name: 'Base de Dados SQLite', extensions: ['db'] }],
  });
  if (result.canceled || !result.filePath) return { canceled: true };

  try {
    const db = getDatabase();
    await db.backup(result.filePath);
    criarNotificacao({
      tipo: 'sucesso',
      titulo: 'Backup concluído com sucesso',
      mensagem: result.filePath,
      nativa: true,
      categoria: 'manutencao',
    });
    return { path: result.filePath };
  } catch (err) {
    criarNotificacao({
      tipo: 'erro',
      titulo: 'Falha ao fazer backup',
      mensagem: err instanceof Error ? err.message : 'Erro desconhecido.',
      nativa: true,
      categoria: 'manutencao',
    });
    throw err;
  }
}

export async function restore(passwordConfirmacao: string): Promise<{ path: string } | { canceled: true }> {
  await auth.verifyCurrentPassword(passwordConfirmacao);

  const result = await dialog.showOpenDialog({
    title: 'Restaurar Backup',
    properties: ['openFile'],
    filters: [{ name: 'Base de Dados SQLite', extensions: ['db'] }],
  });
  if (result.canceled || result.filePaths.length === 0) return { canceled: true };

  const origem = result.filePaths[0];
  const destino = dbPath();

  closeDatabase();
  await removeSidecarFiles(destino);
  await fs.copyFile(origem, destino);
  await removeSidecarFiles(destino);

  relaunchApp();
  return { path: origem };
}

export async function previewImportExcel(): Promise<({ path: string } & ImportPreviewResult) | { canceled: true }> {
  const result = await dialog.showOpenDialog({
    title: 'Importar Contactos — Escolher Ficheiro Excel',
    properties: ['openFile'],
    filters: [{ name: 'Excel', extensions: ['xlsx'] }],
  });
  if (result.canceled || result.filePaths.length === 0) return { canceled: true };

  const filePath = result.filePaths[0];
  const preview = await parseContactosExcel(filePath);
  return { path: filePath, ...preview };
}

export async function confirmarImportExcel(
  linhas: CreateContactoInput[],
  passwordConfirmacao: string,
): Promise<{ criados: number }> {
  await auth.verifyCurrentPassword(passwordConfirmacao);

  for (const linha of linhas) {
    contactoRepository.create(linha);
  }
  criarNotificacao({
    tipo: 'info',
    titulo: `${linhas.length} contacto(s) importado(s) do Excel`,
    linkModulo: 'configuracoes',
    categoria: 'manutencao',
  });
  return { criados: linhas.length };
}

export async function exportarTudo(passwordConfirmacao: string): Promise<{ path: string } | { canceled: true }> {
  await auth.verifyCurrentPassword(passwordConfirmacao);

  const result = await dialog.showSaveDialog({
    title: 'Exportar Tudo',
    defaultPath: `kraga-exportacao-completa-${new Date().toISOString().slice(0, 10)}.xlsx`,
    filters: [{ name: 'Excel', extensions: ['xlsx'] }],
  });
  if (result.canceled || !result.filePath) return { canceled: true };

  const workbook = await buildExportarTudoWorkbook({
    cargas: cargaRepository.list(),
    contentores: contentorRepository.list({ incluirOcultos: true }),
    contactos: contactoRepository.list(true),
  });
  await workbook.xlsx.writeFile(result.filePath);
  return { path: result.filePath };
}

// Só os contactos — sem senha, ao contrário de `exportarTudo`: não expõe
// cargas/contentores nem dados financeiros, é uma lista de agenda.
export async function exportarContactos(): Promise<{ path: string } | { canceled: true }> {
  const result = await dialog.showSaveDialog({
    title: 'Exportar Contactos',
    defaultPath: `kraga-contactos-${new Date().toISOString().slice(0, 10)}.xlsx`,
    filters: [{ name: 'Excel', extensions: ['xlsx'] }],
  });
  if (result.canceled || !result.filePath) return { canceled: true };

  const workbook = await buildContactosWorkbook(contactoRepository.list(true));
  await workbook.xlsx.writeFile(result.filePath);
  return { path: result.filePath };
}

export async function limparDadosTeste(passwordConfirmacao: string): Promise<void> {
  await auth.verifyCurrentPassword(passwordConfirmacao);
  maintenanceRepository.limparDadosDeNegocio();
}

export async function resetTotal(passwordConfirmacao: string): Promise<void> {
  await auth.verifyCurrentPassword(passwordConfirmacao);
  maintenanceRepository.resetTotal();
  auth.logout();
  relaunchApp();
}
