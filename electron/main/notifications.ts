import { BrowserWindow, Notification } from 'electron';
import { notificacaoRepository } from '../models/repositories/notificacaoRepository';
import { contentorRepository } from '../models/repositories/contentorRepository';
import type { TipoNotificacao } from '../../src/types';

interface CriarNotificacaoOptions {
  tipo: TipoNotificacao;
  titulo: string;
  mensagem?: string;
  linkModulo?: string;
  linkEntidadeId?: string;
  nativa?: boolean;
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
