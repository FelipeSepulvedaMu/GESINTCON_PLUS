
import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Download, 
  Trash2, 
  TrendingDown, 
  FileText,
  X,
  Loader2,
  Calendar,
  ChevronDown
} from 'lucide-react';
import { MONTHS, YEARS } from '../../constants';
import { Expense } from '../../types';
import { api } from '../../api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import FeedbackModal, { ModalState } from '../../components/FeedbackModal';

const Expenses: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalState, setModalState] = useState<ModalState>('idle');
  const [modalConfig, setModalConfig] = useState<{title?: string, message?: string, action?: () => Promise<void>}>({});
  
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);
  const [isMonthDropdownOpen, setIsMonthDropdownOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const yearRef = useRef<HTMLDivElement>(null);
  const monthRef = useRef<HTMLDivElement>(null);
  
  const [formData, setFormData] = useState({
    description: '',
    amount: 0,
    category: 'General'
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.getExpenses();
      setExpenses(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Error cargando gastos:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleClickOutside = (event: MouseEvent) => {
      if (yearRef.current && !yearRef.current.contains(event.target as Node)) setIsYearDropdownOpen(false);
      if (monthRef.current && !monthRef.current.contains(event.target as Node)) setIsMonthDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredExpenses = expenses.filter(e => e.year === selectedYear && e.month === selectedMonth);
  const total = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

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
    } catch (e: any) {
      console.error("Error ejecutando acción:", e);
      const errorMsg = e.message || "No se pudo completar la operación en el servidor.";
      setModalConfig(prev => ({ ...prev, message: errorMsg }));
      setModalState('error');
    }
  };

  const handleSave = () => {
    if (!formData.description || formData.amount <= 0) {
      alert("Por favor ingrese una descripción y un monto válido."); 
      return;
    }

    confirmAction(
      "¿Confirmar Registro de Gasto?",
      `Se registrará un egreso de $${formData.amount.toLocaleString()} correspondiente a ${MONTHS[selectedMonth]} ${selectedYear}.`,
      async () => {
        const result = await api.createExpense({ 
          year: selectedYear, 
          month: selectedMonth, 
          ...formData 
        });
        
        if (!result) {
          throw new Error("El servidor rechazó la solicitud.");
        }

        if (result.error) {
          throw new Error(result.error);
        }

        setIsModalOpen(false);
        setFormData({ description: '', amount: 0, category: 'General' });
      }
    );
  };

  const deleteExpense = (id: string) => {
    confirmAction(
      "¿Eliminar Gasto?",
      "Esta acción no se puede deshacer y afectará la rendición mensual.",
      async () => {
        await api.deleteExpense(id);
      }
    );
  };

  const exportPDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const periodStr = `${MONTHS[selectedMonth].toUpperCase()} ${selectedYear}`;
    const timestamp = new Date().toLocaleString('es-CL');
    const reportID = `EXP-${selectedYear}${String(selectedMonth + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

    const primaryColor: [number, number, number] = [15, 23, 42]; // Slate 900
    const accentColor: [number, number, number] = [79, 70, 229]; // Indigo 600

    // 1. CABECERA INSTITUCIONAL
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, pageWidth, 45, 'F');
    
    // Logo / Nombre
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('GESINTCON ERP', 15, 22);
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text('SISTEMA INTEGRAL DE GESTIÓN DE COPROPIEDADES', 15, 30);
    doc.text('VERSIÓN 2.5 - MÓDULO DE FINANZAS CENTRALIZADO', 15, 34);
    
    // Título del Reporte
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('RENDICIÓN MENSUAL DE EGRESOS', pageWidth - 15, 22, { align: 'right' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`ID REPORTE: ${reportID}`, pageWidth - 15, 30, { align: 'right' });
    doc.text(`GENERADO: ${timestamp}`, pageWidth - 15, 35, { align: 'right' });

    // 2. FICHA TÉCNICA DEL PERIODO
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(15, 55, pageWidth - 30, 22, 2, 2, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(15, 55, pageWidth - 30, 22, 'S');

    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'bold');
    doc.text('ESTADO DEL PERIODO CONTABLE', 20, 62);
    doc.text('TOTAL GENERAL CONCILIADO', pageWidth - 20, 62, { align: 'right' });

    doc.setFontSize(12);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(periodStr, 20, 70);
    
    doc.setFontSize(16);
    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.text(`$${total.toLocaleString()}`, pageWidth - 20, 71, { align: 'right' });

    // 3. RESUMEN POR CATEGORÍA (Nivel de detalle adicional)
    const categoryMap: Record<string, number> = {};
    filteredExpenses.forEach(e => {
      const cat = e.category || 'General';
      categoryMap[cat] = (categoryMap[cat] || 0) + e.amount;
    });

    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('RESUMEN ANALÍTICO POR CATEGORÍA', 15, 88);
    doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.setLineWidth(0.5);
    doc.line(15, 90, 45, 90);

    const categoryData = Object.entries(categoryMap).map(([cat, amt]) => [
      cat.toUpperCase(),
      `$${amt.toLocaleString()}`,
      `${((amt / (total || 1)) * 100).toFixed(1)}%`
    ]);

    autoTable(doc, {
      startY: 95,
      margin: { left: 15, right: 15 },
      body: categoryData,
      theme: 'plain',
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: { 
        0: { fontStyle: 'bold', cellWidth: 50 },
        1: { halign: 'right', cellWidth: 30 },
        2: { halign: 'right', textColor: [100, 116, 139] }
      }
    });

    // 4. LISTADO DETALLADO DE MOVIMIENTOS
    const tableStartY = (doc as any).lastAutoTable.finalY + 12;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('DETALLE CRONOLÓGICO DE EGRESOS', 15, tableStartY);

    autoTable(doc, {
      startY: tableStartY + 5,
      head: [['REF', 'DESCRIPCIÓN DEL GASTO / CONCEPTO', 'CATEGORÍA', 'TOTAL NETO']],
      body: filteredExpenses.map((e, index) => [
        (index + 1).toString().padStart(3, '0'),
        e.description.toUpperCase(),
        e.category?.toUpperCase() || 'GENERAL',
        `$${e.amount.toLocaleString()}`
      ]),
      theme: 'striped',
      headStyles: { 
        fillColor: primaryColor, 
        textColor: 255, 
        fontSize: 8, 
        fontStyle: 'bold',
        halign: 'center'
      },
      styles: { 
        fontSize: 8, 
        cellPadding: 4,
        textColor: [51, 65, 85],
        lineColor: [241, 245, 249],
        lineWidth: 0.1
      },
      columnStyles: { 
        0: { cellWidth: 15, halign: 'center' },
        2: { halign: 'center', cellWidth: 35 },
        3: { halign: 'right', fontStyle: 'bold', cellWidth: 35 }
      }
    });

    // 5. BLOQUE DE FIRMAS Y VALIDACIÓN
    const finalY = Math.max((doc as any).lastAutoTable.finalY + 35, pageHeight - 60);
    const signatureWidth = 50;
    const spacing = (pageWidth - (signatureWidth * 3)) / 4;

    doc.setFontSize(8);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.2);

    // Firma 1: Presidente
    let currentX = spacing;
    doc.line(currentX, finalY, currentX + signatureWidth, finalY);
    doc.setFont('helvetica', 'bold');
    doc.text('PRESIDENTE', currentX + (signatureWidth / 2), finalY + 5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text('CONSEJO DE ADMINISTRACIÓN', currentX + (signatureWidth / 2), finalY + 9, { align: 'center' });

    // Firma 2: Tesorero
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    currentX += signatureWidth + spacing;
    doc.line(currentX, finalY, currentX + signatureWidth, finalY);
    doc.text('TESORERO', currentX + (signatureWidth / 2), finalY + 5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text('DEPARTAMENTO DE FINANZAS', currentX + (signatureWidth / 2), finalY + 9, { align: 'center' });

    // Firma 3: Secretaria
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    currentX += signatureWidth + spacing;
    doc.line(currentX, finalY, currentX + signatureWidth, finalY);
    doc.text('SECRETARIA', currentX + (signatureWidth / 2), finalY + 5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text('FE PÚBLICA Y ACTAS', currentX + (signatureWidth / 2), finalY + 9, { align: 'center' });

    // 6. PIE DE PÁGINA DE SEGURIDAD
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, pageHeight - 10, pageWidth, 10, 'F');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text(`Documento controlado electrónicamente - Sin enmiendas - Generado por CondoMaster Cloud Service`, pageWidth / 2, pageHeight - 4, { align: 'center' });

    doc.save(`Rendicion_Gastos_${periodStr.replace(/\s+/g, '_')}.pdf`);
  };

  if (loading) return <div className="p-20 flex justify-center flex-col items-center gap-4">
    <Loader2 className="animate-spin text-indigo-600" size={48} />
    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Sincronizando Rendición...</p>
  </div>;

  return (
    <div className="space-y-6 pb-20">
      <FeedbackModal 
        state={modalState} 
        title={modalConfig.title} 
        message={modalConfig.message} 
        onConfirm={executeAction} 
        onClose={() => setModalState('idle')} 
      />

      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col lg:flex-row gap-8 items-center justify-between">
        <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
          <div className="relative w-full sm:w-32" ref={yearRef}>
            <button 
              onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)}
              className="w-full flex items-center justify-between pl-10 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50 font-black text-slate-700 text-sm shadow-sm transition-all hover:bg-white"
            >
              <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-indigo-600" size={18} />
              <span>{selectedYear}</span>
              <ChevronDown size={14} className={`text-slate-400 transition-transform duration-300 ${isYearDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {isYearDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 max-h-60 overflow-y-auto custom-scrollbar animate-in zoom-in-95 duration-200 origin-top">
                <div className="p-2 space-y-1">
                  {YEARS.map(y => (
                    <button key={y} onClick={() => { setSelectedYear(y); setIsYearDropdownOpen(false); }} className={`w-full text-center px-4 py-2.5 rounded-xl text-xs font-black transition-all ${selectedYear === y ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-600'}`}>{y}</button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="relative w-full sm:w-48" ref={monthRef}>
            <button 
              onClick={() => setIsMonthDropdownOpen(!isMonthDropdownOpen)}
              className="w-full flex items-center justify-between px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50 font-black text-slate-700 text-sm shadow-sm transition-all hover:bg-white uppercase tracking-widest"
            >
              <span>{MONTHS[selectedMonth]}</span>
              <ChevronDown size={14} className={`text-slate-400 transition-transform duration-300 ${isMonthDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {isMonthDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 max-h-60 overflow-y-auto custom-scrollbar animate-in zoom-in-95 duration-200 origin-top">
                <div className="p-2 space-y-1">
                  {MONTHS.map((m, idx) => (
                    <button key={m} onClick={() => { setSelectedMonth(idx); setIsMonthDropdownOpen(false); }} className={`w-full text-left px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${selectedMonth === idx ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-600'}`}>{m}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-4 w-full lg:w-auto">
          <button onClick={exportPDF} className="flex-1 lg:flex-none px-10 py-4 border border-slate-200 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-slate-50 transition-all active:scale-95 shadow-sm">
            <Download size={18} /> Exportar Rendición
          </button>
          <button onClick={() => setIsModalOpen(true)} className="flex-1 lg:flex-none px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-black transition-all shadow-xl active:scale-95">
            <Plus size={18} /> Registrar Egreso
          </button>
        </div>
      </div>

      <div className="bg-indigo-600 p-10 rounded-[3rem] text-white flex flex-col md:flex-row items-center justify-between shadow-2xl border-b-8 border-indigo-900 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-10 opacity-10 rotate-12"><TrendingDown size={140}/></div>
        <div className="flex items-center gap-8 relative z-10">
          <div className="p-6 bg-white/10 rounded-[2rem] backdrop-blur-md border border-white/20 shadow-inner"><TrendingDown size={48} className="text-white" /></div>
          <div>
            <p className="opacity-60 text-[10px] font-black uppercase tracking-[0.3em]">Total Egresos Conciliados</p>
            <h2 className="text-6xl font-black mt-2 leading-none tracking-tighter">${total.toLocaleString()}</h2>
          </div>
        </div>
        <div className="mt-8 md:mt-0 px-8 py-4 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/20 text-[10px] font-black uppercase tracking-[0.2em] relative z-10">
          Periodo {MONTHS[selectedMonth]} {selectedYear}
        </div>
      </div>

      <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-900 text-white uppercase text-[10px] font-black tracking-[0.2em]">
              <th className="py-7 px-10">Descripción del Gasto / Ítem</th>
              <th className="py-7 px-10 text-right">Monto</th>
              <th className="py-7 px-10 text-center">Gestión</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredExpenses.length > 0 ? filteredExpenses.map(expense => (
              <tr key={expense.id} className="hover:bg-slate-50 transition-colors group">
                <td className="py-6 px-10 font-black text-slate-800 uppercase text-sm tracking-tight">{expense.description}</td>
                <td className="py-6 px-10 text-right font-black text-slate-900 text-xl tracking-tighter">${expense.amount.toLocaleString()}</td>
                <td className="py-6 px-10 text-center">
                    <button onClick={() => deleteExpense(expense.id)} className="p-4 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all active:scale-90" title="Eliminar Registro"><Trash2 size={24} /></button>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={3} className="py-24 text-center text-slate-400 italic text-[11px] font-black uppercase tracking-widest opacity-50">No hay gastos registrados en este periodo.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-300">
            <div className="bg-slate-900 p-10 text-white flex justify-between items-center relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5 rotate-12"><TrendingDown size={100}/></div>
                <div className="relative z-10">
                  <h3 className="font-black text-3xl uppercase tracking-tighter leading-none">Registrar Gasto</h3>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-3 italic">{MONTHS[selectedMonth]} {selectedYear}</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="relative z-10 p-3 hover:bg-white/20 rounded-2xl transition-all"><X size={32} /></button>
            </div>
            <div className="p-10 space-y-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Descripción del Egreso</label>
                <div className="relative">
                  <FileText className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={24} />
                  <input type="text" className="w-full pl-14 pr-6 py-5 bg-slate-50 border border-slate-200 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-indigo-50 font-black text-slate-700 uppercase" placeholder="EJ: PAGO LUZ MARZO" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Monto a Rendir ($)</label>
                <div className="relative">
                  <TrendingDown className="absolute left-5 top-1/2 -translate-y-1/2 text-rose-500" size={24} />
                  <input type="number" className="w-full pl-14 pr-6 py-5 bg-slate-50 border border-slate-200 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-indigo-50 font-black text-3xl text-slate-800" placeholder="0" value={formData.amount || ''} onChange={(e) => setFormData({...formData, amount: Number(e.target.value)})} />
                </div>
              </div>
              <button onClick={handleSave} className="w-full bg-slate-900 hover:bg-black text-white font-black py-6 rounded-[2.5rem] shadow-2xl active:scale-95 transition-all uppercase text-[11px] tracking-[0.3em] mt-4 ring-8 ring-slate-900/10">Registrar Gasto del Periodo</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Expenses;
