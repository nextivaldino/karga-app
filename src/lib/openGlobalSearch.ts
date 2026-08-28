export function openGlobalSearch(): void {
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
}
