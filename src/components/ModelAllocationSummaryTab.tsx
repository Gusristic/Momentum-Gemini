import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  Layers, 
  CheckCircle2, 
  Award,
  BarChart3,
  ArrowUpDown,
  Target,
  Shield,
  Activity,
  AlertCircle,
  ExternalLink,
  Zap,
  Info
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid
} from 'recharts';
import { FundISIN, MomentumMode } from '../types';
import { calculateMomentumScore, evaluateDualMomentum } from '../utils/momentumEngine';

interface Props {
  funds: FundISIN[];
  activeFundId?: string;
  onSelectActiveFund?: (fundId: string) => void;
  hysteresisBuffer?: number;
}

interface RankedFundDetail {
  fund: FundISIN;
  score: number;
  rank: number;
  excess: number;
  diffFromFirst: number;
  return12M: number;
  return6M: number;
  return3M: number;
  return1M: number;
  sharpeRatio: number;
  jensenAlpha: number;
  volatility1Y: number;
}

interface ModelSummaryItem {
  mode: MomentumMode;
  modelName: string;
  modelSubtitle: string;
  weightFormula: string;
  color: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  scoreLabel: string;
  assignedFund: FundISIN;
  isDefenseMode: boolean;
  score: number;
  excessOverRf: number;
  return12M: number;
  return6M: number;
  return3M: number;
  return1M: number;
  sharpeRatio: number;
  jensenAlpha: number;
  volatility1Y: number;
  // Podium: 1st, 2nd, and 3rd
  top1: RankedFundDetail;
  top2?: RankedFundDetail;
  top3?: RankedFundDetail;
  // Full ranking
  allRankedFunds: RankedFundDetail[];
  rotationRisk: 'HIGH' | 'MEDIUM' | 'LOW';
}

export const ModelAllocationSummaryTab: React.FC<Props> = ({
  funds,
  activeFundId,
  onSelectActiveFund,
  hysteresisBuffer = 0.5
}) => {
  const [selectedInspectMode, setSelectedInspectMode] = useState<MomentumMode>('COMPOSITE_BLENDED');
  const [tableSortKey, setTableSortKey] = useState<string>('score');
  const [tableSortDir, setTableSortDir] = useState<'asc' | 'desc'>('desc');
  const [podiumViewMode, setPodiumViewMode] = useState<'CARDS' | 'TABLE'>('CARDS');

  // Evaluate each of the 4 models
  const modelsData: ModelSummaryItem[] = useMemo(() => {
    const modelConfigs: {
      mode: MomentumMode;
      name: string;
      subtitle: string;
      formula: string;
      color: string;
      badgeBg: string;
      badgeText: string;
      badgeBorder: string;
      scoreLabel: string;
    }[] = [
      {
        mode: 'CLASSIC_12M',
        name: 'Clásico 12 Meses',
        subtitle: 'Gary Antonacci GEM (Global Equity Momentum)',
        formula: '100% Retorno a 12 Meses',
        color: '#10b981', // emerald
        badgeBg: 'bg-emerald-950/60',
        badgeText: 'text-emerald-400',
        badgeBorder: 'border-emerald-500/40',
        scoreLabel: 'Retorno 12M'
      },
      {
        mode: 'MOMENTUM_12_MINUS_1',
        name: 'Institucional 12m - 1m',
        subtitle: 'Fama-French / Jegadeesh & Titman / AQR',
        formula: '12M excluyendo el último mes (Reversión corto plazo)',
        color: '#06b6d4', // cyan
        badgeBg: 'bg-cyan-950/60',
        badgeText: 'text-cyan-400',
        badgeBorder: 'border-cyan-500/40',
        scoreLabel: 'Score 12m-1m'
      },
      {
        mode: 'COMPOSITE_BLENDED',
        name: 'Compuesto Equilibrado',
        subtitle: 'Multi-Horizonte Ponderado (50 / 30 / 20)',
        formula: '50% 12M + 30% 6M + 20% 3M',
        color: '#8b5cf6', // purple / violet
        badgeBg: 'bg-purple-950/60',
        badgeText: 'text-purple-400',
        badgeBorder: 'border-purple-500/40',
        scoreLabel: 'Score Compuesto'
      },
      {
        mode: 'PROGRESSIVE_STEPPED',
        name: 'Progresivo / Foco Reciente',
        subtitle: 'Andreas Clenow / Alpha Trend (40 / 30 / 20 / 10)',
        formula: '40% 1M + 30% 3M + 20% 6M + 10% 12M',
        color: '#f59e0b', // amber
        badgeBg: 'bg-amber-950/60',
        badgeText: 'text-amber-400',
        badgeBorder: 'border-amber-500/40',
        scoreLabel: 'Score Progresivo'
      }
    ];

    return modelConfigs.map(cfg => {
      const evaluation = evaluateDualMomentum(funds, activeFundId, cfg.mode, hysteresisBuffer);
      const targetFund = evaluation.signal.currentSelectedFund;
      const isDefense = evaluation.signal.isDefenseMode;

      // Hurdle rate
      const hurdle = Number(evaluation.safeHavenFund?.return12M ?? 3.65);

      // Scored list for valid active funds
      const scoredList: RankedFundDetail[] = evaluation.scores
        .filter(s => !s.fund.isDisabled && !s.fund.isBlank && s.fund.isin)
        .map((s, idx) => ({
          fund: s.fund,
          score: s.relativeMomentumScore,
          rank: idx + 1,
          excess: Number((s.relativeMomentumScore - hurdle).toFixed(2)),
          diffFromFirst: 0,
          return12M: Number(s.fund.return12M ?? 0),
          return6M: Number(s.fund.return6M ?? 0),
          return3M: Number(s.fund.return3M ?? 0),
          return1M: Number(s.fund.return1M ?? 0),
          sharpeRatio: Number(s.fund.sharpeRatio ?? 0),
          jensenAlpha: Number(s.fund.jensenAlpha ?? 0),
          volatility1Y: Number(s.fund.volatility1Y ?? 0),
        }))
        .sort((a, b) => b.score - a.score);

      // Re-assign ranks and diffs from 1st
      const firstScore = scoredList[0]?.score || 0;
      scoredList.forEach((item, index) => {
        item.rank = index + 1;
        item.diffFromFirst = Number((firstScore - item.score).toFixed(2));
      });

      // Filter risky funds for podium
      const riskyRanked = scoredList.filter(s => !s.fund.isSafeHaven);
      const top1 = riskyRanked[0] || scoredList[0];
      const top2 = riskyRanked[1];
      const top3 = riskyRanked[2];

      const calculatedScore = calculateMomentumScore(targetFund, cfg.mode);

      // Rotation risk based on 2nd fund distance
      let rotationRisk: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
      if (top2) {
        const diff = top2.diffFromFirst;
        if (diff < 0.75) {
          rotationRisk = 'HIGH';
        } else if (diff < 2.0) {
          rotationRisk = 'MEDIUM';
        } else {
          rotationRisk = 'LOW';
        }
      }

      return {
        mode: cfg.mode,
        modelName: cfg.name,
        modelSubtitle: cfg.subtitle,
        weightFormula: cfg.formula,
        color: cfg.color,
        badgeBg: cfg.badgeBg,
        badgeText: cfg.badgeText,
        badgeBorder: cfg.badgeBorder,
        scoreLabel: cfg.scoreLabel,
        assignedFund: targetFund,
        isDefenseMode: isDefense,
        score: calculatedScore,
        excessOverRf: Number((calculatedScore - hurdle).toFixed(2)),
        return12M: Number(targetFund.return12M ?? 0),
        return6M: Number(targetFund.return6M ?? 0),
        return3M: Number(targetFund.return3M ?? 0),
        return1M: Number(targetFund.return1M ?? 0),
        sharpeRatio: Number(targetFund.sharpeRatio ?? 0),
        jensenAlpha: Number(targetFund.jensenAlpha ?? 0),
        volatility1Y: Number(targetFund.volatility1Y ?? 0),
        top1,
        top2,
        top3,
        allRankedFunds: scoredList,
        rotationRisk
      };
    });
  }, [funds, activeFundId, hysteresisBuffer]);

  // Check consensus across the 4 models
  const consensusInfo = useMemo(() => {
    const assignedMap = new Map<string, number>();
    modelsData.forEach(m => {
      const isin = m.assignedFund.isin || m.assignedFund.id;
      assignedMap.set(isin, (assignedMap.get(isin) || 0) + 1);
    });

    let maxCount = 0;
    let mostAssignedIsin = '';
    assignedMap.forEach((count, isin) => {
      if (count > maxCount) {
        maxCount = count;
        mostAssignedIsin = isin;
      }
    });

    const unanimous = maxCount === modelsData.length;
    const consensusPercentage = Math.round((maxCount / modelsData.length) * 100);
    const topFund = modelsData.find(m => (m.assignedFund.isin || m.assignedFund.id) === mostAssignedIsin)?.assignedFund;

    return {
      unanimous,
      consensusPercentage,
      matchingCount: maxCount,
      totalModels: modelsData.length,
      topFund
    };
  }, [modelsData]);

  // Handle Sort for comparison table
  const handleSort = (key: string) => {
    if (tableSortKey === key) {
      setTableSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setTableSortKey(key);
      setTableSortDir(key === 'modelName' || key === 'fundName' ? 'asc' : 'desc');
    }
  };

  // Sorted items for table
  const sortedTableData = useMemo(() => {
    return [...modelsData].sort((a, b) => {
      let valA: any = 0;
      let valB: any = 0;

      switch (tableSortKey) {
        case 'modelName':
          valA = a.modelName;
          valB = b.modelName;
          break;
        case 'fundName':
          valA = a.assignedFund.name;
          valB = b.assignedFund.name;
          break;
        case 'isin':
          valA = a.assignedFund.isin;
          valB = b.assignedFund.isin;
          break;
        case 'score':
          valA = a.score;
          valB = b.score;
          break;
        case 'return12M':
          valA = a.return12M;
          valB = b.return12M;
          break;
        case 'return6M':
          valA = a.return6M;
          valB = b.return6M;
          break;
        case 'return3M':
          valA = a.return3M;
          valB = b.return3M;
          break;
        case 'return1M':
          valA = a.return1M;
          valB = b.return1M;
          break;
        case 'sharpeRatio':
          valA = a.sharpeRatio;
          valB = b.sharpeRatio;
          break;
        case 'jensenAlpha':
          valA = a.jensenAlpha;
          valB = b.jensenAlpha;
          break;
        case 'volatility1Y':
          valA = a.volatility1Y;
          valB = b.volatility1Y;
          break;
        default:
          valA = a.score;
          valB = b.score;
      }

      if (typeof valA === 'string') {
        return tableSortDir === 'asc' 
          ? valA.localeCompare(valB) 
          : valB.localeCompare(valA);
      }
      return tableSortDir === 'asc' ? valA - valB : valB - valA;
    });
  }, [modelsData, tableSortKey, tableSortDir]);

  // Active inspected model data for ranking breakdown
  const inspectedModel = useMemo(() => {
    return modelsData.find(m => m.mode === selectedInspectMode) || modelsData[0];
  }, [modelsData, selectedInspectMode]);

  // Podium Comparison Chart for the inspected model (1st vs 2nd vs 3rd)
  const podiumChartData = useMemo(() => {
    const items = [inspectedModel.top1, inspectedModel.top2, inspectedModel.top3].filter(Boolean) as RankedFundDetail[];
    return items.map((item, idx) => ({
      name: `${idx === 0 ? '🥇 1º' : idx === 1 ? '🥈 2º' : '🥉 3º'} ${item.fund.name.split(' ')[0]} ${item.fund.name.split(' ')[1] || ''}`,
      fullName: item.fund.name,
      isin: item.fund.isin,
      score: item.score,
      return12M: item.return12M,
      return6M: item.return6M,
      return3M: item.return3M,
      return1M: item.return1M,
      diff: item.diffFromFirst,
      rank: item.rank
    }));
  }, [inspectedModel]);

  return (
    <div className="space-y-6">
      
      {/* 1. TOP CONSENSUS & STRATEGY BANNER */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" />
                Matriz de Asignación y Podio Top 3
              </span>
              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono text-slate-300 bg-slate-800 border border-slate-700">
                Comparativa 1º vs 2º vs 3º por Modelo
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Resumen de Asignación y Comparativa del Podio (1º, 2º y 3º)
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Analiza de un solo vistazo el fondo líder asignado por cada modelo, su <strong className="text-slate-200">Score y rendimientos (12M, 6M, 3M, 1M)</strong>, y compáralo en tiempo real con el <strong className="text-sky-400">2º y 3º clasificado</strong> para vigilar el riesgo de rotación inminente antes del próximo rebalanceo mensual.
            </p>
          </div>

          {/* Consensus Gauge Card */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-4 shrink-0 lg:min-w-[320px]">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-xl border shrink-0 ${
              consensusInfo.unanimous
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-lg shadow-emerald-500/10'
                : consensusInfo.consensusPercentage >= 50
                ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
                : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
            }`}>
              {consensusInfo.consensusPercentage}%
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-1.5">
                {consensusInfo.unanimous ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <Activity className="w-4 h-4 text-cyan-400 shrink-0" />
                )}
                <strong className="text-white font-bold">
                  {consensusInfo.unanimous 
                    ? 'Consenso Total (100%)' 
                    : `Consenso Parcial (${consensusInfo.matchingCount}/${consensusInfo.totalModels})`}
                </strong>
              </div>
              <p className="text-slate-400 leading-tight">
                {consensusInfo.topFund ? (
                  <span>Líder indiscutible: <strong className="text-emerald-300 font-semibold">{consensusInfo.topFund.name}</strong></span>
                ) : (
                  <span>Divergencia entre modelos</span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. THE 4 MODEL CARDS WITH EXPANDED PODIUM (1ST, 2ND, 3RD) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {modelsData.map((m) => {
          const isWinnerHeld = activeFundId === m.assignedFund.id;

          return (
            <div 
              key={m.mode}
              className={`rounded-2xl bg-slate-900 border transition-all flex flex-col justify-between overflow-hidden relative ${
                selectedInspectMode === m.mode 
                  ? 'border-emerald-500/60 shadow-lg shadow-emerald-950/30 ring-1 ring-emerald-500/30' 
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Card Header */}
              <div className="p-4 pb-3 border-b border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold border ${m.badgeBg} ${m.badgeText} ${m.badgeBorder}`}>
                    {m.weightFormula}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold flex items-center gap-1 ${
                    m.isDefenseMode
                      ? 'bg-rose-950/80 text-rose-300 border border-rose-800/80'
                      : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/80'
                  }`}>
                    {m.isDefenseMode ? <Shield className="w-3 h-3 text-rose-400" /> : <TrendingUp className="w-3 h-3 text-emerald-400" />}
                    {m.isDefenseMode ? 'Refugio' : 'Renta Variable'}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
                    {m.modelName}
                  </h3>
                  <p className="text-[11px] text-slate-400 line-clamp-1" title={m.modelSubtitle}>
                    {m.modelSubtitle}
                  </p>
                </div>
              </div>

              {/* Card Body: 1st Assigned Fund Details */}
              <div className="p-4 space-y-3.5 flex-1">
                
                {/* 1st Place Box (Líder / Asignado) */}
                <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/40 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="flex items-center gap-1 text-emerald-400 font-bold">
                      <Award className="w-3.5 h-3.5" />
                      🥇 1º Asignado (Slot #{m.top1.fund.slotNumber})
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 text-xs font-bold border border-emerald-500/40">
                      Score: +{m.top1.score.toFixed(2)}%
                    </span>
                  </div>

                  <div className="text-xs font-bold text-white leading-snug line-clamp-2" title={m.top1.fund.name}>
                    {m.top1.fund.name}
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-emerald-900/40">
                    <span>ISIN: <strong className="text-slate-200">{m.top1.fund.isin}</strong></span>
                    <span className="text-emerald-400 font-semibold">{m.top1.fund.categoryLabel || 'Renta Variable'}</span>
                  </div>

                  {/* 1st Fund Return Horizons */}
                  <div className="grid grid-cols-4 gap-1 text-center pt-1">
                    <div className="p-1 rounded bg-slate-950/80 border border-slate-800 text-[10px]">
                      <span className="text-slate-500 block font-mono">12M</span>
                      <strong className={`font-mono ${m.top1.return12M >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        +{m.top1.return12M}%
                      </strong>
                    </div>
                    <div className="p-1 rounded bg-slate-950/80 border border-slate-800 text-[10px]">
                      <span className="text-slate-500 block font-mono">6M</span>
                      <strong className={`font-mono ${m.top1.return6M >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        +{m.top1.return6M}%
                      </strong>
                    </div>
                    <div className="p-1 rounded bg-slate-950/80 border border-slate-800 text-[10px]">
                      <span className="text-slate-500 block font-mono">3M</span>
                      <strong className={`font-mono ${m.top1.return3M >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        +{m.top1.return3M}%
                      </strong>
                    </div>
                    <div className="p-1 rounded bg-slate-950/80 border border-slate-800 text-[10px]">
                      <span className="text-slate-500 block font-mono">1M</span>
                      <strong className={`font-mono ${m.top1.return1M >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        +{m.top1.return1M}%
                      </strong>
                    </div>
                  </div>
                </div>

                {/* PODIUM COMPARISON: 2nd and 3rd Places */}
                <div className="space-y-2 pt-1 border-t border-slate-800/80">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span className="font-semibold text-slate-300">Aspirantes Inmediatos:</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
                      m.rotationRisk === 'HIGH'
                        ? 'bg-rose-950 text-rose-300 border border-rose-800'
                        : m.rotationRisk === 'MEDIUM'
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : 'bg-slate-800 text-slate-300'
                    }`}>
                      {m.rotationRisk === 'HIGH' ? '⚠️ Rotación Cercana' : m.rotationRisk === 'MEDIUM' ? '⚡ Competido' : '🛡️ Líder Sólido'}
                    </span>
                  </div>

                  {/* 2nd Place Item */}
                  {m.top2 ? (
                    <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between font-mono">
                        <span className="text-sky-300 font-bold flex items-center gap-1 text-[11px]">
                          🥈 2º {m.top2.fund.name.split(' ')[0]} {m.top2.fund.name.split(' ')[1] || ''}
                        </span>
                        <span className="text-sky-400 font-bold text-[11px]">
                          +{m.top2.score.toFixed(2)}% <span className="text-slate-400 font-normal text-[10px]">(-{m.top2.diffFromFirst}%)</span>
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                        <span>ISIN: {m.top2.fund.isin}</span>
                        <span>12M: <strong className="text-slate-200">+{m.top2.return12M}%</strong> | 6M: <strong className="text-slate-200">+{m.top2.return6M}%</strong> | 3M: <strong className="text-slate-200">+{m.top2.return3M}%</strong></span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-500 font-mono italic">No hay 2º clasificado activo</div>
                  )}

                  {/* 3rd Place Item */}
                  {m.top3 ? (
                    <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/60 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between font-mono">
                        <span className="text-slate-300 font-bold flex items-center gap-1 text-[11px]">
                          🥉 3º {m.top3.fund.name.split(' ')[0]} {m.top3.fund.name.split(' ')[1] || ''}
                        </span>
                        <span className="text-slate-300 font-bold text-[11px]">
                          +{m.top3.score.toFixed(2)}% <span className="text-slate-500 font-normal text-[10px]">(-{m.top3.diffFromFirst}%)</span>
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                        <span>ISIN: {m.top3.fund.isin}</span>
                        <span>12M: <strong className="text-slate-300">+{m.top3.return12M}%</strong> | 6M: <strong className="text-slate-300">+{m.top3.return6M}%</strong> | 3M: <strong className="text-slate-300">+{m.top3.return3M}%</strong></span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-500 font-mono italic">No hay 3º clasificado activo</div>
                  )}

                </div>

              </div>

              {/* Card Footer: Select/Inspect Action */}
              <div className="p-3 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between gap-2">
                <button
                  onClick={() => setSelectedInspectMode(m.mode)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer w-full justify-center ${
                    selectedInspectMode === m.mode
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>{selectedInspectMode === m.mode ? 'Inspeccionando Podio' : 'Comparar Podio & Ranking'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. PODIUM COMPARISON (1ST vs 2ND vs 3RD) DETAILED TABLE */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              Matriz Comparativa de Podio: 1º vs 2º vs 3º por Modelo Cuantitativo
            </h3>
            <p className="text-xs text-slate-400">
              Contrasta directamente los scores y rendimientos a 12M, 6M y 3M de los tres primeros clasificados en cada metodología.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> 1º Asignado</span>
            <span className="flex items-center gap-1 ml-2"><span className="w-2.5 h-2.5 rounded-full bg-sky-400" /> 2º Aspirante</span>
            <span className="flex items-center gap-1 ml-2"><span className="w-2.5 h-2.5 rounded-full bg-slate-400" /> 3º Candidato</span>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/90 text-slate-400 font-mono">
                <th className="py-3 px-4 font-semibold">Modelo</th>
                <th className="py-3 px-3 font-semibold">Posición Podio</th>
                <th className="py-3 px-4 font-semibold">Fondo / ISIN</th>
                <th className="py-3 px-3 font-semibold text-right">Score</th>
                <th className="py-3 px-3 font-semibold text-right">Dif vs 1º (Δ)</th>
                <th className="py-3 px-3 font-semibold text-right">12M</th>
                <th className="py-3 px-3 font-semibold text-right">6M</th>
                <th className="py-3 px-3 font-semibold text-right">3M</th>
                <th className="py-3 px-3 font-semibold text-right">1M</th>
                <th className="py-3 px-3 font-semibold text-right">Sharpe</th>
                <th className="py-3 px-3 font-semibold text-right">Alfa</th>
                <th className="py-3 px-3 font-semibold text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {modelsData.map((m) => {
                const podiumItems = [
                  { item: m.top1, label: '🥇 1º Líder', badgeColor: 'bg-emerald-950 text-emerald-300 border-emerald-500/40' },
                  { item: m.top2, label: '🥈 2º Aspirante', badgeColor: 'bg-sky-950 text-sky-300 border-sky-500/40' },
                  { item: m.top3, label: '🥉 3º Tercero', badgeColor: 'bg-slate-800 text-slate-300 border-slate-700' },
                ].filter(p => p.item !== undefined);

                return podiumItems.map((p, idx) => {
                  const detail = p.item!;
                  const isFirstOfGroup = idx === 0;

                  return (
                    <tr 
                      key={`${m.mode}-${detail.fund.id}`}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isFirstOfGroup ? 'border-t-2 border-slate-800 bg-slate-950/30' : ''
                      }`}
                    >
                      {/* Modelo (show on first row of group) */}
                      <td className="py-3 px-4 font-sans font-bold text-white">
                        {isFirstOfGroup ? (
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.color }} />
                            <span>{m.modelName}</span>
                          </div>
                        ) : (
                          <span className="text-slate-600 pl-4 font-normal text-[11px]">↳ {m.modelName.split(' ')[0]}</span>
                        )}
                      </td>

                      {/* Posición Podio */}
                      <td className="py-3 px-3 font-sans">
                        <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold border ${p.badgeColor}`}>
                          {p.label}
                        </span>
                      </td>

                      {/* Fondo / ISIN */}
                      <td className="py-3 px-4 font-sans">
                        <div className="font-semibold text-slate-200 line-clamp-1 max-w-[220px]" title={detail.fund.name}>
                          {detail.fund.name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          ISIN: {detail.fund.isin} • Slot #{detail.fund.slotNumber}
                        </div>
                      </td>

                      {/* Score */}
                      <td className="py-3 px-3 text-right">
                        <strong className={idx === 0 ? 'text-emerald-400 text-sm' : idx === 1 ? 'text-sky-300' : 'text-slate-300'}>
                          +{detail.score.toFixed(2)}%
                        </strong>
                      </td>

                      {/* Dif vs 1st */}
                      <td className="py-3 px-3 text-right">
                        {idx === 0 ? (
                          <span className="text-emerald-400 font-bold">Líder (0.00%)</span>
                        ) : (
                          <span className="text-slate-400 font-mono font-semibold">
                            -{detail.diffFromFirst.toFixed(2)}%
                          </span>
                        )}
                      </td>

                      {/* 12M */}
                      <td className={`py-3 px-3 text-right font-semibold ${detail.return12M >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        +{detail.return12M}%
                      </td>

                      {/* 6M */}
                      <td className={`py-3 px-3 text-right font-semibold ${detail.return6M >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        +{detail.return6M}%
                      </td>

                      {/* 3M */}
                      <td className={`py-3 px-3 text-right font-semibold ${detail.return3M >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        +{detail.return3M}%
                      </td>

                      {/* 1M */}
                      <td className={`py-3 px-3 text-right font-semibold ${detail.return1M >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        +{detail.return1M}%
                      </td>

                      {/* Sharpe */}
                      <td className="py-3 px-3 text-right text-slate-300">
                        {detail.sharpeRatio.toFixed(2)}
                      </td>

                      {/* Alfa */}
                      <td className={`py-3 px-3 text-right font-semibold ${detail.jensenAlpha >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        +{detail.jensenAlpha.toFixed(2)}%
                      </td>

                      {/* Estado */}
                      <td className="py-3 px-3 text-center font-sans">
                        {idx === 0 ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 text-[10px] font-bold border border-emerald-800">
                            Asignado
                          </span>
                        ) : idx === 1 ? (
                          <span className="px-2 py-0.5 rounded-full bg-sky-950 text-sky-300 text-[10px] font-bold border border-sky-800">
                            Aspirante
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500 font-mono">
                            3º
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                });
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. VISUAL COMPARISON CHART: PODIUM OF SELECTED MODEL */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                Gráfico Comparativo Podio
              </span>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                1º vs 2º vs 3º bajo el modelo: <strong className="text-emerald-400">{inspectedModel.modelName}</strong>
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              Fórmula: <span className="text-slate-200 font-mono font-semibold">{inspectedModel.weightFormula}</span>
            </p>
          </div>

          {/* Model Switcher Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {modelsData.map(m => (
              <button
                key={m.mode}
                onClick={() => setSelectedInspectMode(m.mode)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedInspectMode === m.mode
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                {m.modelName}
              </button>
            ))}
          </div>
        </div>

        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={podiumChartData} margin={{ top: 10, right: 20, left: 0, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
              <XAxis 
                dataKey="name" 
                stroke="#94a3b8" 
                fontSize={11} 
                tickLine={false}
                interval={0}
              />
              <YAxis 
                stroke="#94a3b8" 
                fontSize={11} 
                tickLine={false} 
                unit="%" 
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '0.75rem',
                  color: '#f8fafc',
                  fontSize: '12px',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
                }}
                formatter={(val: any, name: any) => [`${Number(val).toFixed(2)}%`, name]}
                labelFormatter={(label, payload) => {
                  const item = payload?.[0]?.payload;
                  return `${label} (${item?.isin || ''})`;
                }}
              />
              <Legend 
                verticalAlign="top" 
                height={36}
                formatter={(val) => {
                  if (val === 'score') return 'Score Modelo (%)';
                  if (val === 'return12M') return 'Rentabilidad 12M (%)';
                  if (val === 'return6M') return 'Rentabilidad 6M (%)';
                  if (val === 'return3M') return 'Rentabilidad 3M (%)';
                  return val;
                }}
              />
              <Bar dataKey="score" name="score" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="return12M" name="return12M" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              <Bar dataKey="return6M" name="return6M" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="return3M" name="return3M" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 5. FULL RANKING OF ALL 15 SLOTS UNDER SELECTED MODEL */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              Ranking Completo del 1 al 15 bajo: <strong className="text-emerald-400">{inspectedModel.modelName}</strong>
            </h3>
            <p className="text-xs text-slate-400">
              Consulta el orden de todos los fondos de tu cartera y la distancia exacta respecto al 1º clasificado.
            </p>
          </div>
        </div>

        {/* Funds Ranking Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-mono">
                <th className="py-2.5 px-3 font-semibold text-center">Rank</th>
                <th className="py-2.5 px-3 font-semibold">Slot / ISIN</th>
                <th className="py-2.5 px-4 font-semibold">Fondo</th>
                <th className="py-2.5 px-3 font-semibold">Categoría</th>
                <th className="py-2.5 px-3 font-semibold text-right">Score</th>
                <th className="py-2.5 px-3 font-semibold text-right">Dif vs 1º (Δ)</th>
                <th className="py-2.5 px-3 font-semibold text-right">12M</th>
                <th className="py-2.5 px-3 font-semibold text-right">6M</th>
                <th className="py-2.5 px-3 font-semibold text-right">3M</th>
                <th className="py-2.5 px-3 font-semibold text-right">1M</th>
                <th className="py-2.5 px-3 font-semibold text-right">Sharpe</th>
                <th className="py-2.5 px-3 font-semibold text-right">Alfa</th>
                <th className="py-2.5 px-3 font-semibold text-center">Rol</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {inspectedModel.allRankedFunds.map((item) => {
                const isTop1 = item.rank === 1 && !item.fund.isSafeHaven;
                const isTop2 = item.rank === 2 && !item.fund.isSafeHaven;
                const isTop3 = item.rank === 3 && !item.fund.isSafeHaven;
                const isSafe = item.fund.isSafeHaven;

                return (
                  <tr 
                    key={item.fund.id}
                    className={`hover:bg-slate-800/40 transition-colors ${
                      isTop1 ? 'bg-emerald-950/30' : isTop2 ? 'bg-sky-950/20' : isTop3 ? 'bg-slate-950/40' : ''
                    }`}
                  >
                    {/* Rank Badge */}
                    <td className="py-3 px-3 text-center">
                      <span className={`w-6 h-6 rounded-full inline-flex items-center justify-center text-xs font-bold ${
                        isTop1
                          ? 'bg-emerald-500 text-slate-950 shadow-sm'
                          : isTop2
                          ? 'bg-sky-500 text-slate-950'
                          : isTop3
                          ? 'bg-slate-600 text-white'
                          : 'bg-slate-800/80 text-slate-400'
                      }`}>
                        {item.rank}
                      </span>
                    </td>

                    {/* Slot / ISIN */}
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-200">
                        {item.fund.isin || 'Sin ISIN'}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Slot #{item.fund.slotNumber}
                      </div>
                    </td>

                    {/* Fondo */}
                    <td className="py-3 px-4 font-sans">
                      <div className="font-semibold text-slate-200 line-clamp-1 max-w-[240px]">
                        {item.fund.name}
                      </div>
                    </td>

                    {/* Categoría */}
                    <td className="py-3 px-3 font-sans">
                      <span className="text-[11px] text-slate-300">
                        {item.fund.categoryLabel || (isSafe ? 'Refugio / Monetario' : 'Renta Variable')}
                      </span>
                    </td>

                    {/* Score */}
                    <td className="py-3 px-3 text-right">
                      <strong className={`text-sm ${
                        item.score >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        +{item.score.toFixed(2)}%
                      </strong>
                    </td>

                    {/* Dif vs 1st */}
                    <td className="py-3 px-3 text-right">
                      {isTop1 ? (
                        <span className="text-emerald-400 font-bold">Líder</span>
                      ) : (
                        <span className="text-slate-400 font-semibold">
                          -{item.diffFromFirst.toFixed(2)}%
                        </span>
                      )}
                    </td>

                    {/* 12M */}
                    <td className={`py-3 px-3 text-right font-semibold ${Number(item.fund.return12M || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      +{item.fund.return12M}%
                    </td>

                    {/* 6M */}
                    <td className={`py-3 px-3 text-right font-semibold ${Number(item.fund.return6M || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      +{item.fund.return6M}%
                    </td>

                    {/* 3M */}
                    <td className={`py-3 px-3 text-right font-semibold ${Number(item.fund.return3M || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      +{item.fund.return3M}%
                    </td>

                    {/* 1M */}
                    <td className={`py-3 px-3 text-right font-semibold ${Number(item.fund.return1M || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      +{item.fund.return1M}%
                    </td>

                    {/* Sharpe */}
                    <td className="py-3 px-3 text-right text-slate-300">
                      {Number(item.fund.sharpeRatio || 0).toFixed(2)}
                    </td>

                    {/* Alfa */}
                    <td className={`py-3 px-3 text-right font-semibold ${Number(item.fund.jensenAlpha || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      +{Number(item.fund.jensenAlpha || 0).toFixed(2)}%
                    </td>

                    {/* Rol */}
                    <td className="py-3 px-3 text-center font-sans">
                      {isTop1 ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                          🥇 Líder 1º
                        </span>
                      ) : isTop2 ? (
                        <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40 text-[10px] font-bold">
                          🥈 2º Puesto
                        </span>
                      ) : isTop3 ? (
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-bold">
                          🥉 3º Puesto
                        </span>
                      ) : isSafe ? (
                        <span className="px-2 py-0.5 rounded bg-slate-800/80 text-slate-400 border border-slate-700 text-[10px]">
                          Refugio
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500">
                          #{item.rank}
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

    </div>
  );
};
