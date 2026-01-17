
import { House, FeeConfig } from './types';

// Función para formatear RUT chileno (ej: 11.111.111-1)
export const formatRUT = (rut: string): string => {
  if (!rut) return '';
  // Limpiar caracteres no permitidos
  let value = rut.replace(/[^0-9kK]/g, '');
  if (value.length < 2) return value;
  
  const body = value.slice(0, -1);
  const dv = value.slice(-1).toUpperCase();
  
  // Aplicar puntos al cuerpo
  let formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  
  return `${formattedBody}-${dv}`;
};

export const INITIAL_HOUSES: House[] = Array.from({ length: 158 }, (_, i) => ({
  id: `house-${i + 1}`,
  number: `${i + 1}`,
  ownerName: `Residente Casa ${i + 1}`,
  rut: `${Math.floor(Math.random() * 12000000 + 7000000)}${['0','1','2','3','4','5','6','7','8','9','K'][Math.floor(Math.random() * 11)]}`,
  phone: `+569${Math.floor(Math.random() * 90000000 + 10000000)}`,
  email: `casa${i + 1}@condominio.cl`,
  hasParking: i % 3 === 0, // Algunos tienen parking por defecto
  residentType: i % 5 === 0 ? 'arrendatario' : 'propietario'
}));

export const DEFAULT_FEES: FeeConfig[] = [
  { 
    id: '1', 
    name: 'Gasto Común', 
    defaultAmount: 50000, 
    startMonth: 0, 
    startYear: 2024,
    category: 'monthly'
  },
  { 
    id: '2', 
    name: 'Estacionamiento', 
    defaultAmount: 15000, 
    startMonth: 0, 
    startYear: 2024,
    category: 'monthly'
  },
  { 
    id: '3', 
    name: 'Aguinaldo Septiembre', 
    defaultAmount: 10000, 
    startMonth: 8, 
    startYear: 2024,
    applicableMonths: [8],
    category: 'monthly'
  },
  { 
    id: '4', 
    name: 'Aguinaldo Diciembre', 
    defaultAmount: 10000, 
    startMonth: 11, 
    startYear: 2024,
    applicableMonths: [11],
    category: 'monthly'
  },
  { 
    id: '5', 
    name: 'Multa Inasistencia', 
    defaultAmount: 20000, 
    startMonth: 0, 
    startYear: 2024,
    category: 'fine'
  },
];

export const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

export const YEARS = Array.from({ length: 50 }, (_, i) => 2024 + i);

export const generateVoucher = () => Math.random().toString(36).substring(2, 10).toUpperCase();

export const NOTIFICATION_CONFIG = {
  senderEmail: 'pagosynotificacioneslila2587@gmail.com',
  pendingAuth: true
};
