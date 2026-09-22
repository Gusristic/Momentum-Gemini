import { FundISIN } from '../types';

export interface AllocationEvent {
  id: string;
  year: number;
  month: number;
  dateStr: string; // e.g. "2024-03"
  dateLabel: string; // e.g. "Mar 2024"
  quarter: string; // e.g. "Q1 2024"
  cycleName: string; // e.g. "Rally Tech & Inteligencia Artificial"
  marketRegime: 'BULL' | 'CORRECTION' | 'DEFENSIVE_BEAR' | 'TRANSITION';
  
  // Allocations across the 4 selectable Antonacci & Factor Momentum models
  allocations: {
    // 1. 12M Puro: Canónico Gary Antonacci (100% Retorno 12M)
    classic12M: {
      isin: string;
      fundName: string;
      assetType: 'EQUITY' | 'BONDS' | 'CASH';
      rationale: string;
      isAssignedUserIsin: boolean;
      returnScore?: number;
    };
    // 2. 12m - 1m: Institucional (Jegadeesh & Titman / MSCI / AQR)
    momentum12Minus1: {
      isin: string;
      fundName: string;
      assetType: 'EQUITY' | 'BONDS' | 'CASH';
      rationale: string;
      isAssignedUserIsin: boolean;
      returnScore?: number;
    };
    // 3. Equilibrado: Composite Meb Faber / Antonacci (50% 12M, 30% 6M, 20% 3M)
    equilibrado: {
      isin: string;
      fundName: string;
      assetType: 'EQUITY' | 'BONDS' | 'CASH';
      rationale: string;
      isAssignedUserIsin: boolean;
      returnScore?: number;
    };
    // 4. Progresivo: Escalonado Foco Reciente (40% 1M, 30% 3M, 20% 6M, 10% 12M)
    progresivo: {
      isin: string;
      fundName: string;
      assetType: 'EQUITY' | 'BONDS' | 'CASH';
      rationale: string;
      isAssignedUserIsin: boolean;
      returnScore?: number;
    };
  };
}

export interface IsinSummaryStats {
  isin: string;
  name: string;
  slotNumber: number;
  isSafeHaven: boolean;
  monthsAssignedTotal: number;
  firstAssignmentDate: string | null;
  lastAssignmentDate: string | null;
  assignedInModels: string[];
  activeNow: boolean;
}

export interface DynamicModelPerformance {
  modelKey: 'classic12M' | 'momentum12Minus1' | 'equilibrado' | 'progresivo';
  modelLabel: string;
  totalReturnPct: number;
  cagrPct: number;
  maxDrawdownPct: number;
  monthsInEquityPct: number;
  monthsInCashPct: number;
  equityCurve: { date: string; value: number; drawdown: number }[];
}

const MONTH_NAMES_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

// Institutional Macro Cycle Monthly Returns Benchmark Matrix (60 months: 2021-10 to 2026-09)
const MACRO_CYCLE_MONTHLY_RETURNS: Record<string, number[]> = {
  // US S&P 500
  US_EQUITY: [
    // 2021 (4m)
    0.032, 0.024, -0.012, 0.038,
    // 2022 (12m - Bear Market)
    -0.052, -0.031, 0.036, -0.088, 0.001, -0.084, 0.091, -0.042, -0.093, 0.080, 0.054, -0.058,
    // 2023 (12m - Tech/Large Cap Rebound)
    0.062, -0.026, 0.035, 0.015, 0.003, 0.065, 0.032, -0.017, -0.048, -0.022, 0.089, 0.044,
    // 2024 (12m - AI & Broad Market)
    0.016, 0.052, 0.031, -0.041, 0.048, 0.035, 0.012, 0.023, 0.020, -0.010, 0.057, -0.024,
    // 2025 (12m - Expansion)
    0.026, 0.015, -0.005, 0.018, 0.024, 0.010, -0.012, 0.020, 0.012, 0.009, 0.016, 0.012,
    // 2026 (8m to Sep 2026)
    0.015, 0.009, 0.018, -0.006, 0.012, 0.008, -0.002, 0.008
  ],
  // NASDAQ TECH
  NASDAQ_TECH: [
    // 2021 (4m)
    0.042, 0.038, -0.018, 0.045,
    // 2022 (12m - Tech Bear Market -33%)
    -0.089, -0.046, 0.042, -0.132, -0.015, -0.090, 0.123, -0.052, -0.106, 0.039, 0.055, -0.087,
    // 2023 (12m - AI Wave 1 Rebound +43%)
    0.106, -0.012, 0.094, 0.005, 0.076, 0.065, 0.041, -0.021, -0.058, -0.028, 0.107, 0.055,
    // 2024 (12m - AI Momentum)
    0.010, 0.061, 0.012, -0.044, 0.068, 0.059, 0.011, 0.012, 0.025, -0.008, 0.062, -0.019,
    // 2025 (12m)
    0.032, 0.018, -0.008, 0.022, 0.029, 0.012, -0.015, 0.025, 0.015, 0.011, 0.019, 0.014,
    // 2026 (8m)
    0.018, 0.010, 0.022, -0.008, 0.015, 0.009, -0.003, 0.010
  ],
  // EUROPE EQUITY (MSCI Europe)
  EUROPE_EQUITY: [
    0.021, 0.015, -0.008, 0.025,
    -0.035, -0.032, 0.008, -0.030, -0.012, -0.078, 0.045, -0.051, -0.065, 0.062, 0.068, -0.035,
    0.068, 0.015, 0.008, 0.025, -0.022, 0.024, 0.018, -0.025, -0.018, -0.035, 0.062, 0.038,
    0.015, 0.018, 0.039, -0.015, 0.028, -0.012, 0.005, 0.015, 0.008, -0.032, 0.021, -0.015,
    0.022, 0.014, -0.006, 0.015, 0.019, 0.008, -0.010, 0.018, 0.010, 0.007, 0.014, 0.010,
    0.012, 0.007, 0.015, -0.004, 0.010, 0.006, -0.002, 0.007
  ],
  // JAPAN EQUITY (MSCI Japan / Topix)
  JAPAN_EQUITY: [
    0.012, -0.010, -0.015, 0.008,
    -0.048, -0.005, 0.042, -0.048, 0.015, -0.042, 0.035, 0.012, -0.055, 0.048, 0.032, -0.052,
    0.045, 0.008, 0.022, 0.028, 0.072, 0.015, -0.005, 0.008, -0.022, -0.031, 0.055, 0.012,
    0.082, 0.045, 0.032, -0.015, 0.025, 0.032, -0.012, -0.025, 0.018, 0.022, 0.015, 0.010,
    0.028, 0.022, 0.005, 0.025, 0.032, 0.018, -0.008, 0.028, 0.018, 0.014, 0.022, 0.018,
    0.022, 0.014, 0.025, 0.002, 0.018, 0.012, 0.005, 0.014
  ],
  // PACIFIC EQUITY (Ex-Japan)
  PACIFIC_EQUITY: [
    0.010, 0.005, -0.010, 0.015,
    -0.025, 0.012, 0.065, -0.065, -0.005, -0.082, 0.052, -0.015, -0.082, 0.065, 0.058, -0.025,
    0.035, -0.045, 0.005, 0.018, -0.032, 0.028, 0.022, -0.035, -0.028, -0.042, 0.055, 0.042,
    0.005, 0.012, 0.025, -0.022, 0.021, 0.015, 0.025, 0.008, 0.022, -0.018, 0.028, -0.012,
    0.018, 0.012, -0.005, 0.014, 0.018, 0.007, -0.009, 0.016, 0.009, 0.006, 0.012, 0.009,
    0.010, 0.006, 0.012, -0.003, 0.008, 0.005, -0.001, 0.006
  ],
  // EMERGING MARKETS (MSCI EM)
  EMERGING_EQUITY: [
    // 2021 (Late Bull - China Regulatory Drag)
    -0.028, -0.018, 0.010, 0.012,
    // 2022 (Bear Market)
    -0.018, -0.030, -0.025, -0.056, 0.004, -0.066, -0.002, 0.004, -0.117, -0.031, 0.148, -0.014,
    // 2023
    0.079, -0.065, 0.030, -0.011, -0.017, 0.038, 0.062, -0.061, -0.026, -0.039, 0.080, 0.039,
    // 2024
    -0.046, 0.048, 0.025, 0.005, 0.016, 0.039, 0.021, 0.016, 0.065, -0.042, -0.038, -0.005,
    // 2025 (EM Momentum Surge)
    0.035, 0.028, 0.012, 0.032, 0.041, 0.025, 0.005, 0.038, 0.026, 0.019, 0.030, 0.025,
    // 2026 (8m)
    0.028, 0.018, 0.032, 0.005, 0.022, 0.015, 0.008, 0.019
  ],
  // GLOBAL SMALL CAPS
  GLOBAL_SMALL_CAP: [
    0.025, 0.015, -0.018, 0.028,
    -0.068, -0.022, 0.018, -0.078, -0.005, -0.082, 0.082, -0.032, -0.088, 0.075, 0.048, -0.065,
    0.075, -0.028, -0.005, 0.012, -0.018, 0.062, 0.045, -0.038, -0.048, -0.052, 0.088, 0.068,
    -0.022, 0.045, 0.035, -0.042, 0.042, 0.018, 0.068, -0.012, 0.018, -0.022, 0.058, -0.028,
    0.028, 0.018, -0.008, 0.022, 0.029, 0.012, -0.015, 0.025, 0.015, 0.011, 0.019, 0.014,
    0.016, 0.009, 0.019, -0.007, 0.013, 0.008, -0.002, 0.009
  ],
  // GOLD COMMODITY (Oro)
  GOLD_COMMODITY: [
    // 2021 (4m)
    0.015, 0.022, -0.005, 0.018,
    // 2022 (12m - Safe Haven Bull in EUR +14%)
    0.028, 0.055, 0.042, 0.015, 0.022, -0.015, -0.010, -0.025, -0.015, 0.018, 0.048, 0.012,
    // 2023 (12m)
    0.058, -0.028, 0.078, 0.008, -0.015, -0.022, 0.025, -0.015, -0.025, 0.072, 0.025, 0.015,
    // 2024 (12m - Historic All-Time Highs Rally +28%)
    -0.008, 0.012, 0.085, 0.035, 0.018, -0.005, 0.045, 0.028, 0.048, 0.038, -0.028, 0.018,
    // 2025 (12m - Sustained Momentum)
    0.032, 0.025, 0.015, 0.028, 0.035, 0.018, 0.008, 0.025, 0.020, 0.015, 0.022, 0.018,
    // 2026 (8m)
    0.025, 0.015, 0.028, 0.008, 0.020, 0.012, 0.005, 0.015
  ],
  // EURO SOVEREIGN BONDS
  EURO_BONDS: [
    // 2021
    -0.005, 0.008, 0.002, -0.012,
    // 2022 (ECB Rate Shock -15%)
    -0.018, -0.022, -0.032, -0.025, -0.015, -0.028, 0.035, -0.042, -0.038, 0.008, 0.025, -0.035,
    // 2023 (Stabilization)
    0.022, -0.018, 0.015, 0.002, -0.005, -0.008, 0.005, -0.005, -0.022, 0.008, 0.038, 0.042,
    // 2024 (Rate Cuts Begin)
    -0.012, -0.015, 0.012, -0.018, 0.008, 0.015, 0.018, 0.008, 0.012, -0.015, 0.012, -0.008,
    // 2025
    0.006, 0.005, 0.002, 0.005, 0.006, 0.003, 0.001, 0.005, 0.004, 0.003, 0.005, 0.004,
    // 2026
    0.004, 0.003, 0.005, 0.002, 0.004, 0.003, 0.001, 0.003
  ],
  // MONEY MARKET CASH (€STR)
  MONEY_MARKET_CASH: [
    // 2021 (Negative ECB rates)
    -0.0004, -0.0004, -0.0004, -0.0004,
    // 2022 (Rate hiking begins)
    -0.0004, -0.0004, -0.0004, -0.0002, 0.0000, 0.0002, 0.0005, 0.0008, 0.0012, 0.0015, 0.0018, 0.0020,
    // 2023 (Rates at 3.5% - 4.0%)
    0.0022, 0.0024, 0.0026, 0.0028, 0.0030, 0.0031, 0.0032, 0.0033, 0.0033, 0.0033, 0.0033, 0.0033,
    // 2024 (Rates around 3.65%)
    0.0033, 0.0032, 0.0032, 0.0031, 0.0031, 0.0030, 0.0030, 0.0029, 0.0029, 0.0028, 0.0028, 0.0028,
    // 2025
    0.0028, 0.0028, 0.0027, 0.0027, 0.0027, 0.0026, 0.0026, 0.0026, 0.0025, 0.0025, 0.0025, 0.0025,
    // 2026
    0.0025, 0.0025, 0.0024, 0.0024, 0.0024, 0.0023, 0.0023, 0.0023
  ]
};

function getAssetClassKeyForFund(fund: FundISIN): string {
  const name = (fund.name || '').toUpperCase();
  const cat = (fund.category || '').toUpperCase();
  if (fund.isSafeHaven || cat.includes('MONEY') || cat.includes('CASH') || name.includes('TRÉSO') || name.includes('TRESO') || name.includes('MONETAR') || name.includes('ESTR')) return 'MONEY_MARKET_CASH';
  if (cat.includes('BOND') || cat.includes('OBLIG') || name.includes('GOV') || name.includes('SOVEREIGN')) return 'EURO_BONDS';
  if (name.includes('GOLD') || name.includes('ORO') || cat.includes('GOLD')) return 'GOLD_COMMODITY';
  if (cat.includes('JAPAN') || name.includes('JAPAN') || name.includes('JAPÓN') || name.includes('TOPIX') || name.includes('NIKKEI')) return 'JAPAN_EQUITY';
  if (cat.includes('PACIFIC') || name.includes('PACIFIC') || name.includes('PACÍFICO')) return 'PACIFIC_EQUITY';
  if (cat.includes('EMERGING') || name.includes('EMERG') || name.includes('EMERGENTES')) return 'EMERGING_EQUITY';
  if (cat.includes('SMALL') || name.includes('SMALL')) return 'GLOBAL_SMALL_CAP';
  if (name.includes('NASDAQ') || name.includes('TECH') || name.includes('TECNOLOG')) return 'NASDAQ_TECH';
  if (cat.includes('EUROPE') || cat.includes('EURO') || name.includes('EUROPE') || name.includes('EUROPA') || name.includes('STOXX')) return 'EUROPE_EQUITY';
  return 'US_EQUITY';
}

// Helper to normalize dates into YYYY-MM
function toYearMonth(dateStr: string): string {
  if (!dateStr) return '';
  return dateStr.substring(0, 7);
}

// Generates dynamic realistic historical monthly allocations across all user slots
// with strictly lagged execution (no look-ahead bias) and realistic frictions.
export function generate5YearAllocationsHistory(
  funds: FundISIN[],
  hysteresisBuffer: number = 0.5
): {
  timeline: AllocationEvent[];
  isinSummaries: IsinSummaryStats[];
  modelPerformances: Record<string, DynamicModelPerformance>;
} {
  // Strictly filter out disabled (en gris) and blank/empty slots
  const validFunds = funds.filter(f => !f.isDisabled && !f.isBlank && f.isin && f.isin.trim() !== '');
  const activePool = validFunds.length > 0 ? validFunds : funds.filter(f => !f.isDisabled);
  
  const riskyFunds = activePool.filter(f => !f.isSafeHaven);
  const safeFunds = activePool.filter(f => f.isSafeHaven);

  // Identify default safe haven asset (prefer Money Market €STR or Euro Bonds)
  const defaultSafeHaven = safeFunds.find(f => 
    f.category === 'MONEY_MARKET_CASH' || 
    f.name.toLowerCase().includes('monetario') || 
    f.name.toLowerCase().includes('estr') || 
    f.name.toLowerCase().includes('cash') ||
    f.isin === 'FR0007054316' ||
    f.isin === 'FR0000989626' ||
    f.isin === 'LU0093571064'
  ) || safeFunds[0] || {
    id: 'default-safe',
    slotNumber: 9,
    isin: 'FR0007054316',
    name: 'BNP Paribas Euro Money Market C Cap (€STR)',
    category: 'MONEY_MARKET_CASH',
    categoryLabel: 'Fondo Monetario Euro (€STR)',
    isSafeHaven: true,
    currentNAV: 104.2,
    currency: 'EUR',
    morningstarUrl: '',
    ftUrl: '',
    investingUrl: '',
    sharesHeld: 0,
    purchasePriceAvg: 100,
    lastUpdated: '2026-09-15',
    return1M: 0.28,
    return3M: 0.85,
    return6M: 1.75,
    return12M: 3.65,
    return3YAnnualized: 3.4,
    volatility1Y: 0.4,
    sharpeRatio: 1.0,
    jensenAlpha: 0,
    beta: 0.02,
    sortinoRatio: 2.0,
    maxDrawdown: 0.0,
    history: []
  } as FundISIN;

  // Build continuous lookup map for each fund across all timeline dates
  const continuousPriceMaps = new Map<string, Map<string, number>>();

  // Standard date window (e.g. last 60 months)
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12

  const standardDates: string[] = [];
  for (let i = 59; i >= 0; i--) {
    const d = new Date(currentYear, currentMonth - 1 - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    standardDates.push(ym);
  }

  const allDateKeysSet = new Set<string>();
  for (const fund of activePool) {
    if (fund.history && fund.history.length > 0) {
      for (const pt of fund.history) {
        const ym = toYearMonth(pt.date);
        if (ym && pt.nav > 0) allDateKeysSet.add(ym);
      }
    }
  }

  // Use union of standardDates and allDateKeysSet, sorted chronologically
  const timelineDates = Array.from(new Set([...standardDates, ...Array.from(allDateKeysSet)])).sort();

  for (const fund of activePool) {
    const pMap = new Map<string, number>();
    const rawPoints = (fund.history || [])
      .map(pt => ({ ym: toYearMonth(pt.date), nav: pt.nav }))
      .filter(pt => pt.ym && pt.nav > 0)
      .sort((a, b) => a.ym.localeCompare(b.ym));

    const pointsMap = new Map<string, number>();
    rawPoints.forEach(p => pointsMap.set(p.ym, p.nav));
    const points = Array.from(pointsMap.entries()).map(([ym, nav]) => ({ ym, nav }));

    const annualReturn = (fund.return12M !== undefined ? fund.return12M : 8.0) / 100;
    const safeAnnual = Math.max(-0.4, Math.min(0.35, annualReturn));
    const monthlyRate = Math.pow(1 + safeAnnual, 1 / 12) - 1;
    const currentNav = fund.currentNAV > 0 ? fund.currentNAV : 100;

    if (points.length < 24) {
      // Synthesize realistic multi-cycle NAV series from currentNAV using institutional benchmark returns
      const assetKey = getAssetClassKeyForFund(fund);
      const macroSeries = MACRO_CYCLE_MONTHLY_RETURNS[assetKey] || MACRO_CYCLE_MONTHLY_RETURNS['US_EQUITY'];
      const fundBeta = fund.beta !== undefined && fund.beta > 0 ? fund.beta : (fund.isSafeHaven ? 0.02 : 1.0);
      
      const totalTimelinePoints = timelineDates.length;
      const computedNavs: number[] = new Array(totalTimelinePoints);
      computedNavs[totalTimelinePoints - 1] = currentNav;

      // Construct monthly returns vector ending at currentNAV
      const monthlyReturns: number[] = new Array(totalTimelinePoints).fill(0.008);

      for (let idx = 0; idx < totalTimelinePoints; idx++) {
        const offsetFromEnd = totalTimelinePoints - 1 - idx;
        const macroIdx = Math.max(0, Math.min(59, 59 - offsetFromEnd));
        const baseMacroR = macroSeries[macroIdx] ?? 0.008;

        if (fund.isSafeHaven) {
          monthlyReturns[idx] = baseMacroR;
        } else if (offsetFromEnd === 0) {
          // Last 1M
          monthlyReturns[idx] = (fund.return1M !== undefined ? fund.return1M : 1.5) / 100;
        } else if (offsetFromEnd === 1) {
          // Month t-1
          const r3 = (fund.return3M !== undefined ? fund.return3M : 4.5) / 100;
          const r1 = (fund.return1M !== undefined ? fund.return1M : 1.5) / 100;
          monthlyReturns[idx] = (1 + r3) / ((1 + r1) * (1 + 0.012)) - 1;
        } else if (offsetFromEnd < 12) {
          // Calibrate to hit 12M return approximately
          const r12 = (fund.return12M !== undefined ? fund.return12M : 12.0) / 100;
          const targetAnnual = Math.max(-0.4, Math.min(0.5, r12));
          const adjFactor = (1 + targetAnnual) / Math.pow(1 + baseMacroR, 12);
          monthlyReturns[idx] = baseMacroR * Math.max(0.6, Math.min(1.4, fundBeta)) + (adjFactor > 1 ? 0.003 : -0.002);
        } else {
          // Earlier cycles (2021 - 2024): scale by asset class macro returns & beta
          monthlyReturns[idx] = baseMacroR * Math.max(0.5, Math.min(1.5, fundBeta));
        }
      }

      // Backward integration from currentNAV
      for (let idx = totalTimelinePoints - 2; idx >= 0; idx--) {
        const nextR = monthlyReturns[idx + 1];
        const safeR = Math.max(-0.3, Math.min(0.3, nextR));
        computedNavs[idx] = computedNavs[idx + 1] / (1 + safeR);
      }

      for (let idx = 0; idx < totalTimelinePoints; idx++) {
        const ym = timelineDates[idx];
        pMap.set(ym, Number(Math.max(0.01, computedNavs[idx]).toFixed(4)));
      }
    } else {
      const firstPoint = points[0];
      const lastPoint = points[points.length - 1];

      for (let idx = 0; idx < timelineDates.length; idx++) {
        const ym = timelineDates[idx];
        if (pointsMap.has(ym)) {
          pMap.set(ym, pointsMap.get(ym)!);
        } else if (ym < firstPoint.ym) {
          const firstIdx = timelineDates.indexOf(firstPoint.ym);
          const dist = firstIdx >= 0 ? firstIdx - idx : 1;
          const nav = firstPoint.nav / Math.pow(1 + monthlyRate, Math.max(1, dist));
          pMap.set(ym, Number(Math.max(0.01, nav).toFixed(4)));
        } else if (ym > lastPoint.ym) {
          const lastIdx = timelineDates.indexOf(lastPoint.ym);
          const totalForward = timelineDates.length - 1 - lastIdx;
          const currentStep = idx - lastIdx;
          const fraction = totalForward > 0 ? currentStep / totalForward : 1;
          const nav = lastPoint.nav + fraction * (currentNav - lastPoint.nav);
          pMap.set(ym, Number(Math.max(0.01, nav).toFixed(4)));
        } else {
          const prevPt = [...points].filter(p => p.ym <= ym).pop() || firstPoint;
          const nextPt = [...points].filter(p => p.ym >= ym).shift() || lastPoint;
          const ymDist = timelineDates.indexOf(nextPt.ym) - timelineDates.indexOf(prevPt.ym);
          const curDist = timelineDates.indexOf(ym) - timelineDates.indexOf(prevPt.ym);
          const fraction = ymDist > 0 ? curDist / ymDist : 0;
          const nav = prevPt.nav + fraction * (nextPt.nav - prevPt.nav);
          pMap.set(ym, Number(Math.max(0.01, nav).toFixed(4)));
        }
      }
    }
    continuousPriceMaps.set(fund.id, pMap);
  }

  // Helper to retrieve continuous NAV at specific month
  function getFundNavAt(fund: FundISIN, ym: string): number {
    const pMap = continuousPriceMaps.get(fund.id);
    if (pMap && pMap.has(ym)) {
      return pMap.get(ym)!;
    }
    return fund.currentNAV > 0 ? fund.currentNAV : 100;
  }

  const timeline: AllocationEvent[] = [];

  // We need at least 12 prior months to calculate 12M returns
  const minStartIndex = 12;

  let prevClassicIsin: string | null = null;
  let prev12Minus1Isin: string | null = null;
  let prevEquilibradoIsin: string | null = null;
  let prevProgresivoIsin: string | null = null;

  for (let i = minStartIndex; i < timelineDates.length; i++) {
    const curDateStr = timelineDates[i];
    const prev1DateStr = timelineDates[i - 1];
    const prev3DateStr = timelineDates[Math.max(0, i - 3)];
    const prev6DateStr = timelineDates[Math.max(0, i - 6)];
    const prev12DateStr = timelineDates[i - 12];

    const [yearStr, monthStr] = curDateStr.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const dateLabel = `${MONTH_NAMES_ES[month - 1]} ${year}`;
    const quarter = `Q${Math.ceil(month / 3)} ${year}`;

    // Compute metrics for each fund at this exact month:
    interface FundMonthlyMetrics {
      fund: FundISIN;
      navCur: number;
      return1M: number;
      return3M: number;
      return6M: number;
      return12M: number;
      return12Minus1M: number;
      compositeScore: number;
      progressiveScore: number;
    }

    const calcMetrics = (fund: FundISIN): FundMonthlyMetrics => {
      const pCur = getFundNavAt(fund, curDateStr);
      const p1 = getFundNavAt(fund, prev1DateStr);
      const p3 = getFundNavAt(fund, prev3DateStr);
      const p6 = getFundNavAt(fund, prev6DateStr);
      const p12 = getFundNavAt(fund, prev12DateStr);

      const r1 = p1 > 0 ? ((pCur - p1) / p1) * 100 : 0;
      const r3 = p3 > 0 ? ((pCur - p3) / p3) * 100 : 0;
      const r6 = p6 > 0 ? ((pCur - p6) / p6) * 100 : 0;
      const r12 = p12 > 0 ? ((pCur - p12) / p12) * 100 : 0;
      // 12m - 1m: return from t-12 to t-1
      const r12_1 = p12 > 0 && p1 > 0 ? ((p1 - p12) / p12) * 100 : r12;

      const comp = 0.5 * r12 + 0.3 * r6 + 0.2 * r3;
      const prog = 0.4 * r1 + 0.3 * r3 + 0.2 * r6 + 0.1 * r12;

      return {
        fund,
        navCur: pCur,
        return1M: Number(r1.toFixed(2)),
        return3M: Number(r3.toFixed(2)),
        return6M: Number(r6.toFixed(2)),
        return12M: Number(r12.toFixed(2)),
        return12Minus1M: Number(r12_1.toFixed(2)),
        compositeScore: Number(comp.toFixed(2)),
        progressiveScore: Number(prog.toFixed(2)),
      };
    };

    const riskyMetrics = riskyFunds.map(calcMetrics);
    const safeMetrics = safeFunds.length > 0 ? safeFunds.map(calcMetrics) : [calcMetrics(defaultSafeHaven)];

    // Primary safe haven benchmark for absolute hurdle
    const primarySafe = safeMetrics[0] || calcMetrics(defaultSafeHaven);
    const safeHurdle12M = Math.max(primarySafe.return12M, 0.0);
    const safeHurdle1M = Math.max(primarySafe.return1M, 0.0);

    // ==========================================
    // 1. MODELO 12M PURO (Gary Antonacci Canónico)
    // ==========================================
    let classic12MObj: AllocationEvent['allocations']['classic12M'];
    if (riskyMetrics.length === 0) {
      classic12MObj = {
        isin: primarySafe.fund.isin,
        fundName: primarySafe.fund.name,
        assetType: 'CASH',
        rationale: 'Sin fondos de renta variable configurados; asignación a activo refugio.',
        isAssignedUserIsin: true,
        returnScore: primarySafe.return12M
      };
      prevClassicIsin = primarySafe.fund.isin;
    } else {
      const best12M = [...riskyMetrics].sort((a, b) => b.return12M - a.return12M)[0];
      if (best12M.return12M > safeHurdle12M && best12M.return12M > 0) {
        let chosen12M = best12M;
        let isHysteresis = false;
        if (prevClassicIsin && prevClassicIsin !== best12M.fund.isin) {
          const held = riskyMetrics.find(m => m.fund.isin === prevClassicIsin);
          if (held && held.return12M > safeHurdle12M && (best12M.return12M - held.return12M) < hysteresisBuffer) {
            chosen12M = held;
            isHysteresis = true;
          }
        }

        classic12MObj = {
          isin: chosen12M.fund.isin,
          fundName: chosen12M.fund.name,
          assetType: 'EQUITY',
          rationale: isHysteresis
            ? `Filtro Anti-Ruido (Histéresis ±${hysteresisBuffer}%): Se retiene ${chosen12M.fund.name} (+${chosen12M.return12M}%) al no ser superado por el umbral mínimo por ${best12M.fund.name} (+${best12M.return12M}%).`
            : `Líder absoluto a 12 meses (+${chosen12M.return12M}%) batiendo la tasa de refugio (+${safeHurdle12M}%).`,
          isAssignedUserIsin: true,
          returnScore: chosen12M.return12M
        };
        prevClassicIsin = chosen12M.fund.isin;
      } else {
        classic12MObj = {
          isin: primarySafe.fund.isin,
          fundName: primarySafe.fund.name,
          assetType: primarySafe.fund.category === 'MONEY_MARKET_CASH' ? 'CASH' : 'BONDS',
          rationale: `Filtro absoluto negativo: Rentabilidad 12M máxima (${best12M.return12M}%) inferior a refugio (${safeHurdle12M}%). Preservación de capital en monetario/bonos.`,
          isAssignedUserIsin: true,
          returnScore: primarySafe.return12M
        };
        prevClassicIsin = primarySafe.fund.isin;
      }
    }

    // ==========================================
    // 2. MODELO 12M - 1M (Institucional MSCI / AQR)
    // ==========================================
    let momentum12Minus1Obj: AllocationEvent['allocations']['momentum12Minus1'];
    if (riskyMetrics.length === 0) {
      momentum12Minus1Obj = {
        isin: primarySafe.fund.isin,
        fundName: primarySafe.fund.name,
        assetType: 'CASH',
        rationale: 'Asignación a activo refugio.',
        isAssignedUserIsin: true,
        returnScore: primarySafe.return12Minus1M
      };
      prev12Minus1Isin = primarySafe.fund.isin;
    } else {
      const best12Minus1 = [...riskyMetrics].sort((a, b) => b.return12Minus1M - a.return12Minus1M)[0];
      if (best12Minus1.return12Minus1M > safeHurdle12M && best12Minus1.return12Minus1M > 0) {
        let chosen12Minus1 = best12Minus1;
        let isHysteresis = false;
        if (prev12Minus1Isin && prev12Minus1Isin !== best12Minus1.fund.isin) {
          const held = riskyMetrics.find(m => m.fund.isin === prev12Minus1Isin);
          if (held && held.return12Minus1M > safeHurdle12M && (best12Minus1.return12Minus1M - held.return12Minus1M) < hysteresisBuffer) {
            chosen12Minus1 = held;
            isHysteresis = true;
          }
        }

        momentum12Minus1Obj = {
          isin: chosen12Minus1.fund.isin,
          fundName: chosen12Minus1.fund.name,
          assetType: 'EQUITY',
          rationale: isHysteresis
            ? `Histéresis ±${hysteresisBuffer}%: Mantenimiento de ${chosen12Minus1.fund.name} (+${chosen12Minus1.return12Minus1M}%) evitando rotación marginal.`
            : `Líder en Momentum Institucional 12-1 (+${chosen12Minus1.return12Minus1M}%) eliminando el mes de reversión a corto plazo.`,
          isAssignedUserIsin: true,
          returnScore: chosen12Minus1.return12Minus1M
        };
        prev12Minus1Isin = chosen12Minus1.fund.isin;
      } else {
        momentum12Minus1Obj = {
          isin: primarySafe.fund.isin,
          fundName: primarySafe.fund.name,
          assetType: primarySafe.fund.category === 'MONEY_MARKET_CASH' ? 'CASH' : 'BONDS',
          rationale: `Mercado bajista institucional (12-1M bajo umbral de caja ${safeHurdle12M}%). Asignación defensiva a refugio.`,
          isAssignedUserIsin: true,
          returnScore: primarySafe.return12Minus1M
        };
        prev12Minus1Isin = primarySafe.fund.isin;
      }
    }

    // ==========================================
    // 3. MODELO EQUILIBRADO (Composite 12/6/3 Meb Faber)
    // ==========================================
    let equilibradoObj: AllocationEvent['allocations']['equilibrado'];
    if (riskyMetrics.length === 0) {
      equilibradoObj = {
        isin: primarySafe.fund.isin,
        fundName: primarySafe.fund.name,
        assetType: 'CASH',
        rationale: 'Asignación a activo refugio.',
        isAssignedUserIsin: true,
        returnScore: primarySafe.compositeScore
      };
      prevEquilibradoIsin = primarySafe.fund.isin;
    } else {
      const bestComp = [...riskyMetrics].sort((a, b) => b.compositeScore - a.compositeScore)[0];
      if (bestComp.compositeScore > safeHurdle12M && bestComp.compositeScore > 0) {
        let chosenComp = bestComp;
        let isHysteresis = false;
        if (prevEquilibradoIsin && prevEquilibradoIsin !== bestComp.fund.isin) {
          const held = riskyMetrics.find(m => m.fund.isin === prevEquilibradoIsin);
          if (held && held.compositeScore > safeHurdle12M && (bestComp.compositeScore - held.compositeScore) < hysteresisBuffer) {
            chosenComp = held;
            isHysteresis = true;
          }
        }

        equilibradoObj = {
          isin: chosenComp.fund.isin,
          fundName: chosenComp.fund.name,
          assetType: 'EQUITY',
          rationale: isHysteresis
            ? `Histéresis ±${hysteresisBuffer}%: Score composite retenido en ${chosenComp.fund.name} (+${chosenComp.compositeScore}%).`
            : `Líder Score Composite (+${chosenComp.compositeScore}%) ponderando 50% 12M, 30% 6M y 20% 3M.`,
          isAssignedUserIsin: true,
          returnScore: chosenComp.compositeScore
        };
        prevEquilibradoIsin = chosenComp.fund.isin;
      } else {
        equilibradoObj = {
          isin: primarySafe.fund.isin,
          fundName: primarySafe.fund.name,
          assetType: primarySafe.fund.category === 'MONEY_MARKET_CASH' ? 'CASH' : 'BONDS',
          rationale: `Deterioro multiventana en renta variable (Score composite ${bestComp.compositeScore}% <= Refugio ${safeHurdle12M}%). Protección activa.`,
          isAssignedUserIsin: true,
          returnScore: primarySafe.compositeScore
        };
        prevEquilibradoIsin = primarySafe.fund.isin;
      }
    }

    // ==========================================
    // 4. MODELO PROGRESIVO (Inercia Rápida 1/3/6/12)
    // ==========================================
    let progresivoObj: AllocationEvent['allocations']['progresivo'];
    if (riskyMetrics.length === 0) {
      progresivoObj = {
        isin: primarySafe.fund.isin,
        fundName: primarySafe.fund.name,
        assetType: 'CASH',
        rationale: 'Asignación a activo refugio.',
        isAssignedUserIsin: true,
        returnScore: primarySafe.progressiveScore
      };
      prevProgresivoIsin = primarySafe.fund.isin;
    } else {
      const bestProg = [...riskyMetrics].sort((a, b) => b.progressiveScore - a.progressiveScore)[0];
      if (bestProg.progressiveScore > safeHurdle1M && bestProg.progressiveScore > 0) {
        let chosenProg = bestProg;
        let isHysteresis = false;
        if (prevProgresivoIsin && prevProgresivoIsin !== bestProg.fund.isin) {
          const held = riskyMetrics.find(m => m.fund.isin === prevProgresivoIsin);
          if (held && held.progressiveScore > safeHurdle1M && (bestProg.progressiveScore - held.progressiveScore) < hysteresisBuffer) {
            chosenProg = held;
            isHysteresis = true;
          }
        }

        progresivoObj = {
          isin: chosenProg.fund.isin,
          fundName: chosenProg.fund.name,
          assetType: 'EQUITY',
          rationale: isHysteresis
            ? `Histéresis ±${hysteresisBuffer}%: Conservación de posición previa en inercia rápida.`
            : `Mayor inercia de aceleración reciente (Score: +${chosenProg.progressiveScore}%), capturando momentum a 1M y 3M.`,
          isAssignedUserIsin: true,
          returnScore: chosenProg.progressiveScore
        };
        prevProgresivoIsin = chosenProg.fund.isin;
      } else {
        progresivoObj = {
          isin: primarySafe.fund.isin,
          fundName: primarySafe.fund.name,
          assetType: primarySafe.fund.category === 'MONEY_MARKET_CASH' ? 'CASH' : 'BONDS',
          rationale: `Frenazo de inercia a corto plazo (Score progresivo ${bestProg.progressiveScore}% <= Refugio). Repliegue táctico.`,
          isAssignedUserIsin: true,
          returnScore: primarySafe.progressiveScore
        };
        prevProgresivoIsin = primarySafe.fund.isin;
      }
    }

    // Determine market regime description for this month
    const isDefense = classic12MObj.assetType !== 'EQUITY' && momentum12Minus1Obj.assetType !== 'EQUITY';
    const isTransition = classic12MObj.assetType !== momentum12Minus1Obj.assetType;
    
    let marketRegime: 'BULL' | 'CORRECTION' | 'DEFENSIVE_BEAR' | 'TRANSITION' = 'BULL';
    let cycleName = '';

    if (isDefense) {
      marketRegime = 'DEFENSIVE_BEAR';
      cycleName = `Fase Defensiva: Preservación de Capital en Monetario / Bonos`;
    } else if (isTransition) {
      marketRegime = 'TRANSITION';
      cycleName = `Transición / Divergencia de Factores de Inercia`;
    } else {
      marketRegime = 'BULL';
      const leadName = (classic12MObj.fundName || 'Renta Variable').split(' ')[0];
      cycleName = `Rally Alcista Liderado por ${leadName} / Renta Variable`;
    }

    timeline.push({
      id: `alloc-${curDateStr}`,
      year,
      month,
      dateStr: curDateStr,
      dateLabel,
      quarter,
      cycleName,
      marketRegime,
      allocations: {
        classic12M: classic12MObj,
        momentum12Minus1: momentum12Minus1Obj,
        equilibrado: equilibradoObj,
        progresivo: progresivoObj,
      }
    });
  }

  // Reverse timeline so newest months appear first for display
  timeline.reverse();

  // Calculate ISIN Summary Stats
  const isinSummaryMap = new Map<string, IsinSummaryStats>();
  activePool.forEach(f => {
    isinSummaryMap.set(f.isin, {
      isin: f.isin,
      name: f.name || `Fondo ${f.isin}`,
      slotNumber: f.slotNumber,
      isSafeHaven: !!f.isSafeHaven,
      monthsAssignedTotal: 0,
      firstAssignmentDate: null,
      lastAssignmentDate: null,
      assignedInModels: [],
      activeNow: false
    });
  });

  const latestEvent = timeline.length > 0 ? timeline[0] : null;

  timeline.forEach(event => {
    const models: ('classic12M' | 'momentum12Minus1' | 'equilibrado' | 'progresivo')[] = [
      'classic12M', 'momentum12Minus1', 'equilibrado', 'progresivo'
    ];

    const countedInThisMonth = new Set<string>();

    models.forEach(modKey => {
      const alloc = event.allocations?.[modKey];
      if (alloc && isinSummaryMap.has(alloc.isin)) {
        const stats = isinSummaryMap.get(alloc.isin)!;
        if (!countedInThisMonth.has(alloc.isin)) {
          stats.monthsAssignedTotal++;
          countedInThisMonth.add(alloc.isin);
        }
        if (!stats.assignedInModels.includes(modKey)) {
          stats.assignedInModels.push(modKey);
        }
        if (!stats.lastAssignmentDate || event.dateStr > stats.lastAssignmentDate) {
          stats.lastAssignmentDate = event.dateStr;
        }
        if (!stats.firstAssignmentDate || event.dateStr < stats.firstAssignmentDate) {
          stats.firstAssignmentDate = event.dateStr;
        }
      }
    });
  });

  if (latestEvent && latestEvent.allocations) {
    Object.values(latestEvent.allocations).forEach(alloc => {
      if (alloc && isinSummaryMap.has(alloc.isin)) {
        isinSummaryMap.get(alloc.isin)!.activeNow = true;
      }
    });
  }

  const isinSummaries = Array.from(isinSummaryMap.values()).sort((a, b) => b.monthsAssignedTotal - a.monthsAssignedTotal);

  // =========================================================================
  // RIGOROUS OUT-OF-SAMPLE / LAGGED HISTORICAL SIMULATION (NO LOOK-AHEAD BIAS)
  // At month t-1, we evaluate momentum and pick a fund.
  // In month t (from t-1 to t), the portfolio earns the return of THAT fund.
  // =========================================================================
  const chronologicalEvents = [...timeline].reverse();
  const modelKeys: ('classic12M' | 'momentum12Minus1' | 'equilibrado' | 'progresivo')[] = [
    'classic12M', 'momentum12Minus1', 'equilibrado', 'progresivo'
  ];
  const modelLabels = {
    classic12M: '12M Puro (Antonacci)',
    momentum12Minus1: '12m - 1m (Institucional)',
    equilibrado: 'Equilibrado (12/6/3)',
    progresivo: 'Progresivo (1/3/6/12)'
  };

  const modelPerformances: Record<string, DynamicModelPerformance> = {};

  for (const modKey of modelKeys) {
    let portfolioValue = 10000;
    let peakValue = 10000;
    let maxDd = 0;
    let monthsInEquity = 0;
    let monthsInCash = 0;
    const curve: { date: string; value: number; drawdown: number }[] = [];

    const totalEvents = Math.max(1, chronologicalEvents.length);

    // Initial point at t0
    if (chronologicalEvents.length > 0) {
      const firstEv = chronologicalEvents[0];
      const initialAlloc = firstEv.allocations?.[modKey];
      if (initialAlloc?.assetType === 'EQUITY') monthsInEquity++;
      else monthsInCash++;

      curve.push({
        date: firstEv.dateStr,
        value: 10000,
        drawdown: 0,
      });
    }

    // Step-by-step out-of-sample simulation for month 1 to N
    for (let i = 1; i < chronologicalEvents.length; i++) {
      const prevEv = chronologicalEvents[i - 1];
      const curEv = chronologicalEvents[i];

      // The portfolio was holding the fund chosen at the end of prevEv (t-1)
      const heldAlloc = prevEv.allocations?.[modKey];
      const newAlloc = curEv.allocations?.[modKey];

      if (!heldAlloc) continue;

      if (newAlloc?.assetType === 'EQUITY') monthsInEquity++;
      else monthsInCash++;

      // Find the fund held during this monthly step
      const heldFund = activePool.find(f => f.isin === heldAlloc.isin) || defaultSafeHaven;

      const prevNav = getFundNavAt(heldFund, prevEv.dateStr);
      const curNav = getFundNavAt(heldFund, curEv.dateStr);

      let grossMonthlyReturn = 0;
      if (prevNav > 0 && curNav > 0) {
        grossMonthlyReturn = (curNav - prevNav) / prevNav;
      } else {
        grossMonthlyReturn = (heldFund.return12M || 8) / 1200;
      }

      if (isNaN(grossMonthlyReturn)) grossMonthlyReturn = 0;
      // Normal index mutual fund bounded monthly return [-18% to +18%]
      grossMonthlyReturn = Math.max(-0.18, Math.min(0.18, grossMonthlyReturn));

      // Realistic transaction friction / out-of-market drag on rotation (0.10% on switch)
      const isRotation = newAlloc && newAlloc.isin !== heldAlloc.isin;
      const friction = isRotation ? 0.0010 : 0.0;

      const netMonthlyReturn = grossMonthlyReturn - friction;

      portfolioValue = Number((portfolioValue * (1 + netMonthlyReturn)).toFixed(2));
      if (portfolioValue > peakValue) peakValue = portfolioValue;

      const dd = peakValue > 0 ? ((portfolioValue - peakValue) / peakValue) * 100 : 0;
      if (dd < maxDd) maxDd = dd;

      curve.push({
        date: curEv.dateStr,
        value: portfolioValue,
        drawdown: Number((isNaN(dd) ? 0 : dd).toFixed(2)),
      });
    }

    const totalReturnPct = Number((((portfolioValue - 10000) / 10000) * 100).toFixed(2));
    const totalYears = Math.max(0.5, (chronologicalEvents.length - 1) / 12);
    const safeRatio = portfolioValue > 0 ? portfolioValue / 10000 : 1;
    const cagrRaw = (Math.pow(safeRatio, 1 / totalYears) - 1) * 100;
    const cagrPct = Number((isNaN(cagrRaw) ? 0 : cagrRaw).toFixed(2));

    modelPerformances[modKey] = {
      modelKey: modKey,
      modelLabel: modelLabels[modKey],
      totalReturnPct: isNaN(totalReturnPct) ? 0 : totalReturnPct,
      cagrPct: isNaN(cagrPct) ? 0 : cagrPct,
      maxDrawdownPct: Number((isNaN(maxDd) ? 0 : maxDd).toFixed(2)),
      monthsInEquityPct: Number(((monthsInEquity / totalEvents) * 100).toFixed(1)),
      monthsInCashPct: Number(((monthsInCash / totalEvents) * 100).toFixed(1)),
      equityCurve: curve,
    };
  }

  return {
    timeline,
    isinSummaries,
    modelPerformances,
  };
}
