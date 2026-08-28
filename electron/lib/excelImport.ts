import ExcelJS from 'exceljs';

export interface ContactoImportRow {
  nome: string;
  telefone: string | null;
  email: string | null;
  morada: string | null;
  nif: string | null;
}

export interface ImportPreviewResult {
  linhas: ContactoImportRow[];
  erros: string[];
}

const COLUNAS_ESPERADAS = ['nome', 'telefone', 'email', 'morada', 'nif'] as const;

function cellText(cell: ExcelJS.Cell | undefined): string | null {
  if (!cell) return null;
  const valor = cell.value;
  if (valor == null) return null;
  const texto = String(valor).trim();
  return texto || null;
}

export async function parseContactosExcel(filePath: string): Promise<ImportPreviewResult> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const sheet = workbook.worksheets[0];
  if (!sheet) {
    throw new Error('O ficheiro não contém nenhuma folha de cálculo.');
  }

  const colIndex: Partial<Record<(typeof COLUNAS_ESPERADAS)[number], number>> = {};
  sheet.getRow(1).eachCell((cell, colNumber) => {
    const texto = String(cell.value ?? '')
      .trim()
      .toLowerCase();
    if ((COLUNAS_ESPERADAS as readonly string[]).includes(texto)) {
      colIndex[texto as (typeof COLUNAS_ESPERADAS)[number]] = colNumber;
    }
  });

  if (!colIndex.nome) {
    throw new Error(
      'O ficheiro tem de ter uma coluna "nome" no cabeçalho (colunas aceites: nome, telefone, email, morada, nif).',
    );
  }

  const linhas: ContactoImportRow[] = [];
  const erros: string[] = [];

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const temAlgumValor = Array.isArray(row.values) && row.values.some((v) => v != null && String(v).trim());
    if (!temAlgumValor) return;

    const nome = cellText(row.getCell(colIndex.nome!));
    if (!nome) {
      erros.push(`Linha ${rowNumber}: coluna "nome" em falta — linha ignorada.`);
      return;
    }

    linhas.push({
      nome,
      telefone: colIndex.telefone ? cellText(row.getCell(colIndex.telefone)) : null,
      email: colIndex.email ? cellText(row.getCell(colIndex.email)) : null,
      morada: colIndex.morada ? cellText(row.getCell(colIndex.morada)) : null,
      nif: colIndex.nif ? cellText(row.getCell(colIndex.nif)) : null,
    });
  });

  return { linhas, erros };
}
