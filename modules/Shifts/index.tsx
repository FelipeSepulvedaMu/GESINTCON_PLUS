
import { 
  Calendar, 
  Save, 
  FileDown, 
  Loader2, 
  Sun, 
  Moon, 
  Coffee, 
  AlertTriangle,
  Zap,
  ChevronLeft,
  ChevronRight,
  Clock,
  Briefcase,
  Plus,
  Minus,
  Star,
  RefreshCw,
  Printer,
  User
} from 'lucide-react';
import React, { useState, useEffect, useMemo } from 'react';
import { Employee } from '../../types';
import { api } from '../../api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import FeedbackModal, { ModalState } from '../../components/FeedbackModal';

const SHIFT_CONFIG = {
  day: { label: 'D', baseHours: 11, icon: <Sun size={14} />, color: 'bg-amber-50 border-amber-300 text-amber-700', activeBg: 'bg-amber-500 text-white' },
  night: { label: 'N', baseHours: 11, bonusHours: 1, icon: <Moon size={14} />, color: 'bg-slate-100 border-slate-300 text-slate-700', activeBg: 'bg-slate-800 text-white' },
  off: { label: 'L', baseHours: 0, bonusHours: 0, icon: <Coffee size={14} />, color: 'bg-emerald-50 border-emerald-300 text-emerald-700', activeBg: 'bg-emerald-500 text-white' }
};

interface DayAssignment {
  type: 'day' | 'night' | 'off';
  extraHours: number;
}

const LegendCard: React.FC<{ icon: React.ReactNode, title: string, value: string, colorClass: string, iconColor: string }> = ({ icon, title, value, colorClass, iconColor }) => (
  <div className="bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3 min-w-[160px] flex-1 transition-all hover:shadow-md">
    <div className={`p-2 rounded-lg ${colorClass} ${iconColor}`}>
      {icon}
    </div>
    <div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{title}</p>
      <p className="text-sm font-black text-slate-800 mt-1">{value}</p>
    </div>
  </div>
);

const Shifts: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalState, setModalState] = useState<ModalState>('idle');
  
  const getStartOfCurrentPeriod = () => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Lunes
    const monday = new Date(today.setDate(diff));
    return monday.toISOString().split('T')[0];
  };

  const [startDate, setStartDate] = useState(getStartOfCurrentPeriod());
  const [assignments, setAssignments] = useState<Record<string, Record<string, DayAssignment>>>({});
  const [viewMode, setViewMode] = useState<'S1' | 'S2' | 'FULL'>('FULL');

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [emp, existingShifts] = await Promise.all([
          api.getEmployees(),
          api.getShifts(startDate)
        ]);
        setEmployees(emp || []);
        setAssignments(existingShifts && typeof existingShifts === 'object' ? existingShifts : {});
      } catch (e) { 
        console.error("Error cargando turnos:", e);
        setAssignments({});
      }
      finally { setLoading(false); }
    };
    load();
  }, [startDate]);

  const dates = useMemo(() => {
    const start = new Date(startDate);
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [startDate]);

  const visibleDates = useMemo(() => {
    if (viewMode === 'S1') return dates.slice(0, 7);
    if (viewMode === 'S2') return dates.slice(7, 14);
    return dates;
  }, [dates, viewMode]);

  const navigateWeeks = (offset: number) => {
    const newDate = new Date(startDate);
    newDate.setDate(newDate.getDate() + (offset * 14));
    setStartDate(newDate.toISOString().split('T')[0]);
  };

  const jumpToToday = () => {
    setStartDate(getStartOfCurrentPeriod());
  };

  const calculateHoursPerDay = (assignment?: DayAssignment) => {
    if (!assignment) return 0;
    const config = SHIFT_CONFIG[assignment.type];
    const base = config.baseHours;
    const bonus = (config as any).bonusHours || 0;
    return base + bonus + (assignment.extraHours || 0);
  };

  const calculateWeeklyHours = (empId: string, weekNum: 1 | 2) => {
    const startIndex = weekNum === 1 ? 0 : 7;
    const weekDates = dates.slice(startIndex, startIndex + 7);
    let total = 0;
    const empAssignments = assignments[empId] || {};
    weekDates.forEach(d => {
      const dStr = d.toISOString().split('T')[0];
      total += calculateHoursPerDay(empAssignments[dStr]);
    });
    return total;
  };

  const cycleShift = (empId: string, dateStr: string) => {
    setAssignments(prev => {
      const empShifts = { ...(prev[empId] || {}) };
      const current = empShifts[dateStr]?.type || 'off';
      const extras = empShifts[dateStr]?.extraHours || 0;
      const next: DayAssignment['type'] = current === 'off' ? 'day' : current === 'day' ? 'night' : 'off';
      empShifts[dateStr] = { type: next, extraHours: extras };
      return { ...prev, [empId]: empShifts };
    });
  };

  const adjustExtraHours = (empId: string, dateStr: string, amount: number) => {
    setAssignments(prev => {
      const empShifts = { ...(prev[empId] || {}) };
      const current = empShifts[dateStr] || { type: 'off', extraHours: 0 };
      const newValue = Math.max(0, current.extraHours + amount);
      empShifts[dateStr] = { ...current, extraHours: newValue };
      return { ...prev, [empId]: empShifts };
    });
  };

  const handleSaveClick = () => setModalState('confirming');

  const executeSave = async () => {
    setModalState('loading');
    try {
      await api.saveShifts(startDate, assignments);
      setModalState('success');
    } catch (e) { 
      setModalState('error');
    }
  };

  const exportIndividualVoucher = (emp: Employee) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const timestamp = new Date().toLocaleString();
    const empAssignments = assignments[emp.id] || {};

    // --- CABECERA ---
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text("GESINTCON ERP", 15, 18);
    doc.setFontSize(14);
    doc.text("FICHA INDIVIDUAL DE TURNOS", pageWidth - 15, 18, { align: 'right' });
    
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`TRABAJADOR: ${emp.name.toUpperCase()}`, 15, 28);
    doc.text(`CARGO: ${emp.role.toUpperCase()}`, 15, 32);
    doc.text(`PERIODO: ${dates[0].toLocaleDateString()} AL ${dates[13].toLocaleDateString()}`, pageWidth - 15, 28, { align: 'right' });
    doc.text(`EMITIDO: ${timestamp}`, pageWidth - 15, 32, { align: 'right' });

    // --- TABLA DETALLE TRABAJADOR ---
    const headers = [['DÍA / FECHA', 'TURNO', 'HRS EXTRA', 'TOTAL JORNADA']];
    const body = dates.map(d => {
      const dStr = d.toISOString().split('T')[0];
      const assign = empAssignments[dStr] || { type: 'off', extraHours: 0 };
      const config = SHIFT_CONFIG[assign.type];
      const total = calculateHoursPerDay(assign);
      return [
        `${d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}`,
        config.label === 'L' ? 'LIBRE' : config.label === 'D' ? 'DÍA (11H)' : 'NOCHE (12H)',
        assign.extraHours > 0 ? `+${assign.extraHours} HRS` : '-',
        `${total} HRS`
      ];
    });

    autoTable(doc, {
      startY: 50,
      head: headers,
      body: body,
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229], halign: 'center' },
      styles: { fontSize: 8, cellPadding: 4 },
      columnStyles: { 
        0: { fontStyle: 'bold', cellWidth: 70 },
        1: { halign: 'center' },
        2: { halign: 'center' },
        3: { halign: 'center', fontStyle: 'bold' }
      }
    });

    const s1 = calculateWeeklyHours(emp.id, 1);
    const s2 = calculateWeeklyHours(emp.id, 2);

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(15, finalY, pageWidth - 30, 20, 3, 3, 'F');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.text("RESUMEN DE HORAS DEL PERIODO", 20, finalY + 8);
    doc.setFont('helvetica', 'normal');
    doc.text(`SEMANA 1: ${s1} HRS  |  SEMANA 2: ${s2} HRS  |  TOTAL ACUMULADO: ${s1+s2} HRS`, 20, finalY + 14);

    // --- FIRMAS ---
    const signatureY = pageHeight - 40;
    doc.setDrawColor(203, 213, 225);
    doc.line(40, signatureY, 90, signatureY);
    doc.text("ADMINISTRACIÓN", 65, signatureY + 5, { align: 'center' });
    doc.line(pageWidth - 90, signatureY, pageWidth - 40, signatureY);
    doc.text("FIRMA TRABAJADOR", pageWidth - 65, signatureY + 5, { align: 'center' });

    doc.save(`FICHA_TURNOS_${emp.name.replace(/\s+/g, '_')}.pdf`);
  };

  const exportPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const timestamp = new Date().toLocaleString();
    
    let totalOrd = 0;
    let totalExt = 0;
    
    employees.forEach(emp => {
      dates.forEach(date => {
        const dStr = date.toISOString().split('T')[0];
        const assign = (assignments[emp.id] || {})[dStr];
        if (assign) {
          const config = SHIFT_CONFIG[assign.type];
          totalOrd += config.baseHours + ((config as any).bonusHours || 0);
          totalExt += (assign.extraHours || 0);
        }
      });
    });

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text("GESINTCON ERP", 15, 18);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text("GESTIÓN INTEGRAL DE RECURSOS HUMANOS", 15, 25);
    doc.text(`PERIODO: ${dates[0].toLocaleDateString()} - ${dates[13].toLocaleDateString()}`, 15, 29);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text("INFORME EJECUTIVO DE TURNOS", pageWidth - 15, 18, { align: 'right' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`GENERADO EL: ${timestamp}`, pageWidth - 15, 25, { align: 'right' });

    const cardY = 48;
    const cardWidth = (pageWidth - 40) / 4;
    const cardHeight = 22;

    const drawCard = (x: number, title: string, value: string, sub: string, color: [number, number, number]) => {
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(x, cardY, cardWidth, cardHeight, 3, 3, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.rect(x, cardY, cardWidth, cardHeight, 'S');
      doc.setFillColor(color[0], color[1], color[2]);
      doc.rect(x, cardY, 2, cardHeight, 'F');
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 116, 139);
      doc.text(title.toUpperCase(), x + 6, cardY + 6);
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text(value, x + 6, cardY + 13);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text(sub, x + 6, cardY + 18);
    };

    drawCard(15, "Personal Activo", `${employees.length} Colaboradores`, "En cuadrante de periodo", [79, 70, 229]);
    drawCard(15 + cardWidth + 3.3, "Horas Ordinarias", `${totalOrd} hrs`, "Carga base contractual", [16, 185, 129]);
    drawCard(15 + (cardWidth + 3.3) * 2, "Horas Extraordinarias", `${totalExt} hrs`, "Sobretiempo autorizado", [244, 63, 94]);
    drawCard(15 + (cardWidth + 3.3) * 3, "Total Proyectado", `${totalOrd + totalExt} hrs`, "Carga operativa total", [15, 23, 42]);

    const headers = [
      'COLABORADOR / CARGO',
      ...visibleDates.map(d => `${d.toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase()}\n${d.getDate()}`),
      'S1', 'S2', 'TOTAL'
    ];

    const body = employees.map(emp => {
      const row = [`${emp.name.toUpperCase()}\n(${emp.role})`];
      visibleDates.forEach(d => {
        const dStr = d.toISOString().split('T')[0];
        const assign = (assignments[emp.id] || {})[dStr] || { type: 'off', extraHours: 0 };
        const label = SHIFT_CONFIG[assign.type].label;
        const extras = assign.extraHours > 0 ? ` (+${assign.extraHours})` : '';
        row.push(`${label}${extras}`);
      });
      const s1 = calculateWeeklyHours(emp.id, 1);
      const s2 = calculateWeeklyHours(emp.id, 2);
      row.push(`${s1}h`, `${s2}h`, `${s1 + s2}h`);
      return row;
    });

    autoTable(doc, {
      startY: cardY + cardHeight + 10,
      head: [headers],
      body: body,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 7, halign: 'center', valign: 'middle', fontStyle: 'bold' },
      styles: { fontSize: 7, cellPadding: 3.5, valign: 'middle', halign: 'center', lineColor: [226, 232, 240] },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 45, halign: 'left' }, [headers.length - 1]: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
      alternateRowStyles: { fillColor: [252, 253, 255] }
    });

    doc.save(`REPORTE_EJECUTIVO_TURNOS_${startDate}.pdf`);
  };

  if (loading) return <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-indigo-600" size={40} /></div>;

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      <FeedbackModal 
        state={modalState}
        onConfirm={executeSave}
        onClose={() => setModalState('idle')}
        message={modalState === 'confirming' ? "¿Desea guardar la planificación de turnos actual para este periodo?" : undefined}
      />

      <div className="bg-white px-6 py-4 rounded-t-2xl border-x border-t border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 z-10 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner border border-slate-200">
            <button onClick={() => navigateWeeks(-1)} className="p-2 hover:bg-white hover:text-indigo-600 rounded-lg transition-all text-slate-500" title="14 Días Atrás">
              <ChevronLeft size={20} />
            </button>
            <div className="flex items-center px-4 gap-2 bg-white rounded-lg shadow-sm mx-1">
              <Calendar size={16} className="text-indigo-600" />
              <input 
                type="date" 
                className="text-sm font-black text-slate-700 outline-none cursor-pointer"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <button onClick={() => navigateWeeks(1)} className="p-2 hover:bg-white hover:text-indigo-600 rounded-lg transition-all text-slate-500" title="14 Días Adelante">
              <ChevronRight size={20} />
            </button>
          </div>
          
          <button 
            onClick={jumpToToday} 
            className="flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-4 py-2 rounded-xl border border-indigo-200 transition-all font-black text-xs uppercase tracking-widest shadow-sm active:scale-95"
          >
            <RefreshCw size={14} /> Ir a Hoy
          </button>

          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 ml-4">
            <button onClick={() => setViewMode('S1')} className={`px-4 py-1.5 text-[11px] font-black rounded-lg transition-all ${viewMode === 'S1' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>S1</button>
            <button onClick={() => setViewMode('S2')} className={`px-4 py-1.5 text-[11px] font-black rounded-lg transition-all ${viewMode === 'S2' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>S2</button>
            <button onClick={() => setViewMode('FULL')} className={`px-4 py-1.5 text-[11px] font-black rounded-lg transition-all ${viewMode === 'FULL' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>15 DÍAS</button>
          </div>
        </div>

        <div className="flex gap-3 text-xs font-black items-center">
          <button onClick={exportPDF} className="bg-white border border-slate-200 px-5 py-2 text-slate-700 hover:bg-slate-50 rounded-xl transition-all flex items-center gap-2 shadow-sm active:scale-95">
            <FileDown size={18} className="text-indigo-600" /> REPORTE PDF
          </button>
          <button onClick={handleSaveClick} className="bg-indigo-600 text-white px-6 py-2 rounded-xl flex items-center gap-2 hover:bg-indigo-700 shadow-lg transition-all active:scale-95">
            <Save size={16} /> GUARDAR
          </button>
        </div>
      </div>

      <div className="flex-1 bg-white border-x border-b border-slate-200 shadow-xl overflow-y-auto rounded-b-2xl">
        <table className="w-full table-fixed border-collapse">
          <thead>
            <tr className="bg-slate-900 text-white sticky top-0 z-40">
              <th className="w-[180px] p-4 text-left text-[10px] font-black uppercase tracking-widest sticky left-0 bg-slate-900 z-50">Personal</th>
              {visibleDates.map((date, i) => {
                const isToday = date.toISOString().split('T')[0] === todayStr;
                return (
                  <th key={i} className={`p-2 text-center border-l border-white/10 relative ${isToday ? 'bg-indigo-600' : ''}`}>
                    <span className="block text-[8px] font-bold opacity-50 uppercase leading-none">{date.toLocaleDateString('es-ES', { weekday: 'short' })}</span>
                    <span className="block text-sm font-black mt-1">{date.getDate()}</span>
                  </th>
                );
              })}
              <th className="w-[100px] p-2 text-center bg-indigo-800 text-[10px] font-black uppercase sticky right-0 z-50">Resumen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {employees.map(emp => {
              const s1 = calculateWeeklyHours(emp.id, 1);
              const s2 = calculateWeeklyHours(emp.id, 2);

              return (
                <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 sticky left-0 bg-white z-20 border-r border-slate-100 shadow-md align-middle h-28">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center font-black text-xs shrink-0">{emp.name[0]}</div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-black text-slate-800 truncate uppercase">{emp.name}</p>
                          <p className="text-[7px] font-bold text-indigo-500 uppercase truncate mt-0.5">{emp.role}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => exportIndividualVoucher(emp)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all active:scale-90 shrink-0"
                        title="Exportar Ficha Individual"
                      >
                        <Printer size={16} />
                      </button>
                    </div>
                  </td>

                  {visibleDates.map((date, i) => {
                    const dateStr = date.toISOString().split('T')[0];
                    const isToday = dateStr === todayStr;
                    const assign = (assignments[emp.id] || {})[dateStr] || { type: 'off', extraHours: 0 };
                    const config = SHIFT_CONFIG[assign.type];
                    const dayTotal = calculateHoursPerDay(assign);

                    return (
                      <td key={i} className={`p-1 border-l border-slate-50 h-28 transition-colors ${isToday ? 'bg-indigo-50/30' : ''}`}>
                        <div className="flex flex-col h-full gap-1">
                          <div 
                            className={`flex-1 rounded-t-lg border border-b-0 p-1 flex flex-col items-center justify-center transition-all cursor-pointer ${assign.type !== 'off' ? config.activeBg : 'bg-slate-50 border-slate-200 hover:border-indigo-300'}`}
                            onClick={() => cycleShift(emp.id, dateStr)}
                          >
                            {config.icon}
                            <span className="text-[9px] font-black leading-none mt-1">{config.label}</span>
                          </div>

                          <div className={`rounded-b-lg border p-1 flex items-center justify-between transition-all ${assign.extraHours > 0 ? 'bg-indigo-600 border-indigo-700 text-white' : 'bg-slate-100 border-slate-200'}`}>
                            <button onClick={(e) => { e.stopPropagation(); adjustExtraHours(emp.id, dateStr, -0.5); }} className="p-0.5 hover:bg-black/10 rounded transition-colors"><Minus size={10} /></button>
                            <div className="flex flex-col items-center min-w-[25px]">
                              <span className="text-[8px] font-black leading-none">{assign.extraHours > 0 ? `+${assign.extraHours}` : '0'}</span>
                              <span className="text-[6px] font-bold opacity-60 leading-none mt-0.5">{dayTotal}h</span>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); adjustExtraHours(emp.id, dateStr, 0.5); }} className="p-0.5 hover:bg-black/10 rounded transition-colors"><Plus size={10} /></button>
                          </div>
                        </div>
                      </td>
                    );
                  })}

                  <td className="p-2 bg-indigo-50/50 sticky right-0 z-20 border-l border-indigo-100 align-middle h-28">
                    <div className="flex flex-col gap-1">
                      <div className={`py-1 rounded-md flex flex-col items-center justify-center ${s1 > 44 ? 'bg-rose-500 text-white' : 'bg-white text-indigo-600 border border-indigo-100'}`}>
                        <span className="text-[6px] font-black uppercase leading-none">S1</span>
                        <span className="text-[10px] font-black leading-none mt-0.5">{s1}h</span>
                      </div>
                      <div className={`py-1 rounded-md flex flex-col items-center justify-center ${s2 > 44 ? 'bg-rose-500 text-white' : 'bg-white text-indigo-600 border border-indigo-100'}`}>
                        <span className="text-[6px] font-black uppercase leading-none">S2</span>
                        <span className="text-[10px] font-black leading-none mt-0.5">{s2}h</span>
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap lg:flex-nowrap gap-4 shrink-0 pb-2">
        <LegendCard icon={<Sun size={18} />} title="TURNO DÍA" value="11h Base" colorClass="bg-amber-100" iconColor="text-amber-600" />
        <LegendCard icon={<Moon size={18} />} title="TURNO NOCHE" value="12h (11+1 Bono)" colorClass="bg-slate-800" iconColor="text-white" />
        <LegendCard icon={<Coffee size={18} />} title="DÍA LIBRE" value="0h" colorClass="bg-emerald-100" iconColor="text-emerald-600" />
        <LegendCard icon={<AlertTriangle size={18} />} title="LÍMITE SEMANAL" value="Máx. 44h" colorClass="bg-rose-100" iconColor="text-rose-600" />
      </div>
    </div>
  );
};

export default Shifts;
