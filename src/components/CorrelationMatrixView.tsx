import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { 
  Grid, 
  AlertCircle, 
  Info, 
  Sparkles, 
  ShieldCheck, 
  Layers, 
  ArrowRight, 
  HelpCircle,
  TrendingDown,
  CheckCircle2,
  Calendar,
  Clock
} from 'lucide-react';
import { FundISIN } from '../types';
import { 
  computeCorrelationMatrix, 
  CorrelationCell, 
  RedundancyPair, 
  CorrelationTimeframe 
} from '../utils/correlationEngine';

interface CorrelationMatrixViewProps {
  funds: FundISIN[];
  onSelectFund?: (fundId: string) => void;
}

export const CorrelationMatrixView: React.FC<CorrelationMatrixViewProps> = ({
  funds,
  onSelectFund
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  
  const [timeframe, setTimeframe] = useState<CorrelationTimeframe>('1Y');
  const [hoveredCell, setHoveredCell] = useState<CorrelationCell | null>(null);
  const [selectedPair, setSelectedPair] = useState<CorrelationCell | null>(null);
  const [filterThreshold, setFilterThreshold] = useState<number>(0.85);
  const [showOnlyRisky, setShowOnlyRisky] = useState<boolean>(false);

  // Compute correlation matrix data for selected timeframe
  const correlationData = useMemo(() => {
    const displayedFunds = showOnlyRisky ? funds.filter(f => !f.isSafeHaven) : funds;
    return computeCorrelationMatrix(displayedFunds, timeframe);
  }, [funds, showOnlyRisky, timeframe]);

  const activeFunds = correlationData.funds;
  const n = activeFunds.length;

  // D3 Heatmap Rendering
  useEffect(() => {
    if (!svgRef.current || !containerRef.current || n === 0) return;

    const containerWidth = containerRef.current.clientWidth || 800;
    const margin = { top: 110, right: 30, bottom: 40, left: 140 };
    
    // Calculate cell size dynamically
    const availableWidth = containerWidth - margin.left - margin.right;
    const cellSize = Math.max(28, Math.min(48, Math.floor(availableWidth / n)));
    
    const width = margin.left + n * cellSize + margin.right;
    const height = margin.top + n * cellSize + margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous render

    svg.attr('width', width)
       .attr('height', height)
       .attr('viewBox', `0 0 ${width} ${height}`);

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // D3 Color Scale for Correlation:
    // -1.0 to 0.0: Deep Blue/Navy (Negative/Inverse Correlation - Best Diversification)
    // 0.0 to 0.5: Emerald / Cyan (Low/Moderate Correlation)
    // 0.5 to 0.85: Amber / Orange (Moderate to High Correlation)
    // 0.85 to 1.0: Rose / Red (Very High Correlation / Redundancy)
    const colorScale = d3.scaleSequential<string>()
      .domain([-0.2, 1.0])
      .interpolator(d3.interpolateRgbBasis([
        '#1e3a8a', // -0.2 (Inverse/Blue)
        '#0284c7', // 0.0 (Cyan)
        '#059669', // 0.3 (Emerald/Green)
        '#d97706', // 0.7 (Amber)
        '#dc2626', // 0.9 (Red)
        '#991b1b'  // 1.0 (Dark Red)
      ]));

    // Truncate fund label for labels
    const formatName = (f: FundISIN) => {
      const parts = f.name.split(' ');
      const clean = (parts[0] + ' ' + (parts[1] || '')).substring(0, 14);
      return `#${f.slotNumber} ${clean}`;
    };

    // Row labels (Y Axis)
    g.selectAll<SVGTextElement, FundISIN>('.row-label')
      .data(activeFunds)
      .enter()
      .append('text')
      .attr('class', 'row-label font-mono text-[11px] fill-slate-300 select-none')
      .attr('x', -8)
      .attr('y', (_d: FundISIN, i: number) => i * cellSize + cellSize / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'end')
      .text((d: FundISIN) => formatName(d))
      .style('cursor', 'pointer')
      .on('click', (_event: MouseEvent, d: FundISIN) => onSelectFund && onSelectFund(d.id));

    // Column labels (X Axis - rotated 45 degrees)
    g.selectAll<SVGTextElement, FundISIN>('.col-label')
      .data(activeFunds)
      .enter()
      .append('text')
      .attr('class', 'col-label font-mono text-[11px] fill-slate-300 select-none')
      .attr('x', 0)
      .attr('y', 0)
      .attr('transform', (_d: FundISIN, i: number) => `translate(${i * cellSize + cellSize / 2}, -10) rotate(-45)`)
      .attr('text-anchor', 'start')
      .text((d: FundISIN) => formatName(d))
      .style('cursor', 'pointer')
      .on('click', (_event: MouseEvent, d: FundISIN) => onSelectFund && onSelectFund(d.id));

    // Cells rendering
    const cellGroups = g.selectAll<SVGGElement, CorrelationCell>('.cell-group')
      .data(correlationData.cells)
      .enter()
      .append('g')
      .attr('class', 'cell-group')
      .attr('transform', (d: CorrelationCell) => {
        const i = activeFunds.findIndex(f => f.id === d.fund1Id);
        const j = activeFunds.findIndex(f => f.id === d.fund2Id);
        return `translate(${j * cellSize}, ${i * cellSize})`;
      })
      .style('cursor', 'pointer')
      .on('mouseenter', function(_event: MouseEvent, d: CorrelationCell) {
        setHoveredCell(d);
        d3.select(this).select('rect')
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 2);
      })
      .on('mouseleave', function() {
        setHoveredCell(null);
        d3.select(this).select('rect')
          .attr('stroke', '#0f172a')
          .attr('stroke-width', 1);
      })
      .on('click', (_event: MouseEvent, d: CorrelationCell) => {
        setSelectedPair(d);
      });

    // Rectangles with smooth color fill
    cellGroups.append('rect')
      .attr('width', cellSize - 1)
      .attr('height', cellSize - 1)
      .attr('rx', 3)
      .attr('fill', (d: CorrelationCell) => colorScale(d.correlation))
      .attr('stroke', '#0f172a')
      .attr('stroke-width', 1)
      .attr('opacity', (d: CorrelationCell) => {
        if (d.fund1Id === d.fund2Id) return 0.9;
        return d.correlation >= filterThreshold ? 1 : 0.85;
      });

    // Value text inside each cell (only if cellSize >= 32px)
    if (cellSize >= 32) {
      cellGroups.append('text')
        .attr('x', cellSize / 2)
        .attr('y', cellSize / 2)
        .attr('dy', '0.35em')
        .attr('text-anchor', 'middle')
        .attr('class', 'font-mono text-[10px] font-bold select-none pointer-events-none')
        .attr('fill', (_d: CorrelationCell) => '#ffffff')
        .text((d: CorrelationCell) => d.correlation.toFixed(2));
    }

  }, [correlationData, activeFunds, n, filterThreshold, onSelectFund]);

  return (
    <div className="space-y-6">
      
      {/* Header Info & Strategy Insights */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Grid className="w-5 h-5 text-indigo-400" />
              <h2 className="text-lg font-bold text-white">Matriz de Correlación de Pearson (D3)</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Auditoría de Co-movimiento
              </span>
            </div>
            <p className="text-xs text-slate-400 max-w-3xl">
              Evalúa el grado de dependencia lineal ($r \in [-1, 1]$) entre los fondos del universo según el marco temporal seleccionado. 
              En estrategias de <strong>Dual Momentum</strong>, una baja correlación permite capturar la inercia del fondo líder mientras otros corrigen.
            </p>
          </div>

          {/* Quick Metrics Badge Group */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center min-w-[110px]">
              <div className="text-[10px] font-mono text-slate-400 uppercase">Diversificación</div>
              <div className={`text-base font-mono font-bold ${
                correlationData.diversificationScore >= 60 ? 'text-emerald-400' : 'text-amber-400'
              }`}>
                {correlationData.diversificationScore} / 100
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center min-w-[110px]">
              <div className="text-[10px] font-mono text-slate-400 uppercase">Correlación Media</div>
              <div className="text-base font-mono font-bold text-slate-200">
                r = {correlationData.avgCorrelation}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center min-w-[110px]">
              <div className="text-[10px] font-mono text-slate-400 uppercase">Redundancias</div>
              <div className={`text-base font-mono font-bold ${
                correlationData.redundancies.length > 0 ? 'text-rose-400' : 'text-emerald-400'
              }`}>
                {correlationData.redundancies.length} detectadas
              </div>
            </div>
          </div>
        </div>

        {/* Timeframe Selector & Detailed explanation */}
        <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          
          {/* Segmented Timeframe Toggle: 1M, 6M, 1A */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-slate-300 font-semibold flex items-center gap-1.5 shrink-0">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span>Marco Temporal:</span>
            </span>

            <div className="inline-flex p-1 bg-slate-950 rounded-xl border border-slate-800">
              <button
                id="btn-corr-timeframe-1m"
                onClick={() => setTimeframe('1M')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-mono transition-all cursor-pointer ${
                  timeframe === '1M'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
                title="1 Mes (30 Días): Correlación de micro-inercia reciente y co-movimientos de corto plazo"
              >
                1M (1 Mes)
              </button>

              <button
                id="btn-corr-timeframe-6m"
                onClick={() => setTimeframe('6M')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-mono transition-all cursor-pointer ${
                  timeframe === '6M'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
                title="6 Meses (Semestral): Correlación de medio plazo calculada con retornos de los últimos 6 meses"
              >
                6M (6 Meses)
              </button>

              <button
                id="btn-corr-timeframe-1y"
                onClick={() => setTimeframe('1Y')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-mono transition-all cursor-pointer ${
                  timeframe === '1Y'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
                title="1 Año (12 Meses): Marco canónico de Gary Antonacci (retornos mensuales a 1 año)"
              >
                1A (1 Año)
              </button>
            </div>
          </div>

          {/* Timeframe description pill */}
          <div className="text-xs font-mono text-slate-400 bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800 flex items-center gap-2">
            <span className="text-indigo-300 font-semibold">{correlationData.timeframeLabel}:</span>
            <span>{correlationData.timeframeDescription}</span>
          </div>
        </div>

        {/* Controls and Filters */}
        <div className="pt-3 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-slate-300 font-medium cursor-pointer">
              <input 
                type="checkbox" 
                checked={showOnlyRisky} 
                onChange={(e) => setShowOnlyRisky(e.target.checked)}
                className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Ocultar activos refugio (Monetario / Bonos)</span>
            </label>

            <div className="flex items-center gap-2">
              <span className="text-slate-400">Umbral Alerta Redundancia:</span>
              <select
                value={filterThreshold}
                onChange={(e) => setFilterThreshold(Number(e.target.value))}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
              >
                <option value={0.80}>r ≥ 0.80 (Muy Estricto)</option>
                <option value={0.85}>r ≥ 0.85 (Recomendado)</option>
                <option value={0.90}>r ≥ 0.90 (Solo casi idénticos)</option>
                <option value={0.95}>r ≥ 0.95 (Duplicados exactos)</option>
              </select>
            </div>
          </div>

          {/* Color Legend Bar */}
          <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
            <span className="text-blue-400 font-bold">&lt; 0.0 (Inversa)</span>
            <div className="w-3 h-3 rounded bg-[#1e3a8a]" title="r < 0.0" />
            <div className="w-3 h-3 rounded bg-[#0284c7]" title="r ~ 0.0" />
            <div className="w-3 h-3 rounded bg-[#059669]" title="r ~ 0.3" />
            <div className="w-3 h-3 rounded bg-[#d97706]" title="r ~ 0.7" />
            <div className="w-3 h-3 rounded bg-[#dc2626]" title="r > 0.85" />
            <span className="text-rose-400 font-bold">&gt; 0.85 (Redundante)</span>
          </div>
        </div>
      </div>

      {/* Main Heatmap Canvas Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Heatmap Container */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col items-center overflow-x-auto" ref={containerRef}>
          <div className="w-full flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-slate-400">
              Marco activo: <strong className="text-slate-200">{correlationData.timeframeLabel}</strong>. Pasa el cursor o haz clic en cualquier celda:
            </span>
            {hoveredCell && (
              <span className="text-xs font-mono text-indigo-300 font-bold bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/60">
                r ({timeframe}) = {hoveredCell.correlation.toFixed(3)}
              </span>
            )}
          </div>
          
          <svg ref={svgRef} className="max-w-full overflow-visible" />
        </div>

        {/* Dynamic Detail & Redundancy Inspector */}
        <div className="space-y-4">
          
          {/* Selected Cell or Hover Inspector */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-indigo-400" />
                <span>Inspección de Par ({timeframe})</span>
              </h3>
              {(hoveredCell || selectedPair) && (
                <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                  ((hoveredCell || selectedPair)?.correlation ?? 0) >= filterThreshold
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : ((hoveredCell || selectedPair)?.correlation ?? 0) < 0.3
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}>
                  r = {(hoveredCell || selectedPair)?.correlation.toFixed(3)}
                </span>
              )}
            </div>

            {hoveredCell || selectedPair ? (
              (() => {
                const cell = hoveredCell || selectedPair!;
                const isSame = cell.fund1Id === cell.fund2Id;
                const isRedundant = cell.correlation >= filterThreshold && !isSame;

                return (
                  <div className="space-y-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2 font-mono">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Fondo A:</span>
                        <strong className="text-slate-200 text-right truncate max-w-[200px]">{cell.fund1Name}</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Fondo B:</span>
                        <strong className="text-slate-200 text-right truncate max-w-[200px]">{cell.fund2Name}</strong>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                        <span className="text-slate-400">Categorías:</span>
                        <span className="text-indigo-400">{cell.fund1Category} vs {cell.fund2Category}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Ventana evaluada:</span>
                        <span className="text-slate-300">{correlationData.timeframeLabel}</span>
                      </div>
                    </div>

                    {isSame ? (
                      <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-400 leading-relaxed">
                        Diagonal principal: correlación consigo mismo ($r = 1,00$).
                      </div>
                    ) : isRedundant ? (
                      <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/40 text-rose-300 space-y-1">
                        <div className="font-bold flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                          <span>Alta Redundancia en {timeframe} (r = {cell.correlation.toFixed(2)})</span>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-relaxed">
                          Estos dos fondos se mueven prácticamente al unísono en el marco de {timeframe}. En Dual Momentum ocupan slots redundantes sin aportar descorrelación.
                        </p>
                      </div>
                    ) : cell.correlation < 0.3 ? (
                      <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-emerald-300 space-y-1">
                        <div className="font-bold flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>Excelente Descorrelación en {timeframe} (r = {cell.correlation.toFixed(2)})</span>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-relaxed">
                          Comportamiento independiente. Permite rotar capital eficazmente según el ciclo de mercado.
                        </p>
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-300 leading-relaxed">
                        Correlación moderada ($r = {cell.correlation.toFixed(2)}$ en {timeframe}). Comportamiento habitual entre índices desarrollados.
                      </div>
                    )}
                  </div>
                );
              })()
            ) : (
              <div className="p-6 rounded-xl bg-slate-950 border border-dashed border-slate-800 text-center text-slate-500 text-xs">
                Pasa el ratón por encima de cualquier casilla de la matriz para inspeccionar la correlación detallada entre ambos fondos en el marco temporal de {correlationData.timeframeLabel}.
              </div>
            )}
          </div>

          {/* List of Redundancy Alerts */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" />
                <span>Pares Redundantes (r ≥ {filterThreshold})</span>
              </h3>
              <span className="text-xs font-mono text-slate-400">
                {correlationData.redundancies.length}
              </span>
            </div>

            {correlationData.redundancies.length > 0 ? (
              <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                {correlationData.redundancies.map((red, idx) => (
                  <div 
                    key={idx}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-300 font-bold truncate max-w-[170px]">
                        #{red.fund1.slotNumber} {red.fund1.name.split(' ')[0]} ↔ #{red.fund2.slotNumber} {red.fund2.name.split(' ')[0]}
                      </span>
                      <span className="text-rose-400 font-bold px-1.5 py-0.5 bg-rose-950/60 rounded border border-rose-900/60">
                        r = {red.correlation.toFixed(2)}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400 leading-relaxed">
                      {red.reason}
                    </div>

                    <div className="text-[10px] font-mono text-indigo-300 bg-indigo-950/40 p-1.5 rounded border border-indigo-900/40">
                      💡 {red.recommendation}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-2">
                <ShieldCheck className="w-6 h-6 text-emerald-400 mx-auto" />
                <p className="text-xs text-slate-300 font-medium">
                  ¡No se detectan redundancias críticas ({timeframe})!
                </p>
                <p className="text-[11px] text-slate-500">
                  Los fondos activos muestran suficiente dispersión para operar con Dual Momentum en la ventana de {correlationData.timeframeLabel}.
                </p>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Practical Guide on Portfolio Optimization */}
      <div className="p-5 rounded-2xl bg-indigo-950/20 border border-indigo-500/30 space-y-2 text-xs">
        <div className="flex items-center gap-2 text-indigo-400 font-bold">
          <Sparkles className="w-4 h-4" />
          <span>Guía de Marcos Temporales en la Matriz de Correlación</span>
        </div>
        <p className="text-slate-300 leading-relaxed">
          • <strong>1 Mes (1M):</strong> Muestra si los fondos se han movido juntos durante los últimos 30 días (reacción ante noticias o eventos macro recientes).<br />
          • <strong>6 Meses (6M):</strong> Muestra la correlación de medio plazo durante el último semestre.<br />
          • <strong>1 Año (1A - Canónico):</strong> Marco de referencia estándar de Gary Antonacci para evaluar la descorrelación estructural entre clases de activo (Renta Variable USA, Europa, Emergentes, Japón y Activo Refugio).
        </p>
      </div>

    </div>
  );
};
