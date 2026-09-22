import React, { useState } from 'react';
import { 
  Send, 
  Bot, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ExternalLink, 
  ShieldCheck, 
  Bell, 
  Eye, 
  EyeOff, 
  Key, 
  MessageSquare,
  Sparkles,
  HelpCircle
} from 'lucide-react';
import { TelegramConfig, DualMomentumSignal } from '../types';
import { 
  detectTelegramChatId, 
  sendTelegramTest, 
  sendTelegramSignal, 
  saveLocalTelegramConfig,
  syncBackendTelegramConfig
} from '../utils/telegramClient';

interface TelegramAlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: TelegramConfig;
  onSaveConfig: (cfg: TelegramConfig) => void;
  currentSignal?: DualMomentumSignal;
  modelName?: string;
  hysteresisBuffer?: number;
  allModels?: {
    equilibrado?: DualMomentumSignal;
    classic12M?: DualMomentumSignal;
    momentum12Minus1?: DualMomentumSignal;
    progresivo?: DualMomentumSignal;
  };
  funds?: any[];
  activeFundId?: string;
}

export function TelegramAlertsModal({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  currentSignal,
  modelName = 'Dual Momentum Equilibrado',
  hysteresisBuffer = 0.5,
  allModels,
  funds,
  activeFundId,
}: TelegramAlertsModalProps) {
  const [token, setToken] = useState(config.botToken);
  const [chatId, setChatId] = useState(config.chatId);
  const [chatName, setChatName] = useState(config.chatName || '');
  const [isEnabled, setIsEnabled] = useState(config.isEnabled);
  const [notifyOnSignalChange, setNotifyOnSignalChange] = useState(config.notifyOnSignalChange);
  const [notifyOnMonthEnd, setNotifyOnMonthEnd] = useState(config.notifyOnMonthEnd);

  const [showToken, setShowToken] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [isSendingSignal, setIsSendingSignal] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  if (!isOpen) return null;

  async function handleAutoDetect() {
    if (!token.trim()) {
      setStatusMsg({ type: 'error', text: 'Por favor, introduce primero el Bot Token que te dio @BotFather.' });
      return;
    }

    setIsDetecting(true);
    setStatusMsg(null);

    const res = await detectTelegramChatId(token.trim());
    setIsDetecting(false);

    if (res.ok && res.chatId) {
      setChatId(res.chatId);
      if (res.chatName) setChatName(res.chatName);
      setStatusMsg({ 
        type: 'success', 
        text: `¡Chat detectado con éxito! ID: ${res.chatId}${res.chatName ? ` (${res.chatName})` : ''}` 
      });
    } else {
      setStatusMsg({ 
        type: 'error', 
        text: res.message || res.error || 'No se pudo detectar el Chat ID. Verifica que hayas abierto el bot en Telegram y pulsado INICIAR.' 
      });
    }
  }

  async function handleSendTest() {
    if (!token.trim() || !chatId.trim()) {
      setStatusMsg({ type: 'error', text: 'Debes rellenar el Bot Token y el Chat ID para enviar la prueba.' });
      return;
    }

    setIsSendingTest(true);
    setStatusMsg(null);

    const res = await sendTelegramTest(token.trim(), chatId.trim());
    setIsSendingTest(false);

    if (res.ok) {
      setStatusMsg({ type: 'success', text: '✅ ¡Mensaje de prueba enviado con éxito a tu Telegram!' });
    } else {
      setStatusMsg({ type: 'error', text: res.error || 'Error al enviar el mensaje de prueba a Telegram.' });
    }
  }

  async function handleSendCurrentSignal() {
    if (!token.trim() || !chatId.trim()) {
      setStatusMsg({ type: 'error', text: 'Debes rellenar el Bot Token y el Chat ID.' });
      return;
    }
    if (!currentSignal) {
      setStatusMsg({ type: 'error', text: 'No hay señal disponible en este momento.' });
      return;
    }

    setIsSendingSignal(true);
    setStatusMsg(null);

    const res = await sendTelegramSignal(
      token.trim(), 
      chatId.trim(), 
      currentSignal, 
      modelName, 
      hysteresisBuffer,
      allModels
    );
    setIsSendingSignal(false);

    if (res.ok) {
      setStatusMsg({ type: 'success', text: '📢 ¡Reporte multi-modelo (Equilibrado prioritario) enviado a tu Telegram!' });
    } else {
      setStatusMsg({ type: 'error', text: res.error || 'Error al enviar la señal.' });
    }
  }

  function handleSave() {
    const updated: TelegramConfig = {
      botToken: token.trim(),
      chatId: chatId.trim(),
      isEnabled: isEnabled && Boolean(token.trim() && chatId.trim()),
      notifyOnSignalChange,
      notifyOnMonthEnd,
      chatName,
    };
    saveLocalTelegramConfig(updated);
    syncBackendTelegramConfig({
      ...updated,
      hysteresisBuffer,
      funds,
      activeFundId
    });
    onSaveConfig(updated);
    onClose();
  }

  return (
    <div id="telegram-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div id="telegram-modal-card" className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-sky-600 to-blue-700 p-5 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
              <Send className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-tight">Alertas Automáticas por Telegram</h3>
              <p className="text-xs text-sky-100">Notificaciones directas de fin de mes y rotación de fondos</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg p-1.5 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {/* Status feedback message */}
          {statusMsg && (
            <div className={`p-4 rounded-xl text-sm flex items-start space-x-3 border ${
              statusMsg.type === 'success' 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                : statusMsg.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-blue-50 border-blue-200 text-blue-800'
            }`}>
              {statusMsg.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 font-medium">{statusMsg.text}</div>
            </div>
          )}

          {/* Quick Step Guide */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-sky-600" />
              <span>Configuración Rápida en 2 Pasos</span>
            </div>
            <ol className="text-xs text-slate-600 space-y-2 list-decimal list-inside leading-relaxed">
              <li>
                <strong className="text-slate-800">Crea tu Bot:</strong> Abre Telegram, busca 
                <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-sky-600 font-semibold hover:underline inline-flex items-center ml-1 mr-1">
                  @BotFather <ExternalLink className="w-3 h-3 ml-0.5 inline" />
                </a> 
                y envía el comando <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800 font-mono">/newbot</code> para obtener tu <span className="font-semibold text-slate-800">Bot Token</span>.
              </li>
              <li>
                <strong className="text-slate-800">Detecta tu Chat ID:</strong> Abre el bot que acabas de crear en Telegram, pulsa <span className="font-semibold text-sky-700">"INICIAR"</span> o envíale un <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800 font-mono">hola</code>, y pulsa el botón de abajo <span className="font-semibold text-sky-700">"🔍 Auto-detectar Chat ID"</span>.
              </li>
            </ol>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            
            {/* Bot Token Field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span className="flex items-center space-x-1.5">
                  <Key className="w-3.5 h-3.5 text-slate-500" />
                  <span>1. Telegram Bot Token</span>
                </span>
                <span className="text-[11px] font-normal text-slate-500">De @BotFather</span>
              </label>
              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Ej: 7123456789:AAHq_x7abcdef12345..."
                  className="w-full font-mono text-sm px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 pr-10 shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Chat ID Field with Auto-detect */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                  <span>2. Tu Chat ID de Telegram</span>
                </label>
                <button
                  type="button"
                  onClick={handleAutoDetect}
                  disabled={isDetecting || !token.trim()}
                  className="inline-flex items-center space-x-1 text-xs font-semibold text-sky-600 hover:text-sky-700 disabled:opacity-50 disabled:cursor-not-allowed bg-sky-50 hover:bg-sky-100 px-2.5 py-1 rounded-lg transition-colors border border-sky-200"
                >
                  <RefreshCw className={`w-3 h-3 ${isDetecting ? 'animate-spin' : ''}`} />
                  <span>{isDetecting ? 'Detectando...' : '🔍 Auto-detectar Chat ID'}</span>
                </button>
              </div>
              <input
                type="text"
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                placeholder="Ej: 123456789 (o pulsa auto-detectar)"
                className="w-full font-mono text-sm px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 shadow-sm"
              />
              {chatName && (
                <p className="text-xs text-emerald-600 font-medium mt-1 flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Conectado a: <strong>{chatName}</strong></span>
                </p>
              )}
            </div>

            {/* Notification Toggles */}
            <div className="pt-2 border-t border-slate-100 space-y-3">
              <label className="flex items-center space-x-3 cursor-pointer p-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={(e) => setIsEnabled(e.target.checked)}
                  className="w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500"
                />
                <div>
                  <span className="text-sm font-bold text-slate-800 block">Activar Notificaciones de Telegram</span>
                  <span className="text-xs text-slate-500">Habilita el envío automático de alertas a tu móvil</span>
                </div>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-7">
                <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyOnMonthEnd}
                    onChange={(e) => setNotifyOnMonthEnd(e.target.checked)}
                    disabled={!isEnabled}
                    className="w-3.5 h-3.5 text-sky-600 rounded border-slate-300 disabled:opacity-50"
                  />
                  <span>Aviso de Fin de Mes (días 28-30)</span>
                </label>

                <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyOnSignalChange}
                    onChange={(e) => setNotifyOnSignalChange(e.target.checked)}
                    disabled={!isEnabled}
                    className="w-3.5 h-3.5 text-sky-600 rounded border-slate-300 disabled:opacity-50"
                  />
                  <span>Aviso al cambiar líder / Refugio</span>
                </label>
              </div>
            </div>

            {/* Live Testing Buttons */}
            <div className="pt-3 border-t border-slate-100 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleSendTest}
                disabled={isSendingTest || !token.trim() || !chatId.trim()}
                className="flex-1 inline-flex items-center justify-center space-x-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all border border-slate-300"
              >
                <Bell className="w-3.5 h-3.5 text-slate-600" />
                <span>{isSendingTest ? 'Enviando...' : '🔔 Enviar Mensaje de Prueba'}</span>
              </button>

              <button
                type="button"
                onClick={handleSendCurrentSignal}
                disabled={isSendingSignal || !token.trim() || !chatId.trim() || !currentSignal}
                className="flex-1 inline-flex items-center justify-center space-x-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-sky-50 hover:bg-sky-100 text-sky-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all border border-sky-200"
              >
                <Send className="w-3.5 h-3.5 text-sky-600" />
                <span>{isSendingSignal ? 'Enviando...' : '📢 Enviar Señal Actual'}</span>
              </button>
            </div>

          </div>

        </div>

        {/* Footer actions */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center space-x-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Guardar Configuración</span>
          </button>
        </div>

      </div>
    </div>
  );
}
