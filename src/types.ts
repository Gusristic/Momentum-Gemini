export type FundCategory = 
  | 'US_EQUITY' 
  | 'EUROPE_EQUITY' 
  | 'WORLD_EQUITY' 
  | 'EMERGING_EQUITY' 
  | 'GLOBAL_SMALL_CAP' 
  | 'REAL_ESTATE' 
  | 'EURO_BONDS' 
  | 'GLOBAL_AGGREGATE_BONDS'
  | 'PACIFIC_EQUITY'
  | 'JAPAN_EQUITY'
  | 'MONEY_MARKET_CASH';

export interface HistoricalDataPoint {
  date: string;
  nav: number; // Valor liquidativo
  benchmarkNav?: number; // Benchmark (e.g. MSCI World)
  riskFreeNav?: number; // Safe asset (€STR or Cash)
}

export interface FundISIN {
  id: string;
  slotNumber: number; // 1 to 15
  isin: string;
  name: string;
  ticker?: string;
  category: FundCategory;
  categoryLabel: string;
  isSafeHaven: boolean; // True if it's the refuge asset (Bonos Euro or Monetario)
  currentNAV: number; // Valor Liquidativo actual (€)
  currency: string;
  morningstarUrl: string;
  ftUrl: string;
  investingUrl: string;
  sharesHeld: number; // Participaciones del usuario
  purchasePriceAvg: number; // Precio medio de adquisición fiscal (€)
  lastUpdated: string;
  
  // Historical Return percentages
  return1M: number;
  return3M: number;
  return6M: number;
  return12M: number; // 1-year lookback (core Antonacci metric)
  return12Minus1M?: number; // Institutional 12-1 momentum (12M minus 1M, ignoring last month noise)
  return3YAnnualized: number;
  
  // Multi-Source Benchmark Audit (Financial Times, Morningstar, Investing)
  morningstarReturn12M?: number;
  ftReturn12M?: number;
  investingReturn12M?: number;
  sourceDate?: string;
  sourceNotes?: string;
  
  // Technical Ratios
  volatility1Y: number; // Annualized standard deviation %
  sharpeRatio: number; // (Return - Rf) / Volatility
  jensenAlpha: number; // Jensen's Alpha % vs MSCI World
  beta: number; // Systematic market risk
  sortinoRatio: number; // Downside volatility adjusted
  maxDrawdown: number; // Maximum peak-to-trough %
  
  // Custom time series for technical charts
  history: HistoricalDataPoint[];
  
  // State toggles
  isDisabled?: boolean; // When true, fund is rendered in gray (disabled) and excluded from Dual Momentum & Backtest calculations
  isBlank?: boolean;    // When true, the slot is an empty/blank placeholder
}

export type MomentumMode = 
  | 'CLASSIC_12M' 
  | 'COMPOSITE_BLENDED' 
  | 'PROGRESSIVE_STEPPED'
  | 'MOMENTUM_12_MINUS_1';

export interface MomentumScoreResult {
  fund: FundISIN;
  relativeMomentumScore: number; // Typically 12M return or Antonacci blended (12M*0.5 + 6M*0.3 + 3M*0.2)
  relativeRank: number;
  absoluteMomentumPositive: boolean; // Return > Risk-Free Hurdle
  excessReturnOverRf: number;
  recommendation: 'STRONG_BUY' | 'HOLD' | 'TRANSFER_OUT' | 'SAFE_HAVEN_DEFENSE';
}

export interface DualMomentumSignal {
  timestamp: string;
  currentSelectedFund: FundISIN;
  previousSelectedFundId?: string;
  isDefenseMode: boolean; // True if absolute momentum failed and we hold cash/bonds
  transferRequired: boolean;
  transferReason: string;
  fromFund?: FundISIN;
  toFund?: FundISIN;
  urgency: 'NONE' | 'REVIEW' | 'CRITICAL_TRANSFER';
  daysUntilNextMonthlyReview: number;
  // Hysteresis filter attributes
  hysteresisBuffer?: number;
  isHysteresisHolding?: boolean;
  candidateLeaderFund?: FundISIN;
  candidateExcessScore?: number;
}

export interface StrategyPerformanceComparison {
  date: string;
  dualMomentumValue: number;
  msciWorldValue: number;
  euroGovBondsValue: number;
  drawdownDM: number;
  drawdownBenchmark: number;
}

export interface TelegramConfig {
  botToken: string;
  chatId: string;
  isEnabled: boolean;
  notifyOnSignalChange: boolean;
  notifyOnMonthEnd: boolean;
  chatName?: string;
  lastNotifiedDate?: string;
  lastNotifiedSignalText?: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConnected: boolean;
  lastSyncedAt?: string;
}

// -------------------------------------------------------------
// DUAL MOMENTUM RECOGNIZED MODELS & REAL BACKTEST TYPES
// -------------------------------------------------------------

export type DualMomentumModelId = 
  | 'GEM_CLASSIC'             // Gary Antonacci Global Equity Momentum 12M
  | 'GEM_MODERN_CASH_FILTER'  // GEM con Filtro Dual Bonos/€STR post-2022
  | 'INSTITUTIONAL_12_MINUS_1'// Momentum Institucional 12m-1m (MSCI / AQR / Jegadeesh & Titman)
  | 'COMPOSITE_DUAL_MOMENTUM' // DMC Gary Antonacci (4 Módulos Descorrelacionados)
  | 'ACCELERATING_DM'         // Accelerating Dual Momentum (ADM Lookback 13612)
  | 'GLOBAL_BALANCED_DM'      // Global Balanced Momentum (GBM 60/40)
  | 'MULTI_ASSET_USER_DM'     // Dual Momentum dinámico sobre los 15 slots ISIN del usuario
  | 'BENCHMARK_MSCI_WORLD'    // MSCI World Buy & Hold (Benchmark Pasivo 100% Renta Variable)
  | 'BENCHMARK_60_40';        // Cartera Clásica 60% Acciones / 40% Bonos

export type BacktestTimeframe = 
  | 'MAX_1973_2026' // Máximo histórico real verificado (53+ años)
  | 'MODERN_1993_2026' // Ciclo moderno real continuo ETFs (33 años)
  | 'UCITS_2000_2026' // Fondos UCITS comercializados en España (26 años)
  | 'DECADE_2016_2026'; // Última década completa con Covid y crisis 2022

export interface DualMomentumModelInfo {
  id: DualMomentumModelId;
  name: string;
  tagline: string;
  author: string;
  yearCreated: string;
  category: 'EQUITY_CORE' | 'MULTI_ASSET' | 'BALANCED' | 'BENCHMARK';
  color: string;
  rulesSummary: string[];
  pros: string[];
  cons: string[];
  referenceSource: string;
}

export interface DualMomentumBacktestMetrics {
  modelId: DualMomentumModelId;
  name: string;
  cagr: number; // Tasa de crecimiento anual compuesto %
  totalReturn: number; // Rendimiento total acumulado %
  maxDrawdown: number; // Máxima caída pico a valle %
  volatility: number; // Desviación estándar anualizada %
  sharpeRatio: number; // (CAGR - Rf) / Volatilidad
  sortinoRatio: number; // Ratio ajustado por riesgo bajista
  calmarRatio: number; // CAGR / |MaxDrawdown|
  annualTurnover: number; // Rotaciones de cartera promedio al año
  spanishTaxSaved: number; // Estimación ahorro fiscal por traspasos en España (€ sobre base 50k)
  
  // Crisis-specific resilience (peor caída / retorno durante cada evento histórico)
  crisisDotCom: number;     // Burbuja Punto Com (2000 - 2002) %
  crisisGFC: number;        // Gran Crisis Financiera (2007 - 2009) %
  crisisCovid: number;      // Shock Covid-19 (Feb - Mar 2020) %
  crisisInflation2022: number; // Gran Caída de Renta Fija y Variable (2022) %
}

export interface MonthlyBacktestPoint {
  date: string; // YYYY-MM
  // Portfolio value indexed at 10,000 €
  values: Record<DualMomentumModelId, number>;
  // Drawdown from peak %
  drawdowns: Record<DualMomentumModelId, number>;
  // Currently held asset or asset allocation string description
  activeHoldings: Record<DualMomentumModelId, string>;
}

export interface RealDataReferenceSource {
  sourceName: string;
  provider: string;
  dataRange: string;
  frequency: string;
  verificationStatus: 'VERIFIED_OFFICIAL' | 'LIVE_CONNECTED';
  description: string;
  citationUrl: string;
}
