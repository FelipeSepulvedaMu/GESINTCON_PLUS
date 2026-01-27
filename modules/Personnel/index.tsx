
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, 
  Calendar, 
  HeartPulse, 
  Plane, 
  Trash2, 
  ArrowRight,
  Loader2,
  X as LucideX,
  History,
  DollarSign,
  Save,
  Zap,
  Tag,
  Briefcase,
  Percent,
  Calculator,
  UserPlus,
  Printer,
  FileText,
  Download,
  AlertCircle,
  ShieldCheck,
  FileCheck,
  User,
  Clock
} from 'lucide-react';
import { Employee, VacationRequest, MedicalLeave, ActionLog } from '../../types';
import { api } from '../../api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import FeedbackModal, { ModalState } from '../../components/FeedbackModal';
import { formatRUT } from '../../constants';

const leaveTypeLabels: Record<string, string> = {
  medical: 'Licencia Médica',
  death: 'Permiso Fallecimiento',
  marriage: 'Permiso Matrimonio',
  absence: 'Falta Injustificada'
};

const Personnel: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [vacations, setVacations] = useState<VacationRequest[]>([]);
  const [leaves, setLeaves] = useState<MedicalLeave[]>([]);
  const [logs, setLogs] = useState<ActionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalState, setModalState] = useState<ModalState>('idle');
  const [modalConfig, setModalConfig] = useState<{title?: string, message?: string, action?: () => Promise<void>}>({});
  
  const [activeTab, setActiveTab] = useState<'list' | 'detail'>('list');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'employee' | 'vacation' | 'leave'>('employee');

  const [newEmployee, setNewEmployee] = useState({ 
    name: '', 
    rut: '', 
    entryDate: new Date().toISOString().split('T')[0], 
    role: 'Conserje' 
  });
  
  const [newActivity, setNewActivity] = useState({ startDate: '', endDate: '', days: 0, type: 'medical' as any });
  
  const [salaryForm, setSalaryForm] = useState({
    grossSalary: 0,
    afpPercentage: 10,
    fonasaPercentage: 7,
    cesantiaPercentage: 0.6,
    entryDate: '',
    role: ''
  });

  const CURRENT_USER = "Administración Principal";

  const loadData = async () => {
    try {
      const [emp, vac, lea] = await Promise.all([
        api.getEmployees(),
        api.getVacations(),
        api.getLeaves()
      ]);
      setEmployees(Array.isArray(emp) ? emp : []);
      setVacations(Array.isArray(vac) ? vac : []);
      setLeaves(Array.isArray(lea) ? lea : []);
    } catch (e) {
      console.error("Error cargando personal", e);
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async (empId: string) => {
    try {
      const data = await api.getLogs(empId);
      setLogs(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (selectedEmployee) {
      setSalaryForm({
        grossSalary: selectedEmployee.grossSalary || 0,
        afpPercentage: selectedEmployee.afpPercentage || 10,
        fonasaPercentage: selectedEmployee.fonasaPercentage || 7,
        cesantiaPercentage: selectedEmployee.cesantiaPercentage || 0.6,
        entryDate: selectedEmployee.entryDate || '',
        role: selectedEmployee.role || ''
      });
    }
  }, [selectedEmployee]);

  const calculateVacationStats = (entryDate: string, employeeId: string) => {
    if (!entryDate) return { earned: '0', taken: 0, available: '0' };
    const start = new Date(entryDate);
    const now = new Date();
    const diffMonths = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
    const totalEarned = Math.max(0, diffMonths * 1.25);
    const taken = vacations.filter(v => v.employeeId === employeeId && v.status === 'approved').reduce((sum, v) => sum + v.days, 0);
    return {
      earned: totalEarned.toFixed(1),
      taken: taken,
      available: Math.max(0, totalEarned - taken).toFixed(1)
    };
  };

  const salaryResults = useMemo(() => {
    const gross = salaryForm.grossSalary || 0;
    const afp = gross * (salaryForm.afpPercentage / 100);
    const fonasa = gross * (salaryForm.fonasaPercentage / 100);
    const cesantia = gross * (salaryForm.cesantiaPercentage / 100);
    const totalDiscounts = afp + fonasa + cesantia;
    const net = gross - totalDiscounts;
    return { afp, fonasa, cesantia, totalDiscounts, net };
  }, [salaryForm]);

  const exportSalaryLiquidation = () => {
    if (!selectedEmployee) return;
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const monthName = new Date().toLocaleString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase();

    const primary: [number, number, number] = [15, 23, 42];
    const accent: [number, number, number] = [79, 70, 229];

    doc.setFillColor(primary[0], primary[1], primary[2]);
    doc.rect(0, 0, pageWidth, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('LIQUIDACIÓN DE SUELDO', 15, 18);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`CONDOMINIO MASTER ERP - R.U.T: 77.421.900-5`, 15, 25);
    doc.text(`PERIODO DE PAGO: ${monthName}`, pageWidth - 15, 18, { align: 'right' });

    doc.setTextColor(primary[0], primary[1], primary[2]);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('I. IDENTIFICACIÓN DEL TRABAJADOR', 15, 45);
    doc.setDrawColor(226, 232, 240);
    doc.line(15, 47, pageWidth - 15, 47);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`NOMBRE: ${selectedEmployee.name.toUpperCase()}`, 15, 53);
    doc.text(`R.U.T: ${formatRUT(selectedEmployee.rut)}`, 15, 57);
    doc.text(`CARGO: ${selectedEmployee.role.toUpperCase()}`, 15, 61);
    doc.text(`FECHA INGRESO: ${salaryForm.entryDate}`, pageWidth - 15, 53, { align: 'right' });
    doc.text(`DÍAS TRABAJADOS: 30`, pageWidth - 15, 57, { align: 'right' });

    const haberes = [
      ['SUELDO BASE', `$${salaryForm.grossSalary.toLocaleString()}`],
      ['GRATIFICACIÓN LEGAL (INCL.)', '$0'],
      ['TOTAL HABERES IMPONIBLES', `$${salaryForm.grossSalary.toLocaleString()}`]
    ];

    const descuentos = [
      [`PREVISIÓN AFP (${salaryForm.afpPercentage}%)`, `$${Math.round(salaryResults.afp).toLocaleString()}`],
      [`SALUD FONASA (${salaryForm.fonasaPercentage}%)`, `$${Math.round(salaryResults.fonasa).toLocaleString()}`],
      [`SEGURO CESANTÍA (${salaryForm.cesantiaPercentage}%)`, `$${Math.round(salaryResults.cesantia).toLocaleString()}`],
      ['TOTAL DESCUENTOS PREVISIONALES', `$${Math.round(salaryResults.totalDiscounts).toLocaleString()}`]
    ];

    autoTable(doc, {
      startY: 70,
      head: [['DETALLE DE HABERES (INGRESOS)', 'VALOR']],
      body: haberes,
      theme: 'grid',
      headStyles: { fillColor: accent, halign: 'center' },
      styles: { fontSize: 8, cellPadding: 3 },
      columnStyles: { 1: { halign: 'right', fontStyle: 'bold', cellWidth: 40 } }
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 5,
      head: [['DETALLE DE DESCUENTOS (EGRESOS)', 'VALOR']],
      body: descuentos,
      theme: 'grid',
      headStyles: { fillColor: [225, 29, 72], halign: 'center' },
      styles: { fontSize: 8, cellPadding: 3 },
      columnStyles: { 1: { halign: 'right', fontStyle: 'bold', cellWidth: 40 } }
    });

    const totalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFillColor(primary[0], primary[1], primary[2]);
    doc.rect(15, totalY, pageWidth - 30, 15, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('ALCANCE LÍQUIDO A PAGAR:', 20, totalY + 9.5);
    doc.setFontSize(14);
    doc.text(`$${Math.round(salaryResults.net).toLocaleString()}`, pageWidth - 20, totalY + 9.5, { align: 'right' });

    const legalText = "Certifico que he recibido de mi empleador, a mi entera satisfacción, el saldo líquido indicado en la presente liquidación, sin tener cargo ni reclamación alguna que hacer, por los conceptos de remuneraciones, leyes sociales u otros haberes del periodo.";
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(7);
    doc.text(doc.splitTextToSize(legalText, pageWidth - 30), 15, totalY + 25);

    const signY = pageHeight - 40;
    doc.setDrawColor(203, 213, 225);
    doc.line(40, signY, 90, signY);
    doc.text("FIRMA EMPLEADOR", 65, signY + 5, { align: 'center' });
    doc.line(pageWidth - 90, signY, pageWidth - 40, signY);
    doc.text("FIRMA TRABAJADOR", pageWidth - 65, signY + 5, { align: 'center' });

    doc.save(`LIQUIDACION_${selectedEmployee.name.replace(/\s+/g, '_')}.pdf`);
  };

  const exportDocumentPDF = (type: 'VACACIONES' | 'LICENCIA', record: VacationRequest | MedicalLeave, employee: Employee) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const title = type === 'VACACIONES' ? 'COMPROBANTE DE VACACIONES' : 'CERTIFICADO DE ASISTENCIA';
    const timestamp = new Date().toLocaleString();

    const cPrimary: [number, number, number] = [15, 23, 42];
    const cAccent: [number, number, number] = type === 'VACACIONES' ? [16, 185, 129] : [225, 29, 72];

    doc.setFillColor(cPrimary[0], cPrimary[1], cPrimary[2]);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('CONDOMASTER ERP', 15, 18);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text('GESTIÓN INTEGRAL DE RECURSOS HUMANOS', 15, 25);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.text(title.toUpperCase(), pageWidth - 15, 18, { align: 'right' });
    doc.setFontSize(8);
    doc.text(`ID REGISTRO: #${record.id.slice(-8).toUpperCase()}`, pageWidth - 15, 25, { align: 'right' });

    doc.setTextColor(cPrimary[0], cPrimary[1], cPrimary[2]);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('I. ANTECEDENTES DEL TRABAJADOR', 15, 52);
    doc.setDrawColor(226, 232, 240);
    doc.line(15, 54, pageWidth - 15, 54);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`NOMBRE COMPLETO: ${employee.name.toUpperCase()}`, 15, 62);
    doc.text(`R.U.T: ${formatRUT(employee.rut)}`, 15, 67);
    doc.text(`CARGO / ROL: ${employee.role.toUpperCase()}`, 15, 72);
    doc.text(`FECHA EMISIÓN: ${timestamp}`, pageWidth - 15, 62, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.text('II. DETALLE DEL PERIODO', 15, 85);
    doc.line(15, 87, pageWidth - 15, 87);

    const detailData = [
      ['CONCEPTO', type === 'LICENCIA' ? leaveTypeLabels[(record as MedicalLeave).type].toUpperCase() : 'VACACIONES LEGALES'],
      ['FECHA INICIO', record.startDate],
      ['FECHA TÉRMINO', record.endDate],
      ['TOTAL DÍAS CORRIDOS', `${record.days} DÍAS`]
    ];

    autoTable(doc, {
      startY: 92,
      body: detailData,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 4 },
      columnStyles: { 0: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 60 } }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(15, finalY, pageWidth - 30, 25, 2, 2, 'F');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'italic');
    const observacion = type === 'VACACIONES' 
      ? 'Este documento acredita la solicitud y goce de feriado anual del trabajador, descontando los días indicados de su saldo disponible.'
      : 'Este documento registra la inasistencia autorizada bajo el concepto indicado. En caso de licencia médica, el trabajador debe presentar el certificado correspondiente.';
    doc.text(doc.splitTextToSize(observacion, pageWidth - 40), 20, finalY + 8);

    const signY = pageHeight - 50;
    doc.setDrawColor(203, 213, 225);
    doc.line(40, signY, 90, signY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(cPrimary[0], cPrimary[1], cPrimary[2]);
    doc.text("FIRMA EMPLEADOR", 65, signY + 5, { align: 'center' });
    
    doc.line(pageWidth - 90, signY, pageWidth - 40, signY);
    doc.text("FIRMA TRABAJADOR", pageWidth - 65, signY + 5, { align: 'center' });

    doc.save(`${type}_${employee.name.replace(/\s+/g, '_')}.pdf`);
  };

  const handleOpenModal = (type: 'employee' | 'vacation' | 'leave') => {
    setModalType(type);
    if (type === 'employee') {
      setNewEmployee({ name: '', rut: '', entryDate: new Date().toISOString().split('T')[0], role: 'Conserje' });
    } else {
      setNewActivity({ startDate: new Date().toISOString().split('T')[0], endDate: '', days: 0, type: 'medical' });
    }
    setIsModalOpen(true);
  };

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
      await loadData();
      if (selectedEmployee) await loadLogs(selectedEmployee.id);
    } catch (e: any) {
      setModalState('error');
    }
  };

  const handleDeleteVacation = (id: string) => {
    confirmAction(
      "¿Eliminar Registro?",
      "Se borrará permanentemente el registro de vacaciones y se reintegrarán los días al saldo disponible.",
      async () => { await api.deleteVacation(id); }
    );
  };

  const handleDeleteLeave = (id: string) => {
    confirmAction(
      "¿Eliminar Registro?",
      "Se borrará permanentemente el registro de licencia o inasistencia del historial.",
      async () => { await api.deleteLeave(id); }
    );
  };

  const handleUpdateFicha = () => {
    if (!selectedEmployee) return;
    confirmAction(
      "¿Actualizar Ficha Maestra?",
      `Se guardarán los nuevos parámetros de remuneración y contrato para ${selectedEmployee.name}.`,
      async () => {
        const result = await api.updateEmployee(selectedEmployee.id, { 
          ...selectedEmployee, 
          ...salaryForm 
        });
        setSelectedEmployee(result);
      }
    );
  };

  const handleSaveRegistration = () => {
    confirmAction(
      "¿Confirmar Registro?",
      `Se registrará el movimiento en la ficha del trabajador.`,
      async () => {
        if (modalType === 'employee') await api.createEmployee(newEmployee);
        else if (modalType === 'vacation' && selectedEmployee) await api.createVacation({ employeeId: selectedEmployee.id, ...newActivity, status: 'approved', createdBy: CURRENT_USER });
        else if (modalType === 'leave' && selectedEmployee) await api.createLeave({ employeeId: selectedEmployee.id, ...newActivity, status: 'approved', createdBy: CURRENT_USER });
        setIsModalOpen(false);
      }
    );
  };

  if (loading) return <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-indigo-600" size={40} /></div>;

  return (
    <div className="space-y-6 pb-20">
      <FeedbackModal state={modalState} title={modalConfig.title} message={modalConfig.message} onConfirm={executeAction} onClose={() => setModalState('idle')} />

      {activeTab === 'list' ? (
        <>
          <div className="flex flex-col md:flex-row gap-6 items-center justify-between bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
            <div>
              <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter leading-none">Gestión de Personal</h2>
              <p className="text-slate-500 text-sm font-medium mt-2">Administración de contratos, remuneraciones y asistencia.</p>
            </div>
            <button onClick={() => handleOpenModal('employee')} className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black flex items-center gap-2 shadow-xl hover:bg-black transition-all active:scale-95 uppercase text-xs tracking-widest">
              <Plus size={20} /> Nuevo Trabajador
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {employees.map(emp => {
              const stats = calculateVacationStats(emp.entryDate, emp.id);
              return (
                <div key={emp.id} className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:border-indigo-400 hover:shadow-2xl transition-all group">
                  <div className="p-8">
                    <div className="flex justify-between items-start mb-8">
                      <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-[1.5rem] flex items-center justify-center font-black text-3xl uppercase group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner border border-slate-100">
                        {emp.name ? emp.name[0] : '?'}
                      </div>
                      <div className="bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-100">{emp.role}</div>
                    </div>
                    <h3 className="text-xl font-black text-slate-800 uppercase leading-tight mb-6">{emp.name}</h3>
                    <div className="grid grid-cols-2 gap-4 mb-8">
                      <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-3xl flex flex-col items-center">
                        <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Disponibles</span>
                        <span className="text-xl font-black text-emerald-700">{stats.available}d</span>
                      </div>
                      <div className="bg-slate-50 border border-slate-100 p-4 rounded-3xl flex flex-col items-center">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Ingreso</span>
                        <span className="text-sm font-black text-slate-700">{emp.entryDate}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => { setSelectedEmployee(emp); setActiveTab('detail'); loadLogs(emp.id); }} 
                      className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-indigo-600 transition-all active:scale-95"
                    >
                      Abrir Ficha Maestra
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        selectedEmployee && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-between bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
              <button onClick={() => setActiveTab('list')} className="text-indigo-600 font-black flex items-center gap-2 hover:bg-indigo-50 px-6 py-3 rounded-2xl transition-all uppercase text-[10px] tracking-widest">
                <ArrowRight className="rotate-180" size={20} /> Volver
              </button>
              <div className="flex gap-2">
                 <button onClick={exportSalaryLiquidation} className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black shadow-lg hover:bg-black transition-all uppercase text-[10px] tracking-widest flex items-center gap-2 active:scale-95">
                   <FileText size={18}/> Liquidación de Sueldo
                 </button>
                 <button onClick={() => handleOpenModal('vacation')} className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black shadow-lg hover:bg-emerald-700 transition-all uppercase text-[10px] tracking-widest flex items-center gap-2 active:scale-95">
                   <Plane size={18}/> Vacaciones
                 </button>
                 <button onClick={() => handleOpenModal('leave')} className="bg-rose-600 text-white px-6 py-3 rounded-2xl font-black shadow-lg hover:bg-rose-700 transition-all uppercase text-[10px] tracking-widest flex items-center gap-2 active:scale-95">
                   <HeartPulse size={18}/> Licencia
                 </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
                   <div className="flex flex-col items-center text-center mb-10">
                      <div className="w-28 h-28 bg-indigo-600 text-white rounded-[2.5rem] flex items-center justify-center text-5xl font-black shadow-2xl mb-6">
                        {selectedEmployee.name ? selectedEmployee.name[0] : '?'}
                      </div>
                      <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter leading-none">{selectedEmployee.name}</h2>
                      <div className="mt-4 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl text-xs font-black border border-emerald-100 flex items-center gap-2">
                        <Plane size={14}/> {calculateVacationStats(salaryForm.entryDate, selectedEmployee.id).available}d Disponibles
                      </div>
                   </div>
                   
                   <div className="space-y-6">
                      {/* INFORMACIÓN DE CONTRATO */}
                      <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2 px-2">Datos de Contrato</label>
                        <div className="space-y-3">
                          <div className="relative">
                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" size={16} />
                            <input 
                              type="date" 
                              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-100" 
                              value={salaryForm.entryDate} 
                              onChange={(e) => setSalaryForm({...salaryForm, entryDate: e.target.value})} 
                              title="Fecha de Ingreso"
                            />
                          </div>
                          <div className="relative">
                            <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" size={16} />
                            <select 
                              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl font-black text-[10px] uppercase outline-none focus:ring-2 focus:ring-indigo-100"
                              value={salaryForm.role}
                              onChange={(e) => setSalaryForm({...salaryForm, role: e.target.value})}
                            >
                              <option value="Conserje">Conserje</option>
                              <option value="Administrador">Administrador</option>
                              <option value="Mantención">Mantención</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* INFORMACIÓN SALARIAL */}
                      <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 text-center">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-4">Sueldo Bruto Mensual</label>
                         <div className="flex items-center justify-center gap-2">
                            <DollarSign className="text-indigo-600" size={24} />
                            <input type="number" className="bg-transparent text-3xl font-black text-slate-800 outline-none w-40 text-center" value={salaryForm.grossSalary} onChange={(e) => setSalaryForm({...salaryForm, grossSalary: Number(e.target.value)})} />
                         </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                         <div className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                            <span className="text-[10px] font-black text-slate-500 uppercase">AFP %</span>
                            <input type="number" step="0.01" className="w-16 text-right font-black text-indigo-600 outline-none" value={salaryForm.afpPercentage} onChange={(e) => setSalaryForm({...salaryForm, afpPercentage: Number(e.target.value)})} />
                         </div>
                         <div className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                            <span className="text-[10px] font-black text-slate-500 uppercase">Salud %</span>
                            <input type="number" step="0.01" className="w-16 text-right font-black text-indigo-600 outline-none" value={salaryForm.fonasaPercentage} onChange={(e) => setSalaryForm({...salaryForm, fonasaPercentage: Number(e.target.value)})} />
                         </div>
                         <div className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                            <span className="text-[10px] font-black text-slate-500 uppercase">AFC %</span>
                            <input type="number" step="0.01" className="w-16 text-right font-black text-indigo-600 outline-none" value={salaryForm.cesantiaPercentage} onChange={(e) => setSalaryForm({...salaryForm, cesantiaPercentage: Number(e.target.value)})} />
                         </div>
                      </div>

                      <div className="p-8 bg-slate-900 rounded-[2.5rem] text-white shadow-2xl">
                         <div className="flex justify-between items-center text-[10px] opacity-60 font-black uppercase tracking-widest mb-4">
                            <span>Descuentos Totales</span>
                            <span className="text-rose-400">-${Math.round(salaryResults.totalDiscounts).toLocaleString()}</span>
                         </div>
                         <div className="flex justify-between items-center pt-4 border-t border-white/10">
                            <span className="text-xs font-black uppercase opacity-60">Líquido a Pagar</span>
                            <span className="text-3xl font-black text-emerald-400">${Math.round(salaryResults.net).toLocaleString()}</span>
                         </div>
                      </div>
                      
                      <button onClick={handleUpdateFicha} className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black shadow-xl hover:bg-indigo-700 transition-all uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-3 active:scale-95">
                        <Save size={20} /> Guardar Ficha Maestra
                      </button>
                   </div>
                </div>
              </div>

              <div className="lg:col-span-2 space-y-8">
                {/* Historial de Vacaciones */}
                <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
                   <div className="flex flex-col md:flex-row justify-between md:items-center mb-8 gap-4">
                      <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Historial Vacaciones</h3>
                      <div className="bg-emerald-50 text-emerald-700 px-6 py-2.5 rounded-2xl text-xl font-black shadow-inner border border-emerald-100 flex items-center gap-3">
                         <Plane size={24} /> {calculateVacationStats(salaryForm.entryDate, selectedEmployee.id).available}d Disponibles
                      </div>
                   </div>
                   <div className="overflow-hidden rounded-[2rem] border border-slate-100 shadow-sm">
                      <table className="w-full text-left">
                         <thead className="bg-slate-900 text-white text-[10px] font-black uppercase">
                            <tr>
                               <th className="py-5 px-8">Periodo</th>
                               <th className="py-5 px-8 text-center">Días</th>
                               <th className="py-5 px-8 text-right">Gestión</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-100">
                            {vacations.filter(v => v.employeeId === selectedEmployee.id).length > 0 ? vacations.filter(v => v.employeeId === selectedEmployee.id).map(v => (
                              <tr key={v.id} className="text-xs font-bold text-slate-700 hover:bg-slate-50">
                                 <td className="py-5 px-8">{v.startDate} al {v.endDate}</td>
                                 <td className="py-5 px-8 text-center">{v.days}</td>
                                 <td className="py-5 px-8 text-right flex items-center justify-end gap-2">
                                    <button onClick={() => exportDocumentPDF('VACACIONES', v, selectedEmployee)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="Imprimir"><Printer size={16}/></button>
                                    <button onClick={() => handleDeleteVacation(v.id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-all" title="Eliminar"><Trash2 size={16}/></button>
                                 </td>
                              </tr>
                            )) : (
                               <tr><td colSpan={3} className="py-10 text-center text-slate-400 italic">No hay registros de vacaciones.</td></tr>
                            )}
                         </tbody>
                      </table>
                   </div>
                </div>

                {/* Historial de Licencias / Inasistencias */}
                <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
                   <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter mb-8">Licencias e Inasistencias</h3>
                   <div className="overflow-hidden rounded-[2rem] border border-slate-100 shadow-sm">
                      <table className="w-full text-left">
                         <thead className="bg-slate-800 text-white text-[10px] font-black uppercase">
                            <tr>
                               <th className="py-5 px-8">Tipo / Periodo</th>
                               <th className="py-5 px-8 text-center">Días</th>
                               <th className="py-5 px-8 text-right">Gestión</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-100">
                            {leaves.filter(l => l.employeeId === selectedEmployee.id).length > 0 ? leaves.filter(l => l.employeeId === selectedEmployee.id).map(l => (
                              <tr key={l.id} className="text-xs font-bold text-slate-700 hover:bg-slate-50">
                                 <td className="py-5 px-8">
                                    <p className="font-black text-slate-800">{leaveTypeLabels[l.type] || l.type.toUpperCase()}</p>
                                    <p className="text-[10px] text-slate-400 mt-1">{l.startDate} al {l.endDate}</p>
                                 </td>
                                 <td className="py-5 px-8 text-center">{l.days}</td>
                                 <td className="py-5 px-8 text-right flex items-center justify-end gap-2">
                                    <button onClick={() => exportDocumentPDF('LICENCIA', l, selectedEmployee)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="Imprimir"><Printer size={16}/></button>
                                    <button onClick={() => handleDeleteLeave(l.id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-all" title="Eliminar"><Trash2 size={16}/></button>
                                 </td>
                              </tr>
                            )) : (
                               <tr><td colSpan={3} className="py-10 text-center text-slate-400 italic">No hay registros de licencias.</td></tr>
                            )}
                         </tbody>
                      </table>
                   </div>
                </div>
              </div>
            </div>
          </div>
        )
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-300">
             <div className="bg-slate-900 p-10 text-white flex justify-between items-center">
                <h3 className="text-2xl font-black uppercase tracking-tighter">
                    {modalType === 'employee' ? 'Contratar Personal' : modalType === 'vacation' ? 'Registrar Vacaciones' : 'Registrar Licencia / Inasistencia'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-white/20 rounded-2xl transition-all"><LucideX size={32}/></button>
             </div>
             <div className="p-10 space-y-6">
                {modalType === 'employee' ? (
                   <div className="space-y-4">
                      <input type="text" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold" placeholder="Nombre Completo" value={newEmployee.name} onChange={(e) => setNewEmployee({...newEmployee, name: e.target.value})} />
                      <input type="text" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-mono font-bold" placeholder="RUT (ej: 12.345.678-9)" value={newEmployee.rut} onChange={(e) => setNewEmployee({...newEmployee, rut: e.target.value})} />
                      <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input type="date" className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold" value={newEmployee.entryDate} onChange={(e) => setNewEmployee({...newEmployee, entryDate: e.target.value})} title="Fecha de Ingreso" />
                      </div>
                      <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black uppercase text-[10px]" value={newEmployee.role} onChange={(e) => setNewEmployee({...newEmployee, role: e.target.value})}>
                        <option value="Conserje">Conserje</option>
                        <option value="Administrador">Administrador</option>
                        <option value="Mantención">Mantención</option>
                      </select>
                   </div>
                ) : (
                   <div className="grid grid-cols-1 gap-6">
                      {modalType === 'leave' && (
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Motivo de Inasistencia</label>
                           <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black uppercase text-[10px]" value={newActivity.type} onChange={(e) => setNewActivity({...newActivity, type: e.target.value})}>
                              <option value="medical">Licencia Médica</option>
                              <option value="death">Permiso Fallecimiento</option>
                              <option value="marriage">Permiso Matrimonio</option>
                              <option value="absence">Falta Injustificada</option>
                           </select>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-1 block">Fecha Inicio</label>
                           <input type="date" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl" value={newActivity.startDate} onChange={(e) => setNewActivity({...newActivity, startDate: e.target.value})} />
                         </div>
                         <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-1 block">Fecha Término</label>
                           <input type="date" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl" value={newActivity.endDate} onChange={(e) => setNewActivity({...newActivity, endDate: e.target.value})} />
                         </div>
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-1 block">Total Días Corridos</label>
                         <input type="number" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-center text-xl" placeholder="Cantidad de Días" value={newActivity.days || ''} onChange={(e) => setNewActivity({...newActivity, days: Number(e.target.value)})} />
                      </div>
                   </div>
                )}
                <button onClick={handleSaveRegistration} className="w-full py-6 bg-slate-900 text-white rounded-[2.5rem] font-black shadow-2xl hover:bg-black transition-all uppercase text-xs tracking-[0.2em] active:scale-95 mt-4 flex items-center justify-center gap-2">
                  <UserPlus size={18} /> Finalizar Registro
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Personnel;
