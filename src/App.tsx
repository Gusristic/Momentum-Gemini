import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldCheck, 
  TrendingUp, 
  AlertTriangle, 
  Database, 
  Calculator, 
  BookOpen, 
  Layers, 
  Sparkles,
  PieChart,
  RefreshCw,
  CheckCircle2,
  History,
  Calendar,
  Grid,
  BarChart3,
  Target
} from 'lucide-react';
import { FundISIN } from './types';
import { INITIAL_FUNDS } from './data/defaultFunds';
import { 
  evaluateDualMomentum, 
  generateBacktestSeries, 
  MomentumMode 
} from './utils/momentumEngine';
import { 
  getLocalFunds, 
  saveLocalFunds, 
  getActiveFundId, 
  saveActiveFundId, 
  fetchFundsFromSupabase, 
  getSavedSupabaseSettings,
  syncFundsToSupabase
} from './utils/supabaseClient';
import { Header } from './components/Header';
import { SignalAlertBanner } from './components/SignalAlertBanner';
import { IsinManager } from './components/IsinManager';
import { TechnicalRatiosView } from './components/TechnicalRatiosView';
import { PerformanceCharts } from './components/PerformanceCharts';
import { SlotReturnsChart } from './components/SlotReturnsChart';
import { CorrelationMatrixView } from './components/CorrelationMatrixView';
import { ModelAllocationSummaryTab } from './components/ModelAllocationSummaryTab';
import { EditFundModal } from './components/EditFundModal';
import { SupabaseModal } from './components/SupabaseModal';
import { MethodologyModal } from './components/MethodologyModal';
import { DualMomentumModelsComparison } from './components/DualMomentumModelsComparison';
import { IsinHistoryAllocationsTab } from './components/IsinHistoryAllocationsTab';
import { Backtest20YearsModal } from './components/Backtest20YearsModal';
import { TelegramAlertsModal } from './components/TelegramAlertsModal';
import { BackupModal } from './components/BackupModal';
import { ConfirmModal, ConfirmDialogState } from './components/ConfirmModal';
import { getLocalTelegramConfig, saveLocalTelegramConfig, sendTelegramSignal, syncBackendTelegramConfig } from './utils/telegramClient';
import { lookupFundByIsinOrQuery } from './utils/fundLookupClient';
import { TelegramConfig } from './types';

export default function App() {
  const [funds, setFunds] = useState<FundISIN[]>(() => getLocalFunds());
  const [activeFundId, setActiveFundId] = useState<string>(() => getActiveFundId());
  const [momentumMode, setMomentumMode] = useState<MomentumMode>(() => {
    const saved = localStorage.getItem('dual_momentum_mode');
    if (saved && ['COMPOSITE_BLENDED', 'CLASSIC_12M', 'MOMENTUM_12_MINUS_1', 'PROGRESSIVE_STEPPED'].includes(saved)) {
      return saved as MomentumMode;
    }
    return 'COMPOSITE_BLENDED';
  });
  const [hysteresisBuffer, setHysteresisBuffer] = useState<number>(() => {
    const saved = localStorage.getItem('dual_momentum_hysteresis');
    return saved !== null ? Number(saved) : 0.5;
  });
  const [telegramConfig, setTelegramConfig] = useState<TelegramConfig>(() => getLocalTelegramConfig());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>(() => {
    return localStorage.getItem('dual_momentum_last_sync_time') || new Date().toISOString();
  });
  const [toastNotification, setToastNotification] = useState<{
    show: boolean;
    message: string;
    timestamp: string;
  } | null>(null);
  
  // Modals state
  const [editingFund, setEditingFund] = useState<FundISIN | null>(null);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isBacktestModalOpen, setIsBacktestModalOpen] = useState(false);
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);

  // In-app confirmation dialog (replaces window.confirm / alert in iframe)
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Active view tab in main dashboard
  const [dashboardTab, setDashboardTab] = useState<
    'OVERVIEW' | 'MODEL_ALLOCATIONS_SUMMARY' | 'SLOT_RETURNS' | 'DUAL_MOMENTUM_MODELS' | 'ISIN_HISTORY_5Y' | 'CORRELATION_MATRIX' | 'ISIN_SLOTS' | 'TECHNICAL_RATIOS' | 'PERFORMANCE'
  >('OVERVIEW');

  // Check Supabase connection on load
  useEffect(() => {
    async function initDb() {
      const settings = getSavedSupabaseSettings();
      if (settings.url && settings.anonKey && settings.url.includes('supabase.co')) {
        const remoteFunds = await fetchFundsFromSupabase(settings);
        if (remoteFunds && remoteFunds.length > 0) {
          setFunds(remoteFunds);
          setIsSupabaseConnected(true);
          return;
        }
      }
      // Otherwise local funds already set
    }
    initDb();
  }, []);

  // Compute Dual Momentum Evaluation with Hysteresis Buffer for active mode
  const { scores, signal, safeHavenFund, relativeWinner } = useMemo(() => {
    return evaluateDualMomentum(funds, activeFundId, momentumMode, hysteresisBuffer);
  }, [funds, activeFundId, momentumMode, hysteresisBuffer]);

  // Compute all 4 signals for multi-model reporting (Equilibrado prioritized)
  const all4Signals = useMemo(() => {
    return {
      equilibrado: evaluateDualMomentum(funds, activeFundId, 'COMPOSITE_BLENDED', hysteresisBuffer).signal,
      classic12M: evaluateDualMomentum(funds, activeFundId, 'CLASSIC_12M', hysteresisBuffer).signal,
      momentum12Minus1: evaluateDualMomentum(funds, activeFundId, 'MOMENTUM_12_MINUS_1', hysteresisBuffer).signal,
      progresivo: evaluateDualMomentum(funds, activeFundId, 'PROGRESSIVE_STEPPED', hysteresisBuffer).signal,
    };
  }, [funds, activeFundId, hysteresisBuffer]);

  // Backtest Historical Series (calculado dinámicamente sobre los fondos del usuario)
  const backtestData = useMemo(() => {
    return generateBacktestSeries(momentumMode, funds);
  }, [momentumMode, funds]);

  // Find currently held fund object
  const currentHeldFund = useMemo(() => {
    return funds.find(f => f.id === activeFundId) || funds[0];
  }, [funds, activeFundId]);

  // Handlers
  const handleSelectActiveFund = (id: string) => {
    setActiveFundId(id);
    saveActiveFundId(id);
  };

  const handleConfirmTransfer = (newFundId: string) => {
    handleSelectActiveFund(newFundId);
  };

  const handleSaveFund = (updatedFund: FundISIN) => {
    const cleanIsin = (updatedFund.isin || '').trim().toUpperCase();
    const isNowBlank = cleanIsin.length === 0;
    const finalFund: FundISIN = {
      ...updatedFund,
      isin: cleanIsin,
      isBlank: isNowBlank,
      name: isNowBlank
        ? (updatedFund.name?.includes('Slot #') ? updatedFund.name : `Slot #${updatedFund.slotNumber} (Vacío)`)
        : (updatedFund.name && !updatedFund.name.includes('(Vacío)') ? updatedFund.name : `Fondo ISIN ${cleanIsin}`),
    };
    // If another slot already had this exact ISIN, automatically clear that other slot to prevent duplicate funds
    const updated = funds.map(f => {
      if (f.id === finalFund.id) return finalFund;
      if (cleanIsin.length > 0 && f.isin === cleanIsin) {
        return {
          ...f,
          isin: '',
          name: `Slot #${f.slotNumber} (Vacío)`,
          categoryLabel: 'Sin Asignar (En Blanco)',
          isBlank: true,
          sharesHeld: 0,
          return12M: 0,
        };
      }
      return f;
    });
    setFunds(updated);
    saveLocalFunds(updated);
    syncFundsToSupabase(updated);
  };

  // Ejecución directa del borrado de slot
  const executeDeleteFund = (fundId: string) => {
    const remaining = funds
      .filter(f => f.id !== fundId)
      .map((f, idx) => ({ ...f, slotNumber: idx + 1 }));
    setFunds(remaining);
    saveLocalFunds(remaining);
    syncFundsToSupabase(remaining);
    if (activeFundId === fundId && remaining.length > 0) {
      handleSelectActiveFund(remaining[0].id);
    }
  };

  // 1. Borrar slot (muestra modal de confirmación in-app seguro)
  const handleDeleteFund = (fundId: string) => {
    const target = funds.find(f => f.id === fundId);
    if (!target) return;
    if (funds.length <= 1) {
      setConfirmDialog({
        isOpen: true,
        title: 'Acción no permitida',
        message: 'Debe mantenerse al menos 1 slot en la cartera de fondos.',
        confirmLabel: 'Entendido',
        variant: 'warning',
        onConfirm: () => {},
      });
      return;
    }
    setConfirmDialog({
      isOpen: true,
      title: `¿Eliminar Slot #${target.slotNumber}?`,
      message: `¿Deseas eliminar definitivamente ${target.name ? `"${target.name}"` : 'este slot'} (ISIN: ${target.isin || 'vacío'})? Se retirará de la lista y se renumerarán los slots restantes.`,
      confirmLabel: 'Sí, eliminar',
      cancelLabel: 'Cancelar',
      variant: 'danger',
      onConfirm: () => executeDeleteFund(fundId),
    });
  };

  // Ejecución directa de vaciado
  const executeClearBlankFund = (fundId: string) => {
    const updated = funds.map(f => {
      if (f.id !== fundId) return f;
      return {
        ...f,
        isin: '',
        name: `Slot #${f.slotNumber} (Vacío)`,
        ticker: '',
        category: 'WORLD_EQUITY' as const,
        categoryLabel: 'Sin Asignar (En Blanco)',
        isSafeHaven: false,
        currentNAV: 100,
        sharesHeld: 0,
        purchasePriceAvg: 100,
        return1M: 0,
        return3M: 0,
        return6M: 0,
        return12M: 0,
        return12Minus1M: 0,
        return3YAnnualized: 0,
        volatility1Y: 0,
        sharpeRatio: 0,
        jensenAlpha: 0,
        beta: 1,
        sortinoRatio: 0,
        maxDrawdown: 0,
        isBlank: true,
        isDisabled: false,
        history: [],
      };
    });
    setFunds(updated);
    saveLocalFunds(updated);
    syncFundsToSupabase(updated);
  };

  // 2. Dejar en blanco (vacía el slot sin borrarlo de la lista)
  const handleClearBlankFund = (fundId: string) => {
    const target = funds.find(f => f.id === fundId);
    if (!target) return;
    setConfirmDialog({
      isOpen: true,
      title: `¿Dejar en blanco el Slot #${target.slotNumber}?`,
      message: `Esta acción vaciará el código ISIN y los datos del slot #${target.slotNumber}, dejándolo preparado para que puedas configurar otro fondo cuando desees.`,
      confirmLabel: 'Sí, dejar en blanco',
      cancelLabel: 'Cancelar',
      variant: 'warning',
      onConfirm: () => executeClearBlankFund(fundId),
    });
  };

  // 3. Dejar en gris (conserva el fondo pero sin que el Dual Momentum ni el Backtest lo tengan en cuenta)
  const handleToggleDisableFund = (fundId: string) => {
    const updated = funds.map(f => {
      if (f.id !== fundId) return f;
      return {
        ...f,
        isDisabled: !f.isDisabled,
      };
    });
    setFunds(updated);
    saveLocalFunds(updated);
    syncFundsToSupabase(updated);
  };

  // 4. Añadir un nuevo slot vacío
  const handleAddSlot = () => {
    const nextSlotNumber = funds.length + 1;
    const newFund: FundISIN = {
      id: `fund-${Date.now()}`,
      slotNumber: nextSlotNumber,
      isin: '',
      name: `Slot #${nextSlotNumber} (Vacío)`,
      ticker: '',
      category: 'WORLD_EQUITY',
      categoryLabel: 'Sin Asignar (En Blanco)',
      isSafeHaven: false,
      currentNAV: 100,
      sharesHeld: 0,
      purchasePriceAvg: 100,
      currency: 'EUR',
      lastUpdated: new Date().toISOString().substring(0, 10),
      return1M: 0,
      return3M: 0,
      return6M: 0,
      return12M: 0,
      return12Minus1M: 0,
      return3YAnnualized: 0,
      volatility1Y: 0,
      sharpeRatio: 0,
      jensenAlpha: 0,
      beta: 1,
      sortinoRatio: 0,
      maxDrawdown: 0,
      morningstarUrl: 'https://www.morningstar.es',
      ftUrl: 'https://markets.ft.com',
      investingUrl: 'https://es.investing.com',
      history: [],
      isBlank: true,
      isDisabled: false,
    };
    const updated = [...funds, newFund];
    setFunds(updated);
    saveLocalFunds(updated);
    syncFundsToSupabase(updated);
  };

  const handleResetDefaults = () => {
    setConfirmDialog({
      isOpen: true,
      title: '¿Restablecer fondos predeterminados?',
      message: 'Se restablecerán los 15 slots con la selección de fondos índice y refugio de España predeterminada (Vanguard, Fidelity, Amundi, DWS Floating Rate, etc.).',
      confirmLabel: 'Restablecer 15 ISIN',
      cancelLabel: 'Cancelar',
      variant: 'info',
      onConfirm: () => {
        setFunds(INITIAL_FUNDS);
        saveLocalFunds(INITIAL_FUNDS);
        syncFundsToSupabase(INITIAL_FUNDS);
      },
    });
  };

  const handleRefreshMarketData = async () => {
    setIsRefreshing(true);
    const nowIso = new Date().toISOString();
    const timeStr = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    try {
      // Query official feeds with universal static/backend support
      const updated = await Promise.all(
        funds.map(async (fund) => {
          if (!fund.isin || !fund.isin.trim() || fund.isBlank) {
            return fund;
          }
          try {
            const data = await lookupFundByIsinOrQuery(fund.isin);
            return {
              ...fund,
              name: data.name || fund.name,
              currentNAV: data.currentNAV || fund.currentNAV,
              currency: data.currency || fund.currency,
              category: data.category || fund.category,
              categoryLabel: data.categoryLabel || fund.categoryLabel,
              isSafeHaven: data.isSafeHaven !== undefined ? data.isSafeHaven : fund.isSafeHaven,
              return1M: data.return1M !== undefined ? data.return1M : fund.return1M,
              return3M: data.return3M !== undefined ? data.return3M : fund.return3M,
              return6M: data.return6M !== undefined ? data.return6M : fund.return6M,
              return12M: data.return12M !== undefined ? data.return12M : fund.return12M,
              morningstarReturn12M: data.morningstarReturn12M !== undefined ? data.morningstarReturn12M : fund.morningstarReturn12M,
              ftReturn12M: data.ftReturn12M !== undefined ? data.ftReturn12M : fund.ftReturn12M,
              investingReturn12M: data.investingReturn12M !== undefined ? data.investingReturn12M : fund.investingReturn12M,
              return12Minus1M: data.return12Minus1M !== undefined ? data.return12Minus1M : fund.return12Minus1M,
              return3YAnnualized: data.return3YAnnualized !== undefined ? data.return3YAnnualized : fund.return3YAnnualized,
              volatility1Y: data.volatility1Y !== undefined ? data.volatility1Y : fund.volatility1Y,
              sharpeRatio: data.sharpeRatio !== undefined ? data.sharpeRatio : fund.sharpeRatio,
              jensenAlpha: data.jensenAlpha !== undefined ? data.jensenAlpha : fund.jensenAlpha,
              sortinoRatio: data.sortinoRatio !== undefined ? data.sortinoRatio : fund.sortinoRatio,
              beta: data.beta !== undefined ? data.beta : fund.beta,
              maxDrawdown: data.maxDrawdown !== undefined ? data.maxDrawdown : fund.maxDrawdown,
              history: data.history && data.history.length > 0 ? data.history : fund.history,
              morningstarUrl: data.morningstarUrl || fund.morningstarUrl,
              ftUrl: data.ftUrl || fund.ftUrl,
              investingUrl: data.investingUrl || fund.investingUrl,
              lastUpdated: nowIso,
            };
          } catch {
            return {
              ...fund,
              lastUpdated: nowIso,
            };
          }
        })
      );

      setFunds(updated);
      saveLocalFunds(updated);
      syncFundsToSupabase(updated);
      setLastUpdated(nowIso);
      try {
        localStorage.setItem('dual_momentum_last_sync_time', nowIso);
      } catch (e) {
        console.warn('Could not save sync time', e);
      }

      setToastNotification({
        show: true,
        message: `Cotizaciones y ratios recalculados con éxito a las ${timeStr}. Datos de mercado online actualizados.`,
        timestamp: timeStr,
      });
      setTimeout(() => {
        setToastNotification(null);
      }, 5000);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleChangeHysteresisBuffer = (val: number) => {
    setHysteresisBuffer(val);
    try {
      localStorage.setItem('dual_momentum_hysteresis', String(val));
    } catch (e) {
      console.warn('Could not save hysteresis buffer to localStorage', e);
    }
  };

  const handleSaveTelegramConfig = (cfg: TelegramConfig) => {
    setTelegramConfig(cfg);
    saveLocalTelegramConfig(cfg);
  };

  const handleRestoreBackup = (data: {
    funds: FundISIN[];
    activeFundId: string;
    momentumMode: MomentumMode;
    hysteresisBuffer: number;
    telegramConfig?: TelegramConfig;
  }) => {
    setFunds(data.funds);
    saveLocalFunds(data.funds);
    syncFundsToSupabase(data.funds);

    if (data.activeFundId) {
      setActiveFundId(data.activeFundId);
      saveActiveFundId(data.activeFundId);
    }

    if (data.momentumMode) {
      setMomentumMode(data.momentumMode);
    }

    if (typeof data.hysteresisBuffer === 'number') {
      setHysteresisBuffer(data.hysteresisBuffer);
      try {
        localStorage.setItem('dual_momentum_hysteresis', String(data.hysteresisBuffer));
      } catch (e) {
        console.warn('Could not save hysteresis', e);
      }
    }

    if (data.telegramConfig) {
      setTelegramConfig(data.telegramConfig);
      saveLocalTelegramConfig(data.telegramConfig);
      syncBackendTelegramConfig({
        ...data.telegramConfig,
        hysteresisBuffer: data.hysteresisBuffer,
        funds: data.funds,
        activeFundId: data.activeFundId,
      });
    }
  };

  const handleResetToDefaultBackup = () => {
    setFunds(INITIAL_FUNDS);
    saveLocalFunds(INITIAL_FUNDS);
    syncFundsToSupabase(INITIAL_FUNDS);
    setActiveFundId(INITIAL_FUNDS[0].id);
    saveActiveFundId(INITIAL_FUNDS[0].id);
  };

  const handleToggleMomentumMode = (mode: MomentumMode) => {
    setMomentumMode(mode);
    try {
      localStorage.setItem('dual_momentum_mode', mode);
    } catch (e) {
      console.warn('Could not save momentum mode', e);
    }
  };

  // Effective online update date derived from active funds or system state
  const effectiveLastUpdated = useMemo(() => {
    if (lastUpdated) return lastUpdated;
    const dates = funds
      .filter(f => !f.isDisabled && !f.isBlank && f.lastUpdated)
      .map(f => f.lastUpdated)
      .filter(Boolean)
      .sort();
    if (dates.length > 0) {
      return dates[dates.length - 1];
    }
    return new Date().toISOString();
  }, [funds, lastUpdated]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      
      {/* Top Navbar */}
      <Header
        momentumMode={momentumMode}
        onToggleMomentumMode={handleToggleMomentumMode}
        onRefreshData={handleRefreshMarketData}
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
        onOpenHelpModal={() => setIsHelpModalOpen(true)}
        onOpenBacktestModal={() => setIsBacktestModalOpen(true)}
        onOpenTelegramModal={() => setIsTelegramModalOpen(true)}
        onOpenBackupModal={() => setIsBackupModalOpen(true)}
        isSupabaseConnected={isSupabaseConnected}
        isTelegramEnabled={telegramConfig.isEnabled && !!telegramConfig.botToken && !!telegramConfig.chatId}
        isRefreshing={isRefreshing}
        lastUpdated={effectiveLastUpdated}
      />

      {/* Main Container - Extended width for wide monitors (27" / 4K / QHD) */}
      <main className="flex-1 max-w-[1920px] w-full mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 py-6 space-y-6">
        
        {/* Real-time Update Confirmation Toast */}
        {toastNotification && (
          <div 
            id="market-sync-toast-alert"
            className="flex items-center justify-between gap-3 p-3.5 bg-emerald-950/90 border border-emerald-500/60 rounded-xl text-emerald-200 text-xs shadow-lg shadow-emerald-950/40"
          >
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-semibold text-white">{toastNotification.message}</span>
            </div>
            <button
              onClick={() => setToastNotification(null)}
              className="text-emerald-400 hover:text-white text-xs px-2 py-0.5 rounded bg-emerald-900/60 border border-emerald-500/30 cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        )}

        {/* AUTOMATED MOMENTUM SIGNAL & SPANISH FISCAL ALERT BANNER */}
        <SignalAlertBanner
          signal={signal}
          activeFund={currentHeldFund}
          onConfirmTransfer={handleConfirmTransfer}
          momentumMode={momentumMode}
          hysteresisBuffer={hysteresisBuffer}
          onChangeHysteresisBuffer={handleChangeHysteresisBuffer}
          onOpenTelegramModal={() => setIsTelegramModalOpen(true)}
          isTelegramEnabled={telegramConfig.isEnabled && !!telegramConfig.botToken && !!telegramConfig.chatId}
          lastUpdated={effectiveLastUpdated}
        />

        {/* DASHBOARD SUB-NAVIGATION TABS */}
        <div className="space-y-2 border-b border-slate-800 pb-3">
          {/* Top Row: Scrollable Tabs */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-700">
            <button
              id="tab-overview"
              onClick={() => setDashboardTab('OVERVIEW')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 whitespace-nowrap cursor-pointer ${
                dashboardTab === 'OVERVIEW'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
              }`}
            >
              <PieChart className="w-3.5 h-3.5" />
              <span>Visión Global</span>
            </button>

            <button
              id="tab-model-allocations-summary"
              onClick={() => setDashboardTab('MODEL_ALLOCATIONS_SUMMARY')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 whitespace-nowrap cursor-pointer ${
                dashboardTab === 'MODEL_ALLOCATIONS_SUMMARY'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900 bg-slate-900/60 border border-slate-800'
              }`}
            >
              <Target className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-bold">Asignación por Modelo</span>
            </button>

            <button
              id="tab-slot-returns"
              onClick={() => setDashboardTab('SLOT_RETURNS')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 whitespace-nowrap cursor-pointer ${
                dashboardTab === 'SLOT_RETURNS'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900 bg-slate-900/60 border border-slate-800'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-bold">Gráfica Rendimientos 12M/6M/3M</span>
            </button>

            <button
              id="tab-dual-momentum-models"
              onClick={() => setDashboardTab('DUAL_MOMENTUM_MODELS')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 whitespace-nowrap cursor-pointer ${
                dashboardTab === 'DUAL_MOMENTUM_MODELS'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900 bg-slate-900/60 border border-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-bold">Modelos Dual Momentum & Backtest</span>
            </button>

            <button
              id="tab-isin-history-5y"
              onClick={() => setDashboardTab('ISIN_HISTORY_5Y')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 whitespace-nowrap cursor-pointer ${
                dashboardTab === 'ISIN_HISTORY_5Y'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900 bg-slate-900/60 border border-slate-800'
              }`}
            >
              <History className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-bold">Historial Asignaciones 5 Años</span>
            </button>

            <button
              id="tab-correlation-matrix"
              onClick={() => setDashboardTab('CORRELATION_MATRIX')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 whitespace-nowrap cursor-pointer ${
                dashboardTab === 'CORRELATION_MATRIX'
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900 bg-slate-900/60 border border-slate-800'
              }`}
            >
              <Grid className="w-3.5 h-3.5 text-indigo-400" />
              <span className="font-bold">Matriz de Correlación (D3)</span>
            </button>

            <button
              id="tab-isin-slots"
              onClick={() => setDashboardTab('ISIN_SLOTS')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 whitespace-nowrap cursor-pointer ${
                dashboardTab === 'ISIN_SLOTS'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>15 Slots ISIN</span>
            </button>

            <button
              id="tab-technical-ratios"
              onClick={() => setDashboardTab('TECHNICAL_RATIOS')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 whitespace-nowrap cursor-pointer ${
                dashboardTab === 'TECHNICAL_RATIOS'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Sharpe & Alfa Jensen</span>
            </button>

            <button
              id="tab-performance"
              onClick={() => setDashboardTab('PERFORMANCE')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 whitespace-nowrap cursor-pointer ${
                dashboardTab === 'PERFORMANCE'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Gráficas & Backtest</span>
            </button>
          </div>

          {/* Sub-bar with context info: Placed on its own distinct line so it never overlaps or covers tabs */}
          <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 font-mono px-1 pt-1">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Hurdle €STR BCE: <strong className="text-slate-200">3.65%</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <span>Ganador Relativo Actual: <strong className="text-emerald-400">{relativeWinner.name.split(' ')[0]} {relativeWinner.name.split(' ')[1] || ''} (+{relativeWinner.return12M}%)</strong></span>
            </div>
          </div>
        </div>

        {/* TAB CONTENTS */}
        {dashboardTab === 'OVERVIEW' && (
          <div className="space-y-6">
            {/* Quick Strategy Summary Bento */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Card 1: Decision Matrix Dual Momentum */}
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">
                    1. Momentum Relativo
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono">
                    {momentumMode === 'PROGRESSIVE_STEPPED'
                      ? 'Progresivo'
                      : momentumMode === 'COMPOSITE_BLENDED'
                      ? 'Compuesto'
                      : momentumMode === 'MOMENTUM_12_MINUS_1'
                      ? '12m - 1m'
                      : 'Clásico 12M'}
                  </span>
                </div>
                <div className="text-base font-bold text-white truncate" title={relativeWinner.name}>
                  {relativeWinner.name}
                </div>
                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800 text-slate-400 font-mono">
                  <span>
                    {momentumMode === 'PROGRESSIVE_STEPPED'
                      ? 'Progresivo:'
                      : momentumMode === 'COMPOSITE_BLENDED'
                      ? 'Compuesto:'
                      : momentumMode === 'MOMENTUM_12_MINUS_1'
                      ? '12m-1m:'
                      : '12M:'}{' '}
                    <strong className="text-emerald-400">
                      +{scores.find(s => s.fund.id === relativeWinner.id)?.relativeMomentumScore ?? relativeWinner.return12M}%
                    </strong>
                  </span>
                  <span>ISIN: {relativeWinner.isin}</span>
                </div>
              </div>

              {/* Card 2: Absolute Momentum Filter */}
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">
                    2. Momentum Absoluto
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-semibold ${
                    signal.isDefenseMode ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  }`}>
                    {signal.isDefenseMode ? 'Modo Defensivo' : 'Renta Variable'}
                  </span>
                </div>
                <div className="text-xs text-slate-300 leading-relaxed truncate">
                  {signal.isDefenseMode ? (
                    <span>Refugio en <strong>{safeHavenFund.name}</strong>.</span>
                  ) : (
                    <span>Líder bate Hurdle €STR (3.65%). Asignación: <strong>{signal.currentSelectedFund.name}</strong>.</span>
                  )}
                </div>
                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800 text-slate-400 font-mono">
                  <span>Exceso vs Cash:</span>
                  <strong className={signal.isDefenseMode ? 'text-rose-400' : 'text-emerald-400'}>
                    {Number((scores.find(s => s.fund.id === relativeWinner.id)?.relativeMomentumScore ?? relativeWinner.return12M) - 3.65).toFixed(2)}%
                  </strong>
                </div>
              </div>

              {/* Card 3: Multi-Horizon Returns Chart */}
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">
                      3. Rendimientos Slots
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
                      12M / 6M / 3M
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed mt-2">
                    Compara la aceleración y persistencia de retornos en cada uno de los 15 slots configurados.
                  </p>
                </div>
                <button
                  id="overview-slot-returns-btn"
                  onClick={() => setDashboardTab('SLOT_RETURNS')}
                  className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all active:scale-95 cursor-pointer mt-1"
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>Ver Gráfica de Rendimientos</span>
                </button>
              </div>

              {/* Card 4: Correlation & Redundancies Audit */}
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">
                      4. Auditoría de Cartera
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 font-mono">
                      Matriz D3
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed mt-2">
                    Analiza la descorrelación estadística entre tus 15 slots y detecta redundancias.
                  </p>
                </div>
                <button
                  id="overview-correlation-matrix-btn"
                  onClick={() => setDashboardTab('CORRELATION_MATRIX')}
                  className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all active:scale-95 cursor-pointer mt-1"
                >
                  <Grid className="w-4 h-4" />
                  <span>Ver Matriz de Correlación</span>
                </button>
              </div>

            </div>

            {/* Performance Charts in Overview */}
            <PerformanceCharts
              backtestData={backtestData}
              funds={funds}
              selectedWinnerId={signal.currentSelectedFund.id}
              momentumMode={momentumMode}
            />

            {/* 15 ISIN Slots Table */}
            <IsinManager
              funds={funds}
              momentumScores={scores}
              momentumMode={momentumMode}
              activeFundId={activeFundId}
              onSelectActiveFund={handleSelectActiveFund}
              onEditFund={setEditingFund}
              onSaveFund={handleSaveFund}
              onDeleteFund={handleDeleteFund}
              onClearBlankFund={handleClearBlankFund}
              onToggleDisableFund={handleToggleDisableFund}
              onAddSlot={handleAddSlot}
              onResetToDefaults={handleResetDefaults}
              onSyncRealMarketData={handleRefreshMarketData}
              isSyncing={isRefreshing}
              lastUpdated={effectiveLastUpdated}
            />

            {/* Technical Ratios Quick Section */}
            <TechnicalRatiosView
              funds={funds}
              selectedWinnerId={signal.currentSelectedFund.id}
            />
          </div>
        )}

        {dashboardTab === 'MODEL_ALLOCATIONS_SUMMARY' && (
          <ModelAllocationSummaryTab
            funds={funds}
            activeFundId={activeFundId}
            onSelectActiveFund={handleSelectActiveFund}
            hysteresisBuffer={hysteresisBuffer}
          />
        )}

        {dashboardTab === 'SLOT_RETURNS' && (
          <SlotReturnsChart
            funds={funds}
            selectedWinnerId={signal.currentSelectedFund.id}
            hurdleRate={3.65}
          />
        )}

        {dashboardTab === 'DUAL_MOMENTUM_MODELS' && (
          <DualMomentumModelsComparison funds={funds} />
        )}

        {dashboardTab === 'ISIN_HISTORY_5Y' && (
          <IsinHistoryAllocationsTab 
            funds={funds} 
            hysteresisBuffer={hysteresisBuffer}
          />
        )}

        {dashboardTab === 'CORRELATION_MATRIX' && (
          <CorrelationMatrixView 
            funds={funds} 
            onSelectFund={(fundId) => {
              setEditingFund(funds.find(f => f.id === fundId) || null);
            }}
          />
        )}

        {dashboardTab === 'ISIN_SLOTS' && (
          <IsinManager
            funds={funds}
            momentumScores={scores}
            momentumMode={momentumMode}
            activeFundId={activeFundId}
            onSelectActiveFund={handleSelectActiveFund}
            onEditFund={setEditingFund}
            onSaveFund={handleSaveFund}
            onDeleteFund={handleDeleteFund}
            onClearBlankFund={handleClearBlankFund}
            onToggleDisableFund={handleToggleDisableFund}
            onAddSlot={handleAddSlot}
            onResetToDefaults={handleResetDefaults}
            onSyncRealMarketData={handleRefreshMarketData}
            isSyncing={isRefreshing}
            lastUpdated={effectiveLastUpdated}
          />
        )}

        {dashboardTab === 'TECHNICAL_RATIOS' && (
          <TechnicalRatiosView
            funds={funds}
            selectedWinnerId={signal.currentSelectedFund.id}
          />
        )}

        {dashboardTab === 'PERFORMANCE' && (
          <PerformanceCharts
            backtestData={backtestData}
            funds={funds}
            selectedWinnerId={signal.currentSelectedFund.id}
          />
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <span>Antonacci Dual Momentum España • Modelo Global Equity Momentum (GEM)</span>
            <span className="mx-2">•</span>
            <span>Optimizado para fondos UCITS con comercialización española</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Dual Momentum GEM</span>
            <span>•</span>
            <span>Persistencia Supabase & Local</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <EditFundModal
        fund={editingFund}
        isOpen={!!editingFund}
        onClose={() => setEditingFund(null)}
        onSave={handleSaveFund}
        onDelete={handleDeleteFund}
        onClearBlank={handleClearBlankFund}
        onToggleDisable={handleToggleDisableFund}
      />

      <SupabaseModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        funds={funds}
        onFundsImported={(imported) => {
          setFunds(imported);
          saveLocalFunds(imported);
        }}
        onSyncCompleted={(success) => setIsSupabaseConnected(success)}
      />

      <MethodologyModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
      />

      <Backtest20YearsModal
        isOpen={isBacktestModalOpen}
        onClose={() => setIsBacktestModalOpen(false)}
        activeMode={momentumMode}
        funds={funds}
        onSelectMode={(mode) => {
          setMomentumMode(mode);
        }}
      />

      <TelegramAlertsModal
        isOpen={isTelegramModalOpen}
        onClose={() => setIsTelegramModalOpen(false)}
        config={telegramConfig}
        onSaveConfig={handleSaveTelegramConfig}
        currentSignal={signal}
        modelName={
          momentumMode === 'CLASSIC_12M'
            ? '12M Puro (Gary Antonacci)'
            : momentumMode === 'MOMENTUM_12_MINUS_1'
            ? 'Institucional 12m - 1m'
            : momentumMode === 'COMPOSITE_BLENDED'
            ? 'Equilibrado (Meb Faber)'
            : 'Progresivo Escalonado'
        }
        hysteresisBuffer={hysteresisBuffer}
        allModels={all4Signals}
        funds={funds}
        activeFundId={activeFundId}
      />

      <BackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        funds={funds}
        activeFundId={activeFundId}
        momentumMode={momentumMode}
        hysteresisBuffer={hysteresisBuffer}
        telegramConfig={telegramConfig}
        onRestoreBackup={handleRestoreBackup}
        onResetToDefault={handleResetToDefaultBackup}
      />

      <ConfirmModal
        state={confirmDialog}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />

    </div>
  );
}
