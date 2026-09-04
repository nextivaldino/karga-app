import { BrowserWindow, Notification } from 'electron';
import { notificacaoRepository } from '../models/repositories/notificacaoRepository';
import { contentorRepository } from '../models/repositories/contentorRepository';
import { settingsRepository } from '../models/repositories/settingsRepository';
import type { TipoNotificacao } from '../../src/types';

// Categorias configuráveis em Definições → Notificações — cada uma tem a
// sua chave em `settingsRepository` (texto '1'/'0', omissa = ligada).
// Notificações sem categoria (ex: originadas de uma ação direta do
// utilizador que já tem o seu próprio toast) não passam por este gate.
export type CategoriaNotificacao = 'contentor_parado' | 'contentor_partida' | 'manutencao';

const SETTING_POR_CATEGORIA: Record<CategoriaNotificacao, string> = {
  contentor_parado: 'notif_contentores_parados',
  contentor_partida: 'notif_contentores_partida',
  manutencao: 'notif_manutencao',
};

interface CriarNotificacaoOptions {
  tipo: TipoNotificacao;
  titulo: string;
  mensagem?: string;
  linkModulo?: string;
  linkEntidadeId?: string;
  nativa?: boolean;
  categoria?: CategoriaNotificacao;
}

function focarJanelaENavegar(linkModulo: string | null, linkEntidadeId: string | null): void {
  const win = BrowserWindow.getAllWindows()[0];
  if (!win) return;
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
  win.webContents.send('notificacoes:navegar', { linkModulo, linkEntidadeId });
}

export function criarNotificacao(options: CriarNotificacaoOptions): void {
  if (options.categoria) {
    const chave = SETTING_POR_CATEGORIA[options.categoria];
    if (settingsRepository.get(chave) === '0') return;
  }

  const notificacao = notificacaoRepository.criar({
    tipo: options.tipo,
    titulo: options.titulo,
    mensagem: options.mensagem ?? null,
    linkModulo: options.linkModulo ?? null,
    linkEntidadeId: options.linkEntidadeId ?? null,
  });

  const win = BrowserWindow.getAllWindows()[0];
  win?.webContents.send('notificacoes:atualizada');

  if (options.nativa && Notification.isSupported()) {
    const nativa = new Notification({ title: options.titulo, body: options.mensagem ?? '' });
    nativa.on('click', () => focarJanelaENavegar(notificacao.linkModulo, notificacao.linkEntidadeId));
    nativa.show();
  }
}

const JANELA_DEDUPE_HORAS = 24;

export function verificarContentores(): void {
  const contentores = contentorRepository.list({ estado: 'aberto' });

  for (const contentor of contentores) {
    if (contentor.partindoEmBreve) {
      const titulo = `Contentor ${contentor.codigo} parte em breve`;
      if (!notificacaoRepository.existeSemelhanteRecente(titulo, contentor.id, JANELA_DEDUPE_HORAS)) {
        criarNotificacao({
          tipo: 'aviso',
          titulo,
          mensagem: `${contentor.nome} tem partida prevista dentro de 2 dias.`,
          linkModulo: 'contentores',
          linkEntidadeId: contentor.id,
          nativa: true,
          categoria: 'contentor_partida',
        });
      }
    }

    if (contentor.diasParado != null) {
      const titulo = `Contentor ${contentor.codigo} parado há ${contentor.diasParado} dias`;
      if (!notificacaoRepository.existeSemelhanteRecente(titulo, contentor.id, JANELA_DEDUPE_HORAS)) {
        criarNotificacao({
          tipo: 'aviso',
          titulo,
          mensagem: `${contentor.nome} está aberto sem novas cargas há ${contentor.diasParado} dias.`,
          linkModulo: 'contentores',
          linkEntidadeId: contentor.id,
          nativa: false,
          categoria: 'contentor_parado',
        });
      }
    }
  }
}

let intervalo: ReturnType<typeof setInterval> | null = null;

export function iniciarVerificacaoPeriodica(intervaloMs = 30 * 60 * 1000): void {
  verificarContentores();
  if (intervalo) clearInterval(intervalo);
  intervalo = setInterval(verificarContentores, intervaloMs);
}
