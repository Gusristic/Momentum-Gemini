import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  Layers, 
  Search, 
  Filter, 
  ShieldAlert, 
  TrendingUp, 
  ArrowRightLeft, 
  CheckCircle2, 
  Clock, 
  Download,
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { FundISIN } from '../types';
import { generate5YearAllocationsHistory, AllocationEvent, IsinSummaryStats } from '../utils/historyAuditEngine';

interface Props {
  funds: FundISIN[];
  hysteresisBuffer?: number;
}

export const IsinHistoryAllocationsTab: React.FC<Props> = ({ funds, hysteresisBuffer = 0.5 }) => {
  const [selectedModel, setSelectedModel] = useState<
    'ALL' | 'classic12M' | 'momentum12Minus1' | 'equilibrado' | 'progresivo'
  >('ALL');

  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [viewMode, setViewMode] = useState<'COMPACT_TABLE' | 'ISIN_SUMMARY'>('COMPACT_TABLE');
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  const { timeline, isinSummaries, modelPerformances } = useMemo(() => {
    return generate5YearAllocationsHistory(funds, hysteresisBuffer);
  }, [funds, hysteresisBuffer]);

  // Model metadata map
  const modelLabels: Record<string, { label: string; badge: string; color: string; desc: string }> = {
    classic12M: { 
      label: '12M Puro', 
      badge: 'Antonacci 12M', 
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      desc: '100% Retorno a 12 meses'
    },
    momentum12Minus1: { 
      label: '12m - 1m', 
      badge: 'MSCI / AQR', 
      color: 'text-teal-400 bg-teal-500/10 border-teal-500/30',
      desc: 'Retorno 12M sin mes t-1'
    },
    equilibrado: { 
      label: 'Equilibrado', 
      badge: 'Composite 12/6/3', 
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
      desc: '50% 12M + 30% 6M + 20% 3M'
    },
    progresivo: { 
      label: 'Progresivo', 
      badge: 'Inercia 1/3/6/12', 
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
      desc: '40% 1M + 30% 3M + 20% 6M + 10% 12M'
    }
  };

  // Filter timeline based on year and search term
  const filteredTimeline = useMemo(() => {
    return timeline.filter(event => {
      // Year filter
      if (selectedYear !== 'ALL' && event.year.toString() !== selectedYear) {
        return false;
      }

      // Search term filter (ISIN, fund name, date, cycle)
      if (searchTerm.trim() !== '') {
        const query = searchTerm.toLowerCase();
        const matchesDate = event.dateLabel.toLowerCase().includes(query) || event.dateStr.includes(query);
        const matchesCycle = event.cycleName.toLowerCase().includes(query);
        
        const matchesAllocations = Object.values(event.allocations).some((alloc: any) => 
          alloc.isin.toLowerCase().includes(query) || 
          alloc.fundName.toLowerCase().includes(query)
        );

        if (!matchesDate && !matchesCycle && !matchesAllocations) {
          return false;
        }
      }

      return true;
    });
  }, [timeline, selectedYear, searchTerm]);

  // Export filtered rows to CSV
  const handleExportCSV = () => {
    const headers = ['Fecha', 'Trimestre', 'Régimen', 'Ciclo', 'Modelo', 'ISIN Asignado', 'Nombre Fondo', 'Tipo'];
    const rows: string[][] = [];

    filteredTimeline.forEach(event => {
      const keys = (Object.keys(event.allocations) as (keyof AllocationEvent['allocations'])[])
        .filter(k => selectedModel === 'ALL' || selectedModel === k);

      keys.forEach(k => {
        const alloc = event.allocations[k];
        rows.push([
          event.dateLabel,
          event.quarter,
          event.marketRegime,
          `"${event.cycleName.replace(/"/g, '""')}"`,
          modelLabels[k]?.label || k,
          alloc.isin,
          `"${alloc.fundName.replace(/"/g, '""')}"`,
          alloc.assetType
        ]);
      });
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `auditoria_asignaciones_dual_momentum_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      
      {/* HEADER COMPACTO CON CONTROLES INTEGRADOS */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-lg space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Auditoría Histórica de Asignaciones (2021 - 2026)
                </h2>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {filteredTimeline.length} meses
                </span>
              </div>
              <p className="text-xs text-slate-400">
                1 fila compacta por fecha con el ISIN asignado en cada modelo de Dual Momentum.
              </p>
            </div>
          </div>

          {/* View switcher & CSV export */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs shrink-0">
              <button
                onClick={() => setViewMode('COMPACT_TABLE')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                  viewMode === 'COMPACT_TABLE'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Vista compacta de 1 fila por fecha"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>1 Fila / Fecha</span>
              </button>
              <button
                onClick={() => setViewMode('ISIN_SUMMARY')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                  viewMode === 'ISIN_SUMMARY'
                    ? 'bg-slate-800 text-cyan-300 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Resumen consolidado por ISIN"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Resumen ISIN ({isinSummaries.length})</span>
              </button>
            </div>

            <button
              onClick={handleExportCSV}
              className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors"
              title="Descargar historial en CSV"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* FILTERS TOOLBAR */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-2 border-t border-slate-800/70 text-xs">
          {/* Year selector */}
          <div className="sm:col-span-3 flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-slate-400 text-[11px]">Año:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-transparent text-white font-medium focus:outline-none w-full cursor-pointer text-xs"
            >
              <option value="ALL" className="bg-slate-900 text-white">Todos (2021-2026)</option>
              <option value="2026" className="bg-slate-900 text-white">2026 (Actual)</option>
              <option value="2025" className="bg-slate-900 text-white">2025</option>
              <option value="2024" className="bg-slate-900 text-white">2024</option>
              <option value="2023" className="bg-slate-900 text-white">2023</option>
              <option value="2022" className="bg-slate-900 text-white">2022 (Crisis/Refugio)</option>
              <option value="2021" className="bg-slate-900 text-white">2021</option>
            </select>
          </div>

          {/* Model selector */}
          <div className="sm:col-span-4 flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800">
            <Layers className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="text-slate-400 text-[11px]">Modelo:</span>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value as any)}
              className="bg-transparent text-white font-medium focus:outline-none w-full cursor-pointer text-xs"
            >
              <option value="ALL" className="bg-slate-900 text-white">Todos los 4 Modelos</option>
              <option value="classic12M" className="bg-slate-900 text-white">12M Puro</option>
              <option value="momentum12Minus1" className="bg-slate-900 text-white">12m - 1m</option>
              <option value="equilibrado" className="bg-slate-900 text-white">Equilibrado</option>
              <option value="progresivo" className="bg-slate-900 text-white">Progresivo</option>
            </select>
          </div>

          {/* Quick search */}
          <div className="sm:col-span-5 relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por ISIN, fondo o mes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
            />
          </div>
        </div>
      </div>

      {/* 4 MODEL PERFORMANCE CARDS (DYNAMIC BACKTEST SUMMARY) */}
      {modelPerformances && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {[
            { key: 'classic12M', label: '12M Puro (Antonacci)', badge: 'Canónico', color: 'emerald', border: 'border-emerald-500/30', bg: 'bg-emerald-950/20' },
            { key: 'momentum12Minus1', label: '12m - 1m', badge: 'MSCI / AQR', color: 'teal', border: 'border-teal-500/30', bg: 'bg-teal-950/20' },
            { key: 'equilibrado', label: 'Equilibrado', badge: '12M/6M/3M', color: 'amber', border: 'border-amber-500/30', bg: 'bg-amber-950/20' },
            { key: 'progresivo', label: 'Progresivo', badge: '1M/3M/6M/12M', color: 'purple', border: 'border-purple-500/30', bg: 'bg-purple-950/20' },
          ].map(m => {
            const perf = modelPerformances[m.key];
            if (!perf) return null;
            const isSelected = selectedModel === 'ALL' || selectedModel === m.key;
            return (
              <div 
                key={m.key} 
                onClick={() => setSelectedModel(m.key as any)}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${m.bg} ${
                  isSelected ? m.border : 'border-slate-800 opacity-60'
                } hover:opacity-100 shadow-sm`}
              >
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <span className="text-xs font-bold text-white tracking-tight truncate">{m.label}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-900/80 text-slate-300 border border-slate-700">
                    {m.badge}
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <div>
                    <div className="text-base sm:text-lg font-black font-mono text-emerald-400">
                      +{perf.totalReturnPct}%
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      CAGR: <span className="text-slate-200 font-bold">+{perf.cagrPct}%/año</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-mono font-bold text-rose-400">
                      {perf.maxDrawdownPct}%
                    </div>
                    <div className="text-[9px] text-slate-500 font-mono">Max DD Histórico</div>
                  </div>
                </div>
                <div className="mt-2 pt-1.5 border-t border-slate-800/60 flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span>En RV: <strong className="text-emerald-400">{perf.monthsInEquityPct}%</strong></span>
                  <span>En Refugio: <strong className="text-slate-300">{perf.monthsInCashPct}%</strong></span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VISTA 1: TABLA ULTRA COMPACTA (1 FILA POR FECHA) */}
      {viewMode === 'COMPACT_TABLE' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
                  <th className="py-2.5 px-3 w-36">Fecha / Régimen</th>
                  
                  {/* Si está seleccionado ALL, mostramos las 4 columnas de los modelos */}
                  {selectedModel === 'ALL' ? (
                    <>
                      <th className="py-2.5 px-3">
                        <span className="text-emerald-400">12M Puro</span>
                        <span className="block text-[9px] text-slate-500 font-normal normal-case">Antonacci 12M</span>
                      </th>
                      <th className="py-2.5 px-3">
                        <span className="text-teal-400">12m - 1m</span>
                        <span className="block text-[9px] text-slate-500 font-normal normal-case">MSCI / AQR</span>
                      </th>
                      <th className="py-2.5 px-3">
                        <span className="text-amber-400">Equilibrado</span>
                        <span className="block text-[9px] text-slate-500 font-normal normal-case">12M / 6M / 3M</span>
                      </th>
                      <th className="py-2.5 px-3">
                        <span className="text-purple-400">Progresivo</span>
                        <span className="block text-[9px] text-slate-500 font-normal normal-case">1M / 3M / 6M / 12M</span>
                      </th>
                    </>
                  ) : (
                    /* Si seleccionó 1 modelo específico, expandimos detalles en la misma fila */
                    <>
                      <th className="py-2.5 px-3">
                        <span className="text-cyan-400">{modelLabels[selectedModel]?.label}</span>
                        <span className="block text-[9px] text-slate-500 font-normal normal-case">{modelLabels[selectedModel]?.badge}</span>
                      </th>
                      <th className="py-2.5 px-3">Fondo Asignado</th>
                      <th className="py-2.5 px-3">Tipo Activo</th>
                      <th className="py-2.5 px-3">Justificación Cuantitativa</th>
                    </>
                  )}
                  <th className="py-2.5 px-2 w-10 text-center">Info</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800/60">
                {filteredTimeline.map((event) => {
                  const isBear = event.marketRegime === 'DEFENSIVE_BEAR';
                  const isTransition = event.marketRegime === 'TRANSITION';
                  const isExpanded = expandedRowId === event.id;

                  return (
                    <React.Fragment key={event.id}>
                      {/* FILA COMPACTA PRINCIPAL */}
                      <tr 
                        className={`hover:bg-slate-800/50 transition-colors group ${
                          isBear 
                            ? 'bg-rose-950/10' 
                            : isTransition 
                            ? 'bg-amber-950/10' 
                            : ''
                        }`}
                      >
                        {/* Columna Fecha & Régimen */}
                        <td className="py-2 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-white text-xs">
                              {event.dateLabel}
                            </span>
                            {isBear && (
                              <span className="p-0.5 rounded bg-rose-500/20 text-rose-400 text-[10px]" title="Mercado Bajista: Refugio activo">
                                <ShieldAlert className="w-3 h-3" />
                              </span>
                            )}
                            {isTransition && (
                              <span className="p-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px]" title="Fase de Transición / Rotación">
                                <ArrowRightLeft className="w-3 h-3" />
                              </span>
                            )}
                            {!isBear && !isTransition && (
                              <span className="p-0.5 rounded bg-emerald-500/15 text-emerald-400 text-[10px]" title="Mercado Alcista">
                                <TrendingUp className="w-3 h-3" />
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 block font-mono">
                            {event.quarter}
                          </span>
                        </td>

                        {/* RENDER CUANDO SE MUESTRAN LOS 4 MODELOS */}
                        {selectedModel === 'ALL' ? (
                          <>
                            {/* 1. 12M Puro */}
                            <td className="py-2 px-3">
                              <div className="flex flex-col">
                                <div className="flex items-center gap-1">
                                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                    event.allocations.classic12M.assetType === 'CASH' 
                                      ? 'bg-cyan-400' 
                                      : event.allocations.classic12M.assetType === 'BONDS' 
                                      ? 'bg-amber-400' 
                                      : 'bg-emerald-400'
                                  }`} />
                                  <span className="font-mono font-bold text-cyan-300 text-xs">
                                    {event.allocations.classic12M.isin}
                                  </span>
                                </div>
                                <span className="text-[11px] text-slate-300 truncate max-w-[280px] 2xl:max-w-[420px]" title={event.allocations.classic12M.fundName}>
                                  {event.allocations.classic12M.fundName}
                                </span>
                              </div>
                            </td>

                            {/* 2. 12m - 1m */}
                            <td className="py-2 px-3">
                              <div className="flex flex-col">
                                <div className="flex items-center gap-1">
                                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                    event.allocations.momentum12Minus1.assetType === 'CASH' 
                                      ? 'bg-cyan-400' 
                                      : event.allocations.momentum12Minus1.assetType === 'BONDS' 
                                      ? 'bg-amber-400' 
                                      : 'bg-emerald-400'
                                  }`} />
                                  <span className="font-mono font-bold text-cyan-300 text-xs">
                                    {event.allocations.momentum12Minus1.isin}
                                  </span>
                                </div>
                                <span className="text-[11px] text-slate-300 truncate max-w-[280px] 2xl:max-w-[420px]" title={event.allocations.momentum12Minus1.fundName}>
                                  {event.allocations.momentum12Minus1.fundName}
                                </span>
                              </div>
                            </td>

                            {/* 3. Equilibrado */}
                            <td className="py-2 px-3">
                              <div className="flex flex-col">
                                <div className="flex items-center gap-1">
                                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                    event.allocations.equilibrado.assetType === 'CASH' 
                                      ? 'bg-cyan-400' 
                                      : event.allocations.equilibrado.assetType === 'BONDS' 
                                      ? 'bg-amber-400' 
                                      : 'bg-emerald-400'
                                  }`} />
                                  <span className="font-mono font-bold text-cyan-300 text-xs">
                                    {event.allocations.equilibrado.isin}
                                  </span>
                                </div>
                                <span className="text-[11px] text-slate-300 truncate max-w-[280px] 2xl:max-w-[420px]" title={event.allocations.equilibrado.fundName}>
                                  {event.allocations.equilibrado.fundName}
                                </span>
                              </div>
                            </td>

                            {/* 4. Progresivo */}
                            <td className="py-2 px-3">
                              <div className="flex flex-col">
                                <div className="flex items-center gap-1">
                                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                    event.allocations.progresivo.assetType === 'CASH' 
                                      ? 'bg-cyan-400' 
                                      : event.allocations.progresivo.assetType === 'BONDS' 
                                      ? 'bg-amber-400' 
                                      : 'bg-emerald-400'
                                  }`} />
                                  <span className="font-mono font-bold text-cyan-300 text-xs">
                                    {event.allocations.progresivo.isin}
                                  </span>
                                </div>
                                <span className="text-[11px] text-slate-300 truncate max-w-[280px] 2xl:max-w-[420px]" title={event.allocations.progresivo.fundName}>
                                  {event.allocations.progresivo.fundName}
                                </span>
                              </div>
                            </td>
                          </>
                        ) : (
                          /* RENDER CUANDO SE FILTRA 1 MODELO ESPECÍFICO */
                          <>
                            <td className="py-2 px-3 whitespace-nowrap">
                              <span className="font-mono font-bold text-cyan-300 text-xs bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                                {event.allocations[selectedModel].isin}
                              </span>
                            </td>
                            <td className="py-2 px-3">
                              <span className="text-xs text-white font-medium truncate block max-w-xs">
                                {event.allocations[selectedModel].fundName}
                              </span>
                            </td>
                            <td className="py-2 px-3 whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                                event.allocations[selectedModel].assetType === 'CASH'
                                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                                  : event.allocations[selectedModel].assetType === 'BONDS'
                                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                  : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                              }`}>
                                {event.allocations[selectedModel].assetType === 'CASH' 
                                  ? 'MONETARIO' 
                                  : event.allocations[selectedModel].assetType === 'BONDS'
                                  ? 'BONOS'
                                  : 'RENTA VARIABLE'}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-[11px] text-slate-400">
                              <span className="line-clamp-1">{event.allocations[selectedModel].rationale}</span>
                            </td>
                          </>
                        )}

                        {/* Botón desplegar información detallada del mes */}
                        <td className="py-2 px-2 text-center">
                          <button
                            onClick={() => setExpandedRowId(isExpanded ? null : event.id)}
                            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            title="Ver contexto macro y detalles de los 4 modelos"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5 text-cyan-400" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </td>
                      </tr>

                      {/* SUB-FILA DESPLEGABLE OPCIONAL CON DETALLES ADICIONALES */}
                      {isExpanded && (
                        <tr className="bg-slate-950/80 border-b border-slate-800">
                          <td colSpan={selectedModel === 'ALL' ? 6 : 6} className="p-3 text-xs">
                            <div className="space-y-2 bg-slate-900/90 p-3 rounded-lg border border-slate-800">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-white">{event.dateLabel}</span>
                                  <span className="text-slate-400">•</span>
                                  <span className="text-cyan-300 font-medium">{event.cycleName}</span>
                                </div>
                                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                                  isBear ? 'border-rose-500/40 text-rose-300 bg-rose-500/10' : 'border-slate-700 text-slate-300'
                                }`}>
                                  Régimen: {event.marketRegime}
                                </span>
                              </div>

                              {/* Racionales de cada modelo */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-[11px]">
                                {(Object.keys(event.allocations) as (keyof AllocationEvent['allocations'])[]).map(k => {
                                  const alloc = event.allocations[k];
                                  const meta = modelLabels[k];
                                  return (
                                    <div key={k} className="p-2 rounded bg-slate-950 border border-slate-800/80 space-y-1">
                                      <div className="flex items-center justify-between">
                                        <span className="font-semibold text-slate-200">{meta.label}</span>
                                        <span className="font-mono text-cyan-300 font-bold">{alloc.isin}</span>
                                      </div>
                                      <div className="text-slate-400 line-clamp-2">{alloc.rationale}</div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredTimeline.length === 0 && (
            <div className="p-8 text-center text-slate-400">
              No se encontraron registros de asignación con los filtros aplicados.
            </div>
          )}
        </div>
      )}

      {/* VISTA 2: RESUMEN POR ISIN (CONSOLIDADO) */}
      {viewMode === 'ISIN_SUMMARY' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Fondos configurados en tus slots y su historial de asignación (últimos 5 años):</span>
            <span className="font-mono text-cyan-300">{isinSummaries.length} fondos</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 text-[11px] uppercase font-semibold">
                  <th className="py-2.5 px-3">Slot</th>
                  <th className="py-2.5 px-3">Código ISIN</th>
                  <th className="py-2.5 px-3">Nombre del Fondo</th>
                  <th className="py-2.5 px-3 text-center">Meses Asignado</th>
                  <th className="py-2.5 px-3">Primera Asignación</th>
                  <th className="py-2.5 px-3">Última Asignación</th>
                  <th className="py-2.5 px-3">Modelos Asignados</th>
                  <th className="py-2.5 px-3 text-right">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {isinSummaries.map((item, index) => (
                  <tr key={`${item.isin || 'blank'}-${item.slotNumber || index}`} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2 px-3 font-mono text-slate-400">
                      #{item.slotNumber}
                    </td>
                    <td className="py-2 px-3 font-mono font-bold text-cyan-300 whitespace-nowrap">
                      {item.isin}
                    </td>
                    <td className="py-2 px-3 font-medium text-white max-w-xs truncate">
                      {item.name}
                    </td>
                    <td className="py-2 px-3 text-center font-mono font-bold text-white">
                      {item.monthsAssignedTotal > 0 ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          {item.monthsAssignedTotal} meses
                        </span>
                      ) : (
                        <span className="text-slate-500">0</span>
                      )}
                    </td>
                    <td className="py-2 px-3 font-mono text-slate-300 whitespace-nowrap">
                      {item.firstAssignmentDate || '—'}
                    </td>
                    <td className="py-2 px-3 font-mono text-slate-300 whitespace-nowrap">
                      {item.lastAssignmentDate || '—'}
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex flex-wrap gap-1">
                        {item.assignedInModels.map((m, i) => (
                          <span key={i} className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                            {m}
                          </span>
                        ))}
                        {item.assignedInModels.length === 0 && (
                          <span className="text-slate-500 text-[10px] italic">Reserva</span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-right whitespace-nowrap">
                      {item.activeNow ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" />
                          Activo Hoy
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-slate-500">
                          Inactivo
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* FOOTER LEYENDA TÉCNICA */}
      <div className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-xl text-xs text-slate-400 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="font-semibold text-slate-300">Tipo de Activo:</span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" /> Renta Variable (Acciones)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400" /> Liquidez Monetaria (€STR)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400" /> Bonos Soberanos
          </span>
        </div>
        <div className="text-[11px] text-slate-500">
          Regla: 1 fila por fecha auditada con trazabilidad directa a los slots configurados.
        </div>
      </div>

    </div>
  );
};
