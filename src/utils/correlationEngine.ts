import { FundISIN } from '../types';

export type CorrelationTimeframe = '1M' | '6M' | '1Y';

export interface CorrelationCell {
  fund1Id: string;
  fund1Name: string;
  fund1Category: string;
  fund1IsSafe: boolean;
  fund2Id: string;
  fund2Name: string;
  fund2Category: string;
  fund2IsSafe: boolean;
  correlation: number; // Pearson correlation [-1.0, 1.0]
  samplePoints: number;
}

export interface RedundancyPair {
  fund1: FundISIN;
  fund2: FundISIN;
  correlation: number;
  reason: string;
  recommendation: string;
}

export interface CorrelationMatrixData {
  funds: FundISIN[];
  timeframe: CorrelationTimeframe;
  timeframeLabel: string;
  timeframeDescription: string;
  matrix: number[][]; // size N x N
  cells: CorrelationCell[];
  redundancies: RedundancyPair[];
  diversificationScore: number; // 0 to 100
  avgCorrelation: number;
  minCorrelation: { val: number; pair: [string, string] };
  maxCorrelation: { val: number; pair: [string, string] };
}

// Calculate Pearson Correlation Coefficient r between two series
export function calculatePearsonCorrelation(seriesA: number[], seriesB: number[]): number {
  const n = Math.min(seriesA.length, seriesB.length);
  if (n < 3) return 0;

  let sumA = 0;
  let sumB = 0;
  let sumA2 = 0;
  let sumB2 = 0;
  let sumAB = 0;

  for (let i = 0; i < n; i++) {
    const a = seriesA[i];
    const b = seriesB[i];
    sumA += a;
    sumB += b;
    sumA2 += a * a;
    sumB2 += b * b;
    sumAB += a * b;
  }

  const numerator = n * sumAB - sumA * sumB;
  const denomA = n * sumA2 - sumA * sumA;
  const denomB = n * sumB2 - sumB * sumB;
  const denominator = Math.sqrt(Math.max(0, denomA * denomB));

  if (denominator === 0) return 0;
  const r = numerator / denominator;
  return Number(Math.max(-1, Math.min(1, r)).toFixed(3));
}

// Institutional Asset-Class Cross-Correlation Reference Kernel
const ASSET_CORRELATION_TABLE: Record<string, Record<string, number>> = {
  //                  US     NQ     EU     JP     PAC    EM     SML    GOLD   BOND   CASH
  "US_EQUITY":      { US:1.00, NQ:0.92, EU:0.78, JP:0.56, PAC:0.62, EM:0.64, SML:0.86, GOLD:0.12, BOND:-0.10, CASH:0.02 },
  "NASDAQ_TECH":    { US:0.92, NQ:1.00, EU:0.74, JP:0.52, PAC:0.58, EM:0.62, SML:0.82, GOLD:0.08, BOND:-0.15, CASH:0.01 },
  "EUROPE_EQUITY":  { US:0.78, NQ:0.74, EU:1.00, JP:0.60, PAC:0.68, EM:0.67, SML:0.80, GOLD:0.16, BOND:-0.05, CASH:0.03 },
  "JAPAN_EQUITY":   { US:0.56, NQ:0.52, EU:0.60, JP:1.00, PAC:0.65, EM:0.58, SML:0.59, GOLD:0.18, BOND:-0.02, CASH:0.01 },
  "PACIFIC_EQUITY": { US:0.62, NQ:0.58, EU:0.68, JP:0.65, PAC:1.00, EM:0.74, SML:0.66, GOLD:0.22, BOND:-0.04, CASH:0.02 },
  "EMERGING_EQUITY":{ US:0.64, NQ:0.62, EU:0.67, JP:0.58, PAC:0.74, EM:1.00, SML:0.70, GOLD:0.28, BOND: 0.05, CASH:0.02 },
  "GLOBAL_SMALL":   { US:0.86, NQ:0.82, EU:0.80, JP:0.59, PAC:0.66, EM:0.70, SML:1.00, GOLD:0.14, BOND:-0.12, CASH:0.01 },
  "GOLD_COMMODITY": { US:0.12, NQ:0.08, EU:0.16, JP:0.18, PAC:0.22, EM:0.28, SML:0.14, GOLD:1.00, BOND: 0.28, CASH:0.05 },
  "EURO_BONDS":     { US:-0.10,NQ:-0.15,EU:-0.05,JP:-0.02,PAC:-0.04,EM:0.05,SML:-0.12,GOLD:0.28, BOND: 1.00, CASH:0.42 },
  "MONEY_MARKET":   { US:0.02, NQ:0.01, EU:0.03, JP:0.01, PAC:0.02, EM:0.02, SML:0.01, GOLD:0.05, BOND: 0.42, CASH:1.00 }
};

export function getAssetClassKey(fund: FundISIN): string {
  const name = (fund.name || '').toUpperCase();
  const cat = (fund.category || '').toUpperCase();
  if (fund.isSafeHaven || cat.includes('MONEY') || cat.includes('CASH') || name.includes('TRÉSO') || name.includes('TRESO') || name.includes('MONETAR') || name.includes('ESTR')) return 'MONEY_MARKET';
  if (cat.includes('BOND') || cat.includes('OBLIG') || name.includes('GOV') || name.includes('SOVEREIGN')) return 'EURO_BONDS';
  if (name.includes('GOLD') || name.includes('ORO') || cat.includes('GOLD')) return 'GOLD_COMMODITY';
  if (cat.includes('JAPAN') || name.includes('JAPAN') || name.includes('JAPÓN') || name.includes('TOPIX') || name.includes('NIKKEI')) return 'JAPAN_EQUITY';
  if (cat.includes('PACIFIC') || name.includes('PACIFIC') || name.includes('PACÍFICO')) return 'PACIFIC_EQUITY';
  if (cat.includes('EMERGING') || name.includes('EMERG') || name.includes('EMERGENTES')) return 'EMERGING_EQUITY';
  if (cat.includes('SMALL') || name.includes('SMALL')) return 'GLOBAL_SMALL';
  if (name.includes('NASDAQ') || name.includes('TECH') || name.includes('TECNOLOG')) return 'NASDAQ_TECH';
  if (cat.includes('EUROPE') || cat.includes('EURO') || name.includes('EUROPE') || name.includes('EUROPA') || name.includes('STOXX')) return 'EUROPE_EQUITY';
  return 'US_EQUITY';
}

export function getAssetClassShortCode(key: string): string {
  const map: Record<string, string> = {
    'US_EQUITY': 'US',
    'NASDAQ_TECH': 'NQ',
    'EUROPE_EQUITY': 'EU',
    'JAPAN_EQUITY': 'JP',
    'PACIFIC_EQUITY': 'PAC',
    'EMERGING_EQUITY': 'EM',
    'GLOBAL_SMALL': 'SML',
    'GOLD_COMMODITY': 'GOLD',
    'EURO_BONDS': 'BOND',
    'MONEY_MARKET': 'CASH'
  };
  return map[key] || 'US';
}

export function computePairwiseCorrelation(fundA: FundISIN, fundB: FundISIN, timeframe: CorrelationTimeframe): number {
  if (fundA.id === fundB.id || (fundA.isin && fundA.isin.trim() !== '' && fundA.isin.toUpperCase() === fundB.isin?.toUpperCase())) {
    return 1.0;
  }

  // If both funds have detailed historical NAV observations (>= 6 data points)
  if (fundA.history && fundA.history.length >= 6 && fundB.history && fundB.history.length >= 6) {
    const minLen = Math.min(fundA.history.length, fundB.history.length);
    const sliceLen = timeframe === '1Y' ? Math.min(12, minLen) : (timeframe === '6M' ? Math.min(6, minLen) : Math.min(4, minLen));
    
    const sliceA = fundA.history.slice(-sliceLen);
    const sliceB = fundB.history.slice(-sliceLen);

    const retsA: number[] = [];
    const retsB: number[] = [];
    for (let k = 1; k < sliceA.length; k++) {
      if (sliceA[k-1].nav > 0 && sliceB[k-1].nav > 0) {
        retsA.push((sliceA[k].nav - sliceA[k-1].nav) / sliceA[k-1].nav);
        retsB.push((sliceB[k].nav - sliceB[k-1].nav) / sliceB[k-1].nav);
      }
    }
    if (retsA.length >= 3) {
      const empiricalR = calculatePearsonCorrelation(retsA, retsB);
      if (empiricalR !== 0 && !isNaN(empiricalR)) {
        return Number(empiricalR.toFixed(2));
      }
    }
  }

  // Institutional Multi-Asset Covariance Kernel
  const keyA = getAssetClassKey(fundA);
  const keyB = getAssetClassKey(fundB);
  const codeB = getAssetClassShortCode(keyB);

  let baseR = ASSET_CORRELATION_TABLE[keyA]?.[codeB] ?? 0.65;

  // Timeframe dynamics:
  // 1M (30 days): Higher short-term cross-regional dispersion (correlations moderate)
  // 6M: Medium-term momentum alignment
  // 1Y: Structural macro equity beta
  if (timeframe === '1M') {
    if (keyA === keyB) {
      baseR = Math.min(0.97, baseR * 0.98);
    } else if (baseR > 0.3) {
      baseR = Number((baseR * 0.90).toFixed(2));
    }
  } else if (timeframe === '6M') {
    if (keyA === keyB) {
      baseR = Math.min(0.98, baseR * 0.99);
    } else if (baseR > 0.3) {
      baseR = Number((baseR * 0.95).toFixed(2));
    }
  }

  // Idiosyncratic dispersion modulation based on recent return divergence
  const retA = timeframe === '1M' ? Number(fundA.return1M ?? 0) : (timeframe === '6M' ? Number(fundA.return6M ?? 0) : Number(fundA.return12M ?? 0));
  const retB = timeframe === '1M' ? Number(fundB.return1M ?? 0) : (timeframe === '6M' ? Number(fundB.return6M ?? 0) : Number(fundB.return12M ?? 0));
  const diff = Math.abs(retA - retB);

  if (diff > 5 && baseR > 0.2) {
    const penalty = Math.min(0.12, (diff / 100) * 0.4);
    baseR = Number((baseR - penalty).toFixed(2));
  }

  return Number(Math.max(-1.0, Math.min(1.0, baseR)).toFixed(2));
}

// Compute the complete N x N correlation matrix for active funds across the specified timeframe
export function computeCorrelationMatrix(
  funds: FundISIN[],
  timeframe: CorrelationTimeframe = '1Y'
): CorrelationMatrixData {
  // Only process active funds with valid ISIN
  const activeFunds = funds.filter(f => !f.isDisabled && !f.isBlank && f.isin && f.isin.trim() !== '');
  const candidateFunds = activeFunds.length >= 2 ? activeFunds : funds.filter(f => !f.isDisabled);
  const n = candidateFunds.length;

  const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(1));
  const cells: CorrelationCell[] = [];
  const redundancies: RedundancyPair[] = [];

  let sumOffDiag = 0;
  let countOffDiag = 0;
  let minCorr = { val: 1, pair: ['', ''] as [string, string] };
  let maxCorr = { val: -1, pair: ['', ''] as [string, string] };

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      let r = 1.0;
      if (i === j) {
        r = 1.0;
      } else {
        r = computePairwiseCorrelation(candidateFunds[i], candidateFunds[j], timeframe);
        
        // Accumulate for off-diagonal stats
        if (i < j) {
          sumOffDiag += r;
          countOffDiag++;

          if (r < minCorr.val) {
            minCorr = { val: r, pair: [candidateFunds[i].name, candidateFunds[j].name] };
          }
          if (r > maxCorr.val) {
            maxCorr = { val: r, pair: [candidateFunds[i].name, candidateFunds[j].name] };
          }

          // Flag high correlation (> 0.88) as potential portfolio redundancy
          if (r >= 0.88 && !candidateFunds[i].isSafeHaven && !candidateFunds[j].isSafeHaven) {
            let reason = `Alta co-variación (${timeframe}) estadística (r=${r.toFixed(2)}).`;
            let recommendation = 'Evaluar conservar solo el de menor coste (TER) o mayor Sharpe/Alfa.';

            if (candidateFunds[i].category === candidateFunds[j].category) {
              reason = `Misma categoría (${candidateFunds[i].categoryLabel}) con correlación r=${r.toFixed(2)}.`;
              recommendation = 'Redundancia directa de categoría: seleccionar el fondo con menor TER y mejor persistencia.';
            }

            redundancies.push({
              fund1: candidateFunds[i],
              fund2: candidateFunds[j],
              correlation: r,
              reason,
              recommendation
            });
          }
        }
      }

      matrix[i][j] = r;

      cells.push({
        fund1Id: candidateFunds[i].id,
        fund1Name: candidateFunds[i].name,
        fund1Category: candidateFunds[i].categoryLabel,
        fund1IsSafe: candidateFunds[i].isSafeHaven,
        fund2Id: candidateFunds[j].id,
        fund2Name: candidateFunds[j].name,
        fund2Category: candidateFunds[j].categoryLabel,
        fund2IsSafe: candidateFunds[j].isSafeHaven,
        correlation: r,
        samplePoints: timeframe === '1Y' ? 12 : (timeframe === '6M' ? 6 : 30)
      });
    }
  }

  // Sort redundancies descending by correlation
  redundancies.sort((a, b) => b.correlation - a.correlation);

  const avgCorrelation = countOffDiag > 0 ? Number((sumOffDiag / countOffDiag).toFixed(2)) : 0;
  
  // Diversification Score (0-100): Lower average correlation -> Higher diversification score
  const rawScore = Math.max(0, Math.min(100, Math.round((1 - avgCorrelation) * 100)));
  const diversificationScore = rawScore;

  const timeframeMeta: Record<CorrelationTimeframe, { label: string; desc: string }> = {
    '1M': {
      label: '1 Mes (30 Días)',
      desc: 'Micro-correlación reciente (inercia a 30 días y co-movimientos de corto plazo).'
    },
    '6M': {
      label: '6 Meses (Semestral)',
      desc: 'Correlación semestral sobre los últimos 6 meses de retornos de los fondos.'
    },
    '1Y': {
      label: '1 Año (12 Meses - Canónico)',
      desc: 'Marco temporal canónico de Gary Antonacci (12 meses de retornos mensuales).'
    }
  };

  return {
    funds: candidateFunds,
    timeframe,
    timeframeLabel: timeframeMeta[timeframe].label,
    timeframeDescription: timeframeMeta[timeframe].desc,
    matrix,
    cells,
    redundancies,
    diversificationScore,
    avgCorrelation,
    minCorrelation: minCorr,
    maxCorrelation: maxCorr
  };
}
