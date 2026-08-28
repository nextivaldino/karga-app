interface FaturaCargaLinha {
  codigo: string;
  nome: string;
  data: string;
  valor: number | null;
  estado: 'pago' | 'devido';
}

interface BuildFaturaHtmlParams {
  empresaNome: string;
  empresaMorada: string;
  empresaContacto: string;
  clienteNome: string;
  cargas: FaturaCargaLinha[];
  moeda: string;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatMoeda(valor: number, moeda: string): string {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: moeda }).format(valor);
}

function formatData(iso: string): string {
  return new Intl.DateTimeFormat('pt-PT').format(new Date(iso));
}

export function buildFaturaHtml(params: BuildFaturaHtmlParams): string {
  const totalGeral = params.cargas.reduce((sum, c) => sum + (c.valor ?? 0), 0);
  const totalPago = params.cargas
    .filter((c) => c.estado === 'pago')
    .reduce((sum, c) => sum + (c.valor ?? 0), 0);
  const totalDevido = params.cargas
    .filter((c) => c.estado === 'devido')
    .reduce((sum, c) => sum + (c.valor ?? 0), 0);

  const linhas = params.cargas
    .map(
      (c) => `
        <tr>
          <td>${escapeHtml(c.codigo)}</td>
          <td>${escapeHtml(c.nome)}</td>
          <td>${formatData(c.data)}</td>
          <td class="right">${formatMoeda(c.valor ?? 0, params.moeda)}</td>
          <td class="${c.estado === 'pago' ? 'tag-pago' : 'tag-devido'}">${c.estado === 'pago' ? 'Pago' : 'Devido'}</td>
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
  .header h1 { font-size: 20px; margin: 0 0 4px; }
  .header p { font-size: 12px; color: #5e5c64; margin: 0; }
  .title { text-align: right; }
  .title h2 { font-size: 22px; margin: 0; color: #3584e4; }
  .cliente { margin-bottom: 20px; font-size: 13px; }
  .cliente strong { display: block; font-size: 15px; margin-bottom: 2px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 20px; }
  th { text-align: left; text-transform: uppercase; letter-spacing: 0.03em; font-size: 10px; color: #9a9996; border-bottom: 1px solid #deddda; padding: 6px 4px; }
  td { padding: 8px 4px; border-bottom: 1px solid #f0f0f0; }
  td.right { text-align: right; }
  .tag-pago { color: #1a8f5c; font-weight: 600; }
  .tag-devido { color: #b8860a; font-weight: 600; }
  .totais { margin-left: auto; width: 260px; font-size: 13px; }
  .totais div { display: flex; justify-content: space-between; padding: 4px 0; }
  .totais .final { border-top: 1px solid #241f31; font-weight: 700; margin-top: 4px; padding-top: 8px; }
  .footer { margin-top: 40px; font-size: 11px; color: #9a9996; text-align: center; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <h1>${escapeHtml(params.empresaNome)}</h1>
      <p>${escapeHtml(params.empresaMorada)}</p>
      <p>${escapeHtml(params.empresaContacto)}</p>
    </div>
    <div class="title">
      <h2>Fatura / Recibo</h2>
      <p>${formatData(new Date().toISOString())}</p>
    </div>
  </div>

  <div class="cliente">
    <strong>${escapeHtml(params.clienteNome)}</strong>
  </div>

  <table>
    <thead>
      <tr><th>Código</th><th>Nome da Carga</th><th>Data</th><th>Valor</th><th>Estado</th></tr>
    </thead>
    <tbody>${linhas}</tbody>
  </table>

  <div class="totais">
    <div><span>Total Geral</span><span>${formatMoeda(totalGeral, params.moeda)}</span></div>
    <div><span>Total Pago</span><span>${formatMoeda(totalPago, params.moeda)}</span></div>
    <div class="final"><span>Total Devido</span><span>${formatMoeda(totalDevido, params.moeda)}</span></div>
  </div>

  <div class="footer">Documento gerado pelo Kraga Desktop</div>
</body>
</html>`;
}
