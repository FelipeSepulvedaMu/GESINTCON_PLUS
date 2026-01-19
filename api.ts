import { VisitRecord, House, User } from './types';

/**
 * URL del backend definida por entorno (Vercel)
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
  console.error('Respuesta no-JSON del servidor:', text.substring(0, 200));

  if (response.status === 404) {
    throw new Error(`Error 404: ruta no encontrada en ${API_URL}`);
  }

  throw new Error(`Error del servidor (${response.status})`);
}

/**
 * Mapeo de visitas
 */
const mapVisit = (v: any): VisitRecord => ({
  id: v.id,
  date: v.date,
  houseNumber: v.house_number || v.houseNumber,
  residentName: v.resident_name || v.residentName,
  type: v.type,
  visitorName: v.visitor_name || v.visitorName,
  visitorRut: v.visitor_rut || v.visitorRut,
  plate: v.plate,
  conciergeName: v.concierge_name || v.conciergeName
});

export const api = {
  async login(rut: string, password: string): Promise<User> {
    const response = await fetch(`${API_URL}/login-visit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rut, password })
    });

    return handleResponse(response);
  },

  async getHouses(): Promise<House[]> {
    try {
      const response = await fetch(`${API_URL}/visits/houses`);
      const data = await handleResponse(response);

      return data.map((h: any) => ({
        id: h.id,
        number: h.number,
        residentName: h.owner_name || h.resident_name || 'Sin nombre',
        phone: h.phone || ''
      }));
    } catch (error) {
      console.error('Error API getHouses:', error);
      return [];
    }
  },

  async getVisits(date: string): Promise<VisitRecord[]> {
    try {
      const response = await fetch(`${API_URL}/visits?date=${date}`);
      const data = await handleResponse(response);
      return data.map(mapVisit);
    } catch (error) {
      console.error('Error API getVisits:', error);
      return [];
    }
  },

  async createVisit(visit: Partial<VisitRecord>): Promise<VisitRecord> {
    const response = await fetch(`${API_URL}/visits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(visit)
    });

    const result = await handleResponse(response);
    return mapVisit(result);
  }
};
