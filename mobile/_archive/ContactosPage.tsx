import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CaretDown as ChevronDown,
  ChatCircle as MessageCircle,
  EnvelopeSimple as Mail,
  List as Menu,
  PencilSimple as Pencil,
  PaperPlaneTilt as Send,
  Trash as Trash2,
  UserCircle as UserRound,
} from '@phosphor-icons/react';
import { useNovaCargaOverlay } from '@/hooks/useNovaCargaOverlay';
import { useFilaOffline } from '@/hooks/useFilaOffline';
import { useCargasToolbar } from '@/hooks/useCargasToolbar';
import { PullToRefresh } from '@/components/PullToRefresh';
import { CargaListHeader, CargaListRow, type AcaoLinhaCarga, type CargaListRowData } from '@/components/CargaListRow';
import type { CargaPendente, NovaCargaPendenteInput } from '@/types';

interface LinhaCarga extends CargaListRowData {
  prefill: NovaCargaPendenteInput;
  filaId: string | null;
}

interface Contacto {
  chave: string;
  nome: string;
  telefone: string | null;
  email: string | null;
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

function abrirWhatsapp(telefone: string): void {
  const digitos = telefone.replace(/[^0-9]/g, '');
  window.open(`https://wa.me/${digitos}`, '_blank');
}

function abrirEmail(email: string): void {
  window.open(`mailto:${email}?subject=${encodeURIComponent('Kraga — as suas cargas')}`, '_blank');
}

// Menu (☰) de cada contacto — Enviar (WhatsApp/Email, a partir do
// contacto guardado nas cargas dele) e Editar (abre a carga mais recente
// para editar — o PWA não tem uma tabela de contactos própria, doc 17
// §6, por isso "editar o contacto" na prática é editar os dados que ele
// já deixou na última carga).
function MenuContacto({ contacto, onEditar }: { contacto: Contacto; onEditar: () => void }): React.JSX.Element {
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent): void {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setAberto((v) => !v);
        }}
        title="Opções"
        className="flex h-9 w-9 items-center justify-center rounded-control text-text-tertiary active:bg-bg-input"
      >
        <Menu size={18} />
      </button>
      {aberto ? (
        <div className="absolute right-0 top-10 z-30 w-44 overflow-hidden rounded-surface border border-border bg-bg-surface shadow-medium">
          {contacto.telefone ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setAberto(false);
                abrirWhatsapp(contacto.telefone!);
              }}
              className="flex min-h-touch w-full items-center gap-2 px-3 text-left text-[13px] text-text-primary active:bg-bg-app"
            >
              <MessageCircle size={16} className="text-success" /> WhatsApp
            </button>
          ) : null}
          {contacto.email ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setAberto(false);
                abrirEmail(contacto.email!);
              }}
              className={`flex min-h-touch w-full items-center gap-2 px-3 text-left text-[13px] text-text-primary active:bg-bg-app ${
                contacto.telefone ? 'border-t border-border' : ''
              }`}
            >
              <Mail size={16} className="text-primary" /> Email
            </button>
          ) : null}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setAberto(false);
              onEditar();
            }}
            className={`flex min-h-touch w-full items-center gap-2 px-3 text-left text-[13px] text-text-primary active:bg-bg-app ${
              contacto.telefone || contacto.email ? 'border-t border-border' : ''
            }`}
          >
            <Pencil size={16} className="text-text-secondary" /> Editar
          </button>
        </div>
      ) : null}
    </div>
  );
}

// Contactos — lista plana (sem cartão a envolver), ícone + nome + nº de
// cargas + menu ☰ por linha. Tocar no contacto expande in-line (não
// navega para outro ecrã) mostrando as suas cargas em colunas —
// reaproveita CargaListHeader/CargaListRow, o mesmo componente compacto
// já usado em Cargas (sem todos os campos que a tabela do Desktop tem).
export function ContactosPage(): React.JSX.Element {
  const { abrir } = useNovaCargaOverlay();
  const { fila, removerItem, reenviarItem } = useFilaOffline();
  const { cargas, loading, recarregar } = useCargasToolbar();
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());

  const contactos = useMemo<Contacto[]>(() => {
    const linhas: LinhaCarga[] = [
      ...fila.map((f) => ({
        id: f.id,
        codigo: '',
        emissorNome: tituloCase(f.item.emissorNome),
        recetorNome: tituloCase(f.item.recetorNome),
        nomeCarga: f.item.nomeCarga,
        comprimentoCm: f.item.comprimentoCm,
        larguraCm: f.item.larguraCm,
        alturaCm: f.item.alturaCm,
        valor: f.item.valor,
        estado: f.estado,
        nota: f.estado === 'erro' && f.ultimoErro ? `${f.ultimoErro} · toca em enviar para tentar novamente` : null,
        prefill: f.item,
        filaId: f.id,
      })),
      ...cargas.map((c) => ({
        id: c.id,
        codigo: '',
        emissorNome: tituloCase(c.emissorNome),
        recetorNome: tituloCase(c.recetorNome),
        nomeCarga: c.nomeCarga,
        comprimentoCm: c.comprimentoCm,
        larguraCm: c.larguraCm,
        alturaCm: c.alturaCm,
        valor: c.valor,
        estado: c.estado,
        nota: c.estado === 'rejeitada' && c.motivoRejeicao ? `Motivo: ${c.motivoRejeicao}` : null,
        prefill: prefillDe(c),
        filaId: null,
      })),
    ];
    const mapa = new Map<string, Contacto>();
    for (const l of linhas) {
      const chave = l.emissorNome.trim().toLowerCase();
      const contacto = mapa.get(chave) ?? { chave, nome: l.emissorNome, telefone: l.prefill.emissorTelefone, email: l.prefill.emissorEmail, itens: [] };
      if (!contacto.telefone && l.prefill.emissorTelefone) contacto.telefone = l.prefill.emissorTelefone;
      if (!contacto.email && l.prefill.emissorEmail) contacto.email = l.prefill.emissorEmail;
      contacto.itens.push(l);
      mapa.set(chave, contacto);
    }
    return [...mapa.values()].sort((a, b) => a.nome.localeCompare(b.nome));
  }, [cargas, fila]);

  function alternar(chave: string): void {
    setExpandidos((atual) => {
      const novo = new Set(atual);
      if (novo.has(chave)) novo.delete(chave);
      else novo.add(chave);
      return novo;
    });
  }

  async function handleEditar(l: LinhaCarga): Promise<void> {
    if (l.filaId) await removerItem(l.filaId);
    abrir(l.prefill);
  }

  function acoesPara(l: LinhaCarga): AcaoLinhaCarga[] {
    if (l.estado === 'fila' || l.estado === 'erro') {
      return [
        { label: 'Enviar', icon: Send, onClick: () => l.filaId && void reenviarItem(l.filaId) },
        { label: 'Editar', icon: Pencil, onClick: () => void handleEditar(l) },
        { label: 'Eliminar', icon: Trash2, destrutiva: true, onClick: () => l.filaId && void removerItem(l.filaId) },
      ];
    }
    if (l.estado === 'rejeitada' || l.estado === 'pendente') {
      return [{ label: 'Editar', icon: Pencil, onClick: () => void handleEditar(l) }];
    }
    return [];
  }

  return (
    <PullToRefresh onRefresh={recarregar} className="h-full">
      <div className="flex flex-col py-2">
        {loading ? (
          <p className="px-4 py-4 text-[14px] text-text-tertiary">A carregar...</p>
        ) : contactos.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <UserRound size={28} className="text-text-tertiary" />
            <p className="text-[14px] text-text-tertiary">Ainda não há contactos.</p>
          </div>
        ) : (
          <div className="flex flex-col border-t border-border">
            {contactos.map((c) => {
              const expandido = expandidos.has(c.chave);
              return (
                <div key={c.chave} className="flex flex-col border-b border-border">
                  <div className="flex items-center gap-1.5 bg-bg-app pl-4 pr-2">
                    <button type="button" onClick={() => alternar(c.chave)} className="flex min-h-touch min-w-0 flex-1 items-center gap-3 py-2.5 text-left">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-bg-input text-text-secondary">
                        <UserRound size={20} />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[15px] text-text-primary">{c.nome}</span>
                      <span className="shrink-0 text-[12px] text-text-tertiary">
                        {c.itens.length} {c.itens.length === 1 ? 'carga' : 'cargas'}
                      </span>
                      <ChevronDown size={15} className={`shrink-0 text-text-tertiary transition-transform ${expandido ? 'rotate-180' : ''}`} />
                    </button>
                    <MenuContacto contacto={c} onEditar={() => void handleEditar(c.itens[0]!)} />
                  </div>
                  {expandido ? (
                    <div className="flex flex-col">
                      <CargaListHeader />
                      {c.itens.map((l, i) => (
                        <CargaListRow key={l.id} linha={{ ...l, codigo: `#${i + 1}` }} acoes={acoesPara(l)} />
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PullToRefresh>
  );
}
