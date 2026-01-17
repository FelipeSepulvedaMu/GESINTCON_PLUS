
/**
 * CONFIGURACIÓN DE CONEXIÓN
 * Este archivo vive en el FRONTEND y se comunica con el BACKEND.
 */
const LOCAL_BACKEND_URL = 'http://localhost:3001/api';

/**
 * Manejador central de peticiones
 * Centraliza la lógica de fetch y manejo de errores.
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

    console.log(`📡 Enviando petición a: ${LOCAL_BACKEND_URL}${endpoint}`);
    const response = await fetch(`${LOCAL_BACKEND_URL}${endpoint}`, options);
    
    if (!response.ok) {
      if (response.status === 401) return null;
      const errorData = await response.json().catch(() => ({}));
      console.error(`🔴 Error en respuesta (${response.status}):`, errorData);
      return null;
    }

    if (response.status === 204) return true;
    
    return await response.json();
  } catch (e) {
    console.error(`🔴 Error de red conectando con el Backend en ${endpoint}. ¿Está el servidor corriendo en el puerto 3001?`, e);
    return null;
  }
};

export const api = {
  login: async (email: string, pass: string) => handleRequest('/login', 'POST', { email, password: pass }),
  getHouses: () => handleRequest('/users', 'GET'),
  updateHouse: (id: string, data: any) => handleRequest(`/users/${id}`, 'PUT', data),
  getPayments: () => handleRequest('/reports/payments', 'GET'),
  createPayment: (data: any) => handleRequest('/reports/payments', 'POST', data),
  deletePayment: (id: string) => handleRequest(`/reports/payments/${id}`, 'DELETE'),
  getMeetings: () => handleRequest('/reports/meetings', 'GET'),
  createMeeting: (data: any) => handleRequest('/reports/meetings', 'POST', data),
  updateMeeting: (id: string, data: any) => handleRequest(`/reports/meetings/${id}`, 'PUT', data),
  deleteMeeting: (id: string) => handleRequest(`/reports/meetings/${id}`, 'DELETE'),
  getExpenses: () => handleRequest('/reports/expenses', 'GET'),
  createExpense: (data: any) => handleRequest('/reports/expenses', 'POST', data),
  deleteExpense: (id: string) => handleRequest(`/reports/expenses/${id}`, 'DELETE'),
  getEmployees: () => handleRequest('/reports/employees', 'GET'),
  createEmployee: (data: any) => handleRequest('/reports/employees', 'POST', data),
  updateEmployee: (id: string, data: any) => handleRequest(`/reports/employees/${id}`, 'PUT', data),
  getVacations: () => handleRequest('/reports/vacations', 'GET'),
  createVacation: (data: any) => handleRequest('/reports/vacations', 'POST', data),
  deleteVacation: (id: string) => handleRequest(`/reports/vacations/${id}`, 'DELETE'),
  getLeaves: () => handleRequest('/reports/leaves', 'GET'),
  createLeave: (data: any) => handleRequest('/reports/leaves', 'POST', data),
  deleteLeave: (id: string) => handleRequest(`/reports/leaves/${id}`, 'DELETE'),
  getFees: () => handleRequest('/products', 'GET'),
  createFee: (data: any) => handleRequest('/products', 'POST', data),
  updateFee: (id: string, data: any) => handleRequest(`/products/${id}`, 'PUT', data),
  deleteFee: (id: string) => handleRequest(`/products/${id}`, 'DELETE'),
  getLogs: (employeeId: string) => handleRequest(`/reports/logs?employeeId=${employeeId}`, 'GET'),
  getShifts: (startDate?: string) => handleRequest(`/reports/shifts${startDate ? `?startDate=${startDate}` : ''}`, 'GET'),
  saveShifts: (startDate: string, assignments: any) => handleRequest('/reports/shifts', 'POST', { startDate, assignments })
};
