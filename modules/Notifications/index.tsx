
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Mail, 
  ShieldCheck, 
  Settings, 
  AlertCircle, 
  ExternalLink, 
  CheckCircle2, 
  Copy, 
  Laptop, 
  Globe, 
  Lock, 
  ShieldAlert, 
  Key, 
  ArrowRight,
  Eye,
  EyeOff,
  ArrowLeft
} from 'lucide-react';
import { NOTIFICATION_CONFIG } from '../../constants';

const Notifications: React.FC = () => {
  const navigate = useNavigate();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);

  const SECRET_KEY = "Ino123$$$";

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === SECRET_KEY) {
      setIsAuthorized(true);
      setError(false);
    } else {
      setError(true);
      setPassword('');
    }
  };

  const troubleshooting = [
    {
      error: "Error 400: invalid_request",
      solution: "Ocurre en Local y Nube. Debes agregar tu correo personal en la sección 'Test Users' de la consola Google Cloud.",
      icon: <AlertCircle className="text-rose-500" size={18} />
    },
    {
      error: "Uso en Localhost (VS Code)",
      solution: "Debes agregar 'http://localhost:5173' (o tu puerto actual) en 'Authorized JavaScript origins' dentro de Google Cloud.",
      icon: <Laptop className="text-indigo-500" size={18} />
    }
  ];

  // Si no está autorizado, mostramos el "Pop-up" de protección
  if (!isAuthorized) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xl animate-in fade-in duration-500">
        <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-300 border border-slate-200">
          <div className="bg-slate-900 p-10 text-white flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-indigo-600 rounded-[2rem] flex items-center justify-center shadow-xl mb-6 animate-pulse">
              <Lock size={36} />
            </div>
            <h3 className="text-2xl font-black uppercase tracking-tighter">Acceso Restringido</h3>
            <p className="text-slate-400 text-xs font-bold tracking-widest uppercase mt-2">Módulo de Notificaciones Críticas</p>
          </div>
          
          <div className="p-10 space-y-6">
            <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-start gap-3">
              <ShieldAlert className="text-amber-600 shrink-0" size={20} />
              <p className="text-[11px] font-bold text-amber-800 leading-tight">
                Este módulo contiene configuraciones sensibles de la API de Google. Se requiere una llave de acceso autorizada.
              </p>
            </div>

            <form onSubmit={handleUnlock} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Llave de Seguridad (Master Key)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <Key size={18} />
                  </span>
                  <input 
                    type={showPassword ? "text" : "password"}
                    className={`w-full pl-12 pr-12 py-4 bg-slate-50 border rounded-2xl outline-none font-bold transition-all ${error ? 'border-rose-500 ring-4 ring-rose-50' : 'border-slate-200 focus:ring-4 focus:ring-indigo-50'}`}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(false); }}
                    autoFocus
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 p-1"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {error && <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest ml-4 mt-2">Llave incorrecta. Acceso denegado.</p>}
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  type="submit" 
                  className="w-full bg-slate-900 hover:bg-indigo-600 text-white font-black py-5 rounded-[2rem] shadow-xl transition-all flex items-center justify-center gap-3 uppercase text-xs tracking-widest active:scale-95"
                >
                  Desbloquear Módulo <ArrowRight size={18} />
                </button>
                
                <button 
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="w-full bg-white border border-slate-200 text-slate-500 font-black py-4 rounded-[2rem] transition-all flex items-center justify-center gap-2 uppercase text-[10px] tracking-widest hover:bg-slate-50 active:scale-95"
                >
                  <ArrowLeft size={16} /> Cancelar y Volver
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Contenido una vez desbloqueado
  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Header con Estado */}
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
              <Mail className="text-indigo-600" /> Centro de Notificaciones Gmail
            </h2>
            <p className="text-slate-500 mt-1">Configuración técnica para <strong>{NOTIFICATION_CONFIG.senderEmail}</strong>.</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl border border-emerald-200">
              <CheckCircle2 size={16} />
              <span className="text-xs font-bold uppercase tracking-wider">Acceso Autorizado</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          
          {/* Instrucciones para Localhost */}
          <div className="bg-indigo-50 border-2 border-indigo-200 p-6 rounded-2xl">
            <h3 className="text-indigo-900 font-black flex items-center gap-2 mb-2 uppercase text-sm">
              <Laptop size={20} /> Guía para Ejecución Local (VS Code)
            </h3>
            <p className="text-indigo-800 text-sm leading-relaxed mb-4">
              Si vas a correr el proyecto en tu PC, Google exige que autorices tu puerto local.
            </p>
            <div className="bg-white/70 p-4 rounded-xl border border-indigo-100 space-y-3">
              <ol className="text-xs text-indigo-900 space-y-2 list-decimal ml-4 font-medium">
                <li>Ejecuta el proyecto en VS Code (ej: <code>npm run dev</code>).</li>
                <li>Identifica tu URL local (usualmente <code>http://localhost:5173</code>).</li>
                <li>En Google Cloud {'>'} Credenciales {'>'} Tu Client ID:</li>
                <li>Agrega esa URL en <strong>Authorized JavaScript origins</strong>.</li>
                <li><strong>CRÍTICO:</strong> Sin importar si es local o nube, tu correo debe estar en <strong>Test Users</strong> dentro de 'OAuth Consent Screen'.</li>
              </ol>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Settings size={20} className="text-indigo-600" /> Diagnóstico Técnico
            </h3>
            <div className="space-y-3">
              {troubleshooting.map((item, idx) => (
                <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-4">
                  <div className="mt-1">{item.icon}</div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-700">{item.error}</h4>
                    <p className="text-xs text-slate-500 mt-1">{item.solution}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900 rounded-2xl p-8 text-white h-full flex flex-col">
            <Globe size={40} className="mb-6 text-indigo-400" />
            <h4 className="text-xl font-bold mb-4">Modo Sandbox</h4>
            <p className="text-slate-400 text-sm leading-relaxed mb-8">
              Google mantiene la aplicación en "Modo de Prueba" hasta que pases por un proceso de verificación oficial. 
              <br/><br/>
              Mientras tanto, <strong>solo los correos que tú agregues a la lista blanca</strong> podrán enviar notificaciones.
            </p>
            
            <a 
              href="https://console.cloud.google.com/apis/credentials/consent" 
              target="_blank" 
              rel="noreferrer"
              className="w-full flex items-center justify-center gap-2 py-4 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold transition-all shadow-lg shadow-indigo-900/50"
            >
              <ExternalLink size={18} /> Gestionar Test Users
            </a>
            
            <button 
              className="mt-4 w-full flex items-center justify-center gap-2 py-4 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl font-bold transition-all text-xs"
              onClick={() => {
                const url = window.location.origin;
                navigator.clipboard.writeText(url);
                alert("URL actual copiada. Pégala en Google Cloud:\n" + url);
              }}
            >
              <Copy size={16} /> Copiar Origen Actual
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Notifications;
