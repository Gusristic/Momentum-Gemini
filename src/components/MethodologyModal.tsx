import React from 'react';
import { X, BookOpen, ShieldCheck, Landmark, CheckCircle, TrendingUp, HelpCircle } from 'lucide-react';

interface MethodologyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MethodologyModal: React.FC<MethodologyModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Manual Cuantitativo: Dual Momentum</h3>
              <p className="text-xs text-slate-400">Metodología de Gary Antonacci y modelos cuantitativos de asignación de activos.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 space-y-6 overflow-y-auto text-xs text-slate-300 leading-relaxed">
          
          {/* Section 1: The Two Pillars of Dual Momentum */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2 font-mono uppercase tracking-wide">
              <span className="w-5 h-5 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs">1</span>
              Los Dos Pilares del Dual Momentum de Gary Antonacci
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-7">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <span className="font-bold text-emerald-400 text-xs block">1. Momentum Relativo (Cross-Sectional)</span>
                <p className="text-slate-400">
                  Compara los rendimientos pasados de diferentes clases de activos de renta variable (EE.UU., Europa, Emergentes, etc.) durante un periodo retrospectivo. Se selecciona el activo con mayor fuerza relativa.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <span className="font-bold text-sky-400 text-xs block">2. Momentum Absoluto (Time-Series / Trend Filter)</span>
                <p className="text-slate-400">
                  Compara el activo líder frente a una tasa libre de riesgo o activo refugio (Fondo Monetario €STR / Bonos Soberanos). Si el rendimiento es inferior al activo refugio, se abandona la renta variable y se activa el modo defensa para evitar mercados bajistas prolongados (drawdowns).
                </p>
              </div>
            </div>
          </div>

          {/* Section 1.5: The 4 Momentum Calculation Models */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2 font-mono uppercase tracking-wide">
              <span className="w-5 h-5 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs">2</span>
              Los 4 Modelos de Medición de Momentum Disponibles
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-7 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="font-bold text-emerald-400 block">1. Clásico 12M Puro (Antonacci GEM)</span>
                <p className="text-slate-400">
                  100% Retorno a 12 meses. La regla clásica y más pausada. Menos traspasos bancarios (1,4/año).
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-teal-500/40 bg-teal-950/20 space-y-1">
                <span className="font-bold text-teal-400 block">2. Institucional 12m - 1m (MSCI / AQR / Jegadeesh)</span>
                <p className="text-slate-300">
                  Retorno de 12 meses omitiendo el mes más reciente (t-1). Suprime el efecto de reversión rápida a corto plazo. Es el método oficial empleado por los índices MSCI Momentum y grandes fondos cuantitativos institucionales.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="font-bold text-sky-400 block">3. Equilibrado Compuesto (Faber 12/6/3)</span>
                <p className="text-slate-400">
                  Ponderación 50% a 12M + 30% a 6M + 20% a 3M. Maximiza el Ratio de Sharpe (0,90) y recorta el drawdown en caídas lentas.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="font-bold text-purple-400 block">4. Progresivo Escalonado (1/3/6/12)</span>
                <p className="text-slate-400">
                  40% 1M + 30% 3M + 20% 6M + 10% 12M. Máxima reactividad ante rebotes y giros veloces de mercado.
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Technical Ratios (Sharpe & Alpha) */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2 font-mono uppercase tracking-wide">
              <span className="w-5 h-5 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs">3</span>
              Ratios Técnicos Cuantitativos: Sharpe & Jensen's Alpha
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-7">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <span className="font-bold text-teal-400 font-mono text-xs block">Sharpe Ratio</span>
                <p className="text-slate-400">
                  Evalúa si la rentabilidad de un fondo compensa adecuadamente el riesgo asumido. Se calcula como el exceso de rendimiento sobre el activo libre de riesgo (€STR) dividido entre la desviación típica (volatilidad). Valores superiores a 1.0 son óptimos.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <span className="font-bold text-indigo-400 font-mono text-xs block">Alfa de Jensen (α)</span>
                <p className="text-slate-400">
                  Basado en el modelo CAPM, mide la rentabilidad adicional generada por encima de lo que predice su exposición sistemática al mercado (Beta). Un Alfa &gt; 0 confirma valor añadido real y superación del benchmark MSCI World.
                </p>
              </div>
            </div>
          </div>

          {/* Section 4: Operational Cycle */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2 font-mono uppercase tracking-wide">
              <span className="w-5 h-5 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs">4</span>
              Rutina Operativa Recomendada (Mensual)
            </h4>
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 pl-7">
              <p className="text-slate-400">
                Gary Antonacci recomienda rebalancear <strong className="text-slate-200">una vez al mes, al cierre del último día hábil</strong>. Evita operar con excesiva frecuencia para minimizar el periodo de permanencia fuera de mercado durante el traspaso (D+3 a D+5 días hábiles).
              </p>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors"
          >
            Entendido
          </button>
        </div>

      </div>
    </div>
  );
};
