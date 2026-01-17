
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Search, 
  ChevronDown, 
  ChevronUp, 
  Edit2, 
  CheckCircle2, 
  X,
  CreditCard,
  Loader2,
  CircleCheck,
  AlertCircle,
  Zap,
  History,
  Scale,
  Trash2,
  DollarSign,
  Gavel,
  CircleUser,
  Car,
  Mail,
  Send,
  Phone,
  Hash,
  Printer,
  FileText,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  Calendar,
  User,
  Key,
  RefreshCw,
  Crown
} from 'lucide-react';
import { MONTHS, formatRUT, YEARS } from '../../constants';
import { House, Payment, FeeConfig, FeeBreakdown } from '../../types';
import { api } from '../../api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import FeedbackModal, { ModalState } from '../../components/FeedbackModal';

const GOOGLE_CLIENT_ID = '198004537964-oppjo3g88214nhbtoelbb9vlr6jhsemc.apps.googleusercontent.com';

interface BreakdownItem {
  amount: number;
  active: boolean;
  name: string;
  isFine?: boolean;
  isExempt?: boolean;
}

const Payments: React.FC = () => {
  const [houses, setHouses] = useState<House[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [feesConfigs, setFeesConfigs] = useState<FeeConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalState, setModalState] = useState<ModalState>('idle');
  const [modalConfig, setModalConfig] = useState<{title?: string, message?: string, action?: () => Promise<void>}>({});
  
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedHouse, setExpandedHouse] = useState<string | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditHouseModalOpen, setIsEditHouseModalOpen] = useState(false);
  
  const [editingHouse, setEditingHouse] = useState<House | null>(null);
  const [currentAction, setCurrentAction] = useState<{house: House, month: number} | null>(null);
  const [shouldSendEmail, setShouldSendEmail] = useState(true);

  // Lógica de Gmail Automatizada
  const [gmailToken, setGmailToken] = useState<string | null>(localStorage.getItem('gmail_token'));
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const CURRENT_USER = "Administrador (ADMIN-2024)";

  const [paymentForm, setPaymentForm] = useState({
    payerName: '',
    date: new Date().toISOString().split('T')[0],
    receiver: CURRENT_USER,
    voucherId: '',
    targetEmail: '',
    breakdown: {} as Record<string, BreakdownItem>
  });

  // Utilidad para detectar Gasto Común ignorando acentos y mayúsculas
  const isGastoComun = (name: string): boolean => {
    if (!name) return false;
    return name.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .includes("gasto comun");
  };

  const loadAllData = async () => {
    try {
      const [h, p, f] = await Promise.all([
        api.getHouses(),
        api.getPayments(),
        api.getFees()
      ]);
      setHouses(Array.isArray(h) ? h : []);
      setPayments(Array.isArray(p) ? p : []);
      setFeesConfigs(Array.isArray(f) ? f : []);
    } catch (e) {
      console.error("Error cargando datos de pagos", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
    
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsYearDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleGoogleAuth = () => {
    if (!(window as any).google) return;
    setIsAuthLoading(true);

    try {
      const client = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/gmail.send',
        callback: (response: any) => {
          setIsAuthLoading(false);
          if (response.access_token) {
            setGmailToken(response.access_token);
            localStorage.setItem('gmail_token', response.access_token);
          }
        },
      });
      client.requestAccessToken();
    } catch (err) {
      setIsAuthLoading(false);
      console.error("Error al iniciar cliente OAuth:", err);
    }
  };

  const sendEmailWithGmail = async (payment: any, house: House) => {
    if (!gmailToken) return;

    const breakdownText = (payment.breakdown || [])
      .map((item: any) => ` - ${item.name.toUpperCase()}: $${item.amount.toLocaleString()}`)
      .join('\n');

    const emailBody = [
      `To: ${paymentForm.targetEmail}`,
      'Subject: Comprobante de Pago Recibido - Casa ' + house.number,
      'Content-Type: text/plain; charset="UTF-8"',
      '',
      `Estimado(a) ${paymentForm.payerName},`,
      '',
      `Se ha registrado correctamente un pago en el sistema CondoMaster ERP para la Unidad Casa ${house.number}.`,
      '',
      `DETALLE DE LA OPERACIÓN:`,
      `------------------------------------------`,
      `Folio: #${payment.voucherId}`,
      `Periodo Fiscal: ${MONTHS[payment.month].toUpperCase()} ${payment.year}`,
      `Fecha de Registro: ${payment.date}`,
      `Recaudador: ${payment.receiver}`,
      `------------------------------------------`,
      '',
      `DESGLOSE DE CONCEPTOS PAGADOS:`,
      breakdownText,
      `------------------------------------------`,
      `MONTO TOTAL CANCELADO: $${payment.amount.toLocaleString()}`,
      `------------------------------------------`,
      '',
      'Gracias por mantener sus pagos al día.',
      'Atentamente,',
      'Administración CondoMaster ERP'
    ].join('\n');

    const base64Email = btoa(unescape(encodeURIComponent(emailBody)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    try {
      const resp = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${gmailToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ raw: base64Email })
      });

      if (!resp.ok) {
        if (resp.status === 401) {
          localStorage.removeItem('gmail_token');
          setGmailToken(null);
        }
      }
    } catch (e) {
      console.error("Error de red enviando email", e);
    }
  };

  const getExpectedAmount = (house: House, year: number, monthIdx: number) => {
    return (feesConfigs || []).reduce((total, fee) => {
      const currentMonthDate = year * 12 + monthIdx;
      const feeStartDate = (fee.startYear || 0) * 12 + (fee.startMonth || 0);
      
      let isApplicable = true;
      
      if (currentMonthDate < feeStartDate) isApplicable = false;
      if (fee.endYear !== undefined && fee.endMonth !== undefined) {
        const feeEndDate = fee.endYear * 12 + fee.endMonth;
        if (currentMonthDate > feeEndDate) isApplicable = false;
      }

      if (fee.name?.toLowerCase().includes('estacionamiento') && !house.hasParking) isApplicable = false;
      if (fee.applicableMonths && fee.applicableMonths.length > 0 && !fee.applicableMonths.includes(monthIdx)) isApplicable = false;
      if (fee.category === 'fine' && fee.targetHouseIds) {
        if (!fee.targetHouseIds.includes(house.id)) isApplicable = false;
      }
      
      // EXENCIÓN DIRECTIVA: Si es directiva, el "Gasto Común" no suma a la deuda esperada.
      if (house.isBoardMember && isGastoComun(fee.name)) isApplicable = false;

      return isApplicable ? total + (fee.defaultAmount || 0) : total;
    }, 0);
  };

  const getAmountPaid = (houseId: string, year: number, monthIdx: number) => {
    return (payments || [])
      .filter(p => String(p.houseId) === String(houseId) && Number(p.year) === Number(year) && Number(p.month) === Number(monthIdx))
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  };

  const getAccumulatedDebt = (house: House) => {
    let debt = 0;
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    for (let m = 0; m <= 11; m++) {
      if (selectedYear < currentYear || (selectedYear === currentYear && m <= currentMonth)) {
        const expected = getExpectedAmount(house, selectedYear, m);
        const paid = getAmountPaid(house.id, selectedYear, m);
        if (paid < expected) debt += (expected - paid);
      }
    }
    return debt;
  };

  const generateUniqueFolio = () => {
    const newFolio = (Math.random().toString(36).substring(2, 7) + Math.random().toString(36).substring(2, 7)).toUpperCase();
    setPaymentForm(prev => ({ ...prev, voucherId: newFolio }));
  };

  const downloadVoucherPDF = (payment: Payment, house: House) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const residentName = house.ownerName || (house as any).owner_name || 'Sin Nombre';
    
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, pageWidth, 45, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('CondoMaster', 15, 22);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text('SISTEMA INTEGRAL DE GESTIÓN DE CONDOMINIOS', 15, 30);
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('COMPROBANTE DE RECAUDACIÓN', pageWidth - 15, 22, { align: 'right' });
    
    doc.setFontSize(10);
    doc.text(`FOLIO: #${payment.voucherId}`, pageWidth - 15, 32, { align: 'right' });

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(11);
    doc.text('DATOS DE LA UNIDAD', 15, 60);
    doc.setDrawColor(226, 232, 240);
    doc.line(15, 63, pageWidth - 15, 63);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`CASA: ${house.number}`, 15, 72);
    doc.text(`RESIDENTE: ${residentName.toUpperCase()}`, 15, 78);
    doc.setFont('helvetica', 'normal');
    doc.text(`RUT: ${formatRUT(house.rut)}`, 15, 84);
    doc.text(`FECHA DE PAGO: ${payment.date}`, pageWidth - 15, 72, { align: 'right' });
    doc.text(`PERIODO: ${MONTHS[payment.month].toUpperCase()} ${payment.year}`, pageWidth - 15, 78, { align: 'right' });

    autoTable(doc, {
      startY: 95,
      head: [['CONCEPTO / ÍTEM DE COBRO', 'MONTO CANCELADO']],
      body: payment.breakdown.map(b => [b.name.toUpperCase(), `$${b.amount.toLocaleString()}`]),
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontSize: 10, halign: 'left' },
      styles: { fontSize: 10, cellPadding: 5 },
      columnStyles: { 
        0: { cellWidth: 'auto' },
        1: { halign: 'right', fontStyle: 'bold', cellWidth: 50 }
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFillColor(248, 250, 252);
    doc.rect(pageWidth - 85, finalY, 70, 15, 'F');
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(79, 70, 229);
    doc.text('TOTAL PAGADO:', pageWidth - 80, finalY + 10);
    doc.text(`$${payment.amount.toLocaleString()}`, pageWidth - 20, finalY + 10, { align: 'right' });

    doc.save(`Comprobante_Casa_${house.number}_${payment.voucherId}.pdf`);
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
      await loadAllData();
    } catch (e) {
      setModalState('error');
    }
  };

  const openPaymentModal = (house: House, monthIdx: number) => {
    const initialBreakdown: Record<string, BreakdownItem> = {};
    const residentName = house.ownerName || (house as any).owner_name || 'Sin Nombre';
    const currentMonthDate = selectedYear * 12 + monthIdx;
    
    feesConfigs.forEach(fee => {
      const feeStartDate = (fee.startYear || 0) * 12 + (fee.startMonth || 0);
      let isApplicable = true;
      let isExempt = false;
      
      if (currentMonthDate < feeStartDate) isApplicable = false;
      
      if (fee.endYear !== undefined && fee.endMonth !== undefined) {
        const feeEndDate = fee.endYear * 12 + fee.endMonth;
        if (currentMonthDate > feeEndDate) isApplicable = false;
      }

      if (fee.name?.toLowerCase().includes('estacionamiento') && !house.hasParking) isApplicable = false;
      if (fee.applicableMonths && fee.applicableMonths.length > 0 && !fee.applicableMonths.includes(monthIdx)) isApplicable = false;
      if (fee.category === 'fine' && fee.targetHouseIds) {
        if (!fee.targetHouseIds.includes(house.id)) isApplicable = false;
      }

      // EXENCIÓN DIRECTIVA MEJORADA (Ignora tildes y mayúsculas en cualquier variante de "Gasto Común")
      if (house.isBoardMember && isGastoComun(fee.name)) {
        isExempt = true;
      }

      if (isApplicable) {
        const conceptPaid = payments
          .filter(p => String(p.houseId) === String(house.id) && Number(p.year) === Number(selectedYear) && Number(p.month) === Number(monthIdx))
          .reduce((sum, p) => sum + (p.breakdown.find(b => b.feeId === fee.id)?.amount || 0), 0);
        
        // REFUERZO: Si es exento, el monto a pagar se fuerza a 0 independientemente de lo que diga la configuración.
        const remanenteConcepto = isExempt ? 0 : Math.max(0, (fee.defaultAmount || 0) - conceptPaid);

        initialBreakdown[fee.id] = {
          amount: remanenteConcepto,
          active: remanenteConcepto > 0 || isExempt,
          name: isExempt ? `${fee.name} (EXENTO DIRECTIVA)` : fee.name,
          isFine: fee.category === 'fine',
          isExempt: isExempt
        };
      }
    });

    setCurrentAction({ house, month: monthIdx });
    setPaymentForm({
      payerName: residentName,
      date: new Date().toISOString().split('T')[0],
      receiver: CURRENT_USER, 
      voucherId: '',
      targetEmail: house.email, 
      breakdown: initialBreakdown
    });
    setShouldSendEmail(!!house.email);
    setIsModalOpen(true);
  };

  const handleSavePayment = () => {
    if (!currentAction || !paymentForm.voucherId.trim()) return;
    const items = Object.values(paymentForm.breakdown) as BreakdownItem[];
    const total = items.filter(item => item.active).reduce((sum, item) => sum + item.amount, 0);
    
    confirmAction(
      "¿Confirmar Transacción?",
      `Se registrará un abono de $${total.toLocaleString()}${shouldSendEmail ? ' y se enviará comprobante a ' + paymentForm.targetEmail : '.'}`,
      async () => {
        const entries = Object.entries(paymentForm.breakdown) as [string, BreakdownItem][];
        const breakdownList: FeeBreakdown[] = entries
          .filter(([_, data]) => data.active)
          .map(([feeId, data]) => ({ feeId, name: data.name, amount: data.amount }));

        const paymentData = {
          houseId: currentAction.house.id,
          year: selectedYear,
          month: currentAction.month,
          amount: total,
          breakdown: breakdownList,
          payerName: paymentForm.payerName,
          date: paymentForm.date,
          receiver: paymentForm.receiver,
          voucherId: paymentForm.voucherId,
          type: "Abono / Pago Mensual"
        };
        
        await api.createPayment(paymentData);
        
        if (shouldSendEmail && gmailToken) {
          await sendEmailWithGmail(paymentData, currentAction.house);
        }

        setIsModalOpen(false);
      }
    );
  };

  const deletePayment = (paymentId: string) => {
    confirmAction(
      "¿Anular Pago?",
      "Esta acción es irreversible. El monto se sumará nuevamente a la deuda pendiente de la unidad.",
      async () => {
        await api.deletePayment(paymentId);
      }
    );
  };

  const saveHouseEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHouse) return;

    confirmAction(
      "¿Actualizar Ficha Maestra?",
      `Los datos de la Casa ${editingHouse.number} serán actualizados en el sistema global.`,
      async () => {
        await api.updateHouse(editingHouse.id, editingHouse);
        setIsEditHouseModalOpen(false);
      }
    );
  };

  const filteredHouses = useMemo(() => {
    if (!Array.isArray(houses)) return [];
    return houses.filter(h => {
      const name = h.ownerName || (h as any).owner_name || '';
      return String(h.number).includes(searchTerm) || name.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [houses, searchTerm]);

  if (loading) return (
    <div className="p-20 flex flex-col items-center justify-center gap-4">
      <Loader2 className="animate-spin text-indigo-600" size={48} />
      <p className="text-slate-400 font-black uppercase text-xs tracking-widest">Cargando Recaudación...</p>
    </div>
  );

  return (
    <div className="space-y-6 pb-20">
      <FeedbackModal state={modalState} title={modalConfig.title} message={modalConfig.message} onConfirm={executeAction} onClose={() => setModalState('idle')} />

      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-6 items-center">
        <div className="p-4 bg-indigo-600 rounded-3xl text-white shadow-lg"><Scale size={32}/></div>
        <div className="flex-1 text-center md:text-left">
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight leading-none">Módulo de Recaudación</h2>
          <p className="text-slate-500 text-sm font-medium mt-1 italic">Gestión de unidades y trazabilidad de ingresos.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <button 
            onClick={handleGoogleAuth}
            disabled={isAuthLoading}
            className={`w-full sm:w-auto px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm border ${gmailToken ? 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-4 ring-emerald-50/50' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            title={gmailToken ? 'Sistema vinculado correctamente' : 'Vincular cuenta para enviar correos'}
          >
            {isAuthLoading ? (
              <RefreshCw className="animate-spin" size={14} />
            ) : gmailToken ? (
              <ShieldCheck size={16} className="text-emerald-500" />
            ) : (
              <Key size={16} className="text-indigo-500" />
            )}
            <span>{gmailToken ? 'Correo Vinculado' : 'Vincular Gmail'}</span>
          </button>

          <div className="relative w-full sm:w-32" ref={dropdownRef}>
            <button 
              onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)}
              className="w-full flex items-center justify-between pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50 font-black text-slate-700 text-sm shadow-sm transition-all hover:bg-white"
            >
              <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-indigo-600" size={18} />
              <span>{selectedYear}</span>
              <ChevronDown size={14} className={`text-slate-400 transition-transform duration-300 ${isYearDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isYearDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 max-h-60 overflow-y-auto custom-scrollbar animate-in zoom-in-95 duration-200 origin-top">
                <div className="p-2 space-y-1">
                  {YEARS.map(y => (
                    <button 
                      key={y}
                      onClick={() => { setSelectedYear(y); setIsYearDropdownOpen(false); }}
                      className={`w-full text-center px-4 py-2 rounded-xl text-xs font-black transition-all ${selectedYear === y ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-600'}`}
                    >
                      {y}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="relative w-full md:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar casa o nombre..." 
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50 font-bold shadow-sm transition-all hover:bg-white" 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredHouses.map(house => {
          const isExpanded = expandedHouse === house.id;
          const debt = getAccumulatedDebt(house);
          const housePayments = payments.filter(p => String(p.houseId) === String(house.id)).sort((a,b) => b.date.localeCompare(a.date));
          
          const residentName = house.ownerName || (house as any).owner_name || 'Sin Nombre';
          
          const initials = residentName
            .split(' ')
            .filter(Boolean)
            .map(n => n[0])
            .join('')
            .substring(0, 2)
            .toUpperCase();

          return (
            <div key={house.id} className={`bg-white rounded-[2.5rem] border transition-all ${isExpanded ? 'border-indigo-400 shadow-xl' : 'border-slate-200 shadow-sm hover:border-indigo-200'}`}>
              <div className="p-6 flex flex-col md:flex-row items-center justify-between cursor-pointer gap-4" onClick={() => setExpandedHouse(isExpanded ? null : house.id)}>
                <div className="flex items-center gap-5 w-full md:w-auto">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-md font-black shrink-0 transition-transform ${isExpanded ? 'scale-110' : ''} ${house.isBoardMember ? 'bg-amber-500 text-white' : (debt > 0 ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-600')}`}>
                    {house.isBoardMember ? <Crown size={24}/> : <span className="text-xl">{initials || <User size={24}/>}</span>}
                  </div>
                  
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <h4 className="font-black text-slate-800 text-xl uppercase leading-none truncate max-w-[150px] sm:max-w-none">
                        {residentName}
                      </h4>
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-black tracking-widest shrink-0 ${debt > 0 ? 'bg-rose-600 text-white' : 'bg-slate-900 text-white'}`}>
                        CASA {house.number}
                      </span>
                      {house.isBoardMember && <span className="px-2 py-1 rounded-lg text-[10px] font-black tracking-widest bg-amber-100 text-amber-700 border border-amber-200 uppercase flex items-center gap-1"><ShieldCheck size={10}/> Directiva</span>}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className="text-[10px] font-bold text-slate-400 font-mono bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100">{formatRUT(house.rut)}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-1 ${house.residentType === 'arrendatario' ? 'bg-amber-100 text-amber-600 border border-amber-200' : 'bg-indigo-100 text-indigo-600 border border-indigo-200'}`}>
                        {house.residentType}
                      </span>
                      {house.hasParking && <div className="flex items-center gap-1 text-[8px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase"><Car size={10}/> Estacionamiento</div>}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 w-full md:w-auto justify-end">
                  <div className={`px-5 py-2 rounded-2xl border flex flex-col items-end min-w-[140px] shadow-sm transition-colors ${debt > 0 ? 'bg-rose-50 border-rose-100' : 'bg-emerald-50 border-emerald-100'}`}>
                    <span className="text-[8px] font-black uppercase opacity-50 mb-0.5">{debt > 0 ? `Saldo Pendiente` : `Al Día`}</span>
                    <span className={`text-xl font-black ${debt > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>${debt.toLocaleString()}</span>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setEditingHouse(house); setIsEditHouseModalOpen(true); }} className="p-3 bg-white hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-xl border border-slate-200 active:scale-90 transition-all shadow-sm" title="Editar Ficha Maestra"><Edit2 size={18} /></button>
                  <div className="p-3 bg-slate-50 text-slate-400 rounded-xl">{isExpanded ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}</div>
                </div>
              </div>

              {isExpanded && (
                <div className="p-8 border-t border-slate-100 bg-slate-50/40 space-y-8 animate-in slide-in-from-top-4 duration-300">
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                    {MONTHS.map((month, idx) => {
                      const expected = getExpectedAmount(house, selectedYear, idx);
                      const paid = getAmountPaid(house.id, selectedYear, idx);
                      const currentYear = new Date().getFullYear();
                      const currentMonth = new Date().getMonth();
                      const isPastMonth = selectedYear < currentYear || (selectedYear === currentYear && idx < currentMonth);
                      const isFullyPaid = paid >= expected && (expected > 0 || house.isBoardMember);
                      
                      let borderColor = "border-slate-200";
                      let statusIcon = <AlertCircle size={32} className="text-slate-200" />;
                      
                      if (isFullyPaid) {
                        borderColor = "border-emerald-400 bg-emerald-50/10";
                        statusIcon = <CircleCheck size={32} className="text-emerald-500" />;
                      } else if (paid > 0 && paid < expected) {
                        borderColor = "border-amber-400 bg-amber-50/10";
                        statusIcon = <AlertCircle size={32} className="text-amber-500 animate-pulse" />;
                      } else if (isPastMonth && paid < expected) {
                        borderColor = "border-rose-400 bg-rose-50/10";
                        statusIcon = <AlertCircle size={32} className="text-rose-600" />;
                      }

                      return (
                        <div key={month} className={`relative p-4 rounded-3xl border flex flex-col items-center justify-between min-h-[140px] shadow-sm transition-all hover:shadow-md ${borderColor}`}>
                          <span className="text-[10px] font-black uppercase tracking-widest opacity-40">{month.substring(0,3)}</span>
                          {statusIcon}
                          <div className="w-full text-center">
                            <p className="text-[10px] font-black text-slate-800 mb-2">${paid.toLocaleString()} / ${expected.toLocaleString()}</p>
                            {!isFullyPaid && (expected > 0 || house.isBoardMember) && <button onClick={() => openPaymentModal(house, idx)} className="w-full bg-slate-900 hover:bg-black text-white py-2 rounded-xl text-[9px] font-black uppercase active:scale-95 transition-all">Registrar</button>}
                            {expected === 0 && !house.isBoardMember && <span className="text-[8px] font-black text-slate-300 uppercase italic">Sin Cobro</span>}
                            {expected === 0 && house.isBoardMember && <span className="text-[8px] font-black text-amber-500 uppercase italic">Exento Dir.</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="space-y-4">
                     <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 flex items-center gap-2"><History size={16} className="text-indigo-600"/> Historial de Transacciones Registradas</h5>
                     <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
                        <table className="w-full text-left">
                           <thead className="bg-slate-900 text-white">
                              <tr className="text-[9px] font-black uppercase tracking-widest">
                                 <th className="py-5 px-8">Periodo Fiscal</th>
                                 <th className="py-5 px-8 text-center">Folio / Fecha</th>
                                 <th className="py-5 px-8 text-right">Monto</th>
                                 <th className="py-5 px-8 text-center">Gestión</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-100">
                              {housePayments.length > 0 ? housePayments.map(p => (
                                <tr key={p.id} className="text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                                   <td className="py-5 px-8 uppercase">{MONTHS[p.month]} {p.year}</td>
                                   <td className="py-5 px-8 text-center">
                                      <div className="flex flex-col">
                                         <span className="text-slate-900 font-black">#{p.voucherId}</span>
                                         <span className="text-[9px] opacity-60 font-mono mt-1 italic">{p.date}</span>
                                      </div>
                                   </td>
                                   <td className="py-5 px-8 text-right text-emerald-600 font-black text-sm">${p.amount.toLocaleString()}</td>
                                   <td className="py-5 px-8 text-center flex items-center justify-center gap-3">
                                      <button onClick={() => downloadVoucherPDF(p, house)} className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all active:scale-90" title="Imprimir Comprobante"><Printer size={18}/></button>
                                      <button onClick={() => deletePayment(p.id)} className="p-3 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all active:scale-90" title="Anular Transacción"><Trash2 size={18}/></button>
                                   </td>
                                </tr>
                              )) : (
                                <tr><td colSpan={4} className="py-12 text-center text-slate-400 italic text-[10px] font-black uppercase tracking-widest opacity-50">No existen registros financieros para esta unidad.</td></tr>
                              )}
                           </tbody>
                        </table>
                     </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {isModalOpen && currentAction && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 animate-in fade-in duration-300 overflow-hidden">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in duration-300">
            <div className="bg-indigo-600 p-6 text-white flex justify-between items-center relative overflow-hidden shrink-0">
              <div className="absolute top-0 right-0 p-6 opacity-10 rotate-12"><CreditCard size={80}/></div>
              <div className="relative z-10">
                <h3 className="font-black text-xl uppercase tracking-tighter leading-none">Nueva Recaudación</h3>
                <p className="text-indigo-100 text-[9px] font-black tracking-[0.2em] uppercase mt-1.5 bg-white/10 inline-block px-2.5 py-0.5 rounded-full">{MONTHS[currentAction.month]} - CASA {currentAction.house.number}</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="relative z-10 p-2 hover:bg-white/20 rounded-xl transition-all"><X size={20}/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">Folio Comprobante</label>
                  <div className="flex gap-2">
                    <input type="text" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-black text-xs uppercase" placeholder="AUTO-GEN" value={paymentForm.voucherId} onChange={(e) => setPaymentForm({...paymentForm, voucherId: e.target.value.toUpperCase()})} />
                    <button onClick={generateUniqueFolio} className="bg-amber-500 text-white p-2.5 rounded-xl shadow-lg active:scale-95" title="Generar Folio"><Zap size={16}/></button>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">Recaudador</label>
                  <input 
                    type="text" 
                    disabled
                    className="w-full px-3 py-2.5 bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-700 text-xs opacity-60 cursor-not-allowed" 
                    value={paymentForm.receiver} 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">Desglose de Cobros</label>
                {(Object.entries(paymentForm.breakdown) as [string, BreakdownItem][]).map(([id, item]) => (
                  <div key={id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${item.isFine ? 'bg-rose-50 border-rose-200' : (item.isExempt ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-100')}`}>
                    <button type="button" disabled={item.isExempt} onClick={() => setPaymentForm(prev => ({...prev, breakdown: {...prev.breakdown, [id]: {...(prev.breakdown[id] as BreakdownItem), active: !item.active}}}))} className={`transition-all ${item.active ? (item.isExempt ? 'text-amber-600' : 'text-indigo-600') : 'text-slate-300'}`}>
                      <CircleCheck size={20} fill={item.active ? 'currentColor' : 'none'} />
                    </button>
                    <div className="flex-1 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2 min-w-0">
                        {item.isFine && <Gavel size={10} className="text-rose-600" />}
                        {item.isExempt && <ShieldCheck size={10} className="text-amber-600" />}
                        <p className="text-[9px] font-black text-slate-800 uppercase truncate tracking-tighter">{item.name}</p>
                      </div>
                      <div className="relative w-24 shrink-0">
                        <DollarSign size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                          type="number" 
                          disabled={!item.active || item.isExempt} 
                          className="w-full pl-6 pr-2 py-1.5 bg-white border border-slate-200 rounded-lg outline-none text-right font-black text-[10px] disabled:opacity-50" 
                          value={item.amount} 
                          onChange={(e) => setPaymentForm(prev => ({...prev, breakdown: {...prev.breakdown, [id]: {...(prev.breakdown[id] as BreakdownItem), amount: Number(e.target.value)}}}))} 
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">Correo para Notificación</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-500" size={14} />
                    <input 
                      type="email" 
                      className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-50 font-bold text-slate-700 text-xs" 
                      placeholder="sin-correo@condominio.cl" 
                      value={paymentForm.targetEmail} 
                      onChange={(e) => setPaymentForm({...paymentForm, targetEmail: e.target.value})} 
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-3 pt-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-col">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">Envío Automático</span>
                        <p className="text-[8px] text-slate-400 ml-3 italic">Requiere Gmail vinculado arriba</p>
                    </div>
                    <div className="flex bg-slate-200 p-0.5 rounded-lg border shadow-inner w-44">
                      <button 
                        type="button"
                        onClick={() => setShouldSendEmail(true)}
                        className={`flex-1 py-1 text-[8px] font-black rounded-md transition-all flex items-center justify-center gap-1.5 ${shouldSendEmail ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500'}`}
                      >
                        <CheckCircle2 size={10} /> SI
                      </button>
                      <button 
                        type="button"
                        onClick={() => setShouldSendEmail(false)}
                        className={`flex-1 py-1 text-[8px] font-black rounded-md transition-all flex items-center justify-center gap-1.5 ${!shouldSendEmail ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-500'}`}
                      >
                        <X size={10} /> NO
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-white shrink-0 space-y-3">
              <div className="flex justify-between items-center px-2">
                <div className="text-left">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Total Recaudado</span>
                    <span className="text-2xl font-black text-indigo-600 leading-none">${(Object.values(paymentForm.breakdown) as BreakdownItem[]).filter(i => i.active).reduce((s, i) => s + i.amount, 0).toLocaleString()}</span>
                </div>
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                  <FileText size={20} />
                </div>
              </div>
              <button onClick={handleSavePayment} className="w-full bg-slate-900 hover:bg-black text-white font-black py-3.5 rounded-2xl shadow-lg active:scale-95 transition-all uppercase text-[10px] tracking-[0.1em] flex items-center justify-center gap-2">
                <CreditCard size={18}/> Procesar Ingreso
              </button>
            </div>
          </div>
        </div>
      )}

      {isEditHouseModalOpen && editingHouse && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in duration-300">
            <div className="bg-slate-900 p-10 text-white flex justify-between items-center relative">
              <div className="flex items-center gap-5 relative z-10">
                <div className="p-5 bg-indigo-600 rounded-[2rem] shadow-xl ring-4 ring-indigo-500/20"><CircleUser size={40}/></div>
                <div>
                  <h3 className="font-black text-3xl uppercase tracking-tighter leading-none">Ficha Maestra</h3>
                  <p className="text-slate-500 text-[10px] font-black mt-3 tracking-[0.3em] uppercase">Control Maestro de Unidad CASA {editingHouse.number}</p>
                </div>
              </div>
              <button onClick={() => setIsEditHouseModalOpen(false)} className="relative z-10 p-3 bg-white/10 hover:bg-white/20 rounded-2xl active:scale-90 transition-all"><X size={28}/></button>
            </div>
            <form onSubmit={saveHouseEdit} className="p-10 space-y-8 max-h-[75vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-4">Nombre del Residente Actual</label>
                  <div className="relative">
                    <CircleUser className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20}/>
                    <input type="text" required className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50 font-black text-slate-700" value={editingHouse.ownerName || (editingHouse as any).owner_name || ''} onChange={(e) => setEditingHouse({...editingHouse, ownerName: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-4">RUT (Identificador Único)</label>
                  <div className="relative">
                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20}/>
                    <input type="text" required className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50 font-mono font-black text-sm text-slate-700 uppercase" value={editingHouse.rut} onChange={(e) => setEditingHouse({...editingHouse, rut: e.target.value})} />
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-4">Correo para Notificaciones</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-500" size={20}/>
                    <input type="email" required className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50 font-black text-slate-700" placeholder="correo@ejemplo.cl" value={editingHouse.email} onChange={(e) => setEditingHouse({...editingHouse, email: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-4">Beneficio Directiva (Exención Gasto Común)</label>
                   <button type="button" onClick={() => setEditingHouse({...editingHouse, isBoardMember: !editingHouse.isBoardMember})} className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all h-[58px] ${editingHouse.isBoardMember ? 'bg-amber-50 border-amber-300 text-amber-700 ring-4 ring-amber-50 shadow-inner' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                      <span className="text-[10px] font-black uppercase tracking-widest">{editingHouse.isBoardMember ? 'BENEFICIO ACTIVO' : 'SIN BENEFICIO'}</span>
                      {editingHouse.isBoardMember ? <Crown size={20}/> : <ToggleLeft size={20}/>}
                   </button>
                </div>
              </div>

              <div className="pt-8 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-4">Clasificación Legal</label>
                  <div className="flex bg-slate-100 p-1.5 rounded-2xl border shadow-inner">
                    <button type="button" onClick={() => setEditingHouse({...editingHouse, residentType: 'propietario'})} className={`flex-1 py-4 text-[10px] font-black rounded-xl transition-all ${editingHouse.residentType === 'propietario' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-200'}`}>PROPIETARIO</button>
                    <button type="button" onClick={() => setEditingHouse({...editingHouse, residentType: 'arrendatario'})} className={`flex-1 py-4 text-[10px] font-black rounded-xl transition-all ${editingHouse.residentType === 'arrendatario' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-200'}`}>ARRENDATARIO</button>
                  </div>
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-4">Servicio de Estacionamiento</label>
                  <button type="button" onClick={() => setEditingHouse({...editingHouse, hasParking: !editingHouse.hasParking})} className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all h-[58px] ${editingHouse.hasParking ? 'bg-emerald-50 border-emerald-300 text-emerald-700 ring-4 ring-emerald-50 shadow-inner' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                    <span className="text-[10px] font-black uppercase tracking-widest">{editingHouse.hasParking ? 'COBRO ACTIVO' : 'SIN COBRO'}</span>
                    <div className={`p-2 rounded-lg ${editingHouse.hasParking ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                      {editingHouse.hasParking ? <CheckCircle2 size={18}/> : <Car size={18}/>}
                    </div>
                  </button>
                </div>
              </div>
              <button type="submit" className="w-full bg-slate-900 hover:bg-black text-white font-black py-6 rounded-[2.5rem] shadow-2xl active:scale-95 transition-all uppercase text-sm tracking-[0.2em] mt-6 ring-8 ring-slate-900/10">Actualizar Registro de Propiedad</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payments;
