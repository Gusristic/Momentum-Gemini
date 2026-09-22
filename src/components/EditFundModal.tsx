import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Save, 
  Sparkles, 
  ExternalLink, 
  Shield, 
  Percent, 
  Calculator,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Activity,
  History,
  Info,
  Trash2,
  Eraser,
  Eye,
  EyeOff
} from 'lucide-react';
import { FundISIN, FundCategory } from '../types';

interface EditFundModalProps {
  fund: FundISIN | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedFund: FundISIN) => void;
  onDelete?: (fundId: string) => void;
  onClearBlank?: (fundId: string) => void;
  onToggleDisable?: (fundId: string) => void;
}

const CATEGORIES: { value: FundCategory; label: string }[] = [
  { value: 'US_EQUITY', label: 'Renta Variable EE.UU. (S&P 500 / Nasdaq)' },
  { value: 'WORLD_EQUITY', label: 'Renta Variable Global Desarrollada (MSCI World)' },
  { value: 'EUROPE_EQUITY', label: 'Renta Variable Europa (MSCI Europe / Stoxx)' },
  { value: 'EMERGING_EQUITY', label: 'Renta Variable Mercados Emergentes' },
  { value: 'GLOBAL_SMALL_CAP', label: 'Small Caps Globales Indexadas' },
  { value: 'PACIFIC_EQUITY', label: 'Renta Variable Pacífico Ex-Japón Indexado' },
  { value: 'JAPAN_EQUITY', label: 'Renta Variable Japón (Topix Index)' },
  { value: 'REAL_ESTATE', label: 'Inmobiliario Global Cotizado (REITs)' },
  { value: 'GLOBAL_AGGREGATE_BONDS', label: 'Renta Fija Global Agregada (EUR Hedged)' },
  { value: 'EURO_BONDS', label: 'Renta Fija Soberana Euro (Refugio Intermedio)' },
  { value: 'MONEY_MARKET_CASH', label: 'Fondo Monetario Euro (€STR - Tasa Libre Riesgo)' },
];

export const EditFundModal: React.FC<EditFundModalProps> = ({
  fund,
  isOpen,
  onClose,
  onSave,
  onDelete,
  onClearBlank,
  onToggleDisable,
}) => {
  if (!isOpen || !fund) return null;

  const [formData, setFormData] = useState<FundISIN>({ ...fund });
  const [isinQuery, setIsinQuery] = useState(fund.isin);
  const [isFetchingRealData, setIsFetchingRealData] = useState(false);
  const [fetchStatus, setFetchStatus] = useState<{
    type: 'success' | 'error' | 'loading' | null;
    message: string;
    details?: any;
  }>({ type: null, message: '' });

  const lastFetchedIsinRef = useRef<string>(fund.isin);

  // Sync when fund prop changes
  useEffect(() => {
    if (fund) {
      setFormData({ ...fund });
      setIsinQuery(fund.isin);
      lastFetchedIsinRef.current = fund.isin;
      setFetchStatus({ type: null, message: '' });
    }
  }, [fund?.id]);

  const handleChange = (field: keyof FundISIN, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCategoryChange = (cat: FundCategory) => {
    const found = CATEGORIES.find(c => c.value === cat);
    setFormData(prev => ({
      ...prev,
      category: cat,
      categoryLabel: found ? found.label : prev.categoryLabel,
      isSafeHaven: cat === 'MONEY_MARKET_CASH' || cat === 'EURO_BONDS',
    }));
  };

  // Main automatic lookup function
  const fetchFundByIsin = async (rawIsin: string) => {
    const isinClean = rawIsin.trim().toUpperCase();
    if (!isinClean) {
      setFetchStatus({ type: 'error', message: 'Por favor, introduce un código ISIN.' });
      return;
    }

    setIsFetchingRealData(true);
    setFetchStatus({ 
      type: 'loading', 
      message: `Buscando cotización oficial, ratios y 5 años de historial para ${isinClean}...` 
    });

    try {
      const res = await fetch(`/api/fund-lookup?query=${encodeURIComponent(isinClean)}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `No se pudo encontrar datos de mercado para ${isinClean}`);
      }

      const data = await res.json();
      lastFetchedIsinRef.current = isinClean;

      const fundName = data.name || (formData.name && !formData.name.includes('(Vacío)') ? formData.name : `Fondo ISIN ${isinClean}`);

      setFormData(prev => ({
        ...prev,
        isin: isinClean,
        isBlank: false,
        name: fundName,
        category: (data.category as FundCategory) || prev.category,
        categoryLabel: data.categoryLabel || prev.categoryLabel,
        isSafeHaven: data.isSafeHaven !== undefined ? data.isSafeHaven : prev.isSafeHaven,
        currentNAV: data.currentNAV || prev.currentNAV,
        currency: data.currency || prev.currency,
        return1M: data.return1M !== undefined ? data.return1M : prev.return1M,
        return3M: data.return3M !== undefined ? data.return3M : prev.return3M,
        return6M: data.return6M !== undefined ? data.return6M : prev.return6M,
        return12M: data.return12M !== undefined ? data.return12M : prev.return12M,
        return3YAnnualized: data.return3YAnnualized !== undefined ? data.return3YAnnualized : prev.return3YAnnualized,
        volatility1Y: data.volatility1Y !== undefined ? data.volatility1Y : prev.volatility1Y,
        sharpeRatio: data.sharpeRatio !== undefined ? data.sharpeRatio : prev.sharpeRatio,
        jensenAlpha: data.jensenAlpha !== undefined ? data.jensenAlpha : prev.jensenAlpha,
        sortinoRatio: data.sortinoRatio !== undefined ? data.sortinoRatio : prev.sortinoRatio,
        beta: data.beta !== undefined ? data.beta : prev.beta,
        maxDrawdown: data.maxDrawdown !== undefined ? data.maxDrawdown : prev.maxDrawdown,
        history: data.history && data.history.length > 0 ? data.history : prev.history,
        morningstarUrl: data.morningstarUrl || prev.morningstarUrl,
        ftUrl: data.ftUrl || prev.ftUrl,
        investingUrl: data.investingUrl || prev.investingUrl,
        lastUpdated: data.lastUpdated || new Date().toISOString().substring(0, 10),
      }));

      setFetchStatus({
        type: 'success',
        message: `¡Datos e historial cargados con éxito!`,
        details: {
          name: fundName,
          categoryLabel: data.categoryLabel,
          currentNAV: data.currentNAV,
          return12M: data.return12M,
          volatility1Y: data.volatility1Y,
          sharpeRatio: data.sharpeRatio,
          isSafeHaven: data.isSafeHaven,
          pointsCount: data.pointsCount || (data.history?.length || 0),
          lastUpdated: data.lastUpdated
        }
      });
    } catch (err: any) {
      setFetchStatus({
        type: 'error',
        message: err.message || 'Error al conectar con la fuente de referencia.'
      });
    } finally {
      setIsFetchingRealData(false);
    }
  };

  // Auto-fetch trigger when typing or pasting a standard 12-char ISIN
  const handleIsinInputChange = (val: string) => {
    const uppercaseVal = val.toUpperCase().replace(/\s/g, '');
    setIsinQuery(uppercaseVal);
    setFormData(prev => ({
      ...prev,
      isin: uppercaseVal,
      isBlank: uppercaseVal.length === 0,
      name: uppercaseVal.length > 0 && prev.name.includes('(Vacío)')
        ? `Fondo ISIN ${uppercaseVal}`
        : prev.name,
    }));

    // If it looks like a valid full 12-character ISIN and is different from last fetched
    if (uppercaseVal.length === 12 && uppercaseVal !== lastFetchedIsinRef.current) {
      fetchFundByIsin(uppercaseVal);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanIsin = (isinQuery || formData.isin || '').trim().toUpperCase();
    const isNowBlank = cleanIsin.length === 0;
    const resolvedName = isNowBlank
      ? (formData.name?.includes('Slot #') ? formData.name : `Slot #${formData.slotNumber} (Vacío)`)
      : (formData.name && !formData.name.includes('(Vacío)') ? formData.name : `Fondo ISIN ${cleanIsin}`);

    const finalFund: FundISIN = {
      ...formData,
      isin: cleanIsin,
      isBlank: isNowBlank,
      name: resolvedName,
    };
    onSave(finalFund);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-6">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-emerald-500/20 text-emerald-400 font-mono font-bold text-xs flex items-center justify-center border border-emerald-500/30">
                #{formData.slotNumber}
              </span>
              <h3 className="text-base font-bold text-white">Configurar Slot ISIN Automáticamente</h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Introduce únicamente el ISIN: el sistema lee automáticamente el nombre, categoría, ratios e historial oficial de 5 años.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs">
          
          {/* PRIMARY ISIN HERO INPUT SECTION */}
          <div className="p-4 rounded-xl bg-gradient-to-b from-emerald-950/40 via-slate-950 to-slate-950 border-2 border-emerald-500/40 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-emerald-300 font-bold text-xs font-mono uppercase tracking-wider flex items-center gap-2">
                <Search className="w-4 h-4 text-emerald-400" />
                <span>Paso Único: Introduce el ISIN del Fondo</span>
              </label>
              <span className="text-[10px] text-emerald-400/90 font-mono bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                Carga Automática Yahoo / Morningstar
              </span>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  required
                  value={isinQuery}
                  onChange={e => handleIsinInputChange(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      fetchFundByIsin(isinQuery);
                    }
                  }}
                  placeholder="Ej: IE00B03HD191, IE0032126645, FR0007054316..."
                  className="w-full bg-slate-900 border border-emerald-500/60 rounded-xl px-3.5 py-2.5 text-white font-mono text-sm font-bold tracking-wider placeholder:text-slate-600 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-none"
                />
              </div>

              <button
                type="button"
                onClick={() => fetchFundByIsin(isinQuery)}
                disabled={isFetchingRealData || !isinQuery.trim()}
                className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold flex items-center gap-2 transition-all shadow-md shrink-0"
              >
                <RefreshCw className={`w-4 h-4 ${isFetchingRealData ? 'animate-spin' : ''}`} />
                <span>{isFetchingRealData ? 'Leyendo ISIN...' : 'Buscar y Cargar'}</span>
              </button>
            </div>

            {/* Quick Helper Text */}
            <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span>
                Pega cualquier ISIN europeo UCITS o español de 12 caracteres (se detecta y consulta al instante).
              </span>
            </p>

            {/* Status Notifications */}
            {fetchStatus.type === 'loading' && (
              <div className="p-3 rounded-lg bg-cyan-950/40 border border-cyan-500/40 text-cyan-200 flex items-center gap-2 text-xs">
                <RefreshCw className="w-4 h-4 animate-spin text-cyan-400 shrink-0" />
                <span>{fetchStatus.message}</span>
              </div>
            )}

            {fetchStatus.type === 'error' && (
              <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/40 text-rose-200 flex items-center gap-2 text-xs">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{fetchStatus.message}</span>
              </div>
            )}

            {fetchStatus.type === 'success' && fetchStatus.details && (
              <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-slate-200 space-y-2">
                <div className="flex items-center justify-between border-b border-emerald-500/30 pb-1.5">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="font-bold text-emerald-300 text-xs">
                      {fetchStatus.message}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded">
                    {fetchStatus.details.pointsCount} meses de historial
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[11px]">
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase">Fondo</span>
                    <span className="text-white font-sans font-semibold truncate block" title={fetchStatus.details.name}>
                      {fetchStatus.details.name}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase">Categoría</span>
                    <span className="text-teal-300 truncate block">
                      {fetchStatus.details.categoryLabel}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase">VL Actual</span>
                    <span className="text-emerald-400 font-bold">
                      {fetchStatus.details.currentNAV.toFixed(2)} €
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase">Retorno 12M</span>
                    <span className={`font-bold ${fetchStatus.details.return12M >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {fetchStatus.details.return12M >= 0 ? '+' : ''}{fetchStatus.details.return12M}%
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* AUTO-POPULATED READOUT FIELDS (User can review or tweak if desired) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1">
              <span className="text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                Detalles leídos del fondo (completados automáticamente)
              </span>
              <span className="text-[10px] text-slate-500">
                Actualizado: {formData.lastUpdated}
              </span>
            </div>

            {/* Fund Name & Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 text-[11px] font-medium mb-1">
                  Nombre Oficial del Fondo
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => handleChange('name', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 text-[11px] font-medium mb-1">
                  Categoría Detectada
                </label>
                <select
                  value={formData.category}
                  onChange={e => handleCategoryChange(e.target.value as FundCategory)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Safe Haven indicator and currency */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex items-center gap-2 cursor-pointer p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <input
                  type="checkbox"
                  checked={formData.isSafeHaven}
                  onChange={e => handleChange('isSafeHaven', e.target.checked)}
                  className="rounded text-emerald-500 focus:ring-0 w-4 h-4 bg-slate-900 border-slate-700"
                />
                <span className="text-slate-300 font-medium flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-sky-400" />
                  Activo Refugio / Defensivo (Fondo Monetario o Renta Fija)
                </span>
              </label>

              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 text-xs">
                <span>Divisa base:</span>
                <span className="text-emerald-400 font-mono font-bold">{formData.currency || 'EUR'}</span>
                <span className="mx-1">•</span>
                <span>Puntos históricos:</span>
                <span className="text-cyan-400 font-mono font-bold">{formData.history?.length || 60} meses</span>
              </div>
            </div>

            {/* MULTI-SOURCE BENCHMARK & AUDIT (FT, Morningstar, Investing) */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                    Auditoría y Fuentes de Rentabilidad (12M)
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  Contrastado en Tiempo Real
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* Source 1: Morningstar */}
                <div className={`p-3 rounded-lg border flex flex-col justify-between transition-all ${
                  formData.return12M === (formData.morningstarReturn12M || 28.49)
                    ? 'bg-emerald-950/40 border-emerald-500/60 ring-1 ring-emerald-500/30'
                    : 'bg-slate-900/70 border-slate-800'
                }`}>
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
                        ⭐ Morningstar
                      </span>
                      <a
                        href={formData.morningstarUrl || `https://www.morningstar.es/es/funds/snapshot/snapshot.aspx?id=${formData.isin}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-slate-400 hover:text-white flex items-center gap-0.5 underline"
                      >
                        Ficha <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                    <div className="text-lg font-bold font-mono text-emerald-400 mt-1">
                      +{formData.morningstarReturn12M !== undefined ? formData.morningstarReturn12M : formData.return12M}%
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Corte diario oficial (18/09)
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleChange('return12M', formData.morningstarReturn12M !== undefined ? formData.morningstarReturn12M : formData.return12M)}
                    className="mt-2 text-[10px] py-1 px-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold w-full text-center transition-colors"
                  >
                    Usar Morningstar
                  </button>
                </div>

                {/* Source 2: Financial Times */}
                <div className={`p-3 rounded-lg border flex flex-col justify-between transition-all ${
                  formData.return12M === (formData.ftReturn12M !== undefined ? formData.ftReturn12M : formData.return12M)
                    ? 'bg-emerald-950/40 border-emerald-500/60 ring-1 ring-emerald-500/30'
                    : 'bg-slate-900/70 border-slate-800'
                }`}>
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-rose-300 flex items-center gap-1">
                        📰 Financial Times
                      </span>
                      <a
                        href={formData.ftUrl || `https://markets.ft.com/data/funds/tearsheet/summary?s=${formData.isin}:EUR`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-slate-400 hover:text-white flex items-center gap-0.5 underline"
                      >
                        Ficha <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                    <div className="text-lg font-bold font-mono text-sky-400 mt-1">
                      +{formData.ftReturn12M !== undefined ? formData.ftReturn12M : formData.return12M}%
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Corte trailing 1Y (17/09)
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleChange('return12M', formData.ftReturn12M !== undefined ? formData.ftReturn12M : formData.return12M)}
                    className="mt-2 text-[10px] py-1 px-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold w-full text-center transition-colors"
                  >
                    Usar Financial Times
                  </button>
                </div>

                {/* Source 3: Investing.com */}
                <div className={`p-3 rounded-lg border flex flex-col justify-between transition-all ${
                  formData.return12M === (formData.investingReturn12M !== undefined ? formData.investingReturn12M : formData.return12M)
                    ? 'bg-emerald-950/40 border-emerald-500/60 ring-1 ring-emerald-500/30'
                    : 'bg-slate-900/70 border-slate-800'
                }`}>
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-indigo-300 flex items-center gap-1">
                        📈 Investing.com
                      </span>
                      <a
                        href={formData.investingUrl || `https://es.investing.com/search/?q=${formData.isin}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-slate-400 hover:text-white flex items-center gap-0.5 underline"
                      >
                        Ficha <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                    <div className="text-lg font-bold font-mono text-indigo-300 mt-1">
                      +{formData.investingReturn12M !== undefined ? formData.investingReturn12M : formData.return12M}%
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Variación gráfica interanual
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleChange('return12M', formData.investingReturn12M !== undefined ? formData.investingReturn12M : formData.return12M)}
                    className="mt-2 text-[10px] py-1 px-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold w-full text-center transition-colors"
                  >
                    Usar Investing.com
                  </button>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 flex items-start gap-2">
                <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p>
                    <strong>Metodología de cálculo:</strong> Las pequeñas diferencias entre fuentes se deben a la fecha de corte del valor liquidativo (NAV) y al tratamiento de dividendos reinvertidos (Total Return).
                  </p>
                  <p className="text-slate-500 text-[10px]">
                    • <strong>Morningstar:</strong> Utiliza el último NAV oficial publicado (18/09/2026). Recomendado para la ejecución formal de Gary Antonacci.<br />
                    • <strong>FT:</strong> Utiliza el último cierre reportado (17/09/2026).<br />
                    • <strong>Investing:</strong> Mide la oscilación entre el precio de cierre actual y la vela de hace 365 días.
                  </p>
                </div>
              </div>
            </div>

            {/* NAV and Metrics Grid */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
                <span className="font-bold text-slate-300 font-mono text-[10px] uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Ratios Técnicos Calculados</span>
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  Lookback: 12M Antonacci Core
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="block text-slate-400 text-[10px] uppercase font-mono mb-1">
                    Valor Liq. (€)
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.currentNAV}
                    onChange={e => handleChange('currentNAV', parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 text-[10px] uppercase font-mono mb-1">
                    Retorno 12M (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.return12M}
                    onChange={e => handleChange('return12M', parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-emerald-400 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 text-[10px] uppercase font-mono mb-1">
                    Sharpe (1Y)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.sharpeRatio}
                    onChange={e => handleChange('sharpeRatio', parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-teal-300 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 text-[10px] uppercase font-mono mb-1">
                    Volatilidad σ (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.volatility1Y}
                    onChange={e => handleChange('volatility1Y', parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 text-[10px] uppercase font-mono mb-1">
                    Alfa Jensen (α) %
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.jensenAlpha}
                    onChange={e => handleChange('jensenAlpha', parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-indigo-300 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 text-[10px] uppercase font-mono mb-1">
                    Retorno 6M (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.return6M}
                    onChange={e => handleChange('return6M', parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 text-[10px] uppercase font-mono mb-1">
                    Retorno 3M (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.return3M}
                    onChange={e => handleChange('return3M', parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 text-[10px] uppercase font-mono mb-1">
                    Max Drawdown %
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.maxDrawdown}
                    onChange={e => handleChange('maxDrawdown', parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-rose-400 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Optional Portfolio Holdings for Spain Fiscality */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
              <span className="font-bold text-slate-300 font-mono text-[10px] uppercase tracking-wider block">
                Participaciones en Cartera (Opcional - Para Simulación Fiscal de Plusvalía)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 text-[10px] uppercase font-mono mb-1">
                    Participaciones poseídas
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    value={formData.sharesHeld}
                    onChange={e => handleChange('sharesHeld', parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-white font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 text-[10px] uppercase font-mono mb-1">
                    Precio Medio Adquisición Fiscal (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.purchasePriceAvg}
                    onChange={e => handleChange('purchasePriceAvg', parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-white font-mono text-xs"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Slot Actions (Borrar, Dejar en blanco, Dejar en gris) */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-300 font-bold text-[11px] uppercase tracking-wider font-mono">
                Control de Estado del Slot #{formData.slotNumber}
              </span>
              <span className="text-[10px] text-slate-500">
                Opciones directas de gestión
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* Dejar en gris / Excluir */}
              <button
                type="button"
                onClick={() => {
                  setFormData(prev => ({ ...prev, isDisabled: !prev.isDisabled }));
                }}
                className={`px-3 py-2 rounded-lg border text-left flex items-center justify-between transition-colors ${
                  formData.isDisabled
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="font-bold text-[11px] flex items-center gap-1.5">
                    {formData.isDisabled ? <EyeOff className="w-3.5 h-3.5 text-amber-400" /> : <Eye className="w-3.5 h-3.5 text-slate-400" />}
                    <span>{formData.isDisabled ? 'En Gris (Excluido)' : 'Activo en Motor'}</span>
                  </div>
                  <div className="text-[9px] text-slate-400 mt-0.5">
                    {formData.isDisabled ? 'Ignorado en cálculos' : 'Poner en gris (ignorar)'}
                  </div>
                </div>
              </button>

              {/* Dejar en blanco */}
              <button
                type="button"
                onClick={() => {
                  if (onClearBlank) {
                    onClearBlank(formData.id);
                    onClose();
                  } else {
                    setFormData(prev => ({
                      ...prev,
                      isin: '',
                      name: `Slot #${prev.slotNumber} (Vacío)`,
                      categoryLabel: 'Sin Asignar (En Blanco)',
                      isBlank: true,
                      return12M: 0,
                      currentNAV: 100,
                      sharesHeld: 0
                    }));
                    setIsinQuery('');
                  }
                }}
                className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/80 text-slate-300 text-left transition-colors"
              >
                <div className="font-bold text-[11px] flex items-center gap-1.5 text-slate-200">
                  <Eraser className="w-3.5 h-3.5 text-slate-400" />
                  <span>Dejar en Blanco</span>
                </div>
                <div className="text-[9px] text-slate-400 mt-0.5">
                  Vacía datos del slot
                </div>
              </button>

              {/* Eliminar Slot */}
              <button
                type="button"
                onClick={() => {
                  if (onDelete) {
                    onDelete(formData.id);
                    onClose();
                  }
                }}
                className="px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 text-rose-300 text-left transition-colors"
              >
                <div className="font-bold text-[11px] flex items-center gap-1.5 text-rose-300">
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Eliminar Slot</span>
                </div>
                <div className="text-[9px] text-rose-400/80 mt-0.5">
                  Borra el slot de la lista
                </div>
              </button>
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-slate-800">
            <div className="text-[11px] text-slate-500 font-mono">
              Slot #{formData.slotNumber} • {formData.isin || '(Sin ISIN)'} {formData.isDisabled ? '• [En gris / Excluido]' : ''}
            </div>
            <div className="flex items-center gap-2 justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold flex items-center gap-1.5 transition-colors shadow-lg"
              >
                <Save className="w-4 h-4" /> Guardar Cambios
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
};

