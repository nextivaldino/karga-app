// Contentor "ativo" escolhido na Home — persistido para a Nova Carga
// abrir já com esse contentor selecionado por omissão, em vez de
// escolher sempre o primeiro da lista.
const STORAGE_KEY = 'kraga_contentor_ativo';

export function getContentorAtivo(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

export function setContentorAtivo(id: string): void {
  localStorage.setItem(STORAGE_KEY, id);
}
