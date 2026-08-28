import { app } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { generatePdfFromHtml } from './pdfService';
import type { ColunaExportacao } from '../../src/types';

function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export async function exportRelatorioExcel(
  titulo: string,
  colunas: ColunaExportacao[],
  linhas: Record<string, unknown>[],
  fileName: string,
): Promise<string> {
  const outputDir = path.join(app.getPath('documents'), 'Kraga Desktop');
  await fs.mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, fileName);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(titulo.slice(0, 31));
  sheet.columns = colunas.map((c) => ({ header: c.header, key: c.key, width: 18 }));
  sheet.addRows(linhas);
  sheet.getRow(1).font = { bold: true };
  await workbook.xlsx.writeFile(outputPath);

  return outputPath;
}

export async function exportRelatorioPdf(
  titulo: string,
  colunas: ColunaExportacao[],
  linhas: Record<string, unknown>[],
  fileName: string,
): Promise<string> {
  const cabecalho = colunas.map((c) => `<th>${escapeHtml(c.header)}</th>`).join('');
  const linhasHtml = linhas
    .map((linha) => `<tr>${colunas.map((c) => `<td>${escapeHtml(linha[c.key])}</td>`).join('')}</tr>`)
    .join('');

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, 'Inter', Helvetica, Arial, sans-serif; color: #241f31; padding: 32px; }
  h1 { font-size: 18px; color: #3584e4; border-bottom: 2px solid #3584e4; padding-bottom: 12px; margin-bottom: 20px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { text-align: left; text-transform: uppercase; letter-spacing: 0.03em; font-size: 9px; color: #9a9996; border-bottom: 1px solid #deddda; padding: 6px 4px; }
  td { padding: 7px 4px; border-bottom: 1px solid #f0f0f0; }
  .footer { margin-top: 32px; font-size: 10px; color: #9a9996; text-align: center; }
</style>
</head>
<body>
  <h1>${escapeHtml(titulo)}</h1>
  <table>
    <thead><tr>${cabecalho}</tr></thead>
    <tbody>${linhasHtml}</tbody>
  </table>
  <div class="footer">Kraga Desktop &mdash; ${new Date().toLocaleDateString('pt-PT')}</div>
</body>
</html>`;

  return generatePdfFromHtml(html, fileName);
}
