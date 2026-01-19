import React, { useState } from 'react';
import { Lock, User as UserIcon, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '../../api';
import { User } from '../../types';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const user = await api.login(email, password);
      onLogin(user);
    } catch (err: any) {
      console.error('LOGIN ERROR:', err);

      setError(
        err?.message ||
        'Credenciales inválidas o error de autenticación'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-6 relative overflow-hidden">
      {/* Background Decorative Blobs */}
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500 rounded-full blur-[120px]"></div>
      </div>

      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-10 z-10 border border-slate-100 animate-in zoom-in duration-300">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-200">
            <Lock className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-2 uppercase tracking-tighter">
            GESINTCON PLUS
          </h1>
          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em]">
            Gestión Inteligente de Condominios
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3 animate-in slide-in-from-top-2">
            <AlertCircle className="text-rose-600 shrink-0" size={18} />
            <p className="text-xs font-bold text-rose-800 leading-tight">
              {error}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-4">
              Correo Electrónico
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <UserIcon size={18} />
              </span>
              <input
                type="email"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 focus:ring-4 focus:ring-indigo-50 outline-none transition-all font-bold text-slate-700"
                placeholder="admin@condominio.cl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-4">
              Contraseña
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <Lock size={18} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-12 focus:ring-4 focus:ring-indigo-50 outline-none transition-all font-bold text-slate-700"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 p-1 transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-black text-white font-black py-5 rounded-[1.5rem] shadow-xl transition-all flex items-center justify-center gap-3 uppercase text-xs tracking-widest active:scale-95"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>Ingresar al Sistema</>
              )}
            </button>
          </div>
        </form>

        <div className="mt-10 text-center">
          <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">
            GESINTCON v1.0 ERP Cloud System
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
