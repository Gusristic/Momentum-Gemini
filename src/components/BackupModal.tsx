import React, { useState, useRef } from 'react';
import { 
  Download, 
  Upload, 
  FileJson, 
  CheckCircle2, 
  AlertTriangle, 
  Copy, 
  Check, 
  X, 
  ShieldCheck, 
  RefreshCw,
  FileCode,
  HardDrive
} from 'lucide-react';
import { FundISIN, TelegramConfig } from '../types';
import { MomentumMode } from '../utils/momentumEngine';

interface BackupData {
  version: string;
  exportDate: string;
  app: string;
  momentumMode: MomentumMode;
  hysteresisBuffer: number;
  activeFundId: string;
  funds: FundISIN[];
  telegramConfig?: Partial<TelegramConfig>;
}

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  funds: FundISIN[];
  activeFundId: string;
  momentumMode: MomentumMode;
  hysteresisBuffer: number;
  telegramConfig: TelegramConfig;
  onRestoreBackup: (data: {
    funds: FundISIN[];
    activeFundId: string;
    momentumMode: MomentumMode;
    hysteresisBuffer: number;
    telegramConfig?: TelegramConfig;
  }) => void;
  onResetToDefault: () => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  onClose,
  funds,
  activeFundId,
  momentumMode,
  hysteresisBuffer,
  telegramConfig,
  onRestoreBackup,
  onResetToDefault,
}) => {
  const [activeTab, setActiveTab] = useState<'EXPORT' | 'IMPORT' | 'RESET'>('EXPORT');
  const [copied, setCopied] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [importValidation, setImportValidation] = useState<{
    isValid: boolean;
    data?: BackupData;
    error?: string;
  } | null>(null);
  const [isSuccessRestored, setIsSuccessRestored] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Build export object
  const currentBackupData: BackupData = {
    version: '2.5.0',
    app: 'Dual Momentum Antigravity Spain',
    exportDate: new Date().toISOString(),
    momentumMode,
    hysteresisBuffer,
    activeFundId,
    funds,
    telegramConfig: {
      isEnabled: telegramConfig.isEnabled,
      botToken: telegramConfig.botToken,
      chatId: telegramConfig.chatId,
      chatName: telegramConfig.chatName,
      notifyOnMonthEnd: telegramConfig.notifyOnMonthEnd,
      notifyOnSignalChange: telegramConfig.notifyOnSignalChange,
    },
  };

  const jsonString = JSON.stringify(currentBackupData, null, 2);

  // Handle file download
  const handleDownloadJson = () => {
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().substring(0, 10);
    link.setAttribute('href', url);
    link.setAttribute('download', `dual_momentum_cartera_${dateStr}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyClipboard = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Validate incoming JSON text
  const validateJson = (text: string) => {
    if (!text.trim()) {
      setImportValidation(null);
      return;
    }
    try {
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== 'object') {
        setImportValidation({ isValid: false, error: 'El archivo no contiene un objeto JSON válido.' });
        return;
      }
      if (!Array.isArray(parsed.funds) || parsed.funds.length === 0) {
        setImportValidation({ isValid: false, error: 'El archivo no contiene una lista de fondos válida ("funds").' });
        return;
      }
      // Check funds validity - allows slots with or without ISINs as long as funds exist
      const validFunds = parsed.funds.filter((f: any) => f && (f.isin || f.name || f.slotNumber));
      if (validFunds.length === 0) {
        setImportValidation({ isValid: false, error: 'No se encontraron fondos válidos en el archivo.' });
        return;
      }

      // Deduplicate ISINs and ensure clean sequential slots
      const seenIsins = new Set<string>();
      const cleanedFunds = parsed.funds.map((f: any, idx: number) => {
        const rawIsin = (f.isin || '').trim().toUpperCase();
        const slotNum = idx + 1;
        const isDuplicate = rawIsin.length > 0 && seenIsins.has(rawIsin);
        if (rawIsin.length > 0 && !isDuplicate) {
          seenIsins.add(rawIsin);
        }
        const cleanIsin = isDuplicate ? '' : rawIsin;
        const isBlank = cleanIsin.length === 0;
        return {
          ...f,
          id: f.id || `fund-${slotNum}`,
          slotNumber: slotNum,
          isin: cleanIsin,
          isBlank,
          name: isBlank
            ? (f.name?.includes('Slot #') ? f.name : `Slot #${slotNum} (Vacío)`)
            : (f.name && !f.name.includes('(Vacío)') ? f.name : `Fondo ISIN ${cleanIsin}`),
        };
      });

      setImportValidation({
        isValid: true,
        data: {
          version: parsed.version || '1.0',
          exportDate: parsed.exportDate || new Date().toISOString(),
          app: parsed.app || 'Dual Momentum',
          momentumMode: parsed.momentumMode || 'COMPOSITE_BLENDED',
          hysteresisBuffer: typeof parsed.hysteresisBuffer === 'number' ? parsed.hysteresisBuffer : 0.5,
          activeFundId: parsed.activeFundId || cleanedFunds[0]?.id || 'fund-1',
          funds: cleanedFunds,
          telegramConfig: parsed.telegramConfig,
        }
      });
    } catch (e: any) {
      setImportValidation({ isValid: false, error: 'Sintaxis JSON inválida: ' + e.message });
    }
  };

  // Handle file drop / upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setImportJsonText(content);
      validateJson(content);
    };
    reader.readAsText(file);
  };

  const handleExecuteRestore = () => {
    if (!importValidation?.isValid || !importValidation.data) return;
    const { data } = importValidation;
    onRestoreBackup({
      funds: data.funds,
      activeFundId: data.activeFundId,
      momentumMode: data.momentumMode,
      hysteresisBuffer: data.hysteresisBuffer,
      telegramConfig: data.telegramConfig ? {
        isEnabled: Boolean(data.telegramConfig.isEnabled),
        botToken: data.telegramConfig.botToken || '',
        chatId: data.telegramConfig.chatId || '',
        chatName: data.telegramConfig.chatName || '',
        notifyOnMonthEnd: data.telegramConfig.notifyOnMonthEnd ?? true,
        notifyOnSignalChange: data.telegramConfig.notifyOnSignalChange ?? true,
      } : undefined,
    });
    setIsSuccessRestored(true);
    setTimeout(() => {
      setIsSuccessRestored(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col my-8">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Copia de Seguridad Local
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  JSON Offline
                </span>
              </h2>
              <p className="text-xs text-slate-400">Exporta, importa y restaura tu cartera de fondos y configuración sin intermediarios</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-6 pt-2">
          <button
            onClick={() => setActiveTab('EXPORT')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'EXPORT'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar Cartera (.JSON)</span>
          </button>
          <button
            onClick={() => setActiveTab('IMPORT')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'IMPORT'
                ? 'border-cyan-500 text-cyan-400 bg-cyan-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Importar / Restaurar</span>
          </button>
          <button
            onClick={() => setActiveTab('RESET')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'RESET'
                ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Valores de Fábrica</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          
          {/* TAB 1: EXPORT */}
          {activeTab === 'EXPORT' && (
            <div className="space-y-4">
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-300 space-y-1">
                  <p className="font-semibold text-white">Tu archivo de respaldo incluye:</p>
                  <ul className="list-disc pl-4 space-y-0.5 text-slate-400 font-mono text-[11px]">
                    <li>{funds.length} Fondos ISIN con históricos de precios y fechas</li>
                    <li>Fondo activo asignado actualmente ({funds.find(f => f.id === activeFundId)?.name || 'Seleccionado'})</li>
                    <li>Modo de momentum ({momentumMode}) y banda de histéresis (±{hysteresisBuffer}%)</li>
                    <li>Configuración de alertas por Telegram</li>
                  </ul>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={handleDownloadJson}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-lg shadow-emerald-950/50 transition-all active:scale-[0.99]"
                >
                  <Download className="w-4 h-4" />
                  <span>Descargar Archivo JSON</span>
                </button>

                <button
                  onClick={handleCopyClipboard}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-xs transition-all active:scale-[0.99]"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-400">¡Copiado al Portapapeles!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-slate-400" />
                      <span>Copiar Texto JSON</span>
                    </>
                  )}
                </button>
              </div>

              {/* JSON Preview Box */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Vista Previa del Contenido JSON</span>
                  <span className="font-mono text-slate-500">{funds.length} slots</span>
                </label>
                <div className="relative">
                  <textarea
                    readOnly
                    value={jsonString}
                    rows={8}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-[11px] text-slate-300 select-all focus:outline-none focus:ring-1 focus:ring-emerald-500/50 resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: IMPORT */}
          {activeTab === 'IMPORT' && (
            <div className="space-y-4">
              {/* File Upload Zone */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-cyan-500/60 bg-slate-950/40 hover:bg-cyan-950/10 rounded-xl p-6 text-center cursor-pointer transition-all group"
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept=".json" 
                  className="hidden" 
                />
                <div className="flex flex-col items-center gap-2">
                  <div className="p-3 rounded-full bg-slate-800 group-hover:bg-cyan-500/20 text-slate-400 group-hover:text-cyan-300 transition-colors">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div className="text-xs">
                    <span className="font-semibold text-cyan-400 hover:underline">Haz clic para seleccionar</span> o arrastra un archivo <code className="font-mono bg-slate-800 px-1 py-0.5 rounded text-[11px] text-slate-300">.json</code>
                  </div>
                  <p className="text-[11px] text-slate-500">Copia de seguridad generada previamente por esta aplicación</p>
                </div>
              </div>

              {/* Or Paste Raw JSON */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>O pega el texto JSON directamente</span>
                  {importValidation && (
                    <span className={`text-[11px] font-semibold flex items-center gap-1 ${importValidation.isValid ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {importValidation.isValid ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          JSON Válido ({importValidation.data?.funds.length} fondos)
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Error en JSON
                        </>
                      )}
                    </span>
                  )}
                </label>
                <textarea
                  value={importJsonText}
                  onChange={(e) => {
                    setImportJsonText(e.target.value);
                    validateJson(e.target.value);
                  }}
                  placeholder="Pega aquí el contenido del archivo .json de respaldo..."
                  rows={5}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-[11px] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 resize-none"
                />
              </div>

              {/* Validation Summary Card */}
              {importValidation && (
                <div className={`p-3.5 rounded-xl border text-xs ${
                  importValidation.isValid 
                    ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200' 
                    : 'bg-rose-950/30 border-rose-500/40 text-rose-200'
                }`}>
                  {importValidation.isValid && importValidation.data ? (
                    <div className="space-y-1 font-mono text-[11px]">
                      <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        Copia de Seguridad Lista para Restaurar
                      </div>
                      <div className="text-slate-300">
                        • <strong>Fondos:</strong> {importValidation.data.funds.length} registrados<br />
                        • <strong>Modo:</strong> {importValidation.data.momentumMode} (Histéresis ±{importValidation.data.hysteresisBuffer}%)<br />
                        • <strong>Fecha de exportación:</strong> {new Date(importValidation.data.exportDate).toLocaleString('es-ES')}<br />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <span>{importValidation.error}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Restore Action Button */}
              <button
                onClick={handleExecuteRestore}
                disabled={!importValidation?.isValid}
                className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-xs shadow-lg transition-all ${
                  importValidation?.isValid
                    ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-950/50 cursor-pointer active:scale-[0.99]'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                }`}
              >
                {isSuccessRestored ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-300">¡Copia Restaurada con Éxito!</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Restaurar Cartera y Configuración</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* TAB 3: RESET */}
          {activeTab === 'RESET' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/40 text-amber-200 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-400">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Restablecer a Cartera Oficial por Defecto</span>
                </div>
                <p className="text-slate-300">
                  Esta acción reemplazará los fondos actuales por los 15 fondos indexados institucionales de referencia (Vanguard, Amundi, Fidelity y Groupama Monetario).
                </p>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs space-y-2">
                <p className="font-semibold text-slate-300">Fondos preconfigurados de fábrica:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 font-mono text-[11px] text-slate-400">
                  <div>• Vanguard S&P 500</div>
                  <div>• Vanguard Global Stock (World)</div>
                  <div>• Vanguard Emerging Markets</div>
                  <div>• Vanguard Japan Stock</div>
                  <div>• Amundi MSCI Europe</div>
                  <div>• Groupama Trésorerie (Refugio)</div>
                </div>
              </div>

              <button
                onClick={() => {
                  onResetToDefault();
                  onClose();
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs shadow-lg shadow-amber-950/50 transition-all active:scale-[0.99]"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Confirmar Restablecimiento de Fábrica</span>
              </button>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between text-xs text-slate-500">
          <span>Formato estándar JSON v2.5</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold transition-colors"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
