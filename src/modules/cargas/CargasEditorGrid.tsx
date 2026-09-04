import { useEffect, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ArrowsLeftRight as ArrowRightLeft, Copy } from '@phosphor-icons/react';
import { Switch } from '@/components/ui/Switch';
import { toast } from '@/components/ui/Toast';
import { ipcService } from '@/services/ipcService';
import { cleanIpcError } from '@/lib/cleanIpcError';
import { incrementCodigo } from '@/lib/incrementCodigo';
import { resolveContactoByNome } from '@/lib/resolveContactoByNome';
import { GridEmissorCell } from './GridEmissorCell';
import type { Contentor, CreateCargaInput, EstadoPagamento } from '@/types';

interface GridRow {
  tempId: string;
  id: string | null;
  codigo: string;
  nome: string;
  comprimentoCm: string;
  larguraCm: string;
  alturaCm: string;
  pesoKg: string;
  valor: string;
  estadoPagamento: EstadoPagamento;
  notas: string;
  emissorNome: string;
  emissorId: string | null;
  saveState: 'idle' | 'saving' | 'saved' | 'error';
  errors: Record<string, string>;
}

type EditableColKey =
  | 'codigo'
  | 'nome'
  | 'emissor'
  | 'comprimentoCm'
  | 'larguraCm'
  | 'alturaCm'
  | 'pesoKg'
  | 'valor'
  | 'estadoPagamento'
  | 'notas';

const ROW_HEIGHT = 34;

// Mesma paleta pastel e a mesma lógica de numeração da lista normal
// (CargasList) — o pedido foi que as duas vistas tenham a formatação
// igual.
const ROW_TINTS = ['var(--color-primary)', 'var(--color-success)', 'var(--color-warning)', 'var(--color-purple)'];

const COLUMNS: { key: EditableColKey | 'm3' | 'sel' | 'acoes' | 'num'; label: string; width: string }[] = [
  { key: 'num', label: '#', width: '32px' },
  { key: 'sel', label: '', width: '28px' },
  { key: 'codigo', label: 'Código', width: '90px' },
  { key: 'nome', label: 'Nome', width: '150px' },
  { key: 'emissor', label: 'Emissor', width: '150px' },
  { key: 'comprimentoCm', label: 'C', width: '48px' },
  { key: 'larguraCm', label: 'L', width: '48px' },
  { key: 'alturaCm', label: 'A', width: '48px' },
  { key: 'm3', label: 'm³', width: '64px' },
  { key: 'pesoKg', label: 'Peso', width: '64px' },
  { key: 'valor', label: 'Valor', width: '80px' },
  { key: 'estadoPagamento', label: 'Pagamento', width: '90px' },
  { key: 'notas', label: 'Observação', width: '160px' },
  { key: 'acoes', label: '', width: '32px' },
];

const GRID_TEMPLATE = COLUMNS.map((c) => c.width).join(' ');

const NAV_COLUMNS: EditableColKey[] = [
  'codigo',
  'nome',
  'emissor',
  'comprimentoCm',
  'larguraCm',
  'alturaCm',
  'pesoKg',
  'valor',
  'estadoPagamento',
  'notas',
];

const NUMERIC_FIELDS = ['comprimentoCm', 'larguraCm', 'alturaCm', 'pesoKg', 'valor'] as const;
type NumericField = (typeof NUMERIC_FIELDS)[number];

const PASTE_COLUMN_TEMPLATE: EditableColKey[] = [
  'nome',
  'comprimentoCm',
  'larguraCm',
  'alturaCm',
  'pesoKg',
  'valor',
  'estadoPagamento',
  'notas',
];

function parseNum(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

function isValidNumericCell(raw: string): boolean {
  const trimmed = raw.trim();
  if (trimmed === '') return true;
  const n = Number(trimmed);
  return Number.isFinite(n) && n >= 0;
}

function parsePagamento(raw: string): EstadoPagamento | null {
  const t = raw.trim().toLowerCase();
  if (t === '') return 'devido';
  if (t === 'pago') return 'pago';
  if (t === 'devido') return 'devido';
  return null;
}

function parseTsv(text: string): string[][] {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter((line, idx, arr) => !(idx === arr.length - 1 && line === ''))
    .map((line) => line.split('\t'));
}

function findMaxCodigo(rowsList: GridRow[]): string | null {
  let max: { codigo: string; num: number } | null = null;
  for (const r of rowsList) {
    const match = r.codigo.match(/^(\D*)(\d+)$/);
    if (!match?.[2]) continue;
    const num = Number(match[2]);
    if (!max || num > max.num) max = { codigo: r.codigo, num };
  }
  return max?.codigo ?? null;
}

function computeM3(row: GridRow): number | null {
  const c = parseNum(row.comprimentoCm);
  const l = parseNum(row.larguraCm);
  const a = parseNum(row.alturaCm);
  if (c == null || l == null || a == null) return null;
  return (c * l * a) / 1_000_000;
}

interface CargasEditorGridProps {
  contentorId: string | null;
  contentoresAbertos: Contentor[];
  onDataChanged: () => void;
}

export function CargasEditorGrid({ contentorId, contentoresAbertos, onDataChanged }: CargasEditorGridProps): React.JSX.Element {
  const [rows, setRows] = useState<GridRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [codigoModoGlobal, setCodigoModoGlobal] = useState<'automatico' | 'manual'>('automatico');
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [movendoPara, setMovendoPara] = useState('');
  const [movendo, setMovendo] = useState(false);
  const rowsRef = useRef<GridRow[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pendingFocusRef = useRef<{ rowIndex: number; col: EditableColKey } | null>(null);

  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  function makeDraftRow(codigo: string): GridRow {
    return {
      tempId: crypto.randomUUID(),
      id: null,
      codigo,
      nome: '',
      comprimentoCm: '',
      larguraCm: '',
      alturaCm: '',
      pesoKg: '',
      valor: '',
      estadoPagamento: 'devido',
      notas: '',
      emissorNome: '',
      emissorId: null,
      saveState: 'idle',
      errors: {},
    };
  }

  useEffect(() => {
    if (!contentorId) {
      setRows([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void ipcService.cargas.list({ contentorId }).then(async (cargas) => {
      if (cancelled) return;
      const mapped: GridRow[] = cargas.map((c) => ({
        tempId: c.id,
        id: c.id,
        codigo: c.codigo,
        nome: c.nome,
        comprimentoCm: c.comprimentoCm != null ? String(c.comprimentoCm) : '',
        larguraCm: c.larguraCm != null ? String(c.larguraCm) : '',
        alturaCm: c.alturaCm != null ? String(c.alturaCm) : '',
        pesoKg: c.pesoKg != null ? String(c.pesoKg) : '',
        valor: c.valor != null ? String(c.valor) : '',
        estadoPagamento: c.estadoPagamento,
        notas: c.notas ?? '',
        emissorNome: c.emissorNome,
        emissorId: c.emissorId,
        saveState: 'idle',
        errors: {},
      }));
      const draftCodigo = codigoModoGlobal === 'automatico' ? await ipcService.cargas.nextCodigo() : '';
      if (cancelled) return;
      mapped.push(makeDraftRow(draftCodigo));
      setRows(mapped);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentorId]);

  useEffect(() => {
    if (!pendingFocusRef.current) return;
    const { rowIndex, col } = pendingFocusRef.current;
    pendingFocusRef.current = null;
    requestAnimationFrame(() => {
      const el = containerRef.current?.querySelector<HTMLElement>(`[data-row="${rowIndex}"][data-col="${col}"]`);
      el?.focus();
    });
  }, [rows.length]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
  });

  function updateRow(rowIndex: number, patch: Partial<GridRow>): void {
    setRows((prev) => prev.map((r, i) => (i === rowIndex ? { ...r, ...patch } : r)));
  }

  function focusCell(rowIndex: number, col: EditableColKey): void {
    const el = containerRef.current?.querySelector<HTMLElement>(`[data-row="${rowIndex}"][data-col="${col}"]`);
    el?.focus();
  }

  async function appendDraftAndFocus(col: EditableColKey): Promise<void> {
    const codigo = codigoModoGlobal === 'automatico' ? await ipcService.cargas.nextCodigo() : '';
    const newRow = makeDraftRow(codigo);
    pendingFocusRef.current = { rowIndex: rowsRef.current.length, col };
    setRows((prev) => [...prev, newRow]);
  }

  async function handleDuplicateRow(rowIndex: number): Promise<void> {
    const source = rowsRef.current[rowIndex];
    if (!source) return;

    let codigo = '';
    if (codigoModoGlobal === 'automatico') {
      const maxCodigo = findMaxCodigo(rowsRef.current);
      codigo = maxCodigo ? incrementCodigo(maxCodigo) : await ipcService.cargas.nextCodigo();
    }

    const duplicado: GridRow = {
      ...makeDraftRow(codigo),
      emissorNome: source.emissorNome,
      emissorId: source.emissorId,
      comprimentoCm: source.comprimentoCm,
      larguraCm: source.larguraCm,
      alturaCm: source.alturaCm,
      pesoKg: source.pesoKg,
      estadoPagamento: source.estadoPagamento,
    };

    const insertAt = rowIndex + 1;
    pendingFocusRef.current = { rowIndex: insertAt, col: 'nome' };
    setRows((prev) => [...prev.slice(0, insertAt), duplicado, ...prev.slice(insertAt)]);
  }

  // Só linhas já gravadas (com id) podem ser selecionadas — uma linha em
  // rascunho ainda não existe como carga real, não faz sentido "mover".
  function toggleSelecionado(id: string): void {
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleMoverSelecionadas(): Promise<void> {
    if (!movendoPara || selecionados.size === 0) return;
    const idsAlvo = new Set(selecionados);
    setMovendo(true);
    let sucesso = 0;
    const falhas: string[] = [];
    for (const row of rowsRef.current) {
      if (!row.id || !idsAlvo.has(row.id)) continue;
      try {
        await ipcService.cargas.update(row.id, { contentorId: movendoPara });
        sucesso += 1;
      } catch (err) {
        falhas.push(`${row.codigo}: ${cleanIpcError(err)}`);
      }
    }
    setMovendo(false);
    // Só remove da grelha (deste contentor) as que realmente moveram — as
    // que falharam ficam visíveis e continuam selecionadas, para tentar de novo.
    const idsMovidas = new Set(idsAlvo);
    for (const falha of falhas) {
      const codigoFalhado = falha.split(':')[0];
      const linhaFalhada = rowsRef.current.find((r) => r.codigo === codigoFalhado);
      if (linhaFalhada?.id) idsMovidas.delete(linhaFalhada.id);
    }
    setRows((prev) => prev.filter((r) => !(r.id && idsMovidas.has(r.id))));
    setSelecionados((prev) => new Set([...prev].filter((id) => !idsMovidas.has(id))));
    setMovendoPara('');

    if (falhas.length === 0) {
      toast.success(`${sucesso} carga${sucesso === 1 ? '' : 's'} movida${sucesso === 1 ? '' : 's'} de contentor.`);
    } else {
      toast.warning(`${sucesso} movida${sucesso === 1 ? '' : 's'}, ${falhas.length} falharam — tenta de novo.`);
    }
    onDataChanged();
  }

  function handleEnter(rowIndex: number, col: EditableColKey): void {
    const isLastRow = rowIndex === rowsRef.current.length - 1;
    if (isLastRow) {
      void appendDraftAndFocus(col);
    } else {
      focusCell(rowIndex + 1, col);
    }
  }

  function handleArrowVertical(rowIndex: number, col: EditableColKey, direction: 1 | -1): void {
    const target = rowIndex + direction;
    if (target < 0 || target >= rowsRef.current.length) return;
    focusCell(target, col);
  }

  function makeNavHandler(rowIndex: number, col: EditableColKey) {
    return (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleEnter(rowIndex, col);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleArrowVertical(rowIndex, col, 1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        handleArrowVertical(rowIndex, col, -1);
      }
    };
  }

  function getEditableColumnsForRow(): EditableColKey[] {
    return codigoModoGlobal === 'automatico' ? NAV_COLUMNS.filter((c) => c !== 'codigo') : NAV_COLUMNS;
  }

  async function saveField(rowIndex: number, field: EditableColKey): Promise<void> {
    const row = rowsRef.current[rowIndex];
    if (!row) return;

    if ((NUMERIC_FIELDS as readonly string[]).includes(field)) {
      const raw = row[field as NumericField];
      if (!isValidNumericCell(raw)) {
        updateRow(rowIndex, {
          errors: { ...row.errors, [field]: 'Valor inválido: esperado um número (não negativo).' },
        });
        return;
      }
    }

    const { [field]: _removed, ...clearedErrors } = row.errors;

    const isDraft = row.id === null;
    const ready = Boolean(row.nome.trim() && row.emissorId && row.codigo.trim());

    if (isDraft && !ready) {
      updateRow(rowIndex, { errors: clearedErrors });
      return;
    }

    updateRow(rowIndex, { saveState: 'saving', errors: clearedErrors });

    const payload: CreateCargaInput = {
      codigo: row.codigo.trim(),
      nome: row.nome.trim(),
      comprimentoCm: parseNum(row.comprimentoCm),
      larguraCm: parseNum(row.larguraCm),
      alturaCm: parseNum(row.alturaCm),
      pesoKg: parseNum(row.pesoKg),
      valor: parseNum(row.valor),
      estadoPagamento: row.estadoPagamento,
      notas: row.notas.trim() || null,
      emissorId: row.emissorId ?? '',
      contentorId,
    };

    try {
      if (isDraft) {
        const created = await ipcService.cargas.create(payload);
        updateRow(rowIndex, { id: created.id, saveState: 'saved' });
      } else {
        await ipcService.cargas.update(row.id!, payload);
        updateRow(rowIndex, { saveState: 'saved' });
      }
      onDataChanged();
      setTimeout(() => updateRow(rowIndex, { saveState: 'idle' }), 1500);
    } catch (err) {
      const message = cleanIpcError(err);
      const errorField = message.toLowerCase().includes('código') ? 'codigo' : field;
      updateRow(rowIndex, { saveState: 'error', errors: { ...clearedErrors, [errorField]: message } });
    }
  }

  async function handleEmissorBlur(rowIndex: number): Promise<void> {
    const row = rowsRef.current[rowIndex];
    if (!row) return;
    if (!row.emissorId && row.emissorNome.trim()) {
      const resolvedId = await resolveContactoByNome(row.emissorNome);
      updateRow(rowIndex, { emissorId: resolvedId });
    }
    void saveField(rowIndex, 'emissor');
  }

  async function handlePaste(e: React.ClipboardEvent<HTMLDivElement>): Promise<void> {
    const active = document.activeElement as HTMLElement | null;
    const anchorRowAttr = active?.getAttribute('data-row');
    const anchorCol = active?.getAttribute('data-col') as EditableColKey | null;
    if (anchorRowAttr == null || !anchorCol) return;
    const anchorRowIndex = Number(anchorRowAttr);

    const clipboardText = e.clipboardData.getData('text/plain');
    if (!clipboardText) return;

    const isTabular = clipboardText.includes('\t') || clipboardText.includes('\n');
    if (!isTabular) return; // let the normal single-cell paste behavior happen

    e.preventDefault();

    const grid = parseTsv(clipboardText).filter((cells) => cells.some((cell) => cell.trim() !== ''));
    if (grid.length === 0) return;

    const templateStart = PASTE_COLUMN_TEMPLATE.includes(anchorCol) ? PASTE_COLUMN_TEMPLATE.indexOf(anchorCol) : 0;

    const nextRows = [...rowsRef.current];
    const anchorRow = nextRows[anchorRowIndex];
    const inheritEmissorNome = anchorRow?.emissorNome ?? '';
    const inheritEmissorId = anchorRow?.emissorId ?? null;

    let codeCursor: string | null = findMaxCodigo(nextRows);
    for (let r = 0; r < grid.length; r++) {
      const targetIndex = anchorRowIndex + r;
      if (targetIndex >= nextRows.length) {
        let codigo = '';
        if (codigoModoGlobal === 'automatico') {
          codeCursor = codeCursor === null ? await ipcService.cargas.nextCodigo() : incrementCodigo(codeCursor);
          codigo = codeCursor;
        }
        const draft = makeDraftRow(codigo);
        draft.emissorNome = inheritEmissorNome;
        draft.emissorId = inheritEmissorId;
        nextRows.push(draft);
      }
    }

    for (let r = 0; r < grid.length; r++) {
      const targetIndex = anchorRowIndex + r;
      const rowCells = grid[r]!;
      const row = { ...nextRows[targetIndex]! };
      const errors = { ...row.errors };

      for (let c = 0; c < rowCells.length; c++) {
        const templateIdx = templateStart + c;
        const targetCol = PASTE_COLUMN_TEMPLATE[templateIdx];
        if (!targetCol) continue;
        const rawValue = (rowCells[c] ?? '').trim();

        if (targetCol === 'estadoPagamento') {
          const parsed = parsePagamento(rawValue);
          if (parsed == null) {
            errors.estadoPagamento = 'Valor inválido: use "Pago" ou "Devido".';
          } else {
            row.estadoPagamento = parsed;
            delete errors.estadoPagamento;
          }
        } else if ((NUMERIC_FIELDS as readonly string[]).includes(targetCol)) {
          (row as unknown as Record<string, string>)[targetCol] = rawValue;
          if (!isValidNumericCell(rawValue)) {
            errors[targetCol] = 'Valor inválido: esperado um número (não negativo).';
          } else {
            delete errors[targetCol];
          }
        } else {
          (row as unknown as Record<string, string>)[targetCol] = rawValue;
        }
      }

      row.errors = errors;
      nextRows[targetIndex] = row;
    }

    setRows(nextRows);
    rowsRef.current = nextRows;

    let savedCount = 0;
    let errorRows = 0;
    let pendingCount = 0;

    for (let r = 0; r < grid.length; r++) {
      const targetIndex = anchorRowIndex + r;
      const row = nextRows[targetIndex]!;

      if (Object.keys(row.errors).length > 0) {
        errorRows++;
        continue;
      }

      const isDraft = row.id === null;
      const ready = Boolean(row.nome.trim() && row.emissorId && row.codigo.trim());

      if (isDraft && !ready) {
        pendingCount++;
        continue;
      }

      updateRow(targetIndex, { saveState: 'saving' });
      const payload: CreateCargaInput = {
        codigo: row.codigo.trim(),
        nome: row.nome.trim(),
        comprimentoCm: parseNum(row.comprimentoCm),
        larguraCm: parseNum(row.larguraCm),
        alturaCm: parseNum(row.alturaCm),
        pesoKg: parseNum(row.pesoKg),
        valor: parseNum(row.valor),
        estadoPagamento: row.estadoPagamento,
        notas: row.notas.trim() || null,
        emissorId: row.emissorId ?? '',
        contentorId,
      };

      try {
        if (isDraft) {
          const created = await ipcService.cargas.create(payload);
          updateRow(targetIndex, { id: created.id, saveState: 'saved' });
        } else {
          await ipcService.cargas.update(row.id!, payload);
          updateRow(targetIndex, { saveState: 'saved' });
        }
        savedCount++;
        setTimeout(() => updateRow(targetIndex, { saveState: 'idle' }), 1500);
      } catch (err) {
        const message = cleanIpcError(err);
        const errorField = message.toLowerCase().includes('código') ? 'codigo' : 'nome';
        updateRow(targetIndex, { saveState: 'error', errors: { ...row.errors, [errorField]: message } });
        errorRows++;
      }
    }

    if (errorRows === 0 && pendingCount === 0) {
      toast.success(`${savedCount} linhas importadas.`);
    } else {
      const parts = [`${savedCount} linhas importadas`];
      if (errorRows > 0) parts.push(`${errorRows} com erro — corrija manualmente`);
      if (pendingCount > 0) parts.push(`${pendingCount} por completar (falta Emissor)`);
      toast.warning(parts.join(', ') + '.');
    }

    onDataChanged();
  }

  if (!contentorId) {
    return (
      <div className="flex h-full items-center justify-center text-[13px] text-text-tertiary">
        Selecione ou crie um contentor aberto.
      </div>
    );
  }

  return (
    <div ref={containerRef} onPaste={(e) => void handlePaste(e)} className="flex h-full flex-col rounded-none">
      <div className="flex shrink-0 items-center gap-3 border-b border-border bg-bg-app px-lg py-2">
        <span className="text-[12px] font-medium text-text-secondary">Código na grelha:</span>
        <div className="flex items-center gap-2 text-[12px]">
          <span className={codigoModoGlobal === 'automatico' ? 'text-text-primary' : 'text-text-tertiary'}>Automático</span>
          <Switch
            checked={codigoModoGlobal === 'manual'}
            onChange={(manual) => setCodigoModoGlobal(manual ? 'manual' : 'automatico')}
          />
          <span className={codigoModoGlobal === 'manual' ? 'text-text-primary' : 'text-text-tertiary'}>Manual</span>
        </div>

        {selecionados.size > 0 ? (
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[12px] font-medium text-text-primary">
              {selecionados.size} selecionada{selecionados.size === 1 ? '' : 's'}
            </span>
            <ArrowRightLeft size={14} className="text-text-tertiary" />
            <select
              value={movendoPara}
              onChange={(e) => setMovendoPara(e.target.value)}
              className="h-7 rounded-control border border-border bg-bg-input px-2 text-[12px] text-text-primary outline-none focus:border-primary"
            >
              <option value="">Mover para contentor...</option>
              {contentoresAbertos
                .filter((c) => c.id !== contentorId)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.codigo} — {c.nome}
                  </option>
                ))}
            </select>
            <button
              type="button"
              disabled={!movendoPara || movendo}
              onClick={() => void handleMoverSelecionadas()}
              className="rounded-control bg-primary px-3 py-1 text-[12px] font-medium text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {movendo ? 'A mover...' : 'Mover'}
            </button>
            <button
              type="button"
              onClick={() => setSelecionados(new Set())}
              className="rounded-control px-2 py-1 text-[12px] font-medium text-text-secondary transition-colors hover:bg-bg-app"
            >
              Limpar
            </button>
          </div>
        ) : null}
      </div>

      <div
        className="grid shrink-0 border-b border-border bg-bg-app text-[11px] font-semibold uppercase tracking-wide text-text-tertiary rounded-none"
        style={{ gridTemplateColumns: GRID_TEMPLATE }}
      >
        {COLUMNS.map((col) => (
          <div key={col.key} className="truncate border-r border-border px-1.5 py-1.5 last:border-r-0">
            {col.label}
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center text-[13px] text-text-tertiary">A carregar...</div>
      ) : (
        <div ref={scrollRef} className="flex-1 overflow-y-auto rounded-none">
          <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const row = rows[virtualRow.index]!;
              const rowIndex = virtualRow.index;
              const m3 = computeM3(row);
              const editableCols = getEditableColumnsForRow();
              const codigoEditable = editableCols.includes('codigo');

              const tint = ROW_TINTS[rowIndex % ROW_TINTS.length];

              return (
                <div
                  key={row.tempId}
                  className="group grid items-stretch text-[12px] text-text-primary rounded-none"
                  style={{
                    gridTemplateColumns: GRID_TEMPLATE,
                    height: virtualRow.size,
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    transform: `translateY(${virtualRow.start}px)`,
                    backgroundColor: `color-mix(in srgb, ${tint} 5%, var(--bg-surface))`,
                  }}
                >
                  <div className="flex h-full items-center justify-center border-r border-border text-text-tertiary">
                    {rowIndex + 1}
                  </div>

                  <div className="flex h-full items-center justify-center border-r border-border">
                    <input
                      type="checkbox"
                      checked={row.id != null && selecionados.has(row.id)}
                      disabled={row.id == null}
                      title={row.id == null ? 'Grava a linha antes de a mover' : 'Selecionar para mover'}
                      onChange={() => row.id && toggleSelecionado(row.id)}
                      className="disabled:opacity-30"
                    />
                  </div>

                  {codigoEditable ? (
                    <input
                      data-row={rowIndex}
                      data-col="codigo"
                      value={row.codigo}
                      title={row.errors.codigo}
                      onChange={(e) => updateRow(rowIndex, { codigo: e.target.value })}
                      onBlur={() => void saveField(rowIndex, 'codigo')}
                      onKeyDown={makeNavHandler(rowIndex, 'codigo')}
                      className={`h-full border-r border-border bg-transparent px-1.5 outline-none focus:bg-primary-light ${
                        row.errors.codigo ? 'ring-1 ring-inset ring-error' : ''
                      }`}
                    />
                  ) : (
                    <div
                      title="Código automático — desative para editar"
                      className="flex h-full cursor-not-allowed items-center border-r border-border bg-bg-app px-1.5 text-text-tertiary"
                    >
                      {row.codigo}
                    </div>
                  )}

                  <input
                    data-row={rowIndex}
                    data-col="nome"
                    value={row.nome}
                    title={row.errors.nome}
                    onChange={(e) => updateRow(rowIndex, { nome: e.target.value })}
                    onBlur={() => void saveField(rowIndex, 'nome')}
                    onKeyDown={makeNavHandler(rowIndex, 'nome')}
                    className={`h-full border-r border-border bg-transparent px-1.5 outline-none focus:bg-primary-light ${
                      row.errors.nome ? 'ring-1 ring-inset ring-error' : ''
                    }`}
                  />

                  <GridEmissorCell
                    rowIndex={rowIndex}
                    value={row.emissorNome}
                    contactoId={row.emissorId}
                    onChange={(nome, contactoId) => {
                      updateRow(rowIndex, { emissorNome: nome, emissorId: contactoId });
                      if (contactoId) void saveField(rowIndex, 'emissor');
                    }}
                    onBlur={() => void handleEmissorBlur(rowIndex)}
                    onKeyDown={makeNavHandler(rowIndex, 'emissor')}
                    hasError={Boolean(row.errors.emissor)}
                    errorMessage={row.errors.emissor}
                  />

                  {(['comprimentoCm', 'larguraCm', 'alturaCm'] as const).map((dim) => (
                    <input
                      key={dim}
                      data-row={rowIndex}
                      data-col={dim}
                      type="text"
                      inputMode="decimal"
                      value={row[dim]}
                      title={row.errors[dim]}
                      onChange={(e) => updateRow(rowIndex, { [dim]: e.target.value } as Partial<GridRow>)}
                      onBlur={() => void saveField(rowIndex, dim)}
                      onKeyDown={makeNavHandler(rowIndex, dim)}
                      className={`h-full border-r border-border bg-transparent px-1.5 outline-none focus:bg-primary-light ${
                        row.errors[dim] ? 'ring-1 ring-inset ring-error' : ''
                      }`}
                    />
                  ))}

                  <div className="flex h-full cursor-not-allowed items-center border-r border-border bg-bg-app px-1.5 text-text-tertiary">
                    {m3 != null ? m3.toFixed(3) : '—'}
                  </div>

                  <input
                    data-row={rowIndex}
                    data-col="pesoKg"
                    type="text"
                    inputMode="decimal"
                    value={row.pesoKg}
                    title={row.errors.pesoKg}
                    onChange={(e) => updateRow(rowIndex, { pesoKg: e.target.value })}
                    onBlur={() => void saveField(rowIndex, 'pesoKg')}
                    onKeyDown={makeNavHandler(rowIndex, 'pesoKg')}
                    className={`h-full border-r border-border bg-transparent px-1.5 outline-none focus:bg-primary-light ${
                      row.errors.pesoKg ? 'ring-1 ring-inset ring-error' : ''
                    }`}
                  />

                  <input
                    data-row={rowIndex}
                    data-col="valor"
                    type="text"
                    inputMode="decimal"
                    value={row.valor}
                    title={row.errors.valor}
                    onChange={(e) => updateRow(rowIndex, { valor: e.target.value })}
                    onBlur={() => void saveField(rowIndex, 'valor')}
                    onKeyDown={makeNavHandler(rowIndex, 'valor')}
                    className={`h-full border-r border-border bg-transparent px-1.5 outline-none focus:bg-primary-light ${
                      row.errors.valor ? 'ring-1 ring-inset ring-error' : ''
                    }`}
                  />

                  <div className="relative flex h-full items-center border-r border-border">
                    <select
                      data-row={rowIndex}
                      data-col="estadoPagamento"
                      value={row.estadoPagamento}
                      onChange={(e) => {
                        const value = e.target.value as EstadoPagamento;
                        updateRow(rowIndex, { estadoPagamento: value });
                        void saveField(rowIndex, 'estadoPagamento');
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleEnter(rowIndex, 'estadoPagamento');
                        }
                      }}
                      className="h-full w-full border-0 bg-transparent px-1.5 outline-none focus:bg-primary-light"
                    >
                      <option value="devido">Devido</option>
                      <option value="pago">Pago</option>
                    </select>
                    {row.saveState === 'saving' ? (
                      <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-pill bg-text-tertiary" title="A gravar..." />
                    ) : row.saveState === 'saved' ? (
                      <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-pill bg-success" title="Gravado" />
                    ) : row.saveState === 'error' ? (
                      <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-pill bg-error" title="Erro ao gravar" />
                    ) : null}
                  </div>

                  <input
                    data-row={rowIndex}
                    data-col="notas"
                    value={row.notas}
                    title={row.notas || 'Observação (opcional)'}
                    onChange={(e) => updateRow(rowIndex, { notas: e.target.value })}
                    onBlur={() => void saveField(rowIndex, 'notas')}
                    onKeyDown={makeNavHandler(rowIndex, 'notas')}
                    placeholder="—"
                    className="h-full border-r border-border bg-transparent px-1.5 text-text-secondary outline-none placeholder:text-text-tertiary focus:bg-primary-light focus:text-text-primary"
                  />

                  <div className="flex h-full items-center justify-center">
                    <button
                      type="button"
                      title="Duplicar linha (copia emissor, dimensões, peso e pagamento)"
                      onClick={() => void handleDuplicateRow(rowIndex)}
                      className="flex h-6 w-6 items-center justify-center rounded-control text-text-tertiary opacity-0 transition-opacity hover:bg-bg-app hover:text-primary group-hover:opacity-100"
                    >
                      <Copy size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
