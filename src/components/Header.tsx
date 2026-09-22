import React from 'react';
import { 
  ShieldCheck, 
  Database, 
  RefreshCw, 
  Sliders, 
  HelpCircle,
  FileSpreadsheet,
  AlertTriangle,
  History,
  Send,
  Bell,
  HardDrive,
  Calendar
} from 'lucide-react';
import { MomentumMode } from '../utils/momentumEngine';

interface HeaderProps {
  momentumMode: MomentumMode;
  onToggleMomentumMode: (mode: MomentumMode) => void;
  onRefreshData: () => void;
  onOpenSupabaseModal: () => void;
  onOpenHelpModal: () => void;
  onOpenBacktestModal?: () => void;
  onOpenTelegramModal?: () => void;
  onOpenBackupModal?: () => void;
  isSupabaseConnected: boolean;
  isTelegramEnabled?: boolean;
  isRefreshing: boolean;
  lastUpdated: string;
}

const formatDateDisplay = (dStr: string) => {
  if (!dStr) return '21 Sep 2026';
  try {
    const parts = dStr.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const monthIdx = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      return `${day} ${months[monthIdx] || parts[1]} ${year}`;
    }
  } catch {}
  return dStr;
};

export const Header: React.FC<HeaderProps> = ({
  momentumMode,
  onToggleMomentumMode,
  onRefreshData,
  onOpenSupabaseModal,
  onOpenHelpModal,
  onOpenBacktestModal,
  onOpenTelegramModal,
  onOpenBackupModal,
  isSupabaseConnected,
  isTelegramEnabled = false,
  isRefreshing,
  lastUpdated,
}) => {
  return (
    <header className="border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-md sticky top-0 z-30 shadow-lg">
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 py-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          
          {/* Brand & Strategy Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-900/30 border border-emerald-400/20">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
                  Antonacci Dual Momentum
                  <span className="text-xs px-2 py-0.5 rounded-full font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    ESPAÑA UCITS
                  </span>
                </h1>
              </div>
              <p className="text-xs text-slate-400 flex flex-wrap items-center gap-1.5 mt-0.5 font-medium">
                <span>Estrategia Cuantitativa GEM</span>
                <span className="text-slate-600">•</span>
                <span>15 Slots ISIN</span>
                <span className="text-slate-600">•</span>
                <span className="font-mono text-emerald-400">Rotación Mensual</span>
                <span className="text-slate-600">•</span>
                <span 
                  id="header-last-updated-badge"
                  className="inline-flex items-center gap-1.5 text-slate-300 font-mono bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800 text-[11px]"
                  title={`Fecha de última actualización efectiva de datos de mercado: ${lastUpdated}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-slate-400">Datos online:</span>
                  <strong className="text-emerald-400 font-bold">{formatDateDisplay(lastUpdated)}</strong>
                </span>
              </p>
            </div>
          </div>

          {/* Right Controls: Mode selector, Supabase status, Telegram & Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Live Effective Date Indicator Badge in top bar */}
            <div 
              id="top-bar-date-pill"
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono shadow-inner"
              title={`Datos y cotizaciones online sincronizados a fecha: ${lastUpdated}`}
            >
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-400 text-[11px]">Actualización online:</span>
              <span className="font-bold text-white text-xs">{formatDateDisplay(lastUpdated)}</span>
            </div>

            {/* Antonacci Mode Selector (4 options: 12M Puro, Inst. 12-1, Equilibrado, Progresivo) */}
            <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
              <button
                id="mode-classic-btn"
                onClick={() => onToggleMomentumMode('CLASSIC_12M')}
                className={`px-2.5 py-1.5 rounded-md font-medium transition-all ${
                  momentumMode === 'CLASSIC_12M'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="12M Puro: Canónico Gary Antonacci (100% Retorno 12M)"
              >
                12M Puro
              </button>
              <button
                id="mode-institutional-btn"
                onClick={() => onToggleMomentumMode('MOMENTUM_12_MINUS_1')}
                className={`px-2.5 py-1.5 rounded-md font-medium transition-all ${
                  momentumMode === 'MOMENTUM_12_MINUS_1'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Institucional 12m - 1m: Estándar MSCI/AQR (elimina reversión a corto plazo)"
              >
                12m - 1m
              </button>
              <button
                id="mode-composite-btn"
                onClick={() => onToggleMomentumMode('COMPOSITE_BLENDED')}
                className={`px-2.5 py-1.5 rounded-md font-medium transition-all ${
                  momentumMode === 'COMPOSITE_BLENDED'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Equilibrado (Meb Faber): 50% 12M · 30% 6M · 20% 3M"
              >
                Equilibrado
              </button>
              <button
                id="mode-progressive-btn"
                onClick={() => onToggleMomentumMode('PROGRESSIVE_STEPPED')}
                className={`px-2.5 py-1.5 rounded-md font-medium transition-all ${
                  momentumMode === 'PROGRESSIVE_STEPPED'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Progresivo Escalonado (Foco Reciente): 40% 1M · 30% 3M · 20% 6M · 10% 12M"
              >
                Progresivo
              </button>
            </div>

            {/* Backtest 20 Años Comparison Button */}
            {onOpenBacktestModal && (
              <button
                id="backtest-20y-modal-btn"
                onClick={onOpenBacktestModal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-950/40 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-900/30 transition-colors shadow-sm"
                title="Ver Backtest comparativo de 20 años de los 3 modelos (12M Puro, Equilibrado y Progresivo)"
              >
                <History className="w-3.5 h-3.5 text-emerald-400" />
                <span>Backtest 20A</span>
              </button>
            )}

            {/* Telegram Alerts Button */}
            {onOpenTelegramModal && (
              <button
                id="telegram-alerts-btn"
                onClick={onOpenTelegramModal}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  isTelegramEnabled
                    ? 'bg-sky-950/50 text-sky-300 border-sky-500/50 hover:bg-sky-900/40 shadow-sm'
                    : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
                title="Configurar Alertas Automáticas por Telegram (Fin de mes y cambios de señal)"
              >
                <Send className={`w-3.5 h-3.5 ${isTelegramEnabled ? 'text-sky-400' : 'text-slate-400'}`} />
                <span>{isTelegramEnabled ? 'Telegram Activo' : 'Alertas Telegram'}</span>
                {isTelegramEnabled && (
                  <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                )}
              </button>
            )}

            {/* Supabase Status Button */}
            <button
              id="supabase-settings-btn"
              onClick={onOpenSupabaseModal}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                isSupabaseConnected
                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/30'
                  : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
              title="Configurar y sincronizar base de datos Supabase"
            >
              <Database className={`w-3.5 h-3.5 ${isSupabaseConnected ? 'text-emerald-400' : 'text-slate-400'}`} />
              <span>{isSupabaseConnected ? 'Supabase Conectado' : 'Supabase'}</span>
            </button>

            {/* Local Backup JSON Button */}
            {onOpenBackupModal && (
              <button
                id="backup-json-modal-btn"
                onClick={onOpenBackupModal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800/80 text-slate-300 border border-slate-700 hover:bg-slate-700 transition-colors"
                title="Copia de Seguridad Local: Exportar o Importar archivo JSON sin intermediarios"
              >
                <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
                <span>Copia JSON</span>
              </button>
            )}

            {/* Botón Actualizar Cotizaciones Online */}
            <button
              id="refresh-metrics-btn"
              onClick={onRefreshData}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-950/50 text-emerald-300 hover:bg-emerald-900/40 border border-emerald-500/40 shadow-sm disabled:opacity-50 transition-all cursor-pointer"
              title="Actualizar cotizaciones, valores liquidativos (VL) y métricas de mercado online"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="font-bold">{isRefreshing ? 'Actualizando...' : 'Actualizar Cotizaciones'}</span>
            </button>

            {/* Guide & Rules */}
            <button
              id="help-guide-btn"
              onClick={onOpenHelpModal}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800 transition-colors"
              title="Reglas del Dual Momentum y Fiscalidad Española"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
