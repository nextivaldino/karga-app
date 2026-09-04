export type IdiomaExportacao = 'pt' | 'en' | 'fr';

interface ContentorExportCargaLinha {
  codigo: string;
  nome: string;
  comprimentoCm: number | null;
  larguraCm: number | null;
  alturaCm: number | null;
  pesoKg: number | null;
  m3: number | null;
  valor: number | null;
  emissorNome: string;
  destinatarios: string[];
}

interface BuildContentorListaHtmlParams {
  empresaNome: string;
  empresaMorada: string;
  empresaContacto: string;
  empresaLogo?: string | null;
  empresaNif?: string | null;
  contentorCodigo: string;
  contentorNome: string;
  dataPartida: string | null;
  dataChegadaPrevista: string | null;
  moeda: string;
  idioma: IdiomaExportacao;
  cargas: ContentorExportCargaLinha[];
}

const LOCALE: Record<IdiomaExportacao, string> = { pt: 'pt-PT', en: 'en-GB', fr: 'fr-FR' };

const LABELS: Record<IdiomaExportacao, Record<string, string>> = {
  pt: {
    titulo: 'Lista de Carga do Contentor',
    codigo: 'Código',
    dataPartida: 'Data de Partida',
    dataChegada: 'Data de Chegada Prevista',
    colCodigo: 'Código',
    colNome: 'Nome',
    colDimensoes: 'Dimensões (C×L×A)',
    colPeso: 'Peso',
    colM3: 'm³',
    colValor: 'Valor',
    colEmissor: 'Emissor',
    colDestinatario: 'Destinatário(s)',
    totalCargas: 'Total de Cargas',
    totalPeso: 'Peso Total',
    totalM3: 'm³ Total',
    totalValor: 'Valor Total',
    geradoEm: 'Gerado em',
    semData: '—',
  },
  en: {
    titulo: 'Container Packing List',
    codigo: 'Code',
    dataPartida: 'Departure Date',
    dataChegada: 'Expected Arrival Date',
    colCodigo: 'Code',
    colNome: 'Item',
    colDimensoes: 'Dimensions (L×W×H)',
    colPeso: 'Weight',
    colM3: 'CBM',
    colValor: 'Value',
    colEmissor: 'Sender',
    colDestinatario: 'Recipient(s)',
    totalCargas: 'Total Items',
    totalPeso: 'Total Weight',
    totalM3: 'Total CBM',
    totalValor: 'Total Value',
    geradoEm: 'Generated on',
    semData: '—',
  },
  fr: {
    titulo: 'Liste de Colisage du Conteneur',
    codigo: 'Code',
    dataPartida: 'Date de Départ',
    dataChegada: "Date d'Arrivée Prévue",
    colCodigo: 'Code',
    colNome: 'Article',
    colDimensoes: 'Dimensions (L×l×H)',
    colPeso: 'Poids',
    colM3: 'm³',
    colValor: 'Valeur',
    colEmissor: 'Expéditeur',
    colDestinatario: 'Destinataire(s)',
    totalCargas: "Nombre d'Articles",
    totalPeso: 'Poids Total',
    totalM3: 'm³ Total',
    totalValor: 'Valeur Totale',
    geradoEm: 'Généré le',
    semData: '—',
  },
};

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatData(iso: string | null, idioma: IdiomaExportacao, semData: string): string {
  if (!iso) return semData;
  return new Intl.DateTimeFormat(LOCALE[idioma]).format(new Date(iso));
}

function formatMoeda(valor: number | null, moeda: string, idioma: IdiomaExportacao): string {
  return new Intl.NumberFormat(LOCALE[idioma], { style: 'currency', currency: moeda }).format(valor ?? 0);
}

function formatDimensoes(
  comprimentoCm: number | null,
  larguraCm: number | null,
  alturaCm: number | null,
  semData: string,
): string {
  if (comprimentoCm == null || larguraCm == null || alturaCm == null) return semData;
  return `${comprimentoCm}×${larguraCm}×${alturaCm} cm`;
}

export function buildContentorListaHtml(params: BuildContentorListaHtmlParams): string {
  const t = LABELS[params.idioma];

  const totalPeso = params.cargas.reduce((sum, c) => sum + (c.pesoKg ?? 0), 0);
  const totalM3 = params.cargas.reduce((sum, c) => sum + (c.m3 ?? 0), 0);
  const totalValor = params.cargas.reduce((sum, c) => sum + (c.valor ?? 0), 0);

  const linhas = params.cargas
    .map(
      (c) => `
        <tr>
          <td>${escapeHtml(c.codigo)}</td>
          <td>${escapeHtml(c.nome)}</td>
          <td>${formatDimensoes(c.comprimentoCm, c.larguraCm, c.alturaCm, t.semData)}</td>
          <td class="right">${c.pesoKg != null ? `${c.pesoKg} kg` : t.semData}</td>
          <td class="right">${c.m3 != null ? c.m3.toFixed(3) : t.semData}</td>
          <td class="right">${formatMoeda(c.valor, params.moeda, params.idioma)}</td>
          <td>${escapeHtml(c.emissorNome)}</td>
          <td>${c.destinatarios.length ? escapeHtml(c.destinatarios.join(', ')) : t.semData}</td>
        </tr>`,
    )
    .join('');

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, 'Inter', Helvetica, Arial, sans-serif; color: #241f31; padding: 40px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #3584e4; padding-bottom: 16px; margin-bottom: 24px; }
  .header-empresa { display: flex; gap: 12px; align-items: flex-start; }
  .header-empresa img { max-height: 48px; max-width: 140px; object-fit: contain; }
  .header h1 { font-size: 20px; margin: 0 0 4px; }
  .header p { font-size: 12px; color: #5e5c64; margin: 0; }
  .title { text-align: right; }
  .title h2 { font-size: 20px; margin: 0; color: #3584e4; }
  .contentor-info { display: flex; gap: 32px; margin-bottom: 20px; font-size: 12px; }
  .contentor-info div strong { display: block; font-size: 10px; text-transform: uppercase; letter-spacing: 0.03em; color: #9a9996; margin-bottom: 2px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 20px; }
  th { text-align: left; text-transform: uppercase; letter-spacing: 0.03em; font-size: 9px; color: #9a9996; border-bottom: 1px solid #deddda; padding: 6px 4px; }
  td { padding: 7px 4px; border-bottom: 1px solid #f0f0f0; }
  td.right, th.right { text-align: right; }
  .totais { margin-left: auto; width: 280px; font-size: 12px; }
  .totais div { display: flex; justify-content: space-between; padding: 3px 0; }
  .totais .final { border-top: 1px solid #241f31; font-weight: 700; margin-top: 4px; padding-top: 8px; }
  .footer { margin-top: 40px; font-size: 10px; color: #9a9996; text-align: center; }
</style>
</head>
<body>
  <div class="header">
    <div class="header-empresa">
      ${params.empresaLogo ? `<img src="${params.empresaLogo}" alt="" />` : ''}
      <div>
        <h1>${escapeHtml(params.empresaNome)}</h1>
        <p>${escapeHtml(params.empresaMorada)}</p>
        <p>${escapeHtml(params.empresaContacto)}</p>
        ${params.empresaNif ? `<p>NIF: ${escapeHtml(params.empresaNif)}</p>` : ''}
      </div>
    </div>
    <div class="title">
      <h2>${t.titulo}</h2>
      <p>${t.geradoEm} ${formatData(new Date().toISOString(), params.idioma, t.semData)}</p>
    </div>
  </div>

  <div class="contentor-info">
    <div><strong>${t.codigo}</strong>${escapeHtml(params.contentorCodigo)} · ${escapeHtml(params.contentorNome)}</div>
    <div><strong>${t.dataPartida}</strong>${formatData(params.dataPartida, params.idioma, t.semData)}</div>
    <div><strong>${t.dataChegada}</strong>${formatData(params.dataChegadaPrevista, params.idioma, t.semData)}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th>${t.colCodigo}</th>
        <th>${t.colNome}</th>
        <th>${t.colDimensoes}</th>
        <th class="right">${t.colPeso}</th>
        <th class="right">${t.colM3}</th>
        <th class="right">${t.colValor}</th>
        <th>${t.colEmissor}</th>
        <th>${t.colDestinatario}</th>
      </tr>
    </thead>
    <tbody>${linhas}</tbody>
  </table>

  <div class="totais">
    <div><span>${t.totalCargas}</span><span>${params.cargas.length}</span></div>
    <div><span>${t.totalPeso}</span><span>${totalPeso} kg</span></div>
    <div><span>${t.totalM3}</span><span>${totalM3.toFixed(3)}</span></div>
    <div class="final"><span>${t.totalValor}</span><span>${formatMoeda(totalValor, params.moeda, params.idioma)}</span></div>
  </div>

  <div class="footer">Kraga Desktop</div>
</body>
</html>`;
}
