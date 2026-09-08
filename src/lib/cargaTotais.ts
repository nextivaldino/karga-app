// Cálculo de totais partilhado entre os dois geradores de recibo (texto
// WhatsApp/e-mail em reciboTemplate.ts, PDF em invoiceTemplate.ts) — para
// os dois nunca poderem divergir em número mesmo referindo-se às mesmas
// cargas. Módulo puro, sem dependências de DOM/Node, importável tanto pelo
// renderer como pelo processo principal do Electron.

export interface CargaValorLinha {
  valor: number | null;
  estadoPagamento: 'pago' | 'devido';
}

export interface TotaisCargas {
  totalGeral: number;
  totalPago: number;
  totalDevido: number;
}

export function calcularTotaisCargas(cargas: CargaValorLinha[]): TotaisCargas {
  return cargas.reduce<TotaisCargas>(
    (acc, c) => {
      const valor = c.valor ?? 0;
      acc.totalGeral += valor;
      if (c.estadoPagamento === 'pago') acc.totalPago += valor;
      else acc.totalDevido += valor;
      return acc;
    },
    { totalGeral: 0, totalPago: 0, totalDevido: 0 },
  );
}
