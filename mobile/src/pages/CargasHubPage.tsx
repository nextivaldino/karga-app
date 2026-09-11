import { useMemo, useRef, useState } from 'react';
import { useFilaOffline } from '@/hooks/useFilaOffline';
import { useCargasHub } from '@/hooks/useCargasHub';
import { useHubSheet } from '@/hooks/useHubSheet';
import { DynamicIslandMenu } from '@/components/DynamicIslandMenu';
import { Fab } from '@/components/Fab';
import { SyncPill } from '@/components/SyncPill';
import { Sheet } from '@/components/Sheet';
import { CargaRow, type CargaRowData } from '@/components/CargaRow';
import { ContactRow } from '@/components/ContactRow';
import { ContactDetailHeader } from '@/components/ContactDetailHeader';
import { PullToRefresh } from '@/components/PullToRefresh';
import { AddCargaSheetContent } from '@/components/AddCargaSheetContent';
import { CargaOptionsSheetContent } from '@/components/CargaOptionsSheetContent';
import { EditContactSheetContent } from '@/components/EditContactSheetContent';
import { WhatsAppSheetContent } from '@/components/WhatsAppSheetContent';
import { formatMoeda } from '@/lib/cargaEstado';
import { formatRelativo } from '@/lib/formatRelativo';
import type { CargaPendente, NovaCargaPendenteInput } from '@/types';

const TITULO_SHEET: Record<string, string> = {
  addCarga: 'Adicionar carga',
  opcoesCarga: '',
  editarContacto: 'Editar contacto',
  whatsapp: 'Enviar por WhatsApp',
};

export interface LinhaCarga extends CargaRowData {
  prefill: NovaCargaPendenteInput;
  filaId: string | null;
}

interface GrupoContacto {
  chave: string;
  nome: string;
  itens: LinhaCarga[];
}

function tituloCase(nome: string): string {
  return nome
    .trim()
    .split(/\s+/)
    .map((p) => (p.length > 0 ? p.charAt(0).toUpperCase() + p.slice(1).toLowerCase() : p))
    .join(' ');
}

function prefillDe(c: CargaPendente): NovaCargaPendenteInput {
  return {
    contentorId: c.contentorId,
    emissorNome: c.emissorNome,
    emissorTelefone: c.emissorTelefone,
    emissorEmail: c.emissorEmail,
    emissorNif: c.emissorNif,
    emissorMorada: c.emissorMorada,
    recetorNome: c.recetorNome,
    recetorTelefone: c.recetorTelefone,
    recetorEmail: c.recetorEmail,
    recetorMorada: c.recetorMorada,
    nomeCarga: c.nomeCarga,
    comprimentoCm: c.comprimentoCm,
    larguraCm: c.larguraCm,
    alturaCm: c.alturaCm,
    pesoKg: c.pesoKg,
    valor: c.valor,
    pago: c.pago,
    notas: c.notas,
  };
}

// Página única pós-login (docs/26 §1-§2) — hub central: topbar (só
// título) + ilha dinâmica (menu) + segmented control Cargas/Contactos +
// lista + FAB dinâmico + pílula de sync + host do sheet único. Não há
// mais nenhuma outra rota além desta e Definições (via menu da ilha).
export function CargasHubPage(): React.JSX.Element {
  const { fila, processarFila } = useFilaOffline();
  const { cargas, loading, recarregar, ultimaSincronizacao, modo, setModo, contactoSelecionado, selecionarContacto } = useCargasHub();
  const { tipo: sheetTipo, payload: sheetPayload, abrir: abrirSheet, fechar: fecharSheet } = useHubSheet();

  const [escondidoFab, setEscondidoFab] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const lastYRef = useRef(0);

  const linhas = useMemo<LinhaCarga[]>(() => {
    const daFila: LinhaCarga[] = fila.map((f) => ({
      id: f.id,
      // Ainda não passou pelo Desktop — nunca tem código real.
      codigo: null,
      nomeCarga: f.item.nomeCarga,
      emissorNome: tituloCase(f.item.emissorNome),
      recetorNome: tituloCase(f.item.recetorNome),
      comprimentoCm: f.item.comprimentoCm,
      larguraCm: f.item.larguraCm,
      alturaCm: f.item.alturaCm,
      valor: f.item.valor,
      estado: f.estado,
      prefill: f.item,
      filaId: f.id,
    }));
    const doServidor: LinhaCarga[] = cargas.map((c) => ({
      id: c.id,
      codigo: c.codigo,
      nomeCarga: c.nomeCarga,
      emissorNome: tituloCase(c.emissorNome),
      recetorNome: tituloCase(c.recetorNome),
      comprimentoCm: c.comprimentoCm,
      larguraCm: c.larguraCm,
      alturaCm: c.alturaCm,
      valor: c.valor,
      estado: c.estado,
      prefill: prefillDe(c),
      filaId: null,
    }));
    return [...daFila, ...doServidor];
  }, [cargas, fila]);

  const grupos = useMemo<GrupoContacto[]>(() => {
    const mapa = new Map<string, GrupoContacto>();
    for (const l of linhas) {
      const chave = l.emissorNome.trim().toLowerCase();
      const g = mapa.get(chave) ?? { chave, nome: l.emissorNome, itens: [] };
      g.itens.push(l);
      mapa.set(chave, g);
    }
    return [...mapa.values()].sort((a, b) => a.nome.localeCompare(b.nome));
  }, [linhas]);

  const contactoAtual = contactoSelecionado ? grupos.find((g) => g.chave === contactoSelecionado) ?? null : null;
  const pendentesFila = fila.length;
  const errosFila = fila.filter((f) => f.estado === 'erro').length;
  const titulo = contactoAtual ? contactoAtual.nome : modo === 'cargas' ? 'Cargas' : 'Contactos';

  function onScroll(e: React.UIEvent<HTMLDivElement>): void {
    const y = e.currentTarget.scrollTop;
    if (Math.abs(y - lastYRef.current) < 4) return;
    setEscondidoFab(y > lastYRef.current && y > 20);
    lastYRef.current = y;
    setSyncOpen(false);
  }

  function handleFabClick(): void {
    if (pendentesFila > 0) {
      setSyncOpen((v) => !v);
      return;
    }
    abrirSheet('addCarga');
  }

  function abrirWhatsappContacto(nome: string, itens: LinhaCarga[]): void {
    const telefone = itens.find((i) => i.prefill.emissorTelefone)?.prefill.emissorTelefone ?? null;
    abrirSheet('whatsapp', { nome, telefone });
  }

  async function handleSincronizarAgora(): Promise<void> {
    setSyncOpen(false);
    await processarFila();
  }

  return (
    <div className="karga-hub-theme relative flex h-full flex-col overflow-hidden">
      <DynamicIslandMenu />

      <div className="shrink-0 px-5 pb-2.5" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 52px)' }}>
        <p className="text-[22px] font-bold leading-none tracking-tight text-text-primary">{titulo}</p>
      </div>

      <div className="mx-5 mb-3.5 flex shrink-0 rounded-[14px] border border-border bg-glass p-[3px]">
        <button
          type="button"
          onClick={() => {
            setModo('cargas');
            selecionarContacto(null);
          }}
          className={`flex-1 rounded-[11px] py-2 text-[13.5px] font-semibold transition-colors ${
            modo === 'cargas' ? 'border border-border-strong bg-glass-strong text-text-primary' : 'text-text-secondary'
          }`}
        >
          Cargas
        </button>
        <button
          type="button"
          onClick={() => setModo('contactos')}
          className={`flex-1 rounded-[11px] py-2 text-[13.5px] font-semibold transition-colors ${
            modo === 'contactos' ? 'border border-border-strong bg-glass-strong text-text-primary' : 'text-text-secondary'
          }`}
        >
          Contactos
        </button>
      </div>

      <PullToRefresh onRefresh={recarregar} onScroll={onScroll} className="flex-1 px-3.5 pb-32">
        {loading ? (
          <p className="px-2 py-4 text-[13px] text-text-tertiary">A carregar...</p>
        ) : modo === 'cargas' ? (
          linhas.length === 0 ? (
            <p className="px-2 py-8 text-center text-[13px] text-text-tertiary">Nenhuma carga ainda.</p>
          ) : (
            <div className="overflow-hidden rounded-[22px] border border-border bg-glass">
              {linhas.map((l, i) => (
                <CargaRow key={l.id} carga={l} numero={i + 1} onAbrirOpcoes={(c) => abrirSheet('opcoesCarga', c)} />
              ))}
            </div>
          )
        ) : contactoAtual ? (
          <>
            <ContactDetailHeader
              nome={contactoAtual.nome}
              numCargas={contactoAtual.itens.length}
              valorTotalLabel={formatMoeda(contactoAtual.itens.reduce((s, i) => s + (i.valor ?? 0), 0))}
              onVoltar={() => selecionarContacto(null)}
              onEditar={() => abrirSheet('editarContacto', { nome: contactoAtual.nome })}
              onWhatsapp={() => abrirWhatsappContacto(contactoAtual.nome, contactoAtual.itens)}
            />
            <div className="overflow-hidden rounded-[22px] border border-border bg-glass">
              {contactoAtual.itens.map((l, i) => (
                <CargaRow key={l.id} carga={l} numero={i + 1} onAbrirOpcoes={(c) => abrirSheet('opcoesCarga', c)} />
              ))}
            </div>
          </>
        ) : grupos.length === 0 ? (
          <p className="px-2 py-8 text-center text-[13px] text-text-tertiary">Ainda não há contactos.</p>
        ) : (
          <>
            <p className="px-1.5 py-3 text-[11.5px] text-text-tertiary">Contactos</p>
            <div className="overflow-hidden rounded-[22px] border border-border bg-glass">
              {grupos.map((g) => (
                <ContactRow
                  key={g.chave}
                  nome={g.nome}
                  numCargas={g.itens.length}
                  valorTotalLabel={formatMoeda(g.itens.reduce((s, i) => s + (i.valor ?? 0), 0))}
                  onAbrir={() => selecionarContacto(g.chave)}
                  onWhatsapp={() => abrirWhatsappContacto(g.nome, g.itens)}
                />
              ))}
            </div>
          </>
        )}
      </PullToRefresh>

      <Fab pendente={pendentesFila > 0} badge={pendentesFila} escondido={escondidoFab} onClick={handleFabClick} />
      <SyncPill
        open={syncOpen}
        pendentes={pendentesFila}
        ultimaLabel={ultimaSincronizacao ? formatRelativo(ultimaSincronizacao) : '—'}
        erros={errosFila}
        onSincronizar={() => void handleSincronizarAgora()}
      />

      <Sheet
        open={sheetTipo != null}
        onClose={fecharSheet}
        title={sheetTipo === 'opcoesCarga' ? 'Opções da carga' : sheetTipo ? TITULO_SHEET[sheetTipo] : undefined}
        subtitle={
          sheetTipo === 'opcoesCarga'
            ? `${(sheetPayload as LinhaCarga).emissorNome} → ${(sheetPayload as LinhaCarga).recetorNome}`
            : sheetTipo === 'editarContacto' || sheetTipo === 'whatsapp'
              ? (sheetPayload as { nome: string }).nome
              : undefined
        }
      >
        {sheetTipo === 'addCarga' ? (
          <AddCargaSheetContent prefillInicial={(sheetPayload as { prefill?: NovaCargaPendenteInput } | null)?.prefill} />
        ) : sheetTipo === 'opcoesCarga' ? (
          <CargaOptionsSheetContent carga={sheetPayload as LinhaCarga} />
        ) : sheetTipo === 'editarContacto' ? (
          <EditContactSheetContent payload={sheetPayload as { nome: string }} />
        ) : sheetTipo === 'whatsapp' ? (
          <WhatsAppSheetContent payload={sheetPayload as { nome: string; telefone?: string | null }} />
        ) : null}
      </Sheet>
    </div>
  );
}
