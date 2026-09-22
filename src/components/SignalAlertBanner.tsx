import React, { useState } from 'react';
import { 
  AlertTriangle, 
  ArrowRight, 
  CheckCircle2, 
  ShieldAlert, 
  Clock, 
  TrendingUp, 
  Percent, 
  FileCheck,
  Scale,
  Send,
  SlidersHorizontal,
  Info,
  Copy,
  Check,
  Calendar
} from 'lucide-react';
import { DualMomentumSignal, FundISIN } from '../types';
import { formatDateDisplay } from './Header';

interface SignalAlertBannerProps {
  signal: DualMomentumSignal;
  activeFund: FundISIN;
  onConfirmTransfer: (newActiveFundId: string) => void;
  momentumMode: string;
  hysteresisBuffer?: number;
  onChangeHysteresisBuffer?: (val: number) => void;
  onOpenTelegramModal?: () => void;
  isTelegramEnabled?: boolean;
  lastUpdated?: string;
}

export const SignalAlertBanner: React.FC<SignalAlertBannerProps> = ({
  signal,
  activeFund,
  onConfirmTransfer,
  momentumMode,
  hysteresisBuffer = 0.5,
  onChangeHysteresisBuffer,
  onOpenTelegramModal,
  isTelegramEnabled = false,
  lastUpdated = '2026-09-21',
}) => {
  const [copiedOrder, setCopiedOrder] = useState(false);
  const isTransferRequired = signal.transferRequired;
  const isDefense = signal.isDefenseMode;
  const isHysteresis = signal.isHysteresisHolding;

  const handleCopyBrokerOrder = () => {
    const text = 
      `📋 ORDEN DE ROTACIÓN / REBALANCEO DE CARTERA\n` +
      `───────────────────────────────────────────────\n` +
      `• OPERACIÓN:       Rotación Momentum (100%)\n\n` +
      `1. FONDO ORIGEN (En cartera):\n` +
      `   ISIN:   ${signal.fromFund?.isin || activeFund.isin}\n` +
      `   Nombre: ${signal.fromFund?.name || activeFund.name}\n\n` +
      `2. FONDO DESTINO (Nuevo líder):\n` +
      `   ISIN:   ${signal.toFund?.isin || signal.currentSelectedFund.isin}\n` +
      `   Nombre: ${signal.toFund?.name || signal.currentSelectedFund.name}\n` +
      `───────────────────────────────────────────────\n` +
      `Fecha: ${new Date().toLocaleDateString('es-ES')}`;

    navigator.clipboard.writeText(text);
    setCopiedOrder(true);
    setTimeout(() => setCopiedOrder(false), 2500);
  };

  return (
    <div className="w-full space-y-3">
      
      {/* Top Banner Control Bar: Hysteresis Buffer Selector & Telegram Shortcut */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 border border-slate-800/80 px-4 py-2 rounded-xl text-xs">
        
        {/* Hysteresis Buffer Selector */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-slate-400 font-semibold" title="Banda de tolerancia para evitar traspasos por diferencias marginales o ruido">
            <Scale className="w-3.5 h-3.5 text-amber-400" />
            <span>Filtro de Histéresis (Anti-Ruido):</span>
          </div>
          <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
            {[
              { val: 0.0, label: '0.0% (Off)' },
              { val: 0.5, label: '0.5% (Recomendado)' },
              { val: 1.0, label: '1.0%' },
              { val: 1.5, label: '1.5%' },
            ].map((opt) => (
              <button
                key={opt.val}
                onClick={() => onChangeHysteresisBuffer && onChangeHysteresisBuffer(opt.val)}
                className={`px-2 py-0.5 rounded-md font-mono text-[11px] font-semibold transition-all ${
                  hysteresisBuffer === opt.val
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title={`Exige que el nuevo fondo supere al actual por al menos ${opt.val}% para ejecutar rotación.`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right Info: Effective Online Data Date & Telegram Shortcut */}
        <div className="flex items-center gap-2">
          <div 
            id="banner-online-date-badge"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300"
            title={`Fecha y hora de última actualización de datos online: ${lastUpdated}`}
          >
            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-400">Datos online:</span>
            <strong className="text-emerald-400 font-bold">{formatDateDisplay(lastUpdated)}</strong>
          </div>

          {onOpenTelegramModal && (
            <button
              onClick={onOpenTelegramModal}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium text-sky-400 hover:text-sky-300 hover:bg-sky-950/40 border border-sky-500/20 transition-colors"
            >
              <Send className="w-3 h-3" />
              <span>{isTelegramEnabled ? 'Alertas Telegram Activas' : 'Conectar Bot de Telegram'}</span>
            </button>
          )}
        </div>

      </div>

      {isTransferRequired ? (
        /* Critical Alert: Fund change required */
        <div 
          id="alert-transfer-required"
          className="rounded-2xl border-2 border-amber-500/80 bg-gradient-to-br from-amber-950/40 via-slate-900 to-amber-950/20 p-5 sm:p-6 shadow-xl shadow-amber-950/30 relative overflow-hidden"
        >
          {/* Subtle top indicator bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 animate-pulse" />

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            <div className="space-y-2 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500 text-slate-950 shadow-sm animate-pulse">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Alerta Dual Momentum: Traspaso Requerido
                </span>
                <span className="text-xs text-amber-300 font-mono font-medium">
                  {isDefense ? 'Defensa Activa (€STR / Refugio)' : 'Nuevo Líder en Momentum Relativo'}
                </span>
              </div>

              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                {signal.transferReason}
              </h2>
            </div>

            {/* Visual Transfer Pathway (From Fund -> To Fund) */}
            <div className="flex flex-col sm:flex-row items-center gap-3 bg-slate-950/70 p-4 rounded-xl border border-slate-800 shrink-0">
              {/* Origin Fund */}
              <div className="text-center sm:text-left min-w-[150px]">
                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block">Fondo a Salir</span>
                <p className="text-xs font-bold text-slate-200 truncate max-w-[160px]">{signal.fromFund?.name || activeFund.name}</p>
                <p className="text-[11px] font-mono text-slate-400">{signal.fromFund?.isin || activeFund.isin}</p>
                <span className="text-[11px] font-mono text-rose-400">
                  Ret. 12M: {signal.fromFund?.return12M || activeFund.return12M}%
                </span>
              </div>

              <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/40 shrink-0">
                <ArrowRight className="w-4 h-4" />
              </div>

              {/* Destination Fund */}
              <div className="text-center sm:text-left min-w-[150px]">
                <span className="text-[10px] uppercase font-mono tracking-wider text-emerald-400 font-semibold block">Fondo Destino</span>
                <p className="text-xs font-bold text-emerald-300 truncate max-w-[160px]">{signal.toFund?.name}</p>
                <p className="text-[11px] font-mono text-emerald-400/80">{signal.toFund?.isin}</p>
                <span className="text-[11px] font-mono text-emerald-400 font-bold">
                  Ret. 12M: +{signal.toFund?.return12M}% | Sharpe: {signal.toFund?.sharpeRatio}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-2 mt-2 sm:mt-0 w-full sm:w-auto">
                <button
                  id="copy-broker-order-btn"
                  onClick={handleCopyBrokerOrder}
                  className="w-full sm:w-auto px-3.5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95"
                  title="Copiar datos estructurados del traspaso (ISIN origen y destino) para pegar o usar en tu banco"
                >
                  {copiedOrder ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-400">¡Ficha Copiada!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-slate-400" />
                      <span>Copiar Orden Broker</span>
                    </>
                  )}
                </button>

                {signal.toFund && (
                  <button
                    id="confirm-transfer-btn"
                    onClick={() => onConfirmTransfer(signal.toFund!.id)}
                    className="w-full sm:w-auto px-3.5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-transform active:scale-95"
                  >
                    <FileCheck className="w-4 h-4 text-emerald-400" />
                    <span>Marcar Traspaso Ejecutado</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Position Optimal: No transfer needed */
        <div 
          id="alert-position-confirmed"
          className={`rounded-2xl border ${
            isHysteresis 
              ? 'border-amber-500/40 bg-gradient-to-br from-amber-950/20 via-slate-900 to-slate-900' 
              : 'border-emerald-500/30 bg-gradient-to-br from-emerald-950/20 via-slate-900 to-slate-900'
          } p-5 sm:p-6 shadow-lg relative overflow-hidden`}
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                {isHysteresis ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                    <Scale className="w-3.5 h-3.5 text-amber-400" />
                    Filtro Anti-Ruido Activo (Histéresis ±{hysteresisBuffer}%)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Asignación Óptima Confirmada
                  </span>
                )}
                <span className="text-xs text-slate-400 font-mono">
                  {isDefense ? 'Modo Defensivo en Renta Fija / Monetario' : 'Modo Renta Variable (Líder Absoluto)'}
                </span>
              </div>

              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Mantener posición en: <span className="text-emerald-400">{signal.currentSelectedFund.name}</span>
                <span className="text-xs font-mono font-normal text-slate-400">({signal.currentSelectedFund.isin})</span>
              </h2>

              <p className="text-xs text-slate-300 max-w-2xl">
                {signal.transferReason} No se requiere ninguna operación ni movimiento en tu comercializador.
              </p>
            </div>

            {/* Quick Stats pill */}
            <div className="flex items-center gap-4 bg-slate-950/60 px-4 py-3 rounded-xl border border-slate-800 text-xs shrink-0">
              <div>
                <span className="text-[10px] uppercase font-mono text-slate-400 block">
                  {momentumMode === 'PROGRESSIVE_STEPPED'
                    ? 'Score Progresivo'
                    : momentumMode === 'COMPOSITE_BLENDED'
                    ? 'Score Compuesto'
                    : momentumMode === 'MOMENTUM_12_MINUS_1'
                    ? 'Score 12m - 1m'
                    : 'Score 12M'}
                </span>
                <span className="text-emerald-400 font-bold font-mono text-sm">
                  {(() => {
                    const f = signal.currentSelectedFund;
                    let val = f.return12M;
                    if (momentumMode === 'MOMENTUM_12_MINUS_1') {
                      val = f.return12Minus1M !== undefined 
                        ? f.return12Minus1M 
                        : Number((((1 + f.return12M / 100) / (1 + f.return1M / 100) - 1) * 100).toFixed(2));
                    } else if (momentumMode === 'COMPOSITE_BLENDED') {
                      val = Number((f.return12M * 0.5 + f.return6M * 0.3 + f.return3M * 0.2).toFixed(2));
                    } else if (momentumMode === 'PROGRESSIVE_STEPPED') {
                      val = Number((f.return1M * 0.4 + f.return3M * 0.3 + f.return6M * 0.2 + f.return12M * 0.1).toFixed(2));
                    }
                    return val > 0 ? `+${val}%` : `${val}%`;
                  })()}
                </span>
              </div>
              <div className="h-6 w-px bg-slate-800" />
              <div>
                <span className="text-[10px] uppercase font-mono text-slate-400 block">Sharpe 1Y</span>
                <span className="text-teal-300 font-bold font-mono text-sm">{signal.currentSelectedFund.sharpeRatio}</span>
              </div>
              <div className="h-6 w-px bg-slate-800" />
              <div>
                <span className="text-[10px] uppercase font-mono text-slate-400 block flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  Próxima Revisión
                </span>
                <span className="text-slate-200 font-semibold font-mono text-sm">En {signal.daysUntilNextMonthlyReview} días</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

