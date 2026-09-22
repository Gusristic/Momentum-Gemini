import React, { useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  ReferenceLine, 
  ScatterChart, 
  Scatter, 
  ZAxis, 
  Cell 
} from 'recharts';
import { 
  Calculator, 
  TrendingUp, 
  Activity, 
  Percent, 
  Award, 
  Sliders, 
  HelpCircle,
  BarChart3,
  Flame,
  ShieldCheck,
  ArrowUpDown
} from 'lucide-react';
import { FundISIN } from '../types';

interface TechnicalRatiosViewProps {
  funds: FundISIN[];
  selectedWinnerId: string;
}

export const TechnicalRatiosView: React.FC<TechnicalRatiosViewProps> = ({
  funds,
  selectedWinnerId,
}) => {
  const [activeTab, setActiveTab] = useState<'SHARPE' | 'ALPHA' | 'RISK_RETURN_FRONTIER' | 'MATRIX'>('SHARPE');
  const [matrixSortKey, setMatrixSortKey] = useState<string>('sharpeRatio');
  const [matrixSortDir, setMatrixSortDir] = useState<'asc' | 'desc'>('desc');

  const handleMatrixSort = (key: string) => {
    if (matrixSortKey === key) {
      setMatrixSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setMatrixSortKey(key);
      setMatrixSortDir(key === 'name' || key === 'volatility1Y' || key === 'maxDrawdown' ? 'asc' : 'desc');
    }
  };

  // Filter out disabled and blank funds so only active slots are analyzed
  const validFunds = funds.filter(f => !f.isDisabled && f.isin && f.isin.trim() !== '');
  const activeFunds = validFunds.length > 0 ? validFunds : funds;

  // Prepare Sharpe data sorted
  const sharpeData = [...activeFunds]
    .sort((a, b) => b.sharpeRatio - a.sharpeRatio)
    .map(f => ({
      name: f.name.length > 22 ? f.name.substring(0, 20) + '...' : f.name,
      fullName: f.name,
      isin: f.isin,
      sharpe: f.sharpeRatio,
      isWinner: f.id === selectedWinnerId,
      volatility: f.volatility1Y,
      return12M: f.return12M,
    }));

  // Prepare Alpha data sorted
  const alphaData = [...activeFunds]
    .sort((a, b) => b.jensenAlpha - a.jensenAlpha)
    .map(f => ({
      name: f.name.length > 22 ? f.name.substring(0, 20) + '...' : f.name,
      fullName: f.name,
      isin: f.isin,
      alpha: f.jensenAlpha,
      beta: f.beta,
      isWinner: f.id === selectedWinnerId,
    }));

  // Prepare Scatter data for Risk-Return Frontier
  const scatterData = activeFunds.map(f => ({
    name: f.name,
    isin: f.isin,
    x: f.volatility1Y, // Volatility (Risk)
    y: f.return12M,     // Return (Reward)
    sharpe: f.sharpeRatio,
    alpha: f.jensenAlpha,
    isWinner: f.id === selectedWinnerId,
    isSafe: f.isSafeHaven,
    category: f.categoryLabel,
  }));

  // Average Sharpe and Alpha for context
  const avgSharpe = (activeFunds.reduce((acc, f) => acc + f.sharpeRatio, 0) / activeFunds.length).toFixed(2);
  const avgAlpha = (activeFunds.reduce((acc, f) => acc + f.jensenAlpha, 0) / activeFunds.length).toFixed(2);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-6 shadow-xl">
      
      {/* Top Header & Sub-Navigation */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                Análisis Cuantitativo & Desglose de Ratios
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                  Sharpe & Jensen's Alpha
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Visualización detallada de eficiencia ajustada por riesgo (CAPM), volatilidad y generación de alfa.
              </p>
            </div>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex flex-wrap items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('SHARPE')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'SHARPE' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sharpe Ratio
          </button>
          <button
            onClick={() => setActiveTab('ALPHA')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'ALPHA' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Jensen's Alpha (α)
          </button>
          <button
            onClick={() => setActiveTab('RISK_RETURN_FRONTIER')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'RISK_RETURN_FRONTIER' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Frontera Riesgo-Retorno
          </button>
          <button
            onClick={() => setActiveTab('MATRIX')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'MATRIX' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Matriz Completa
          </button>
        </div>
      </div>

      {/* TAB 1: SHARPE RATIO DETAIL */}
      {activeTab === 'SHARPE' && (
        <div className="space-y-6">
          {/* Formula & Explanation Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block">
                Fórmula Matemática
              </span>
              <div className="text-base font-mono font-bold text-emerald-400 py-1">
                Sharpe = (R<sub>p</sub> - R<sub>f</sub>) / σ<sub>p</sub>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Mide el exceso de rentabilidad generado por cada unidad de volatilidad asumida respecto a la tasa libre de riesgo (€STR: 3.65%).
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block">
                Interpretación Técnica
              </span>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between items-center text-emerald-400">
                  <span>&gt; 1.50</span>
                  <span className="font-semibold">Excelente / Top Cuantil</span>
                </div>
                <div className="flex justify-between items-center text-teal-300">
                  <span>1.00 - 1.50</span>
                  <span className="font-semibold">Bueno / Eficiente</span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span>0.50 - 1.00</span>
                  <span>Aceptable</span>
                </div>
                <div className="flex justify-between items-center text-rose-400">
                  <span>&lt; 0.50</span>
                  <span>Pobre retorno por riesgo</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block">
                  Media del Universo
                </span>
                <div className="text-2xl font-mono font-bold text-white mt-1">
                  {avgSharpe}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Promedio de Sharpe ratio en los {funds.length} fondos UCITS monitorizados.
                </p>
              </div>
              <div className="text-[11px] text-emerald-400 font-mono flex items-center gap-1 mt-2">
                <ShieldCheck className="w-3.5 h-3.5" />
                Dual Momentum prioriza activos con Sharpe superior
              </div>
            </div>
          </div>

          {/* Sharpe Bar Chart */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className="font-semibold">Ranking de Sharpe Ratio (1 Año Anualizado)</span>
              <span className="font-mono text-slate-500">Benchmark Hurdle R<sub>f</sub> = 3.65%</span>
            </div>

            <div className="h-72 w-full bg-slate-950/70 p-4 rounded-xl border border-slate-800/80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sharpeData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={true} vertical={true} />
                  <XAxis type="number" stroke="#64748b" domain={[0, 3]} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} width={140} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#090d16', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                    formatter={(val: any, name: any, item: any) => [
                      `${val} (Vol: ${item.payload.volatility}%, Retorno 12M: +${item.payload.return12M}%)`,
                      'Sharpe Ratio'
                    ]}
                    labelFormatter={(label) => label}
                  />
                  <ReferenceLine x={1.0} stroke="#10b981" strokeDasharray="4 4" label={{ value: 'Umbral Eficiente (1.0)', fill: '#10b981', fontSize: 10 }} />
                  <Bar dataKey="sharpe" radius={[0, 4, 4, 0]}>
                    {sharpeData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.isWinner ? '#10b981' : entry.sharpe >= 1.0 ? '#0d9488' : entry.sharpe >= 0.5 ? '#3b82f6' : '#64748b'} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: JENSEN'S ALPHA DETAIL */}
      {activeTab === 'ALPHA' && (
        <div className="space-y-6">
          {/* Formula & Explanation Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block">
                Fórmula del Alfa de Jensen (CAPM)
              </span>
              <div className="text-base font-mono font-bold text-teal-400 py-1">
                α = R<sub>p</sub> - [R<sub>f</sub> + β × (R<sub>m</sub> - R<sub>f</sub>)]
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Determina si el fondo bate al mercado tras descontar el riesgo sistemático (Beta). Un Alfa positivo denota valor añadido genuino.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block">
                Benchmark de Referencia
              </span>
              <div className="space-y-1.5 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span>Mercado (R<sub>m</sub>):</span>
                  <span className="font-mono text-emerald-400 font-semibold">MSCI World Index</span>
                </div>
                <div className="flex justify-between">
                  <span>Tasa Libre Riesgo (R<sub>f</sub>):</span>
                  <span className="font-mono text-slate-400">€STR (3.65%)</span>
                </div>
                <div className="flex justify-between">
                  <span>Filtro Antonacci:</span>
                  <span className="font-mono text-slate-400">Relativo + Absoluto</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block">
                  Alfa Medio del Universo
                </span>
                <div className={`text-2xl font-mono font-bold mt-1 ${Number(avgAlpha) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {Number(avgAlpha) >= 0 ? `+${avgAlpha}%` : `${avgAlpha}%`}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Exceso medio de retorno ajustado por beta frente a MSCI World.
                </p>
              </div>
            </div>
          </div>

          {/* Alpha Bar Chart */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className="font-semibold">Generación de Alfa de Jensen (% Anual)</span>
              <span className="font-mono text-slate-500">Valores positivos = Sobre-rendimiento puro</span>
            </div>

            <div className="h-72 w-full bg-slate-950/70 p-4 rounded-xl border border-slate-800/80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={alphaData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={true} vertical={true} />
                  <XAxis type="number" stroke="#64748b" tick={{ fontSize: 11 }} domain={[-4, 4]} />
                  <YAxis type="category" dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} width={140} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#090d16', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                    formatter={(val: any, name: any, item: any) => [
                      `${val > 0 ? `+${val}%` : `${val}%`} (Beta: ${item.payload.beta})`,
                      "Alfa de Jensen"
                    ]}
                  />
                  <ReferenceLine x={0} stroke="#94a3b8" strokeWidth={1.5} />
                  <Bar dataKey="alpha" radius={[0, 4, 4, 0]}>
                    {alphaData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.isWinner ? '#10b981' : entry.alpha > 0 ? '#14b8a6' : '#f43f5e'} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: RISK-RETURN SCATTER FRONTIER */}
      {activeTab === 'RISK_RETURN_FRONTIER' && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="font-semibold text-white block">Diagrama de Dispersión Riesgo-Retorno (Capital Allocation Line)</span>
              <span>El eje X representa la Volatilidad Anualizada (%) y el eje Y el Rendimiento Anual (%). El cuadrante superior izquierdo representa la máxima eficiencia.</span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="flex items-center gap-1.5 text-emerald-400 font-mono font-semibold">
                <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                Ganador Momentum
              </span>
              <span className="flex items-center gap-1.5 text-sky-400 font-mono">
                <span className="w-3 h-3 rounded-full bg-sky-500 inline-block" />
                Refugio
              </span>
            </div>
          </div>

          <div className="h-80 w-full bg-slate-950/70 p-4 rounded-xl border border-slate-800/80">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis 
                  type="number" 
                  dataKey="x" 
                  name="Volatilidad" 
                  unit="%" 
                  stroke="#64748b" 
                  label={{ value: 'Volatilidad Anualizada σ (%)', position: 'insideBottom', offset: -10, fill: '#64748b', fontSize: 11 }}
                  domain={[0, 22]} 
                />
                <YAxis 
                  type="number" 
                  dataKey="y" 
                  name="Retorno 12M" 
                  unit="%" 
                  stroke="#64748b" 
                  label={{ value: 'Retorno 12M (%)', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11 }}
                  domain={[-5, 30]} 
                />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl shadow-xl text-xs space-y-1">
                          <p className="font-bold text-white">{data.name}</p>
                          <p className="text-slate-400 font-mono">{data.isin}</p>
                          <p className="text-emerald-400 font-mono font-semibold">Retorno 12M: +{data.y}%</p>
                          <p className="text-amber-400 font-mono">Volatilidad: {data.x}%</p>
                          <p className="text-teal-400 font-mono">Sharpe Ratio: {data.sharpe}</p>
                          <p className="text-indigo-400 font-mono">Alfa de Jensen: {data.alpha}%</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Scatter name="Fondos UCITS" data={scatterData}>
                  {scatterData.map((entry, index) => (
                    <Cell 
                      key={`scatter-cell-${index}`} 
                      fill={entry.isWinner ? '#10b981' : entry.isSafe ? '#38bdf8' : '#6366f1'} 
                      stroke={entry.isWinner ? '#ffffff' : 'none'}
                      strokeWidth={entry.isWinner ? 2 : 0}
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* TAB 4: COMPLETE TECHNICAL MATRIX */}
      {activeTab === 'MATRIX' && (() => {
        const sortedMatrixFunds = [...activeFunds].sort((a, b) => {
          let valA: any = 0;
          let valB: any = 0;
          switch (matrixSortKey) {
            case 'name':
              valA = a.name || '';
              valB = b.name || '';
              break;
            case 'sharpeRatio':
              valA = a.sharpeRatio;
              valB = b.sharpeRatio;
              break;
            case 'jensenAlpha':
              valA = a.jensenAlpha;
              valB = b.jensenAlpha;
              break;
            case 'beta':
              valA = a.beta;
              valB = b.beta;
              break;
            case 'sortinoRatio':
              valA = a.sortinoRatio;
              valB = b.sortinoRatio;
              break;
            case 'volatility1Y':
              valA = a.volatility1Y;
              valB = b.volatility1Y;
              break;
            case 'maxDrawdown':
              valA = a.maxDrawdown;
              valB = b.maxDrawdown;
              break;
            case 'calmar':
              valA = a.maxDrawdown !== 0 ? Math.abs(a.return12M / a.maxDrawdown) : 0;
              valB = b.maxDrawdown !== 0 ? Math.abs(b.return12M / b.maxDrawdown) : 0;
              break;
            default:
              valA = a.sharpeRatio;
              valB = b.sharpeRatio;
          }
          if (typeof valA === 'string') {
            return matrixSortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
          }
          return matrixSortDir === 'asc' ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
        });

        const renderTh = (key: string, label: string, align: 'left' | 'right' = 'right', extraClass: string = '') => {
          const isCurrent = matrixSortKey === key;
          return (
            <th 
              onClick={() => handleMatrixSort(key)}
              className={`py-3 px-3 cursor-pointer select-none group hover:text-white transition-colors ${
                align === 'right' ? 'text-right' : 'text-left'
              } ${extraClass}`}
              title={`Ordenar por ${label}`}
            >
              <div className={`inline-flex items-center gap-1 ${align === 'right' ? 'justify-end' : 'justify-start'}`}>
                <span>{label}</span>
                <span className={`transition-opacity ${isCurrent ? 'text-emerald-400 font-bold opacity-100' : 'opacity-30 group-hover:opacity-75'}`}>
                  {isCurrent ? (matrixSortDir === 'asc' ? '▲' : '▼') : <ArrowUpDown className="w-2.5 h-2.5" />}
                </span>
              </div>
            </th>
          );
        };

        return (
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/70">
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider bg-slate-950">
                  {renderTh('name', 'Fondo / ISIN', 'left', 'px-4')}
                  {renderTh('sharpeRatio', 'Sharpe')}
                  {renderTh('jensenAlpha', 'Alfa (α)')}
                  {renderTh('beta', 'Beta (β)')}
                  {renderTh('sortinoRatio', 'Sortino')}
                  {renderTh('volatility1Y', 'Volatilidad (σ)')}
                  {renderTh('maxDrawdown', 'Max Drawdown')}
                  {renderTh('calmar', 'Calmar Ratio')}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {sortedMatrixFunds.map((fund, index) => {
                  const isWinner = fund.id === selectedWinnerId;
                  const calmar = fund.maxDrawdown !== 0 ? Math.abs(fund.return12M / fund.maxDrawdown).toFixed(2) : 'N/A';

                  return (
                    <tr key={`${fund.id}-${fund.slotNumber || index}`} className={`hover:bg-slate-900/60 ${isWinner ? 'bg-emerald-950/20 font-bold' : ''}`}>
                      <td className="py-2.5 px-4">
                        <div className="text-slate-200 font-sans">{fund.name}</div>
                        <div className="text-slate-500 text-[10px]">{fund.isin}</div>
                      </td>
                      <td className="py-2.5 px-3 text-right text-emerald-400">{fund.sharpeRatio.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right text-teal-400">{fund.jensenAlpha > 0 ? `+${fund.jensenAlpha}%` : `${fund.jensenAlpha}%`}</td>
                      <td className="py-2.5 px-3 text-right text-slate-300">{fund.beta.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right text-sky-400">{fund.sortinoRatio.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right text-amber-400">{fund.volatility1Y}%</td>
                      <td className="py-2.5 px-3 text-right text-rose-400">{fund.maxDrawdown}%</td>
                      <td className="py-2.5 px-3 text-right text-slate-200">{calmar}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })()}

    </div>
  );
};
