import ExcelJS from 'exceljs';
import type { CargaComEmissor, Contacto, Contentor } from '../../src/types';

interface ExportarTudoData {
  cargas: CargaComEmissor[];
  contentores: Contentor[];
  contactos: Contacto[];
}

// Código e Nome ficam sempre na folha "Cargas" (identificam a linha); o
// resto é configurável em Configurações → Exportação. Sem `colunasCargas`,
// mantém o comportamento de sempre (tudo visível).
export interface ColunasExcelCargas {
  emissor: boolean;
  peso: boolean;
  m3: boolean;
  valor: boolean;
  moeda: boolean;
  pagamento: boolean;
  estado: boolean;
  criadoEm: boolean;
}

const COLUNAS_EXCEL_PADRAO: ColunasExcelCargas = {
  emissor: true,
  peso: true,
  m3: true,
  valor: true,
  moeda: true,
  pagamento: true,
  estado: true,
  criadoEm: true,
};

const CONTACTOS_COLUMNS: Partial<ExcelJS.Column>[] = [
  { header: 'Nome', key: 'nome', width: 26 },
  { header: 'Telefone', key: 'telefone', width: 16 },
  { header: 'Email', key: 'email', width: 26 },
  { header: 'Morada', key: 'morada', width: 32 },
  { header: 'NIF', key: 'nif', width: 14 },
  { header: 'Ativo', key: 'ativo', width: 8 },
];

// Export só de contactos — mesmas colunas do separador "Contactos" da
// exportação completa, para os dois ficheiros lerem-se da mesma forma.
export async function buildContactosWorkbook(contactos: Contacto[]): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Kraga Desktop';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Contactos');
  sheet.columns = CONTACTOS_COLUMNS;
  sheet.addRows(contactos);
  sheet.getRow(1).font = { bold: true };

  return workbook;
}

export async function buildExportarTudoWorkbook(data: ExportarTudoData, colunasCargas?: ColunasExcelCargas): Promise<ExcelJS.Workbook> {
  const col = colunasCargas ?? COLUNAS_EXCEL_PADRAO;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Kraga Desktop';
  workbook.created = new Date();

  const cargasSheet = workbook.addWorksheet('Cargas');
  cargasSheet.columns = [
    { header: 'Código', key: 'codigo', width: 12 },
    { header: 'Nome', key: 'nome', width: 26 },
    ...(col.emissor ? [{ header: 'Emissor', key: 'emissorNome', width: 24 }] : []),
    ...(col.peso ? [{ header: 'Peso (kg)', key: 'pesoKg', width: 12 }] : []),
    ...(col.m3 ? [{ header: 'm³', key: 'm3', width: 10 }] : []),
    ...(col.valor ? [{ header: 'Valor', key: 'valor', width: 12 }] : []),
    ...(col.moeda ? [{ header: 'Moeda', key: 'moeda', width: 8 }] : []),
    ...(col.pagamento ? [{ header: 'Pagamento', key: 'estadoPagamento', width: 12 }] : []),
    ...(col.estado ? [{ header: 'Estado', key: 'estado', width: 14 }] : []),
    ...(col.criadoEm ? [{ header: 'Criado em', key: 'createdAt', width: 22 }] : []),
  ];
  cargasSheet.addRows(data.cargas);

  const contentoresSheet = workbook.addWorksheet('Contentores');
  contentoresSheet.columns = [
    { header: 'Código', key: 'codigo', width: 12 },
    { header: 'Nome', key: 'nome', width: 26 },
    { header: 'Mês Ref.', key: 'mesReferencia', width: 10 },
    { header: 'Estado', key: 'estado', width: 14 },
    { header: 'Peso Total (kg)', key: 'pesoTotalKg', width: 16 },
    { header: 'm³ Total', key: 'm3Total', width: 12 },
    { header: 'Valor Total', key: 'valorTotal', width: 14 },
    { header: 'Nº Cargas', key: 'totalCargas', width: 10 },
    { header: 'Data Partida', key: 'dataPartida', width: 14 },
    { header: 'Criado em', key: 'createdAt', width: 22 },
  ];
  contentoresSheet.addRows(data.contentores);

  const contactosSheet = workbook.addWorksheet('Contactos');
  contactosSheet.columns = CONTACTOS_COLUMNS;
  contactosSheet.addRows(data.contactos);

  for (const sheet of workbook.worksheets) {
    sheet.getRow(1).font = { bold: true };
  }

  return workbook;
}
