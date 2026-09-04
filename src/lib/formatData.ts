export function formatData(iso: string | null): string {
  return iso ? new Intl.DateTimeFormat('pt-PT').format(new Date(iso)) : '—';
}
