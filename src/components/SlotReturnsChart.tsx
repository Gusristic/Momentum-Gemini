import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Cell
} from 'recharts';
import {
  BarChart3,
  ArrowUpDown,
  Filter,
  Shield,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  Award,
  Layers
} from 'lucide-react';
import { FundISIN } from '../types';

interface SlotReturnsChartProps {
  funds: FundISIN[];
  selectedWinnerId?: string;
  hurdleRate?: number;
  embedded?: boolean;
}

type SortByOption = 'SLOT' | 'RETURN_12M' | 'RETURN_6M' | 'RETURN_3M';
type FilterCategoryOption = 'ALL' | 'ACTIVE_ONLY' | 'EQUITY_ONLY' | 'SAFE_HAVEN_ONLY';

export const SlotReturnsChart: React.FC<SlotReturnsChartProps> = ({
  funds,
  selectedWinnerId,
  hurdleRate = 3.65,
  embedded = false,
}) => {
  const [sortBy, setSortBy] = useState<SortByOption>('RETURN_12M');
  const [filterCategory, setFilterCategory] = useState<FilterCategoryOption>('ACTIVE_ONLY');
  const [activeBarPeriod, setActiveBarPeriod] = useState<'ALL' | '12M' | '6M' | '3M'>('ALL');
  const [highlightFundId, setHighlightFundId] = useState<string | null>(null);

  // Process and filter funds
  const chartData = useMemo(() => {
    let filtered = funds.filter(f => !f.isBlank);

    if (filterCategory === 'ACTIVE_ONLY') {
      filtered = filtered.filter(f => !f.isDisabled);
    } else if (filterCategory === 'EQUITY_ONLY') {
      filtered = filtered.filter(f => !f.isSafeHaven && !f.isDisabled);
    } else if (filterCategory === 'SAFE_HAVEN_ONLY') {
      filtered = filtered.filter(f => f.isSafeHaven);
    }

    const mapped = filtered.map(f => {
      const shortName = f.name.length > 22 ? `${f.name.substring(0, 20)}…` : f.name;
      return {
        id: f.id,
        slotNumber: f.slotNumber,
        slotLabel: `Slot ${f.slotNumber}`,
        shortName,
        fullName: f.name,
        isin: f.isin,
        category: f.categoryLabel,
        isSafeHaven: f.isSafeHaven,
        isDisabled: f.isDisabled,
        isWinner: f.id === selectedWinnerId,
        return12M: Number(f.return12M.toFixed(2)),
        return6M: Number(f.return6M.toFixed(2)),
        return3M: Number(f.return3M.toFixed(2)),
        return1M: Number(f.return1M.toFixed(2)),
      };
    });

    // Sorting
    mapped.sort((a, b) => {
      if (sortBy === 'RETURN_12M') return b.return12M - a.return12M;
      if (sortBy === 'RETURN_6M') return b.return6M - a.return6M;
      if (sortBy === 'RETURN_3M') return b.return3M - a.return3M;
      return a.slotNumber - b.slotNumber;
    });

    return mapped;
  }, [funds, filterCategory, sortBy, selectedWinnerId]);

  // Statistics
  const stats = useMemo(() => {
    if (chartData.length === 0) return null;
    const max12M = Math.max(...chartData.map(d => d.return12M));
    const max6M = Math.max(...chartData.map(d => d.return6M));
    const max3M = Math.max(...chartData.map(d => d.return3M));
    const best12MFund = chartData.find(d => d.return12M === max12M);
    const best6MFund = chartData.find(d => d.return6M === max6M);
    const best3MFund = chartData.find(d => d.return3M === max3M);
    const beatingHurdle12M = chartData.filter(d => d.return12M > hurdleRate).length;

    return {
      best12MFund,
      best6MFund,
      best3MFund,
      beatingHurdle12M,
      total: chartData.length,
    };
  }, [chartData, hurdleRate]);

  // Custom tooltip for rich comparison
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-950 border border-slate-700 p-3.5 rounded-xl shadow-2xl text-xs space-y-2 max-w-xs z-50">
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
            <span className="font-bold text-white flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-emerald-400 font-mono text-[10px]">
                Slot #{data.slotNumber}
              </span>
              <span className="truncate max-w-[180px]">{data.fullName}</span>
            </span>
            {data.isSafeHaven && (
              <span className="px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 text-[10px] font-mono">
                Refugio
              </span>
            )}
          </div>

          <div className="text-[11px] text-slate-400 font-mono">
            <span>ISIN: {data.isin}</span> • <span>{data.category}</span>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1">
            <div className={`p-2 rounded-lg border ${data.return12M >= hurdleRate ? 'bg-emerald-950/40 border-emerald-800/50' : 'bg-slate-900 border-slate-800'}`}>
              <span className="text-[10px] text-slate-400 block font-sans">12 Meses (1A)</span>
              <span className={`font-mono font-bold text-xs ${data.return12M >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {data.return12M > 0 ? `+${data.return12M}` : data.return12M}%
              </span>
            </div>

            <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 block font-sans">6 Meses</span>
              <span className={`font-mono font-bold text-xs ${data.return6M >= 0 ? 'text-sky-400' : 'text-rose-400'}`}>
                {data.return6M > 0 ? `+${data.return6M}` : data.return6M}%
              </span>
            </div>

            <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 block font-sans">3 Meses</span>
              <span className={`font-mono font-bold text-xs ${data.return3M >= 0 ? 'text-amber-400' : 'text-rose-400'}`}>
                {data.return3M > 0 ? `+${data.return3M}` : data.return3M}%
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-800 text-slate-400">
            <span>Hurdle €STR: {hurdleRate}%</span>
            <span className={data.return12M >= hurdleRate ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
              {data.return12M >= hurdleRate ? '✓ Supera Hurdle' : '✗ Bajo Hurdle'}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={embedded ? "space-y-6 pt-2" : "bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-6 shadow-xl"}>
      
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Comparativa de Rendimientos por Slot: 12M, 6M y 3M
                </h2>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800">
                  {chartData.length} Slots Visualizados
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Evaluación comparativa multidimensional de momentum relativo para detectar aceleración o fatiga de tendencia en cada fondo.
              </p>
            </div>
          </div>
        </div>

        {/* Filter & Sort Buttons */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          
          {/* Horizon toggle (All, 12M only, 6M only, 3M only) */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveBarPeriod('ALL')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                activeBarPeriod === 'ALL' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              12M + 6M + 3M
            </button>
            <button
              onClick={() => setActiveBarPeriod('12M')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                activeBarPeriod === '12M' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Solo 12M
            </button>
            <button
              onClick={() => setActiveBarPeriod('6M')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                activeBarPeriod === '6M' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Solo 6M
            </button>
            <button
              onClick={() => setActiveBarPeriod('3M')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                activeBarPeriod === '3M' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Solo 3M
            </button>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center bg-slate-950 px-2 py-1 rounded-xl border border-slate-800 text-slate-300 gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[11px] text-slate-400">Ordenar:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortByOption)}
              className="bg-transparent text-xs text-white focus:outline-none cursor-pointer"
            >
              <option value="RETURN_12M" className="bg-slate-900">Por Rentabilidad 12M</option>
              <option value="RETURN_6M" className="bg-slate-900">Por Rentabilidad 6M</option>
              <option value="RETURN_3M" className="bg-slate-900">Por Rentabilidad 3M</option>
              <option value="SLOT" className="bg-slate-900">Por Número de Slot (1-15)</option>
            </select>
          </div>

          {/* Filter Selector */}
          <div className="flex items-center bg-slate-950 px-2 py-1 rounded-xl border border-slate-800 text-slate-300 gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as FilterCategoryOption)}
              className="bg-transparent text-xs text-white focus:outline-none cursor-pointer"
            >
              <option value="ACTIVE_ONLY" className="bg-slate-900">Slots Activos</option>
              <option value="ALL" className="bg-slate-900">Todos (inc. inactivos)</option>
              <option value="EQUITY_ONLY" className="bg-slate-900">Solo Renta Variable</option>
              <option value="SAFE_HAVEN_ONLY" className="bg-slate-900">Solo Refugio</option>
            </select>
          </div>

        </div>
      </div>

      {/* Quick Top Performers Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-slate-400 text-[11px] flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-emerald-400" />
              Líder 12 Meses (1A)
            </span>
            <div className="font-bold text-white truncate mt-1" title={stats.best12MFund?.fullName}>
              Slot #{stats.best12MFund?.slotNumber} {stats.best12MFund?.shortName}
            </div>
            <span className="text-emerald-400 font-mono font-bold text-sm block mt-0.5">
              +{stats.best12MFund?.return12M}%
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-slate-400 text-[11px] flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-sky-400" />
              Líder 6 Meses
            </span>
            <div className="font-bold text-white truncate mt-1" title={stats.best6MFund?.fullName}>
              Slot #{stats.best6MFund?.slotNumber} {stats.best6MFund?.shortName}
            </div>
            <span className="text-sky-400 font-mono font-bold text-sm block mt-0.5">
              +{stats.best6MFund?.return6M}%
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-slate-400 text-[11px] flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Líder 3 Meses
            </span>
            <div className="font-bold text-white truncate mt-1" title={stats.best3MFund?.fullName}>
              Slot #{stats.best3MFund?.slotNumber} {stats.best3MFund?.shortName}
            </div>
            <span className="text-amber-400 font-mono font-bold text-sm block mt-0.5">
              +{stats.best3MFund?.return3M}%
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-slate-400 text-[11px] flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              Superan Hurdle (€STR {hurdleRate}%)
            </span>
            <div className="font-bold text-white mt-1">
              {stats.beatingHurdle12M} de {stats.total} slots
            </div>
            <span className="text-[11px] text-emerald-400 font-mono block mt-0.5">
              {((stats.beatingHurdle12M / stats.total) * 100).toFixed(0)}% aptos para Momentum
            </span>
          </div>
        </div>
      )}

      {/* Main Bar Chart Container */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" />
              <span className="text-slate-300 font-medium">Rentabilidad 12M (1 Año)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-sky-500 inline-block" />
              <span className="text-slate-300 font-medium">Rentabilidad 6M (Semestral)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-amber-500 inline-block" />
              <span className="text-slate-300 font-medium">Rentabilidad 3M (Trimestral)</span>
            </span>
          </div>
          <span className="font-mono text-emerald-400 hidden sm:inline-block">
            Línea discontinua: Hurdle €STR ({hurdleRate}%)
          </span>
        </div>

        <div className="h-96 w-full bg-slate-950/70 p-4 rounded-xl border border-slate-800/80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 20, left: 0, bottom: 50 }}
              barGap={2}
              barCategoryGap="18%"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              
              <XAxis
                dataKey="shortName"
                stroke="#64748b"
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                interval={0}
                angle={-35}
                textAnchor="end"
                height={60}
              />
              
              <YAxis
                stroke="#64748b"
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                unit="%"
                domain={['auto', 'auto']}
              />
              
              <Tooltip content={<CustomTooltip />} />

              {/* Hurdle Reference Line */}
              <ReferenceLine
                y={hurdleRate}
                stroke="#10b981"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: `Hurdle €STR ${hurdleRate}%`,
                  position: 'insideTopRight',
                  fill: '#10b981',
                  fontSize: 10,
                  fontWeight: 'bold',
                }}
              />

              <ReferenceLine y={0} stroke="#475569" strokeWidth={1} />

              {/* 12M Bar */}
              {(activeBarPeriod === 'ALL' || activeBarPeriod === '12M') && (
                <Bar
                  dataKey="return12M"
                  name="12 Meses"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-12m-${index}`}
                      fill={
                        entry.id === selectedWinnerId
                          ? '#34d399'
                          : entry.return12M < 0
                          ? '#f43f5e'
                          : '#10b981'
                      }
                      fillOpacity={entry.id === highlightFundId || !highlightFundId ? 1 : 0.4}
                    />
                  ))}
                </Bar>
              )}

              {/* 6M Bar */}
              {(activeBarPeriod === 'ALL' || activeBarPeriod === '6M') && (
                <Bar
                  dataKey="return6M"
                  name="6 Meses"
                  fill="#0ea5e9"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-6m-${index}`}
                      fill={entry.return6M < 0 ? '#fb7185' : '#0ea5e9'}
                      fillOpacity={entry.id === highlightFundId || !highlightFundId ? 0.9 : 0.35}
                    />
                  ))}
                </Bar>
              )}

              {/* 3M Bar */}
              {(activeBarPeriod === 'ALL' || activeBarPeriod === '3M') && (
                <Bar
                  dataKey="return3M"
                  name="3 Meses"
                  fill="#f59e0b"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-3m-${index}`}
                      fill={entry.return3M < 0 ? '#fda4af' : '#f59e0b'}
                      fillOpacity={entry.id === highlightFundId || !highlightFundId ? 0.85 : 0.3}
                    />
                  ))}
                </Bar>
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Breakdown Table with Details */}
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900/90 text-slate-400 font-mono border-b border-slate-800 uppercase text-[10px]">
            <tr>
              <th className="py-2.5 px-3">Slot</th>
              <th className="py-2.5 px-3">Fondo / ISIN</th>
              <th className="py-2.5 px-3">Categoría</th>
              <th className="py-2.5 px-3 text-right text-emerald-400">Rent. 12M</th>
              <th className="py-2.5 px-3 text-right text-sky-400">Rent. 6M</th>
              <th className="py-2.5 px-3 text-right text-amber-400">Rent. 3M</th>
              <th className="py-2.5 px-3 text-right">Rent. 1M</th>
              <th className="py-2.5 px-3 text-center">Estado Hurdle</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono text-slate-200">
            {chartData.map((item) => {
              const isWinner = item.id === selectedWinnerId;
              return (
                <tr
                  key={item.id}
                  onMouseEnter={() => setHighlightFundId(item.id)}
                  onMouseLeave={() => setHighlightFundId(null)}
                  className={`hover:bg-slate-900/60 transition-colors ${
                    isWinner ? 'bg-emerald-950/20' : ''
                  }`}
                >
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      isWinner 
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      #{item.slotNumber}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-sans">
                    <div className="font-semibold text-white flex items-center gap-1.5">
                      <span className="truncate max-w-[240px]">{item.fullName}</span>
                      {isWinner && (
                        <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-mono border border-emerald-500/30">
                          Líder
                        </span>
                      )}
                      {item.isSafeHaven && (
                        <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-mono border border-indigo-500/30">
                          Refugio
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">{item.isin}</div>
                  </td>
                  <td className="py-2.5 px-3 font-sans text-slate-400 text-[11px]">
                    {item.category}
                  </td>
                  <td className={`py-2.5 px-3 text-right font-bold ${item.return12M >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {item.return12M > 0 ? `+${item.return12M}` : item.return12M}%
                  </td>
                  <td className={`py-2.5 px-3 text-right font-semibold ${item.return6M >= 0 ? 'text-sky-400' : 'text-rose-400'}`}>
                    {item.return6M > 0 ? `+${item.return6M}` : item.return6M}%
                  </td>
                  <td className={`py-2.5 px-3 text-right font-semibold ${item.return3M >= 0 ? 'text-amber-400' : 'text-rose-400'}`}>
                    {item.return3M > 0 ? `+${item.return3M}` : item.return3M}%
                  </td>
                  <td className={`py-2.5 px-3 text-right ${item.return1M >= 0 ? 'text-slate-300' : 'text-rose-400'}`}>
                    {item.return1M > 0 ? `+${item.return1M}` : item.return1M}%
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {item.return12M >= hurdleRate ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400 text-[10px] font-sans">
                        <CheckCircle2 className="w-3 h-3" /> Apto
                      </span>
                    ) : (
                      <span className="text-rose-400 text-[10px] font-sans">
                        Bajo €STR
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
};
