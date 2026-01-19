import { VisitRecord, House, User } from './types';

/**
 * URL del backend (Vercel / Vite)
 * Ej: https://gesintcon-plus-backend.duckdns.org/api
 */
const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  throw new Error('VITE_API_URL no está definida en el entorno');
}

/**
 * Manejo seguro de respuestas
 */
async function handleResponse(response: Response) {
  const contentType = response.headers.get('content-type');

  if (contentType && contentType.includes('application/json')) {
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || data.error || `Error ${response.status}`);
    }

    return data;
  }

  const text = await response.text();
  console.error('Respuesta no JSON:', text.substring(0, 200));
  throw new Error(`Error del servidor (${response.status})`);
}

export const api = {
  /**
   * LOGIN
   * Backend real: POST /api/login
   */
  async login(email: string, password: string): Promise<User> {
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    return handleResponse(response);
  }
};
