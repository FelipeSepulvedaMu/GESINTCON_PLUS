
import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Calendar, 
  ArrowRight,
  FileDown,
  Loader2,
  UserCheck,
  Trash2,
  Edit3,
  Save,
  Gavel,
  X,
  DollarSign,
  Zap,
  CheckCircle2,
  ShieldCheck,
  BarChart3,
  Users as UsersIcon,
  Search,
  AlertCircle
} from 'lucide-react';
import { Meeting, House, FeeConfig } from '../../types';
import { api } from '../../api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import FeedbackModal, { ModalState } from '../../components/FeedbackModal';
import { formatRUT } from '../../constants';

const Attendance: React.FC = () => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [houses, setHouses] = useState<House[]>([]);
  const [fees, setFees] = useState<FeeConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalState, setModalState] = useState<ModalState>('idle');
  const [modalConfig, setModalConfig] = useState<{title?: string, message?: string, action?: () => Promise<void>}>({});
  
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [isEditingExisting, setIsEditingExisting] = useState(false);
  
  const [newMeeting, setNewMeeting] = useState({ name: '', date: '' });
  const [currentAttendance, setCurrentAttendance] = useState<Record<string, 'present' | 'justified' | 'absent'>>({});

  const [isFineModalOpen, setIsFineModalOpen] = useState(false);
  const [manualFineAmount, setManualFineAmount] = useState<number>(20000);
  const [meetingForFine, setMeetingForFine] = useState<Meeting | null>(null);

  const CURRENT_USER = "Administrador - ADMIN-2024";

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [m, h, f] = await Promise.all([
        api.getMeetings(), 
        api.getHouses(),
        api.getFees()
      ]);
      console.log("Cargando reuniones:", m);
      setMeetings(Array.isArray(m) ? m : []);
      setHouses(Array.isArray(h) ? h : []);
      setFees(Array.isArray(f) ? f : []);
    } catch (e) {
      console.error("Error cargando datos de asistencia:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const confirmAction = (title: string, message: string, action: () => Promise<void>) => {
    setModalConfig({ title, message, action });
    setModalState('confirming');
  };

  const executeAction = async () => {
    if (!modalConfig.action) return;
    setModalState('loading');
    try {
      await modalConfig.action();
      setModalState('success');
      await loadAllData(); 
    } catch (e) {
      console.error("Error ejecutando acción:", e);
      setModalState('error');
    }
  };

  const startNewMeeting = () => {
    setNewMeeting({ name: '', date: new Date().toISOString().split('T')[0] });
    setIsEditingExisting(false);
    const initialAttendance: Record<string, 'present' | 'justified' | 'absent'> = {};
    houses.forEach(h => { initialAttendance[h.id] = 'absent'; });
    setCurrentAttendance(initialAttendance);
    setActiveTab('create');
  };

  const saveMeeting = () => {
    if (!newMeeting.name) { alert("Debe ingresar un nombre para la reunión"); return; }
    const isEditing = isEditingExisting && selectedMeeting;
    confirmAction(
      isEditing ? "¿Actualizar Acta?" : "¿Finalizar Acta?",
      isEditing ? "Se guardarán los cambios realizados en el registro." : "Se guardará el registro definitivo de asistencia.",
      async () => {
        const timestamp = new Date().toISOString();
        const meetingData: Partial<Meeting> = { 
          name: newMeeting.name, 
          date: newMeeting.date, 
          attendance: currentAttendance 
        };
        if (isEditing && selectedMeeting) {
          meetingData.updatedBy = CURRENT_USER;
          meetingData.updatedAt = timestamp;
          await api.updateMeeting(selectedMeeting.id, meetingData);
        } else {
          meetingData.createdBy = CURRENT_USER;
          meetingData.createdAt = timestamp;
          await api.createMeeting(meetingData);
        }
        setActiveTab('list');
      }
    );
  };

  const deleteMeeting = (meeting: Meeting) => {
    confirmAction(
      "¿Eliminar Acta?",
      `Esta acción borrará permanentemente el acta de "${meeting.name}". Las multas ya vinculadas en el sistema de cobros se mantendrán registradas.`,
      async () => {
        await api.deleteMeeting(meeting.id);
      }
    );
  };

  const getStats = (meeting: Meeting) => {
    const universe = houses.length || 158;
    const attendance = meeting.attendance || {};
    const present = Object.values(attendance).filter(v => v === 'present').length;
    const justified = Object.values(attendance).filter(v => v === 'justified').length;
    const absent = universe - present - justified;
    const percent = ((present / universe) * 100).toFixed(1);
    return { total: universe, present, justified, absent, percent };
  };

  const isMeetingFined = (meetingName: string) => {
    if (!fees) return false;
    return fees.some(f => f.name === `Multa: ${meetingName}`);
  };

  const processAndGenerateFines = (meeting: Meeting, amount: number) => {
    if (!meeting) return;
    setIsFineModalOpen(false);
    
    confirmAction(
      "¿Vincular Multas y Generar PDF?",
      `Se crearán cobros individuales de $${amount.toLocaleString()} en el sistema para las casas inasistentes.`,
      async () => {
        const attendanceMap = meeting.attendance || {};
        const absents = houses.filter(h => attendanceMap[h.id] === 'absent' || !attendanceMap[h.id]);
        const dateObj = new Date(meeting.date);
        
        const fineConfig: Partial<FeeConfig> = {
          name: `Multa: ${meeting.name}`,
          defaultAmount: amount,
          startMonth: dateObj.getMonth(),
          startYear: dateObj.getFullYear(),
          applicableMonths: [dateObj.getMonth()],
          category: 'fine',
          targetHouseIds: absents.map(h => h.id)
        };
        
        await api.createFee(fineConfig);

        const doc = new jsPDF();
        let currentY = 15;
        const slipHeight = 70; 
        const margin = 20;

        absents.forEach((house, index) => {
          if (currentY + slipHeight > 280) {
            doc.addPage();
            currentY = 15;
          }
          
          doc.setFillColor(30, 41, 59);
          doc.rect(margin, currentY, 170, 8, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.text(`NOTIFICACIÓN DE MULTA - FOLIO #${index + 1}`, margin + 5, currentY + 5.5);

          doc.setTextColor(30, 41, 59);
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.text(`CASA: ${house.number}`, margin, currentY + 18);
          
          doc.setFontSize(9);
          const safeOwner = (house.ownerName || (house as any).owner_name || 'Residente').toString().toUpperCase();
          doc.text(`RESIDENTE: ${safeOwner}`, margin, currentY + 24);
          doc.text(`RUT: ${formatRUT(house.rut)}`, margin, currentY + 29);

          const safeMeeting = (meeting.name || 'Asamblea').toString().toUpperCase();
          const bodyText = `Por la presente se notifica la aplicación de una multa por inasistencia a la reunión "${safeMeeting}" realizada el ${meeting.date}. El cobro se verá reflejado en su próximo estado de cuenta mensual.`;
          
          const splitText = doc.splitTextToSize(bodyText, 170);
          doc.setFont('helvetica', 'normal');
          doc.text(splitText, margin, currentY + 38);

          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(153, 27, 27);
          doc.text(`MONTO MULTA: $${amount.toLocaleString()}`, margin, currentY + 62);

          currentY += slipHeight;
          
          if (index < absents.length - 1) {
            doc.setDrawColor(200);
            try { (doc as any).setLineDash([2, 2], 0); } catch(e) {}
            doc.line(10, currentY - 3, 200, currentY - 3);
            try { (doc as any).setLineDash([], 0); } catch(e) {}
          }
          currentY += 5; 
        });

        const safeFileName = (meeting.name || 'Multas').replace(/\s+/g, '_');
        doc.save(`NOTIFICACIONES_MULTAS_${safeFileName}.pdf`);
      }
    );
  };

  const exportAttendanceList = (meeting: Meeting) => {
    const doc = new jsPDF();
    const stats = getStats(meeting);
    
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text('GESINTCON', 20, 25);
    
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(14);
    doc.text(`ACTA DE ASISTENCIA: ${meeting.name.toUpperCase()}`, 20, 55);
    
    autoTable(doc, {
      startY: 65,
      head: [['INDICADOR DE QUÓRUM', 'VALOR REGISTRADO']],
      body: [
        ['UNIVERSO DE CASAS', stats.total], 
        ['PRESENTES', stats.present], 
        ['JUSTIFICADOS', stats.justified], 
        ['INASISTENTES', stats.absent], 
        ['PORCENTAJE DE ASISTENCIA', `${stats.percent}%`]
      ],
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229] }
    });

    const safeFileName = meeting.name.replace(/\s+/g, '_');
    doc.save(`ACTA_QUORUM_${safeFileName}.pdf`);
  };

  if (loading) return <div className="p-20 flex justify-center items-center flex-col gap-4">
    <Loader2 className="animate-spin text-indigo-600" size={48} />
    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Sincronizando Actas...</p>
  </div>;

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      <FeedbackModal state={modalState} title={modalConfig.title} message={modalConfig.message} onConfirm={executeAction} onClose={() => setModalState('idle')} />

      {isFineModalOpen && meetingForFine && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in duration-300">
             <div className="bg-rose-600 p-8 text-white flex justify-between items-center">
                <div className="flex items-center gap-4">
                   <Gavel size={24} />
                   <h3 className="text-xl font-black uppercase tracking-tighter">Procesar Multas</h3>
                </div>
                <button onClick={() => setIsFineModalOpen(false)} className="p-2 hover:bg-white/10 rounded-xl"><X size={20}/></button>
             </div>
             <div className="p-8 space-y-6">
                <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100">
                   <p className="text-[10px] font-black text-rose-800 uppercase mb-1 opacity-60">Reunión</p>
                   <p className="text-sm font-black text-slate-800">{meetingForFine.name}</p>
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Monto Legal ($)</label>
                   <div className="relative">
                      <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-500" size={20} />
                      <input type="number" className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-black text-xl text-slate-800" value={manualFineAmount} onChange={(e) => setManualFineAmount(Number(e.target.value))} />
                   </div>
                </div>
                <button 
                  onClick={() => processAndGenerateFines(meetingForFine, manualFineAmount)}
                  className="w-full bg-slate-900 hover:bg-black text-white font-black py-4 rounded-[1.5rem] shadow-xl flex items-center justify-center gap-2 uppercase text-xs tracking-widest"
                >
                  <Zap size={18} className="text-amber-400" /> Vincular Multas
                </button>
             </div>
          </div>
        </div>
      )}

      {activeTab === 'list' ? (
        <div className="space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-center bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm gap-6">
            <div className="flex items-center gap-6">
              <div className="p-5 bg-indigo-600 rounded-[1.5rem] text-white shadow-lg"><UserCheck size={32}/></div>
              <div>
                <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter leading-none">Bitácora de Asambleas</h2>
                <p className="text-slate-500 text-sm font-medium mt-2">Control Maestro de Quórum y Multas por Inasistencia.</p>
              </div>
            </div>
            <button onClick={startNewMeeting} className="bg-slate-900 text-white px-10 py-5 rounded-2xl font-black flex items-center gap-2 shadow-xl hover:bg-black transition-all active:scale-95 uppercase text-xs tracking-widest">
              <Plus size={20} /> Crear Acta de Reunión
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
            {meetings.length > 0 ? meetings.map(meeting => {
              const stats = getStats(meeting);
              const alreadyFined = isMeetingFined(meeting.name);
              return (
                <div key={meeting.id} className={`bg-white rounded-[2.5rem] border transition-all overflow-hidden flex flex-col group relative ${alreadyFined ? 'border-emerald-200 shadow-emerald-50 shadow-lg' : 'border-slate-200 shadow-sm hover:border-indigo-400 hover:shadow-2xl'}`}>
                  {alreadyFined && (
                    <div className="absolute top-4 right-12 z-10 bg-emerald-500 text-white px-3 py-1 rounded-full flex items-center gap-1.5 shadow-md">
                      <ShieldCheck size={12} />
                      <span className="text-[8px] font-black uppercase tracking-tighter">Contabilizado</span>
                    </div>
                  )}

                  <div className="p-8 flex-1">
                    <div className="flex justify-between items-start mb-6">
                      <div className={`p-4 rounded-2xl ${alreadyFined ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>
                        <Calendar size={28} />
                      </div>
                      <div className="flex gap-2">
                         <button onClick={() => { setSelectedMeeting(meeting); setNewMeeting({ name: meeting.name, date: meeting.date }); setCurrentAttendance(meeting.attendance || {}); setIsEditingExisting(true); setActiveTab('create'); }} className="p-3 bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-xl transition-all" title="Editar"><Edit3 size={18} /></button>
                         <button onClick={() => deleteMeeting(meeting)} className="p-3 bg-slate-50 text-slate-400 hover:text-rose-600 rounded-xl transition-all" title="Eliminar"><Trash2 size={18} /></button>
                      </div>
                    </div>
                    
                    <h3 className="text-xl font-black text-slate-800 mb-6 uppercase leading-tight line-clamp-2 min-h-[56px]">{meeting.name}</h3>
                    
                    <div className="grid grid-cols-3 gap-2 mb-8">
                      <div className="bg-emerald-50 p-4 rounded-2xl flex flex-col items-center border border-emerald-100/50">
                        <span className="text-[9px] font-black text-emerald-400 uppercase tracking-tighter">Presentes</span>
                        <span className="text-xl font-black text-emerald-700">{stats.present}</span>
                      </div>
                      <div className="bg-amber-50 p-4 rounded-2xl flex flex-col items-center border border-amber-100/50">
                        <span className="text-[9px] font-black text-amber-400 uppercase tracking-tighter">Justific.</span>
                        <span className="text-xl font-black text-amber-700">{stats.justified}</span>
                      </div>
                      <div className="bg-rose-50 p-4 rounded-2xl flex flex-col items-center border border-rose-100/50">
                        <span className="text-[9px] font-black text-rose-400 uppercase tracking-tighter">Multas</span>
                        <span className="text-xl font-black text-rose-700">{stats.absent}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                       <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-500">
                          <span>Casas: {stats.total}</span>
                          <span>Quórum: {stats.percent}%</span>
                       </div>
                       <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden shadow-inner border border-slate-200">
                         <div className={`h-full transition-all duration-1000 ${alreadyFined ? 'bg-emerald-500' : 'bg-indigo-600'}`} style={{ width: `${stats.percent}%` }}></div>
                       </div>
                    </div>
                  </div>

                  <div className="bg-slate-50/80 p-5 border-t border-slate-100 grid grid-cols-2 gap-3">
                    <button onClick={() => exportAttendanceList(meeting)} className="bg-white border border-slate-200 text-slate-700 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all shadow-sm flex items-center justify-center gap-2"><FileDown size={16} /> Acta Quórum</button>
                    {!alreadyFined ? (
                      <button onClick={() => { setMeetingForFine(meeting); setManualFineAmount(20000); setIsFineModalOpen(true); }} className="bg-rose-50 border border-rose-200 text-rose-700 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all shadow-sm flex items-center justify-center gap-2">
                        <Gavel size={16} /> Multar
                      </button>
                    ) : (
                      <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
                        <CheckCircle2 size={16} /> Vinculado
                      </div>
                    )}
                  </div>
                </div>
              );
            }) : (
              <div className="col-span-full py-32 flex flex-col items-center justify-center opacity-40">
                <Calendar size={64} className="text-slate-200 mb-4" />
                <p className="font-black text-slate-400 uppercase tracking-widest">No hay registros visibles en el sistema.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-in slide-in-from-right duration-300">
          <div className="flex items-center justify-between bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm">
            <button onClick={() => setActiveTab('list')} className="text-indigo-600 font-black flex items-center gap-2 hover:bg-indigo-50 px-6 py-3 rounded-2xl transition-all uppercase text-xs tracking-widest"><ArrowRight className="rotate-180" size={20} /> Volver</button>
            <button onClick={saveMeeting} className="bg-indigo-600 text-white px-10 py-3.5 rounded-2xl font-black shadow-xl hover:bg-indigo-700 transition-all uppercase text-xs tracking-widest flex items-center gap-2"><Save size={18} /> Finalizar y Guardar Acta</button>
          </div>

          <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Nombre de la Asamblea</label>
                 <input type="text" className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50 font-black text-slate-800 uppercase" placeholder="EJ: ASAMBLEA EXTRAORDINARIA" value={newMeeting.name} onChange={(e) => setNewMeeting({...newMeeting, name: e.target.value.toUpperCase()})} />
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Fecha del Evento</label>
                 <input type="date" className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50 font-bold text-slate-700" value={newMeeting.date} onChange={(e) => setNewMeeting({...newMeeting, date: e.target.value})}/>
              </div>
            </div>

            <div className="bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-2xl border border-slate-800">
              <table className="w-full text-left">
                <thead className="text-white uppercase text-[10px] font-black tracking-[0.2em] border-b border-white/10">
                  <tr>
                    <th className="py-6 px-10">Unidad / Residente Autorizado</th>
                    <th className="py-6 px-10 text-center">Registro de Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {houses.map(house => {
                    const val = currentAttendance[house.id] || 'absent';
                    const safeName = (house.ownerName || (house as any).owner_name || 'Residente').toString().toUpperCase();
                    return (
                      <tr key={house.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-5 px-10">
                           <p className="font-black text-white text-sm">CASA {house.number} - {safeName}</p>
                           <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1 font-mono">RUT: {formatRUT(house.rut)}</p>
                        </td>
                        <td className="py-5 px-10">
                          <div className="flex justify-center gap-3">
                            <button onClick={() => setCurrentAttendance({...currentAttendance, [house.id]: 'present'})} className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all ${val === 'present' ? 'bg-emerald-500 text-white shadow-lg scale-105' : 'bg-white/5 text-slate-500 hover:bg-white/10'}`}>Presente</button>
                            <button onClick={() => setCurrentAttendance({...currentAttendance, [house.id]: 'justified'})} className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all ${val === 'justified' ? 'bg-amber-500 text-white shadow-lg scale-105' : 'bg-white/5 text-slate-500 hover:bg-white/10'}`}>Justificado</button>
                            <button onClick={() => setCurrentAttendance({...currentAttendance, [house.id]: 'absent'})} className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all ${val === 'absent' ? 'bg-rose-500 text-white shadow-lg scale-105' : 'bg-white/5 text-slate-500 hover:bg-white/10'}`}>Inasistente</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Attendance;
