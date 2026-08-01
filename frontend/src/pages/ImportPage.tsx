import { useState, useRef, useCallback, useEffect } from 'react';
import type { User } from '../types';
import {
  letterboxdPreview,
  letterboxdImport,
  steamPreview,
  steamImport,
  traktPreview,
  traktImport,
  tvtimePreview,
  tvtimeImport,
} from '../services/api';

interface ImportPageProps {
  user: User;
}

type Tab = 'letterboxd' | 'steam' | 'trakt' | 'tvtime';
type Phase = 'upload' | 'preview' | 'importing' | 'done';

interface ImportItem {
  title: string;
  year?: number;
  rating?: number;
  review?: string;
  hours_spent?: number;
  status: string;
  platform?: string;
  log_date?: string;
  selected?: boolean;
}

interface ImportResult {
  created: number;
  updated: number;
  skipped: number;
  enriched?: number;
  total: number;
  imported_items: Array<{ title: string; action: string; episodes_added?: number }>;
  skipped_items: Array<{ title: string; reason: string }>;
}

const usePrompt = (message: string | null) => {
  const messageRef = useRef(message);
  messageRef.current = message;

  useEffect(() => {
    if (!message) return;

    // Block browser back/forward navigation (popstate) while active
    const onPopState = () => {
      if (!messageRef.current) return;
      if (window.confirm(messageRef.current)) {
        return;
      }
      window.history.pushState(null, '');
    };
    window.history.pushState(null, '');
    window.addEventListener('popstate', onPopState);

    // Block in-app link clicks while active
    const onClick = (e: MouseEvent) => {
      if (!messageRef.current) return;
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const target = (e.target as HTMLElement).closest('a');
      if (!target || !target.href) return;
      if (target.hasAttribute('download') || target.target === '_blank') return;
      const sameOrigin = target.origin === window.location.origin;
      if (!sameOrigin) return;
      if (!window.confirm(messageRef.current)) {
        e.preventDefault();
      }
    };
    document.addEventListener('click', onClick);

    return () => {
      window.removeEventListener('popstate', onPopState);
      document.removeEventListener('click', onClick);
    };
  }, [message]);
};

const ImportPage = ({ user }: ImportPageProps) => {
  const [tab, setTab] = useState<Tab>('letterboxd');
  const [phase, setPhase] = useState<Phase>('upload');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [items, setItems] = useState<ImportItem[]>([]);
  const [steamId, setSteamId] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('steam_import_id') || '';
    }
    return '';
  });

  // Persist steamId to localStorage
  const handleSteamIdChange = (value: string) => {
    setSteamId(value);
    if (typeof window !== 'undefined') {
      if (value.trim()) {
        localStorage.setItem('steam_import_id', value.trim());
      } else {
        localStorage.removeItem('steam_import_id');
      }
    }
  };
  const [selectAll, setSelectAll] = useState(true);
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const importing = phase === 'importing';
  usePrompt(importing ? 'Uma importação está em andamento. Sair da página interrompe o acompanhamento do progresso. Deseja continuar?' : null);

  useEffect(() => {
    if (!importing) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [importing]);

  // Reload saved Steam ID when switching to Steam tab
  useEffect(() => {
    if (tab === 'steam') {
      const saved = localStorage.getItem('steam_import_id');
      if (saved) setSteamId(saved);
    }
  }, [tab]);

  const reset = () => {
    setPhase('upload');
    setItems([]);
    setResult(null);
    setError(null);
    setSelectAll(true);
    setSteamId('');
    setRawFile(null);
    setIsDragOver(false);
  };

  const toggleTab = (t: Tab) => {
    reset();
    setTab(t);
  };

  const toggleItem = (idx: number) => {
    setItems(prev => prev.map((item, i) =>
      i === idx ? { ...item, selected: !item.selected } : item
    ));
  };

  const toggleAll = () => {
    const newSelectAll = !selectAll;
    setSelectAll(newSelectAll);
    setItems(prev => prev.map(item => ({ ...item, selected: newSelectAll })));
  };

  const getSelected = () => items.filter(i => i.selected);

  const processFile = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    setRawFile(file);
    try {
      const formData = new FormData();
      formData.append('file', file);
      let res;
      if (tab === 'letterboxd') {
        res = await letterboxdPreview(formData);
      } else if (tab === 'tvtime') {
        res = await tvtimePreview(formData);
      } else {
        res = await traktPreview(formData);
      }
      const previewItems: ImportItem[] = res.data.items.map((item: Record<string, unknown>) => ({
        ...item,
        selected: true,
      }));
      setItems(previewItems);
      setPhase('preview');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao processar arquivo.';
      setError(msg);
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [tab]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (tab === 'steam') return;
    if (ext && ['csv', 'json', 'zip'].includes(ext)) {
      processFile(file);
    } else {
      setError('Formato de arquivo nao suportado. Use CSV, JSON ou ZIP.');
    }
  }, [tab, processFile]);

  const handleSteamPreview = async () => {
    if (!steamId.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await steamPreview(steamId.trim());
      const previewItems: ImportItem[] = res.data.items.map((item: Record<string, unknown>) => ({
        ...item,
        selected: true,
      }));
      setItems(previewItems);
      setPhase('preview');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr.response?.data?.detail || 'Erro ao buscar dados da Steam.');
    } finally {
      setLoading(false);
    }
  };

  const handleSteamReload = async () => {
    const savedId = localStorage.getItem('steam_import_id');
    if (!savedId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await steamPreview(savedId);
      const previewItems: ImportItem[] = res.data.items.map((item: Record<string, unknown>) => ({
        ...item,
        selected: true,
      }));
      setItems(previewItems);
      setPhase('preview');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr.response?.data?.detail || 'Erro ao recarregar dados da Steam.');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    const selected = getSelected();
    if (selected.length === 0) return;
    setPhase('importing');
    setImportProgress({ current: 0, total: selected.length });
    setError(null);
    try {
      let res;
      const cleanItems = selected.map(({ selected: _, ...rest }) => rest);
      if (tab === 'letterboxd') {
        res = await letterboxdImport(user.id, cleanItems);
      } else if (tab === 'steam') {
        res = await steamImport(user.id, steamId, cleanItems);
      } else if (tab === 'tvtime' && rawFile) {
        res = await tvtimeImport(user.id, cleanItems, rawFile);
      } else {
        res = await traktImport(user.id, cleanItems);
      }
      setResult(res.data);
      setImportProgress({ current: selected.length, total: selected.length });
      setTimeout(() => setPhase('done'), 600);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr.response?.data?.detail || 'Erro ao importar.');
      setPhase('preview');
    }
  };

  const tabBtn = (key: Tab, label: string, icon: string) => (
    <button
      onClick={() => toggleTab(key)}
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
      style={tab === key ? {
        background: 'var(--accent)',
        color: '#000',
      } : {
        background: 'var(--mdf-surface)',
        color: 'var(--text-muted)',
      }}
    >
      <span>{icon}</span>
      {label}
    </button>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="font-display text-3xl font-black tracking-tight">Importar Dados</h1>
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
        Importe seus logs de outras plataformas para o Logger.
      </p>

      <div className="flex gap-2">
        {tabBtn('letterboxd', 'Letterboxd', '🎬')}
        {tabBtn('steam', 'Steam', '🎮')}
        {tabBtn('trakt', 'Trakt', '📺')}
        {tabBtn('tvtime', 'TV Time', '📱')}
      </div>

      {error && (
        <div className="rounded-xl px-4 py-3 text-sm font-medium"
          style={{ background: 'rgba(248,113,113,0.15)', color: '#f87171', border: '1px solid rgba(248,113,113,0.3)' }}>
          {error}
        </div>
      )}

      {phase === 'upload' && (
        <div className="rounded-xl p-6 space-y-4" style={{ background: 'var(--mdf-surface)' }}>
          {tab === 'steam' ? (
            <div className="space-y-3">
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Insira sua Steam ID ou URL do perfil. O perfil precisa ser publico.
              </p>
              <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
                Ex: <code>76561197960434622</code> ou <code>steamcommunity.com/id/seuperfil</code>
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={steamId}
                  onChange={(e) => handleSteamIdChange(e.target.value)}
                  placeholder="Steam ID ou URL"
                  className="flex-1 bg-[var(--mdf-bg)] border border-white/10 focus:border-[var(--accent)] outline-none rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-white/30 transition-colors"
                />
                <button
                  onClick={handleSteamReload}
                  disabled={loading}
                  className="mdf-btn-secondary px-4"
                  title="Recarregar jogos da Steam"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M23 4v6h-6"/>
                    <path d="M1 20v-6h6"/>
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                  </svg>
                </button>
                <button
                  onClick={handleSteamPreview}
                  disabled={loading || !steamId.trim()}
                  className="mdf-btn-primary px-6"
                >
                  {loading ? 'Carregando...' : 'Buscar'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {tab === 'letterboxd'
                  ? 'Envie o arquivo ZIP ou CSV exportado do Letterboxd (Settings > Data > Export).'
                  : tab === 'tvtime'
                    ? 'Envie o ZIP exportado do TV Time (Settings > Data > GDPR Request).'
                    : 'Envie o arquivo JSON ou CSV exportado do Trakt (Settings > Export).'}
              </p>
              <label
                className="flex flex-col items-center justify-center w-full h-32 rounded-xl border-2 border-dashed cursor-pointer transition-colors"
                style={{
                  borderColor: isDragOver ? 'var(--accent)' : 'var(--border)',
                  background: isDragOver ? 'rgba(var(--accent-rgb, 0,224,84), 0.08)' : 'var(--mdf-bg)',
                }}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="flex flex-col items-center gap-2">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-muted)' }}>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  <span className="text-sm font-medium" style={{ color: isDragOver ? 'var(--accent)' : 'var(--text-muted)' }}>
                    {loading ? 'Processando...' : isDragOver ? 'Solte o arquivo aqui' : 'Clique ou arraste o arquivo'}
                  </span>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.json,.zip,.csv.zip"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={loading}
                />
              </label>
            </div>
          )}
        </div>
      )}

      {phase === 'preview' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl font-bold">{items.length} itens encontrados</h2>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Desmarque os itens que nao deseja importar.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={reset} className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                Voltar
              </button>
              <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--text-muted)' }}>
                <input type="checkbox" checked={selectAll} onChange={toggleAll}
                  className="w-4 h-4 rounded accent-[var(--accent)]" />
                Todos
              </label>
            </div>
          </div>

          <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border)', background: 'var(--mdf-surface)' }}>
            <div className="max-h-[420px] overflow-y-auto">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0 transition-colors"
                  style={{ borderColor: 'var(--border)', background: item.selected ? 'transparent' : 'rgba(255,255,255,0.02)' }}
                >
                  <input
                    type="checkbox"
                    checked={item.selected ?? true}
                    onChange={() => toggleItem(idx)}
                    className="w-4 h-4 rounded flex-shrink-0 accent-[var(--accent)]"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate" style={{ color: item.selected ? 'white' : 'var(--text-muted)' }}>
                      {item.title}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-dim)' }}>
                      {item.year && <span>{item.year}</span>}
                      {item.rating != null && <span> · ⭐ {item.rating}</span>}
                      {item.hours_spent != null && tab === 'tvtime' && <span> · {item.hours_spent} episodios assistidos</span>}
                      {item.hours_spent != null && tab !== 'tvtime' && <span> · {item.hours_spent}h</span>}
                      {item.log_date && <span> · {item.log_date}</span>}
                      {item.review && <span> · 📝 review</span>}
                    </div>
                  </div>
                  {item.status === 'wishlist' && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: 'rgba(168,85,247,0.2)', color: '#a855f7' }}>
                      wishlist
                    </span>
                  )}
                  {item.status === 'library' && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: 'rgba(99,102,241,0.2)', color: '#818cf8' }}>
                      biblioteca
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button onClick={reset} className="px-4 py-2 rounded-xl text-sm font-medium" style={{ background: 'var(--mdf-surface)', color: 'var(--text-muted)' }}>
              Cancelar
            </button>
            <button
              onClick={handleImport}
              disabled={getSelected().length === 0}
              className="mdf-btn-primary px-6"
            >
              Importar {getSelected().length} itens
            </button>
          </div>
        </div>
      )}

      {phase === 'importing' && (
        <div className="rounded-xl p-8 text-center space-y-5" style={{ background: 'var(--mdf-surface)' }}>
          <div className="text-4xl animate-pulse">⏳</div>
          <h2 className="font-display text-2xl font-black">Importando...</h2>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Buscando informacoes na TMDb e criando seus logs. Isso pode levar alguns minutos.
          </p>
          <div className="w-full max-w-md mx-auto">
            <div className="flex justify-between text-xs mb-1.5" style={{ color: 'var(--text-dim)' }}>
              <span>{importProgress.total > 0 ? `Processando ${importProgress.total} itens...` : 'Preparando...'}</span>
            </div>
            <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--mdf-bg)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  background: 'var(--accent)',
                  width: importProgress.total > 0 ? '60%' : '30%',
                  animation: 'pulse 1.5s ease-in-out infinite',
                }}
              />
            </div>
          </div>
        </div>
      )}

      {phase === 'done' && result && (
        <div className="rounded-xl p-8 text-center space-y-4" style={{ background: 'var(--mdf-surface)' }}>
          <div className="text-4xl">✅</div>
          <h2 className="font-display text-2xl font-black">Importacao Concluida!</h2>
          <div className="flex justify-center gap-6 text-sm">
            {result.created > 0 && (
              <div>
                <div className="text-2xl font-display font-black" style={{ color: 'var(--accent)' }}>{result.created}</div>
                <div className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Importados</div>
              </div>
            )}
            {result.updated > 0 && (
              <div>
                <div className="text-2xl font-display font-black" style={{ color: '#3b82f6' }}>{result.updated}</div>
                <div className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Atualizados</div>
              </div>
            )}
            {result.skipped > 0 && (
              <div>
                <div className="text-2xl font-display font-black" style={{ color: 'var(--text-muted)' }}>{result.skipped}</div>
                <div className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Ignorados</div>
              </div>
            )}
          </div>

          {result.imported_items?.length > 0 && (
            <div className="text-left mt-4 max-h-48 overflow-y-auto rounded-lg border" style={{ borderColor: 'var(--border)' }}>
              <div className="px-3 py-2 text-xs font-bold uppercase tracking-wider" style={{ background: 'var(--mdf-bg)', color: 'var(--text-muted)' }}>
                Importados / Atualizados
              </div>
              {result.imported_items.map((item, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 text-sm border-b last:border-b-0" style={{ borderColor: 'var(--border)' }}>
                  <span style={{ color: 'white' }}>{item.title}</span>
                  <span className="text-xs" style={{ color: item.action === 'updated' ? '#3b82f6' : 'var(--accent)' }}>
                    {item.action === 'updated' ? `+${item.episodes_added} eps` : 'novo'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {result.skipped_items?.length > 0 && (
            <div className="text-left mt-4 max-h-48 overflow-y-auto rounded-lg border" style={{ borderColor: 'var(--border)' }}>
              <div className="px-3 py-2 text-xs font-bold uppercase tracking-wider" style={{ background: 'var(--mdf-bg)', color: 'var(--text-muted)' }}>
                Ignorados
              </div>
              {result.skipped_items.map((item, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 text-sm border-b last:border-b-0" style={{ borderColor: 'var(--border)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{item.title}</span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {item.reason === 'duplicate' ? 'ja existe' : 'nao selecionado'}
                  </span>
                </div>
              ))}
            </div>
          )}

          <button onClick={reset} className="mdf-btn-primary px-6">
            Importar Mais
          </button>
        </div>
      )}
    </div>
  );
};

export default ImportPage;
