
import React, { useState } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  CreditCard, 
  Users, 
  CalendarCheck, 
  FileText, 
  Settings, 
  LogOut,
  Menu,
  X,
  UserCircle,
  Mail,
  Clock
} from 'lucide-react';

import Dashboard from './modules/Dashboard';
import Payments from './modules/Payments';
import Attendance from './modules/Attendance';
import Expenses from './modules/Expenses';
import Personnel from './modules/Personnel';
import Shifts from './modules/Shifts';
import Config from './modules/Config';
import Notifications from './modules/Notifications';
import Login from './modules/Auth/Login';
import { User } from './types';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    setCurrentUser(null);
    navigate('/');
  };

  if (!currentUser) {
    return <Login onLogin={(user) => setCurrentUser(user)} />;
  }

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={20} /> },
    { label: 'Pagos de Casas', path: '/payments', icon: <CreditCard size={20} /> },
    { label: 'Asistencia Reuniones', path: '/attendance', icon: <CalendarCheck size={20} /> },
    { label: 'Gastos Condominio', path: '/expenses', icon: <FileText size={20} /> },
    { label: 'Gestión Personal', path: '/personnel', icon: <Users size={20} /> },
    { label: 'Gestión Turnos', path: '/shifts', icon: <Clock size={20} /> },
    { label: 'Correo y Notificaciones', path: '/notifications', icon: <Mail size={20} /> },
    { label: 'Configuración', path: '/config', icon: <Settings size={20} /> },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside 
        className={`${
          isSidebarOpen ? 'w-64' : 'w-20'
        } transition-all duration-300 bg-slate-900 text-white flex flex-col fixed inset-y-0 left-0 z-50`}
      >
        <div className="p-4 flex items-center justify-between border-b border-slate-800">
          <div className={`font-bold text-xl overflow-hidden whitespace-nowrap transition-all ${!isSidebarOpen && 'opacity-0'}`}>
            GESINTCON
          </div>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-1 hover:bg-slate-800 rounded">
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 mt-4 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center p-4 transition-colors hover:bg-slate-800 ${
                location.pathname.startsWith(item.path) ? 'bg-indigo-600 border-r-4 border-white' : ''
              }`}
            >
              <span className="shrink-0">{item.icon}</span>
              <span className={`ml-4 overflow-hidden whitespace-nowrap transition-all ${!isSidebarOpen && 'w-0 opacity-0'}`}>
                {item.label}
              </span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={handleLogout}
            className="flex items-center w-full p-2 hover:bg-red-500 rounded transition-colors"
          >
            <LogOut size={20} />
            <span className={`ml-4 transition-all ${!isSidebarOpen && 'opacity-0 w-0'}`}>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-20'} p-8`}>
        <header className="flex justify-between items-center mb-8 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <h1 className="text-2xl font-bold text-slate-800">
            {navItems.find(item => location.pathname.startsWith(item.path))?.label || 'Bienvenido'}
          </h1>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-black text-slate-900 uppercase">{currentUser.name}</p>
              <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">{currentUser.role} | {currentUser.email}</p>
            </div>
            {currentUser.avatarUrl ? (
              <img src={currentUser.avatarUrl} alt="avatar" className="w-10 h-10 rounded-full border border-slate-200" />
            ) : (
              <UserCircle size={40} className="text-slate-300" />
            )}
          </div>
        </header>

        <div className="max-w-[1600px] mx-auto">
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/payments/*" element={<Payments />} />
            <Route path="/attendance/*" element={<Attendance />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/personnel/*" element={<Personnel />} />
            <Route path="/shifts" element={<Shifts />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/config" element={<Config />} />
            <Route path="*" element={<Dashboard />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

export default App;
