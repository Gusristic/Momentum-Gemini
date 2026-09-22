import React, { useState } from 'react';
import { 
  X, 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  Download, 
  Upload, 
  RefreshCw,
  ExternalLink,
  Code
} from 'lucide-react';
import { 
  getSavedSupabaseSettings, 
  saveSupabaseSettings, 
  syncFundsToSupabase, 
  SUPABASE_SQL_SCHEMA,
  SupabaseSettings
} from '../utils/supabaseClient';
import { FundISIN } from '../types';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  funds: FundISIN[];
  onFundsImported: (funds: FundISIN[]) => void;
  onSyncCompleted: (success: boolean) => void;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({
  isOpen,
  onClose,
  funds,
  onFundsImported,
  onSyncCompleted,
}) => {
  if (!isOpen) return null;

  const [settings, setSettings] = useState<SupabaseSettings>(getSavedSupabaseSettings());
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [showSql, setShowSql] = useState(false);

  const handleTestAndSave = async () => {
    setTesting(true);
    setTestResult(null);
    saveSupabaseSettings(settings);

    const result = await syncFundsToSupabase(funds, settings);
    setTesting(false);
    setTestResult(result);
    onSyncCompleted(result.success);
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(funds, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `antonacci_dual_momentum_esp_${new Date().toISOString().substring(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed) && parsed.length > 0) {
          onFundsImported(parsed);
          setTestResult({ success: true, message: `Se importaron con éxito ${parsed.length} slots de fondos.` });
        }
      } catch (err) {
        setTestResult({ success: false, message: 'Error al procesar el archivo JSON.' });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-8">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Sincronización con Supabase & Persistencia</h3>
              <p className="text-xs text-slate-400">Guarda tus 10 slots ISIN, historial de precios y carteras de forma permanente.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 text-xs">
          
          {/* Storage Mode Status */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 font-mono text-[11px] uppercase tracking-wider">
                Estado de la Base de Datos
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Almacenamiento Local Activo (Offline-Ready)
              </span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Tus datos ya se guardan automáticamente en tu navegador. Si deseas sincronizarlos con tu propia base de datos Postgres en Supabase o desplegar en Netlify, introduce tus credenciales abajo.
            </p>
          </div>

          {/* Credentials Inputs */}
          <div className="space-y-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Supabase Project URL
              </label>
              <input
                type="text"
                placeholder="https://xyzcompany.supabase.co"
                value={settings.url}
                onChange={e => setSettings(prev => ({ ...prev, url: e.target.value.trim() }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Supabase Anon Key (Public Key)
              </label>
              <input
                type="password"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={settings.anonKey}
                onChange={e => setSettings(prev => ({ ...prev, anonKey: e.target.value.trim() }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Feedback message */}
          {testResult && (
            <div className={`p-3 rounded-lg flex items-start gap-2 ${
              testResult.success 
                ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/40' 
                : 'bg-rose-950/40 text-rose-300 border border-rose-500/40'
            }`}>
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportJson}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1.5 transition-colors"
                title="Descargar copia de seguridad en JSON"
              >
                <Download className="w-3.5 h-3.5" /> Exportar JSON
              </button>

              <label className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1.5 cursor-pointer transition-colors">
                <Upload className="w-3.5 h-3.5" /> Importar JSON
                <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
              </label>
            </div>

            <button
              type="button"
              onClick={handleTestAndSave}
              disabled={testing}
              className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
              {testing ? 'Conectando...' : 'Guardar y Sincronizar Supabase'}
            </button>
          </div>

          {/* SQL Schema helper toggle */}
          <div className="border-t border-slate-800 pt-4 space-y-2">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowSql(!showSql)}
                className="text-slate-400 hover:text-slate-200 font-medium flex items-center gap-1.5"
              >
                <Code className="w-3.5 h-3.5 text-emerald-400" />
                <span>{showSql ? 'Ocultar Script SQL para Supabase' : 'Ver Script SQL para crear la tabla en Supabase'}</span>
              </button>
              
              {showSql && (
                <button
                  type="button"
                  onClick={handleCopySql}
                  className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-mono text-[11px]"
                >
                  {copiedSql ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedSql ? 'Copiado' : 'Copiar SQL'}</span>
                </button>
              )}
            </div>

            {showSql && (
              <pre className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-300 overflow-x-auto max-h-40">
                {SUPABASE_SQL_SCHEMA}
              </pre>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
