
import React, { useState, useEffect } from 'react';
import { Settings, Plus, Trash2, Edit2, Save, Calendar, Loader2, Gavel, LayoutDashboard, Info, Users, AlertCircle, RefreshCw, Database, Clock, ArrowRight } from 'lucide-react';
import { MONTHS, YEARS } from '../../constants';
import { FeeConfig } from '../../types';
import { api } from '../../api';
import FeedbackModal, { ModalState } from '../../components/FeedbackModal';

const Config: React.FC = () => {
  const [fees, setFees] = useState<FeeConfig[]>([]);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalState, setModalState] = useState<ModalState>('idle');
  const [modalConfig, setModalConfig] = useState<{title?: string, message?: string, action?: () => Promise<void>}>({});

  const loadFees = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getFees();
      if (data === null) {
        setError("Error de sincronización con Supabase.");
        setFees([]);
      } else {
        setFees(Array.isArray(data) ? data : []);
      }
    } catch (e: any) {
      setError(e.message || "Error de conexión.");
      setFees([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFees();
  }, []);

  const executeAction = async () => {
    if (!modalConfig.action) return;
    setModalState('loading');
    try {
      await modalConfig.action();
      setModalState('success');
    } catch (e) {
      setModalState('error');
    }
  };

  const handleAddMonthly = () => {
    setModalConfig({
      title: "¿Nuevo Concepto Maestro?",
      message: "Se creará un nuevo ítem de cobro base en la base de datos.",
      action: async () => {
        const newFeeData = { 
          name: 'NUEVO COBRO CONFIGURABLE', 
          defaultAmount: 0, 
          startMonth: new Date().getMonth(), 
          startYear: new Date().getFullYear(),
          category: 'monthly'
        };
        const saved = await api.createFee(newFeeData);
        if (saved) {
          setFees(prev => [...prev, saved]);
          setIsEditing(saved.id);
        }
      }
    });
    setModalState('confirming');
  };

  const handleApplyChanges = (fee: FeeConfig) => {
    setModalConfig({
      title: "¿Guardar Cambios?",
      message: `Se actualizará el valor y vigencia de ${fee.name}.`,
      action: async () => {
        const updated = await api.updateFee(fee.id, fee);
        if (updated) {
          setFees(prev => prev.map(f => f.id === updated.id ? updated : f));
          setIsEditing(null);
        }
      }
    });
    setModalState('confirming');
  };

  const handleDelete = (id: string) => {
    const feeToDelete = fees.find(f => f.id === id);
    setModalConfig({
      title: "¿Eliminar Cobro?",
      message: `¿Está seguro de eliminar "${feeToDelete?.name}"? Esta acción borrará el registro de vigencia.`,
      action: async () => {
        await api.deleteFee(id);
        setFees(prev => prev.filter(f => f.id !== id));
      }
    });
    setModalState('confirming');
  };

  const toggleMonth = (feeId: string, monthIdx: number) => {
    setFees(prev => prev.map(f => {
      if (f.id !== feeId) return f;
      const current = f.applicableMonths || [];
      const updated = current.includes(monthIdx) 
        ? current.filter(m => m !== monthIdx) 
        : [...current, monthIdx].sort((a, b) => a - b);
      return { ...f, applicableMonths: updated.length === 0 ? [] : updated };
    }));
  };

  if (loading) return (
    <div className="p-20 flex flex-col items-center justify-center gap-4">
      <Loader2 className="animate-spin text-indigo-600" size={48} />
      <p className="text-slate-400 font-black uppercase text-xs tracking-widest">Sincronizando Vigencias...</p>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <FeedbackModal state={modalState} title={modalConfig.title} message={modalConfig.message} onConfirm={executeAction} onClose={() => setModalState('idle')} />

      <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-6 mb-10">
          <div>
            <h2 className="text-3xl font-black text-slate-800 flex items-center gap-4 uppercase tracking-tighter">
              <Settings className="text-indigo-600" size={32} /> Parámetros de Cobro
            </h2>
            <p className="text-slate-500 mt-2 text-sm font-medium italic">Vigencia temporal para preservar integridad histórica.</p>
          </div>
          <button onClick={handleAddMonthly} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-black shadow-xl active:scale-95 uppercase text-[10px] tracking-widest transition-all">
            <Plus size={20} /> Nuevo Parámetro
          </button>
        </div>

        <div className="space-y-6">
          {fees.map(fee => {
            const isFine = fee.category === 'fine';
            const isBeingEdited = isEditing === fee.id;
            
            return (
              <div key={fee.id} className={`p-8 rounded-[2.5rem] border transition-all ${isBeingEdited ? 'border-indigo-300 bg-indigo-50/20 ring-4 ring-indigo-50' : 'border-slate-100 bg-slate-50 hover:border-slate-200 shadow-sm'}`}>
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      {isBeingEdited ? (
                        <input 
                          type="text" 
                          className="w-full p-4 border border-slate-200 rounded-2xl outline-none font-black uppercase text-xl text-slate-800 mb-4" 
                          value={fee.name} 
                          onChange={(e) => setFees(prev => prev.map(f => f.id === fee.id ? {...f, name: e.target.value.toUpperCase()} : f))} 
                        />
                      ) : (
                        <h4 className="text-2xl font-black text-slate-800 uppercase tracking-tight truncate">{fee.name}</h4>
                      )}
                      
                      <div className="flex flex-wrap items-center gap-4 mt-2">
                        <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${isFine ? 'bg-rose-100 border-rose-200 text-rose-600' : 'bg-indigo-100 border-indigo-200 text-indigo-600'}`}>
                          <Clock size={12}/>
                          <span className="text-[10px] font-black uppercase">{isFine ? 'MULTA' : 'MENSUAL'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                          <Calendar size={12} />
                          <span>Vigencia: {MONTHS[fee.startMonth]} {fee.startYear}</span>
                          {fee.endYear && <span> - {MONTHS[fee.endMonth || 0]} {fee.endYear}</span>}
                          {!fee.endYear && <span> - Actualidad</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {!isBeingEdited ? (
                        <>
                          <button onClick={() => setIsEditing(fee.id)} className="p-3 bg-white text-slate-400 hover:text-indigo-600 border border-slate-100 rounded-xl shadow-sm"><Edit2 size={18}/></button>
                          <button onClick={() => handleDelete(fee.id)} className="p-3 bg-white text-slate-400 hover:text-rose-600 border border-slate-100 rounded-xl shadow-sm"><Trash2 size={18}/></button>
                        </>
                      ) : (
                        <button onClick={() => handleApplyChanges(fee)} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase shadow-lg flex items-center gap-2">
                          <Save size={16}/> Aplicar
                        </button>
                      )}
                    </div>
                  </div>

                  {isBeingEdited && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-200">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Valor Cuota ($)</label>
                        <input type="number" className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-black text-xl" value={fee.defaultAmount} onChange={(e) => setFees(prev => prev.map(f => f.id === fee.id ? {...f, defaultAmount: Number(e.target.value)} : f))} />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Válido Desde</label>
                        <div className="grid grid-cols-2 gap-2">
                          <select className="p-4 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase" value={fee.startMonth} onChange={(e) => setFees(prev => prev.map(f => f.id === fee.id ? {...f, startMonth: Number(e.target.value)} : f))}>
                            {MONTHS.map((m, i) => <option key={m} value={i}>{m.substring(0,3)}</option>)}
                          </select>
                          <select className="p-4 bg-white border border-slate-200 rounded-2xl text-[10px] font-black" value={fee.startYear} onChange={(e) => setFees(prev => prev.map(f => f.id === fee.id ? {...f, startYear: Number(e.target.value)} : f))}>
                            {YEARS.slice(0, 10).map(y => <option key={y} value={y}>{y}</option>)}
                          </select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Válido Hasta (Opcional)</label>
                        <div className="grid grid-cols-2 gap-2">
                          <select className="p-4 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase" value={fee.endMonth ?? ''} onChange={(e) => setFees(prev => prev.map(f => f.id === fee.id ? {...f, endMonth: e.target.value === '' ? undefined : Number(e.target.value)} : f))}>
                            <option value="">Continua</option>
                            {MONTHS.map((m, i) => <option key={m} value={i}>{m.substring(0,3)}</option>)}
                          </select>
                          <select className="p-4 bg-white border border-slate-200 rounded-2xl text-[10px] font-black" value={fee.endYear ?? ''} onChange={(e) => setFees(prev => prev.map(f => f.id === fee.id ? {...f, endYear: e.target.value === '' ? undefined : Number(e.target.value)} : f))}>
                            <option value="">Activo</option>
                            {YEARS.slice(0, 10).map(y => <option key={y} value={y}>{y}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {!isFine && !isBeingEdited && (
                    <div className="pt-4 border-t border-slate-200/50 flex flex-wrap gap-1.5">
                      {MONTHS.map((month, idx) => {
                        const isApplicable = !fee.applicableMonths || fee.applicableMonths.length === 0 || fee.applicableMonths.includes(idx);
                        return (
                          <div key={month} className={`text-[8px] px-2 py-1 rounded-md font-black uppercase border ${isApplicable ? 'bg-indigo-600 border-indigo-700 text-white' : 'bg-slate-100 border-slate-200 text-slate-400'}`}>
                            {month.substring(0, 3)}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {!isFine && isBeingEdited && (
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Meses de Cobro Activo</label>
                      <div className="flex flex-wrap gap-2">
                        {MONTHS.map((month, idx) => {
                          const isApplicable = !fee.applicableMonths || fee.applicableMonths.length === 0 || fee.applicableMonths.includes(idx);
                          return (
                            <button 
                              key={month} 
                              onClick={() => toggleMonth(fee.id, idx)} 
                              className={`text-[9px] px-3 py-2 rounded-xl font-black uppercase border transition-all ${isApplicable ? 'bg-indigo-600 border-indigo-700 text-white' : 'bg-white border-slate-200 text-slate-400'}`}
                            >
                              {month.substring(0, 3)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Config;
