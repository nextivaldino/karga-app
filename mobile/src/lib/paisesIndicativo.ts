import type { IndicativoPais } from '@/components/ui/PhoneField';

// Emissor está tipicamente sediado no Luxemburgo, com a França como
// alternativa comum (proximidade/comunidade); Recetor em Cabo Verde é
// sempre o destino de entrega — só um indicativo, fixo.
export const PAISES_EMISSOR: IndicativoPais[] = [
  { codigo: '+352', nome: 'Luxemburgo' },
  { codigo: '+33', nome: 'França' },
];

export const PAISES_RECETOR: IndicativoPais[] = [{ codigo: '+238', nome: 'Cabo Verde' }];
