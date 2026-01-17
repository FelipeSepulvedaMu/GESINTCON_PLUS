
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'conserje' | 'tesorero';
  avatarUrl?: string;
  lastLogin?: string;
}

export interface House {
  id: string;
  number: string;
  ownerName: string;
  rut: string;
  phone: string;
  email: string;
  hasParking: boolean;
  residentType: 'propietario' | 'arrendatario';
  isBoardMember?: boolean;
}

export interface FeeBreakdown {
  feeId: string;
  name: string;
  amount: number;
}

export interface Payment {
  id: string;
  houseId: string;
  year: number;
  month: number;
  payerName: string;
  amount: number;
  breakdown: FeeBreakdown[];
  date: string;
  receiver: string;
  voucherId: string;
  type: string;
}

export interface Meeting {
  id: string;
  name: string;
  date: string;
  attendance: {
    [houseId: string]: 'present' | 'justified' | 'absent';
  };
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Expense {
  id: string;
  year: number;
  month: number;
  description: string;
  amount: number;
  category: string;
}

export interface Employee {
  id: string;
  name: string;
  rut: string;
  entryDate: string;
  role: string;
  grossSalary?: number;
  afpPercentage?: number;
  fonasaPercentage?: number;
  cesantiaPercentage?: number;
}

export interface VacationRequest {
  id: string;
  employeeId: string;
  startDate: string;
  endDate: string;
  days: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  createdBy: string;
}

export interface MedicalLeave {
  id: string;
  employeeId: string;
  startDate: string;
  endDate: string;
  days: number;
  type: 'medical' | 'death' | 'marriage' | 'absence';
  createdAt: string;
  createdBy: string;
}

export interface ActionLog {
  id: string;
  employeeId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  module: 'VACATION' | 'LEAVE';
  description: string;
  timestamp: string;
  user: string;
}

export interface FeeConfig {
  id: string;
  name: string;
  defaultAmount: number;
  startMonth: number;
  startYear: number;
  endMonth?: number;
  endYear?: number;
  applicableMonths?: number[];
  category?: 'monthly' | 'fine';
  targetHouseIds?: string[];
}

export interface Shift {
  id: string;
  employeeId: string;
  date: string;
  type: 'day' | 'night' | 'off';
  hours: number;
}

export interface ShiftSchedule {
  id: string;
  startDate: string; 
  assignments: Record<string, Record<string, 'day' | 'night' | 'off'>>; 
}
