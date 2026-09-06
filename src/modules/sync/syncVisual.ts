// Linguagem visual partilhada por todas as superfícies de sincronização
// PWA (card na barra de Cargas, card da Home, popup pós-login, e os
// acentos na página de Sincronização em Definições) — para que se leiam
// como UM sistema só com vários atalhos, não features distintas.

// ─── Estado: COM NOTIFICAÇÃO (cargas pendentes) ────────────────────────────
// Amarelo #FFB400 — exactamente o amarelo do ícone KARGA (ModuleIcon kraga).
export const SYNC_NOTIF_HEADER_BG  = '#FFB400'; // base — pill header (= ícone kraga)
export const SYNC_NOTIF_BASE_BG    = '#E6A200'; // um tom acima — corpo fechado
export const SYNC_NOTIF_BORDER     = '#FFC940'; // um tom abaixo — borda suave
export const SYNC_NOTIF_DIVIDER    = '#D99900'; // divider interno
export const SYNC_NOTIF_INK        = '#1A1200'; // quase-preto quente — alto contraste
export const SYNC_NOTIF_INK_SOFT   = 'rgba(26,18,0,0.50)'; // texto secundário
export const SYNC_NOTIF_INVERT_BG  = '#D99900'; // dropdown expandido — tom acima do body

// ─── Estado: SEM NOTIFICAÇÃO (seletor de contentor) ───────────────────────
// Amarelo muito suave — "irmão quieto" da notificação. Família #FFB400.
export const SYNC_SEL_HEADER_LIGHT  = '#FFF8E1'; // amarelo quase branco (light)
export const SYNC_SEL_HEADER_DARK   = '#2A1F06'; // fundo amarelo-escuro quente (dark)
export const SYNC_SEL_BASE_LIGHT    = '#FFF3CC'; // corpo dropdown light
export const SYNC_SEL_BASE_DARK     = '#362808'; // corpo dropdown dark
export const SYNC_SEL_BORDER_LIGHT  = '#FFB400'; // borda = ícone KARGA
export const SYNC_SEL_BORDER_DARK   = '#8C6D10'; // borda adaptada ao dark
export const SYNC_SEL_DIVIDER_LIGHT = '#FFE08A'; // divisor amarelo suave
export const SYNC_SEL_DIVIDER_DARK  = '#443010'; // divisor dark
export const SYNC_SEL_INK_LIGHT     = '#374151'; // gray-700
export const SYNC_SEL_INK_DARK      = '#F0E4C0'; // creme quente sobre fundo escuro
export const SYNC_SEL_INK_SOFT_LIGHT = '#8A7030'; // ocre suave
export const SYNC_SEL_INK_SOFT_DARK  = '#B08C40'; // ocre médio
export const SYNC_SEL_INVERT_LIGHT  = '#FFEDAA'; // dropdown expandido light
export const SYNC_SEL_INVERT_DARK   = '#362808'; // dropdown expandido dark

// ─── Partilhados (usados nos dois estados) ─────────────────────────────────
export const SYNC_GREEN      = '#22c55e'; // green-500 — botão Sincronizar
export const SYNC_ATIVO      = '#FFB400'; // amarelo ícone KARGA — universal

// ─── Aba Sync (MainTabs) — mesma família amarela, para a aba e o pill
// central se lerem como a mesma identidade visual. ──────────────────────────
export const SYNC_HEADER_BG  = '#FFB400'; // aba ativa — amarelo ícone KARGA
export const SYNC_INK        = '#1A1200'; // texto sobre o amarelo — quase-preto quente
