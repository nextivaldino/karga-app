import { ipcService } from '@/services/ipcService';
import type { DadosEmpresaRecibo, OpcoesRecibo } from '@/lib/reciboTemplate';

// Ponto único de leitura das settings que alimentam recibos/mensagens —
// evita cada modal de envio saber sozinho quais chaves ler.
export async function carregarDadosRecibo(): Promise<{ empresa: DadosEmpresaRecibo; opcoes: OpcoesRecibo }> {
  const all = await ipcService.settings.getAll();

  return {
    empresa: {
      nome: all.empresa_origem_nome ?? 'Kraga Desktop',
      morada: all.empresa_origem_morada || null,
      telefone: all.empresa_origem_contacto || null,
      email: all.empresa_origem_email || null,
      nif: all.empresa_origem_nif || null,
      iban: all.empresa_origem_iban || null,
      banco: all.empresa_origem_banco || null,
    },
    opcoes: {
      incluirMorada: all.recibo_incluir_morada !== '0',
      incluirContacto: all.recibo_incluir_contacto !== '0',
      incluirNif: all.recibo_incluir_nif !== '0',
      incluirIban: all.recibo_incluir_iban === '1',
    },
  };
}
