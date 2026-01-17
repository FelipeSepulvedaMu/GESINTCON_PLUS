
import React from 'react';
import { HelpCircle, CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';

export type ModalState = 'idle' | 'confirming' | 'loading' | 'success' | 'cancelled' | 'error';

interface FeedbackModalProps {
  state: ModalState;
  title?: string;
  message?: string;
  onConfirm?: () => void;
  onClose: () => void;
  confirmText?: string;
  cancelText?: string;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ 
  state, 
  title, 
  message, 
  onConfirm, 
  onClose,
  confirmText = "Confirmar Acción",
  cancelText = "Cancelar"
}) => {
  if (state === 'idle') return null;

  const config = {
    confirming: {
      icon: <HelpCircle size={48} className="text-indigo-600" />,
      bg: "bg-indigo-50",
      title: title || "¿Confirmar Acción?",
      message: message || "Esta acción se registrará en el sistema. ¿Desea continuar?"
    },
    loading: {
      icon: <Loader2 size={48} className="text-indigo-600 animate-spin" />,
      bg: "bg-slate-50",
      title: "Procesando...",
      message: "Espere un momento mientras actualizamos los registros."
    },
    success: {
      icon: <CheckCircle2 size={48} className="text-emerald-600" />,
      bg: "bg-emerald-50",
      title: "¡Acción Exitosa!",
      message: message || "La operación se ha completado correctamente."
    },
    cancelled: {
      icon: <XCircle size={48} className="text-rose-600" />,
      bg: "bg-rose-50",
      title: "Acción Cancelada",
      message: message || "El proceso ha sido detenido por el usuario."
    },
    error: {
      icon: <AlertCircle size={48} className="text-amber-600" />,
      bg: "bg-amber-50",
      title: "Hubo un Problema",
      message: message || "No se pudo completar la acción. Intente nuevamente."
    }
  };

  const current = config[state as keyof typeof config];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in duration-200">
        <div className={`p-8 flex flex-col items-center text-center ${current.bg}`}>
          <div className="mb-4 bg-white p-4 rounded-full shadow-sm">
            {current.icon}
          </div>
          <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight leading-tight mb-2">
            {current.title}
          </h3>
          <p className="text-slate-500 text-sm font-medium leading-relaxed">
            {current.message}
          </p>
        </div>
        
        <div className="p-4 bg-white border-t border-slate-100 flex flex-col gap-2">
          {state === 'confirming' ? (
            <>
              <button 
                onClick={onConfirm}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl transition-all shadow-lg active:scale-95 uppercase text-xs tracking-widest"
              >
                {confirmText}
              </button>
              <button 
                onClick={onClose}
                className="w-full bg-white border border-slate-200 text-slate-500 font-bold py-3 rounded-2xl hover:bg-slate-50 transition-all uppercase text-[10px] tracking-widest"
              >
                {cancelText}
              </button>
            </>
          ) : state !== 'loading' ? (
            <button 
              onClick={onClose}
              className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl transition-all shadow-lg active:scale-95 uppercase text-xs tracking-widest"
            >
              Entendido
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default FeedbackModal;
