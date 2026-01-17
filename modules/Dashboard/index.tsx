
import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  AreaChart, Area
} from 'recharts';
import { TrendingUp, CreditCard, Users, AlertCircle, Loader2, ArrowUpRight, ArrowDownRight, DollarSign, Home } from 'lucide-react';
import { api } from '../../api';
import { Payment, Expense, House } from '../../types';
import { MONTHS } from '../../constants';

const StatCard: React.FC<{ title: string, value: string, icon: React.ReactNode, color: string, trend?: { value: string, isUp: boolean } }> = ({ title, value, icon, color, trend }) => (
  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{title}</p>
        <h3 className="text-2xl font-black text-slate-800 mt-1">{value}</h3>
        {trend && (
          <p className={`text-[10px] mt-2 font-black flex items-center gap-1 uppercase ${trend.isUp ? 'text-emerald-500' : 'text-rose-500'}`}>
            {trend.isUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {trend.value} vs mes ant.
          </p>
        )}
      </div>
      <div className={`p-4 rounded-2xl shadow-lg ${color}`}>
        {icon}
      </div>
    </div>
  </div>
);

const Dashboard: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [houses, setHouses] = useState<House[]>([]);
  const [loading, setLoading] = useState(true);

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  useEffect(() => {
    async function load() {
      try {
        const [p, e, h] = await Promise.all([
          api.getPayments(),
          api.getExpenses(),
          api.getHouses()
        ]);
        setPayments(p || []);
        setExpenses(e || []);
        setHouses(h || []);
      } catch (err) {
        console.error("Error cargando Dashboard", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // 1. Datos para Comparativa Año Actual vs Anterior (Recaudación)
  const comparisonData = useMemo(() => {
    const prevYear = currentYear - 1;
    return MONTHS.map((name, idx) => {
      const actual = payments
        .filter(p => p.year === currentYear && p.month === idx)
        .reduce((sum, p) => sum + p.amount, 0);
      
      const anterior = payments
        .filter(p => p.year === prevYear && p.month === idx)
        .reduce((sum, p) => sum + p.amount, 0);

      return { 
        name: name.substring(0, 3), 
        yearActual: idx <= currentMonth ? actual : null, 
        yearAnterior: anterior 
      };
    });
  }, [payments, currentYear, currentMonth]);

  // 2. Datos para Balance Flujo de Caja (Ingresos vs Egresos Año Actual)
  const balanceData = useMemo(() => {
    return MONTHS.map((name, idx) => {
      const ingresos = payments
        .filter(p => p.year === currentYear && p.month === idx)
        .reduce((sum, p) => sum + p.amount, 0);
      
      const egresos = expenses
        .filter(e => e.year === currentYear && e.month === idx)
        .reduce((sum, e) => sum + e.amount, 0);

      return { 
        name: name.substring(0, 3), 
        ingresos: idx <= currentMonth ? ingresos : null, 
        egresos: idx <= currentMonth ? egresos : null 
      };
    });
  }, [payments, expenses, currentYear, currentMonth]);

  // 3. Estadísticas de las tarjetas
  const stats = useMemo(() => {
    const monthIncome = payments
      .filter(p => p.year === currentYear && p.month === currentMonth)
      .reduce((sum, p) => sum + p.amount, 0);
    
    const prevMonthIncome = payments
      .filter(p => p.year === (currentMonth === 0 ? currentYear - 1 : currentYear) && p.month === (currentMonth === 0 ? 11 : currentMonth - 1))
      .reduce((sum, p) => sum + p.amount, 0);

    const monthExpenses = expenses
      .filter(e => e.year === currentYear && e.month === currentMonth)
      .reduce((sum, e) => sum + e.amount, 0);

    const incomeTrend = prevMonthIncome > 0 
      ? { value: `${(((monthIncome - prevMonthIncome) / prevMonthIncome) * 100).toFixed(1)}%`, isUp: monthIncome >= prevMonthIncome }
      : undefined;

    return {
      monthIncome,
      incomeTrend,
      monthExpenses,
      totalHouses: houses.length,
      activeHouses: houses.length 
    };
  }, [payments, expenses, houses, currentYear, currentMonth]);

  if (loading) return <div className="p-20 flex flex-col items-center gap-4"><Loader2 className="animate-spin text-indigo-600" size={48} /><p className="font-black text-slate-400 uppercase text-xs tracking-widest">Cargando Inteligencia Operacional...</p></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Tarjetas Superiores */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Ingresos del Mes" 
          value={`$${stats.monthIncome.toLocaleString()}`} 
          icon={<TrendingUp size={24} className="text-white" />} 
          color="bg-emerald-500" 
          trend={stats.incomeTrend}
        />
        <StatCard 
          title="Egresos del Mes" 
          value={`$${stats.monthExpenses.toLocaleString()}`} 
          icon={<CreditCard size={24} className="text-white" />} 
          color="bg-rose-500" 
        />
        <StatCard 
          title="Unidades Registradas" 
          value={stats.totalHouses.toString()} 
          icon={<Home size={24} className="text-white" />} 
          color="bg-slate-800" 
        />
        <StatCard 
          title="Balance Operativo" 
          value={`$${(stats.monthIncome - stats.monthExpenses).toLocaleString()}`} 
          icon={<DollarSign size={24} className="text-white" />} 
          color="bg-indigo-600" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
          <div className="mb-6">
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Comparativa de Recaudación Anual</h3>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Relación {currentYear} vs {currentYear - 1}</p>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }} tickFormatter={(val) => `$${val / 1000}k`} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 800, fontSize: '12px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase' }} />
                <Bar dataKey="yearActual" name={`Año Actual (${currentYear})`} fill="#4f46e5" radius={[4, 4, 0, 0]} />
                <Bar dataKey="yearAnterior" name={`Año Anterior (${currentYear - 1})`} fill="#cbd5e1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
          <div className="mb-6">
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Flujo de Caja Mensual</h3>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Ingresos vs Gastos {currentYear}</p>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={balanceData}>
                <defs>
                  <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorEgresos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }} tickFormatter={(val) => `$${val / 1000}k`} />
                <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 800, fontSize: '12px' }} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase' }} />
                <Area type="monotone" dataKey="ingresos" name="Ingresos" stroke="#10b981" fillOpacity={1} fill="url(#colorIngresos)" strokeWidth={3} connectNulls />
                <Area type="monotone" dataKey="egresos" name="Egresos" stroke="#f43f5e" fillOpacity={1} fill="url(#colorEgresos)" strokeWidth={3} connectNulls />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
