/**
 * CONFIGURACIÓN DE CONEXIÓN API - GESINTCON PLUS
 * Este archivo centraliza todas las peticiones al Backend Modular.
 */
const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  throw new Error('VITE_API_URL no está definida en el entorno');
}

/**
 * Manejador central de peticiones
 */
const handleRequest = async (endpoint: string, method: string, payload: any = null) => {
  try {
    const options: RequestInit = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };

    if (payload) {
      options.body = JSON.stringify(payload);
    }

    console.log(`📡 Petición: ${method} -> ${API_URL}${endpoint}`);
    const response = await fetch(`${API_URL}${endpoint}`, options);
    
    if (!response.ok) {
      if (response.status === 401) {
        console.warn("⚠️ Error 401: Credenciales inválidas o sesión expirada.");
        return null;
      }
      const errorData = await response.json().catch(() => ({}));
      console.error(`🔴 Error API (${response.status}):`, errorData);
      return null;
    }

    if (response.status === 204) return true; // DELETE
    return await response.json();
  } catch (e) {
    console.error(`🔴 Error de red en ${endpoint}: ¿Está el backend encendido?`, e);
    return null;
  }
};

export const api = {
  // --- AUTENTICACIÓN ---
  login: (email: string, pass: string) => handleRequest('/login', 'POST', { email, password: pass }),

  // --- CASAS / USUARIOS ---
  getHouses: () => handleRequest('/users', 'GET'),
  updateHouse: (id: string, data: any) => handleRequest(`/users/${id}`, 'PUT', data),

  // --- PAGOS ---
  getPayments: () => handleRequest('/reports/payments', 'GET'),
  createPayment: (data: any) => handleRequest('/reports/payments', 'POST', data),
  deletePayment: (id: string) => handleRequest(`/reports/payments/${id}`, 'DELETE'),

  // --- REUNIONES / MEETINGS ---
  getMeetings: () => handleRequest('/reports/meetings', 'GET'),
  createMeeting: (data: any) => handleRequest('/reports/meetings', 'POST', data),
  updateMeeting: (id: string, data: any) => handleRequest(`/reports/meetings/${id}`, 'PUT', data),
  deleteMeeting: (id: string) => handleRequest(`/reports/meetings/${id}`, 'DELETE'),

  // --- GASTOS / EXPENSES ---
  getExpenses: () => handleRequest('/reports/expenses', 'GET'),
  createExpense: (data: any) => handleRequest('/reports/expenses', 'POST', data),
  deleteExpense: (id: string) => handleRequest(`/reports/expenses/${id}`, 'DELETE'),

  // --- EMPLEADOS ---
  getEmployees: () => handleRequest('/reports/employees', 'GET'),
  createEmployee: (data: any) => handleRequest('/reports/employees', 'POST', data),
  updateEmployee: (id: string, data: any) => handleRequest(`/reports/employees/${id}`, 'PUT', data),

  // --- VACACIONES ---
  getVacations: () => handleRequest('/reports/vacations', 'GET'),
  createVacation: (data: any) => handleRequest('/reports/vacations', 'POST', data),
  deleteVacation: (id: string) => handleRequest(`/reports/vacations/${id}`, 'DELETE'),

  // --- LICENCIAS / LEAVES ---
  getLeaves: () => handleRequest('/reports/leaves', 'GET'),
  createLeave: (data: any) => handleRequest('/reports/leaves', 'POST', data),
  deleteLeave: (id: string) => handleRequest(`/reports/leaves/${id}`, 'DELETE'),

  // --- PRODUCTOS / FEES ---
  getFees: () => handleRequest('/products', 'GET'),
  createFee: (data: any) => handleRequest('/products', 'POST', data),
  updateFee: (id: string, data: any) => handleRequest(`/products/${id}`, 'PUT', data),
  deleteFee: (id: string) => handleRequest(`/products/${id}`, 'DELETE'),

  // --- LOGS ---
  getLogs: (employeeId: string) => handleRequest(`/reports/logs?employeeId=${employeeId}`, 'GET'),

  // --- TURNOS / SHIFTS ---
  getShifts: (startDate?: string) =>
    handleRequest(`/reports/shifts${startDate ? `?startDate=${startDate}` : ''}`, 'GET'),
  saveShifts: (startDate: string, assignments: any) =>
    handleRequest('/reports/shifts', 'POST', { startDate, assignments })
};
