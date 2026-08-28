import { createHmac } from 'node:crypto';

// Mantém em sincronia com electron/main/license.ts — script standalone para o
// developer gerar uma chave de ativação a partir do "Identificador desta
// máquina" mostrado no ecrã de Licença Inválida do cliente, sem precisar
// correr a aplicação completa.
const LICENSE_SECRET = 'kraga-desktop-license-v1';

const machineId = process.argv[2];
if (!machineId) {
  console.error('Uso: node scripts/generate-license.mjs "<machineId>"');
  console.error('O machineId é mostrado no ecrã de ativação do Kraga Desktop.');
  process.exit(1);
}

const hash = createHmac('sha256', LICENSE_SECRET).update(machineId).digest('hex').toUpperCase();
const raw = hash.slice(0, 16);
const key = raw.match(/.{1,4}/g).join('-');

console.log(key);
