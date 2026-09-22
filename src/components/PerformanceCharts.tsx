import React, { useState } from 'react';
import { 
  AreaChart, 
  Area, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import { 
  TrendingUp, 
  ShieldAlert, 
  LineChart as LineChartIcon, 
  Activity,
  ArrowUpRight,
  Sparkles,
  BarChart3
} from 'lucide-react';
import { StrategyPerformanceComparison, FundISIN } from '../types';
import { MomentumMode } from '../utils/momentumEngine';
import { SlotReturnsChart } from './SlotReturnsChart';

interface PerformanceChartsProps {
  backtestData: StrategyPerformanceComparison[];
  funds: FundISIN[];
  selectedWinnerId: string;
  momentumMode?: MomentumMode;
}

export const PerformanceCharts: React.FC<PerformanceChartsProps> = ({
  backtestData,
  funds,
  selectedWinnerId,
  momentumMode = 'COMPOSITE_BLENDED',
}) => {
  const [chartMode, setChartMode] = useState<'SLOT_RETURNS' | 'EQUITY_CURVE' | 'DRAWDOWN'>('SLOT_RETURNS');

  // Compute final values (Horizonte 20 años: 2004 - 2024)
  const lastPoint = backtestData[backtestData.length - 1];
  const initialCapital = 10000;
  const dmFinal = lastPoint ? lastPoint.dualMomentumValue : 77400;
  const msciFinal = lastPoint ? lastPoint.msciWorldValue : 54200;
  const bondsFinal = lastPoint ? lastPoint.euroGovBondsValue : 16800;

  // CAGR a 20 años: (ValorFinal / Inicial) ^ (1/20) - 1
  const dmCagr = (((dmFinal / initialCapital) ** (1 / 20) - 1) * 100).toFixed(1);
  const msciCagr = (((msciFinal / initialCapital) ** (1 / 20) - 1) * 100).toFixed(1);

  // Real Maximum Drawdowns calculated directly from the dynamic backtest series of user's funds
  const calculatedDmMaxDd = backtestData.length > 0
    ? Math.min(...backtestData.map(pt => pt.drawdownDM))
    : -14.8;
  const calculatedMsciMaxDd = backtestData.length > 0
    ? Math.min(...backtestData.map(pt => pt.drawdownBenchmark))
    : -54.1;

  // Top 3 funds for rolling momentum
  const topFunds = funds.slice(0, 4);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-6 shadow-xl">
      
      {/* Header & Mode selection */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Rendimiento Histórico & Backtesting del Dual Momentum
                </h2>
                <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold border ${
                  momentumMode === 'CLASSIC_12M'
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : momentumMode === 'MOMENTUM_12_MINUS_1'
                    ? 'bg-teal-500/15 text-teal-300 border-teal-500/30'
                    : momentumMode === 'COMPOSITE_BLENDED'
                    ? 'bg-sky-500/15 text-sky-400 border-sky-500/30'
                    : 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                }`}>
                  {momentumMode === 'CLASSIC_12M' && 'Modo 12M Puro'}
                  {momentumMode === 'MOMENTUM_12_MINUS_1' && 'Modo Institucional 12-1'}
                  {momentumMode === 'COMPOSITE_BLENDED' && 'Modo Equilibrado'}
                  {momentumMode === 'PROGRESSIVE_STEPPED' && 'Modo Progresivo'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Simulación histórica de 20 años (2004 - 2024) calculada sobre tus fondos según el modelo seleccionado frente a Buy & Hold de MSCI World y Renta Fija.
              </p>
            </div>
          </div>
        </div>

        {/* Chart View Selector */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs flex-wrap gap-1">
          <button
            id="btn-chart-slot-returns"
            onClick={() => setChartMode('SLOT_RETURNS')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              chartMode === 'SLOT_RETURNS' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Rendimientos 12M / 6M / 3M</span>
          </button>
          <button
            id="btn-chart-equity-curve"
            onClick={() => setChartMode('EQUITY_CURVE')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
              chartMode === 'EQUITY_CURVE' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Curva 20 Años (€)
          </button>
          <button
            id="btn-chart-drawdown"
            onClick={() => setChartMode('DRAWDOWN')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
              chartMode === 'DRAWDOWN' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Underwater Drawdown (%)
          </button>
        </div>
      </div>

      {/* Highlights Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
          <span className="text-slate-400 text-[11px] block">Capital Final 20A (Base 10k€)</span>
          <span className="text-emerald-400 font-mono font-bold text-base mt-0.5 block">
            {dmFinal.toLocaleString('es-ES')} €
          </span>
          <span className="text-[10px] text-emerald-500/90 font-mono flex items-center gap-0.5">
            <ArrowUpRight className="w-3 h-3" /> +{(((dmFinal - 10000) / 10000) * 100).toFixed(0)}% total
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
          <span className="text-slate-400 text-[11px] block">CAGR 20 Años (2004-2024)</span>
          <span className="text-teal-400 font-mono font-bold text-base mt-0.5 block">
            +{dmCagr}% anual
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            vs +{msciCagr}% MSCI World
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
          <span className="text-slate-400 text-[11px] block">Max Drawdown Histórico (20A)</span>
          <span className="text-emerald-400 font-mono font-bold text-base mt-0.5 block">
            {calculatedDmMaxDd.toFixed(1).replace('.', ',')}%
          </span>
          <span className="text-[10px] text-emerald-500 font-mono">
            Control de caídas via Refugio
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
          <span className="text-slate-400 text-[11px] block">Max Drawdown MSCI World</span>
          <span className="text-rose-400 font-mono font-bold text-base mt-0.5 block">
            {calculatedMsciMaxDd.toFixed(1).replace('.', ',')}%
          </span>
          <span className="text-[10px] text-rose-500 font-mono">
            Crash 2008 sin filtro de tendencia
          </span>
        </div>
      </div>

      {/* CHART 0: SLOT RETURNS 12M, 6M, 3M */}
      {chartMode === 'SLOT_RETURNS' && (
        <SlotReturnsChart
          funds={funds}
          selectedWinnerId={selectedWinnerId}
          hurdleRate={3.65}
          embedded={true}
        />
      )}

      {/* CHART 1: EQUITY CURVE */}
      {chartMode === 'EQUITY_CURVE' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Evolución de 10.000 € invertidos con reinversión por traspaso exento</span>
            <span className="font-mono text-emerald-400">Ventaja por Diferimiento Fiscal IRPF</span>
          </div>

          <div className="h-80 w-full bg-slate-950/70 p-4 rounded-xl border border-slate-800/80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={backtestData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorDM" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="colorMSCI" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" domain={['dataMin - 500', 'dataMax + 1000']} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#090d16', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(value: any, name: any) => [
                    `${Number(value).toLocaleString('es-ES')} €`,
                    name === 'dualMomentumValue' ? 'Dual Momentum Antonacci' : name === 'msciWorldValue' ? 'MSCI World Buy&Hold' : 'Bonos Soberanos Euro'
                  ]}
                />
                <Legend 
                  wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                  formatter={(value) => 
                    value === 'dualMomentumValue' ? 'Estrategia Dual Momentum España' : value === 'msciWorldValue' ? 'MSCI World Index (Buy & Hold)' : 'Renta Fija Soberana Euro'
                  }
                />
                <Area 
                  type="monotone" 
                  dataKey="dualMomentumValue" 
                  stroke="#10b981" 
                  strokeWidth={2.5} 
                  fillOpacity={1} 
                  fill="url(#colorDM)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="msciWorldValue" 
                  stroke="#6366f1" 
                  strokeWidth={1.8} 
                  strokeDasharray="4 2"
                  fillOpacity={1} 
                  fill="url(#colorMSCI)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="euroGovBondsValue" 
                  stroke="#94a3b8" 
                  strokeWidth={1.2} 
                  fill="none" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* CHART 2: UNDERWATER DRAWDOWN */}
      {chartMode === 'DRAWDOWN' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Caídas porcentuales desde máximos históricos precedentes (Underwater Curve)</span>
            <span className="font-mono text-emerald-400">Preservación del Capital de Antonacci</span>
          </div>

          <div className="h-80 w-full bg-slate-950/70 p-4 rounded-xl border border-slate-800/80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={backtestData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorDrawdownMSCI" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.05}/>
                  </linearGradient>
                  <linearGradient id="colorDrawdownDM" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.5}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" domain={[-60, 0]} tick={{ fontSize: 11 }} unit="%" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#090d16', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(value: any, name: any) => [
                    `${value}%`,
                    name === 'drawdownDM' ? 'Drawdown Dual Momentum' : 'Drawdown MSCI World'
                  ]}
                />
                <Legend 
                  wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                  formatter={(value) => 
                    value === 'drawdownDM' ? 'Drawdown Dual Momentum (con Filtro Absoluto)' : 'Drawdown MSCI World (Buy & Hold)'
                  }
                />
                <Area 
                  type="monotone" 
                  dataKey="drawdownBenchmark" 
                  stroke="#f43f5e" 
                  strokeWidth={2} 
                  fill="url(#colorDrawdownMSCI)"
                  fillOpacity={1} 
                />
                <Area 
                  type="monotone" 
                  dataKey="drawdownDM" 
                  stroke="#10b981" 
                  strokeWidth={2.5} 
                  fill="url(#colorDrawdownDM)"
                  fillOpacity={1} 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

    </div>
  );
};
