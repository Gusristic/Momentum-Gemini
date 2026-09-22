import React, { useState } from 'react';
import { 
  Copy, 
  Check, 
  ExternalLink, 
  Edit3, 
  CheckCircle, 
  Shield, 
  AlertCircle, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  ArrowUpDown,
  Sparkles,
  Info,
  RefreshCw,
  Search,
  Zap,
  CheckCircle2,
  Trash2,
  Eraser,
  Eye,
  EyeOff,
  Plus,
  Calendar
} from 'lucide-react';
import { FundISIN, MomentumScoreResult } from '../types';
import { MomentumMode } from '../utils/momentumEngine';

interface IsinManagerProps {
  funds: FundISIN[];
  momentumScores: MomentumScoreResult[];
  momentumMode?: MomentumMode;
  activeFundId: string;
  onSelectActiveFund: (id: string) => void;
  onEditFund: (fund: FundISIN) => void;
  onSaveFund?: (fund: FundISIN) => void;
  onDeleteFund?: (fundId: string) => void;
  onClearBlankFund?: (fundId: string) => void;
  onToggleDisableFund?: (fundId: string) => void;
  onAddSlot?: () => void;
  onResetToDefaults: () => void;
  onSyncRealMarketData?: () => void;
  isSyncing?: boolean;
  lastUpdated?: string;
}

export const IsinManager: React.FC<IsinManagerProps> = ({
  funds,
  momentumScores,
  momentumMode = 'COMPOSITE_BLENDED',
  activeFundId,
  onSelectActiveFund,
  onEditFund,
  onSaveFund,
  onDeleteFund,
  onClearBlankFund,
  onToggleDisableFund,
  onAddSlot,
  onResetToDefaults,
  onSyncRealMarketData,
  isSyncing = false,
  lastUpdated = '2026-09-21',
}) => {
  const [copiedIsin, setCopiedIsin] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');

  // Quick ISIN state
  const [quickSlot, setQuickSlot] = useState<number>(1);
  const [quickIsin, setQuickIsin] = useState<string>('');
  const [isQuickLoading, setIsQuickLoading] = useState(false);
  const [quickStatus, setQuickStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });

  const handleQuickIsinLoad = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const isinClean = quickIsin.trim().toUpperCase();
    if (!isinClean) {
      setQuickStatus({ type: 'error', message: 'Introduce un código ISIN.' });
      return;
    }

    setIsQuickLoading(true);
    setQuickStatus({ type: null, message: '' });

    try {
      const res = await fetch(`/api/fund-lookup?query=${encodeURIComponent(isinClean)}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `No se pudo encontrar datos para ${isinClean}`);
      }

      const data = await res.json();
      const targetSlot = funds.find(f => f.slotNumber === quickSlot) || funds[0];

      const updatedFund: FundISIN = {
        ...targetSlot,
        isin: isinClean,
        isBlank: false,
        name: data.name || targetSlot.name,
        category: data.category || targetSlot.category,
        categoryLabel: data.categoryLabel || targetSlot.categoryLabel,
        isSafeHaven: data.isSafeHaven !== undefined ? data.isSafeHaven : targetSlot.isSafeHaven,
        currentNAV: data.currentNAV || targetSlot.currentNAV,
        currency: data.currency || targetSlot.currency,
        return1M: data.return1M !== undefined ? data.return1M : targetSlot.return1M,
        return3M: data.return3M !== undefined ? data.return3M : targetSlot.return3M,
        return6M: data.return6M !== undefined ? data.return6M : targetSlot.return6M,
        return12M: data.return12M !== undefined ? data.return12M : targetSlot.return12M,
        return3YAnnualized: data.return3YAnnualized !== undefined ? data.return3YAnnualized : targetSlot.return3YAnnualized,
        volatility1Y: data.volatility1Y !== undefined ? data.volatility1Y : targetSlot.volatility1Y,
        sharpeRatio: data.sharpeRatio !== undefined ? data.sharpeRatio : targetSlot.sharpeRatio,
        jensenAlpha: data.jensenAlpha !== undefined ? data.jensenAlpha : targetSlot.jensenAlpha,
        sortinoRatio: data.sortinoRatio !== undefined ? data.sortinoRatio : targetSlot.sortinoRatio,
        beta: data.beta !== undefined ? data.beta : targetSlot.beta,
        maxDrawdown: data.maxDrawdown !== undefined ? data.maxDrawdown : targetSlot.maxDrawdown,
        history: data.history && data.history.length > 0 ? data.history : targetSlot.history,
        morningstarUrl: data.morningstarUrl || targetSlot.morningstarUrl,
        ftUrl: data.ftUrl || targetSlot.ftUrl,
        investingUrl: data.investingUrl || targetSlot.investingUrl,
        lastUpdated: data.lastUpdated || new Date().toISOString().substring(0, 10),
      };

      if (onSaveFund) {
        onSaveFund(updatedFund);
      }

      setQuickStatus({
        type: 'success',
        message: `¡Slot #${quickSlot} asignado con éxito a "${data.name}" (${data.pointsCount || 60} meses de historial oficial leídos)!`
      });
      setQuickIsin('');
    } catch (err: any) {
      setQuickStatus({
        type: 'error',
        message: err.message || 'Error al buscar ISIN en fuentes oficiales.'
      });
    } finally {
      setIsQuickLoading(false);
    }
  };

  const copyToClipboard = (isin: string) => {
    navigator.clipboard.writeText(isin);
    setCopiedIsin(isin);
    setTimeout(() => setCopiedIsin(null), 2000);
  };

  const getScoreResult = (fundId: string) => {
    return momentumScores.find(s => s.fund.id === fundId);
  };

  const filteredFunds = funds.filter(fund => {
    const matchesSearch = 
      fund.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fund.isin.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fund.categoryLabel.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterCategory === 'ALL') return matchesSearch;
    if (filterCategory === 'SAFE') return matchesSearch && fund.isSafeHaven;
    if (filterCategory === 'EQUITY') return matchesSearch && !fund.isSafeHaven;
    if (filterCategory === 'DISABLED') return matchesSearch && fund.isDisabled;
    if (filterCategory === 'BLANK') return matchesSearch && (!fund.isin || fund.isin.trim() === '');
    return matchesSearch;
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5 shadow-lg">
      
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              Panel de Fondos UCITS (15 Slots ISIN)
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-slate-800 text-slate-300 border border-slate-700">
              {funds.length}/15 Slots Asignados
            </span>
            <span 
              id="isin-manager-online-update-badge"
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono bg-emerald-950/60 text-emerald-300 border border-emerald-500/40"
              title={`Fecha de última actualización efectiva de cotizaciones online: ${lastUpdated}`}
            >
              <Calendar className="w-3 h-3 text-emerald-400" />
              <span className="text-slate-400 text-[11px]">Actualización online:</span>
              <strong className="text-emerald-400 font-bold">{lastUpdated}</strong>
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Cada slot contiene el ISIN español comercializable, su valor liquidativo (VL), métricas de Morningstar / FT / Investing y su momentum retrospectivo.
          </p>
        </div>

        {/* Filters & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800 text-xs">
            <button
              onClick={() => setFilterCategory('ALL')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filterCategory === 'ALL' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Todos ({funds.length})
            </button>
            <button
              onClick={() => setFilterCategory('EQUITY')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filterCategory === 'EQUITY' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              RV Renta Variable
            </button>
            <button
              onClick={() => setFilterCategory('SAFE')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filterCategory === 'SAFE' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Refugios / Bonos
            </button>
            {funds.some(f => f.isDisabled) && (
              <button
                onClick={() => setFilterCategory('DISABLED')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  filterCategory === 'DISABLED' ? 'bg-amber-950/60 text-amber-300 font-medium border border-amber-800/50' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                En Gris ({funds.filter(f => f.isDisabled).length})
              </button>
            )}
            {funds.some(f => !f.isin || f.isin.trim() === '') && (
              <button
                onClick={() => setFilterCategory('BLANK')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  filterCategory === 'BLANK' ? 'bg-slate-800 text-slate-200 font-medium' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                En Blanco ({funds.filter(f => !f.isin || f.isin.trim() === '').length})
              </button>
            )}
          </div>

          {onSyncRealMarketData && (
            <button
              onClick={onSyncRealMarketData}
              disabled={isSyncing}
              className="text-xs font-semibold px-3 py-1 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 transition-colors flex items-center gap-1.5 disabled:opacity-50"
              title="Consultar cotizaciones oficiales en tiempo real desde Yahoo Finance y Morningstar"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Consultando...' : 'Sincronizar Datos Reales'}</span>
            </button>
          )}

          {onAddSlot && (
            <button
              onClick={onAddSlot}
              className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-indigo-500/40 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 transition-colors flex items-center gap-1"
              title="Añadir una nueva casilla o slot a la cartera"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Añadir Slot</span>
            </button>
          )}

          <button
            onClick={onResetToDefaults}
            className="text-xs text-slate-400 hover:text-slate-200 px-2.5 py-1 rounded-lg border border-slate-800 hover:bg-slate-800 transition-colors"
            title="Restablecer los 15 fondos modelo de España"
          >
            Restaurar 15 ISIN
          </button>
        </div>
      </div>

      {/* QUICK ISIN ONE-CLICK AUTO-LOAD BAR */}
      <div className="p-3.5 sm:p-4 rounded-xl bg-gradient-to-r from-emerald-950/30 via-slate-950 to-slate-900 border border-emerald-500/30 shadow-md">
        <form onSubmit={handleQuickIsinLoad} className="space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-emerald-500/20 text-emerald-400">
                <Zap className="w-3.5 h-3.5" />
              </span>
              <span className="text-xs font-bold text-white tracking-wide">
                Carga Rápida: Solo Introduce el ISIN
              </span>
            </div>
            <span className="text-[11px] text-slate-400">
              Lee cotización, 5 años de histórico y calcula ratios automáticamente sin rellenar formularios
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* Slot selector */}
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 shrink-0">
              <span className="text-[11px] font-mono text-slate-400">Destino:</span>
              <select
                value={quickSlot}
                onChange={e => setQuickSlot(parseInt(e.target.value))}
                className="bg-transparent text-emerald-400 font-mono font-bold text-xs focus:outline-none cursor-pointer"
              >
                {funds.map(f => (
                  <option key={f.slotNumber} value={f.slotNumber} className="bg-slate-900 text-white">
                    Slot #{f.slotNumber}: {f.isin} ({f.name.substring(0, 20)}...)
                  </option>
                ))}
              </select>
            </div>

            {/* ISIN Input */}
            <div className="relative flex-1">
              <input
                type="text"
                value={quickIsin}
                onChange={e => setQuickIsin(e.target.value.toUpperCase().replace(/\s/g, ''))}
                placeholder="Pega aquí el ISIN (ej: IE00B03HD191, LU0274208692, FR0007054316...)"
                className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-white font-mono text-xs font-semibold placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isQuickLoading || !quickIsin.trim()}
              className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isQuickLoading ? 'animate-spin' : ''}`} />
              <span>{isQuickLoading ? 'Leyendo ISIN...' : '⚡ Leer ISIN y Cargar'}</span>
            </button>
          </div>

          {/* Preset Chips for 1-Click Testing */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
            <span className="text-slate-400 font-mono text-[10px]">ISINs Populares para probar:</span>
            {[
              { label: 'S&P 500 (IE0032126645)', isin: 'IE0032126645' },
              { label: 'MSCI World (IE00B03HD191)', isin: 'IE00B03HD191' },
              { label: 'Small Cap (IE00B42W3S00)', isin: 'IE00B42W3S00' },
              { label: 'Emergentes (IE0031442068)', isin: 'IE0031442068' },
              { label: 'Japón (IE0007201042)', isin: 'IE0007201042' },
              { label: 'Monetario €STR (FR0007054316)', isin: 'FR0007054316' },
              { label: 'Bonos Global (IE00B18GC888)', isin: 'IE00B18GC888' },
            ].map(chip => (
              <button
                key={chip.isin}
                type="button"
                onClick={() => setQuickIsin(chip.isin)}
                className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-emerald-400 border border-slate-800 transition-colors font-mono text-[10px]"
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Quick status banner */}
          {quickStatus.message && (
            <div className={`text-[11px] p-2 rounded-lg font-mono flex items-center gap-2 ${
              quickStatus.type === 'success' 
                ? 'bg-emerald-950/50 text-emerald-300 border border-emerald-500/30' 
                : 'bg-rose-950/50 text-rose-300 border border-rose-500/30'
            }`}>
              {quickStatus.type === 'success' ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              )}
              <span>{quickStatus.message}</span>
            </div>
          )}
        </form>
      </div>

      {/* Table of the 15 Slots */}
      <div className="overflow-x-auto rounded-xl border border-slate-800/80 bg-slate-950/60">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px] bg-slate-950/90 uppercase tracking-wider">
              <th className="py-3 px-3.5">Slot / ISIN</th>
              <th className="py-3 px-3.5">Fondo & Categoría</th>
              <th className="py-3 px-3.5 text-right">VL (€)</th>
              <th className="py-3 px-3.5 text-center">
                <div className="flex flex-col items-center">
                  <span>
                    {momentumMode === 'MOMENTUM_12_MINUS_1'
                      ? 'Score 12m-1m (Inst.)'
                      : momentumMode === 'PROGRESSIVE_STEPPED'
                      ? 'Score Progresivo'
                      : momentumMode === 'COMPOSITE_BLENDED'
                      ? 'Score Compuesto'
                      : 'Score 12M Puro'}
                  </span>
                  <span className="text-[9px] text-slate-500 font-normal normal-case">
                    {momentumMode === 'MOMENTUM_12_MINUS_1'
                      ? 'MSCI/AQR · 12M sin mes t (ignora ruido)'
                      : momentumMode === 'PROGRESSIVE_STEPPED'
                      ? '40% 1M · 30% 3M · 20% 6M · 10% 12M'
                      : momentumMode === 'COMPOSITE_BLENDED'
                      ? '50% 12M · 30% 6M · 20% 3M'
                      : 'Ventana 100% Gary Antonacci'}
                  </span>
                </div>
              </th>
              <th className="py-3 px-3.5 text-center">Sharpe (1Y)</th>
              <th className="py-3 px-3.5 text-center">Alfa (α)</th>
              <th className="py-3 px-3.5 text-center">Mom. Absoluto</th>
              <th className="py-3 px-3.5 text-center">Fuentes</th>
              <th className="py-3 px-3.5 text-right">Cartera (€)</th>
              <th className="py-3 px-3.5 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {filteredFunds.map((fund, index) => {
              const scoreResult = getScoreResult(fund.id);
              const isCurrentHeld = fund.id === activeFundId;
              const isSlotDisabled = !!fund.isDisabled;
              const isSlotBlank = !fund.isin || fund.isin.trim() === '';
              const isRankOne = scoreResult?.relativeRank === 1 && !fund.isSafeHaven && !isSlotDisabled && !isSlotBlank;
              const capitalValue = (fund.sharesHeld * fund.currentNAV).toFixed(2);

              return (
                <tr 
                  key={`${fund.id}-${fund.slotNumber || index}`}
                  className={`transition-colors ${
                    isSlotDisabled
                      ? 'bg-slate-950/80 opacity-60 text-slate-500 border-l-4 border-l-slate-700'
                      : isSlotBlank
                      ? 'bg-slate-950/40 text-slate-500 border-dashed border-slate-800'
                      : isCurrentHeld 
                      ? 'bg-emerald-950/20 border-l-4 border-l-emerald-500 hover:bg-slate-900/80' 
                      : isRankOne 
                      ? 'bg-teal-950/10 hover:bg-slate-900/80' 
                      : 'hover:bg-slate-900/80'
                  }`}
                >
                  {/* Slot & ISIN */}
                  <td className="py-3 px-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-md flex items-center justify-center font-mono font-bold text-[10px] ${
                        isSlotDisabled 
                          ? 'bg-slate-800 text-slate-500' 
                          : isSlotBlank
                          ? 'bg-slate-900 text-slate-600 border border-dashed border-slate-700'
                          : 'bg-slate-800 text-slate-300'
                      }`}>
                        #{fund.slotNumber}
                      </span>
                      <div>
                        <div className="flex items-center gap-1.5 font-mono font-bold">
                          {isSlotBlank ? (
                            <span className="text-slate-500 italic text-xs font-normal">(Slot Vacío)</span>
                          ) : (
                            <span className={isSlotDisabled ? 'text-slate-500 line-through' : 'text-slate-200'}>
                              {fund.isin}
                            </span>
                          )}
                          {!isSlotBlank && (
                            <button
                              onClick={() => copyToClipboard(fund.isin)}
                              className="text-slate-500 hover:text-emerald-400 transition-colors p-0.5"
                              title="Copiar código ISIN"
                            >
                              {copiedIsin === fund.isin ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          {isCurrentHeld && (
                            <span className="inline-block text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                              Fondo en Cartera
                            </span>
                          )}
                          {isSlotDisabled && (
                            <span className="inline-block text-[9px] font-semibold text-amber-400/90 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                              En Gris (Excluido)
                            </span>
                          )}
                          {isSlotBlank && (
                            <span className="inline-block text-[9px] font-semibold text-slate-400 bg-slate-800/60 px-1.5 py-0.2 rounded border border-slate-700">
                              En Blanco
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Fund Name & Category */}
                  <td className="py-3 px-3.5 max-w-[320px] 2xl:max-w-[450px]">
                    <div className={`font-semibold truncate ${isSlotDisabled ? 'text-slate-500' : 'text-slate-100'}`} title={fund.name}>
                      {isSlotBlank ? (
                        <span className="text-slate-500 font-normal italic">Sin asignar • Clic en Editar o Cargar ISIN</span>
                      ) : (
                        fund.name || `Fondo ISIN ${fund.isin}`
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        isSlotDisabled
                          ? 'bg-slate-800 text-slate-500'
                          : fund.isSafeHaven 
                          ? 'bg-sky-500/10 text-sky-300 border border-sky-500/20' 
                          : 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20'
                      }`}>
                        {fund.categoryLabel}
                      </span>
                      {fund.isSafeHaven && !isSlotDisabled && (
                        <span className="text-[10px] text-sky-400 font-mono flex items-center gap-0.5">
                          <Shield className="w-2.5 h-2.5" /> Refugio
                        </span>
                      )}
                    </div>
                  </td>

                  {/* NAV (€) */}
                  <td className="py-3 px-3.5 text-right font-mono font-semibold text-slate-200 whitespace-nowrap">
                    {isSlotBlank ? '—' : `${fund.currentNAV.toFixed(2)} €`}
                  </td>

                  {/* Momentum Score (Dynamic based on mode) */}
                  <td className="py-3 px-3.5 text-center whitespace-nowrap">
                    {isSlotBlank ? (
                      <span className="text-slate-600 text-xs">—</span>
                    ) : (
                      <div className="inline-flex flex-col items-center">
                        {(() => {
                          const scoreVal = scoreResult ? scoreResult.relativeMomentumScore : fund.return12M;
                          return (
                            <>
                              <span className={`font-mono font-bold text-sm ${
                                scoreVal > 0 ? 'text-emerald-400' : 'text-rose-400'
                              }`}>
                                {scoreVal > 0 ? `+${scoreVal}%` : `${scoreVal}%`}
                              </span>
                              {momentumMode === 'COMPOSITE_BLENDED' && (
                                <span className="text-[9px] font-mono text-slate-500">
                                  (12M: {fund.return12M}%)
                                </span>
                              )}
                              {momentumMode === 'PROGRESSIVE_STEPPED' && (
                                <span className="text-[9px] font-mono text-purple-400/80">
                                  (1M: {fund.return1M}% · 3M: {fund.return3M}%)
                                </span>
                              )}
                            </>
                          );
                        })()}
                        {scoreResult && !fund.isSafeHaven && scoreResult.relativeRank !== 999 && (
                          <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold mt-0.5 ${
                            scoreResult.relativeRank === 1 
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' 
                              : 'text-slate-400'
                          }`}>
                            Rank #{scoreResult.relativeRank}
                          </span>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Sharpe Ratio */}
                  <td className="py-3 px-3.5 text-center font-mono whitespace-nowrap">
                    {isSlotBlank || isSlotDisabled ? (
                      <span className="text-slate-600 text-xs">—</span>
                    ) : (
                      <span className={`px-2 py-0.5 rounded font-semibold text-xs ${
                        fund.sharpeRatio >= 1.5 
                          ? 'bg-emerald-500/20 text-emerald-300' 
                          : fund.sharpeRatio >= 1.0 
                          ? 'bg-teal-500/20 text-teal-300' 
                          : fund.sharpeRatio >= 0.5 
                          ? 'bg-slate-800 text-slate-300' 
                          : 'bg-rose-500/10 text-rose-400'
                      }`}>
                        {fund.sharpeRatio.toFixed(2)}
                      </span>
                    )}
                  </td>

                  {/* Jensen's Alpha */}
                  <td className="py-3 px-3.5 text-center font-mono whitespace-nowrap">
                    {isSlotBlank || isSlotDisabled ? (
                      <span className="text-slate-600 text-xs">—</span>
                    ) : (
                      <span className={`font-semibold ${
                        fund.jensenAlpha > 0 ? 'text-emerald-400' : fund.jensenAlpha < 0 ? 'text-rose-400' : 'text-slate-400'
                      }`}>
                        {fund.jensenAlpha > 0 ? `+${fund.jensenAlpha.toFixed(2)}%` : `${fund.jensenAlpha.toFixed(2)}%`}
                      </span>
                    )}
                  </td>

                  {/* Absolute Momentum Check */}
                  <td className="py-3 px-3.5 text-center whitespace-nowrap">
                    {isSlotDisabled ? (
                      <span className="text-slate-500 text-[11px] font-mono">En Gris</span>
                    ) : isSlotBlank ? (
                      <span className="text-slate-600 text-xs font-mono">—</span>
                    ) : scoreResult?.absoluteMomentumPositive ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        <CheckCircle className="w-3 h-3" />
                        Apto (&gt; €STR)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                        <AlertCircle className="w-3 h-3" />
                        Bajo Hurdle
                      </span>
                    )}
                  </td>

                  {/* External Financial Sources */}
                  <td className="py-3 px-3.5 text-center whitespace-nowrap">
                    {isSlotBlank ? (
                      <span className="text-slate-600 text-xs font-mono">—</span>
                    ) : (
                      <div className="flex items-center justify-center gap-1.5">
                        <a
                          href={fund.morningstarUrl}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-rose-950/40 text-rose-300 hover:bg-rose-900/60 border border-rose-800/40 transition-colors"
                          title="Ver ficha en Morningstar España"
                        >
                          MS
                        </a>
                        <a
                          href={fund.ftUrl}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-950/40 text-amber-300 hover:bg-amber-900/60 border border-amber-800/40 transition-colors"
                          title="Ver tearsheet en Financial Times"
                        >
                          FT
                        </a>
                        <a
                          href={fund.investingUrl}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-blue-950/40 text-blue-300 hover:bg-blue-900/60 border border-blue-800/40 transition-colors"
                          title="Ver cotización en Investing.com"
                        >
                          INV
                        </a>
                      </div>
                    )}
                  </td>

                  {/* Portfolio Capital */}
                  <td className="py-3 px-3.5 text-right font-mono whitespace-nowrap">
                    {fund.sharesHeld > 0 && !isSlotBlank ? (
                      <div>
                        <div className="font-bold text-slate-200">{Number(capitalValue).toLocaleString('es-ES')} €</div>
                        <div className="text-[10px] text-slate-400">{fund.sharesHeld} part.</div>
                      </div>
                    ) : (
                      <span className="text-slate-600 font-mono">0,00 €</span>
                    )}
                  </td>

                  {/* Actions: Direct buttons for Edit, Toggle Disable (En Gris), Leave Blank, Delete */}
                  <td className="py-3 px-3.5 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1">
                      {/* Toggle Disabled (En gris / Excluir del motor) */}
                      {onToggleDisableFund && (
                        <button
                          onClick={() => onToggleDisableFund(fund.id)}
                          className={`p-1.5 rounded-md transition-colors ${
                            isSlotDisabled
                              ? 'text-amber-400 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40'
                              : 'text-slate-400 hover:text-amber-300 hover:bg-slate-800'
                          }`}
                          title={isSlotDisabled ? 'Activar fondo (quitar de gris)' : 'Dejar en gris (fondo visible pero excluido del algoritmo)'}
                        >
                          {isSlotDisabled ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      )}

                      {/* Dejar en blanco */}
                      {onClearBlankFund && !isSlotBlank && (
                        <button
                          onClick={() => onClearBlankFund(fund.id)}
                          className="p-1.5 rounded-md text-slate-400 hover:text-sky-300 hover:bg-slate-800 transition-colors"
                          title="Dejar en blanco (vaciar slot sin eliminar la fila)"
                        >
                          <Eraser className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Edit */}
                      <button
                        onClick={() => onEditFund(fund)}
                        className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        title="Editar parámetros de este slot ISIN"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      {/* Asignar como activo */}
                      {!isCurrentHeld && !isSlotBlank && !isSlotDisabled && (
                        <button
                          onClick={() => onSelectActiveFund(fund.id)}
                          className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                          title="Fijar como fondo actual en cartera"
                        >
                          Asignar
                        </button>
                      )}

                      {/* Borrar Slot */}
                      {onDeleteFund && (
                        <button
                          onClick={() => onDeleteFund(fund.id)}
                          className="p-1.5 rounded-md text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Borrar este slot definitivamente"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>

                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer Info note */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-slate-400 gap-2 pt-1 border-t border-slate-800/60">
        <div className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>
            Los fondos mostrados son comercializables en España (MyInvestor, Renta 4, Openbank) con cuenta de valores española y traspaso tributario al 0%.
          </span>
        </div>
        <span className="font-mono text-slate-500 text-[11px]">
          Filtro Momentum: 12M lookback + Hurdle €STR Cash
        </span>
      </div>

    </div>
  );
};
