import http from './http';

export async function getClients() {
  const { data } = await http.get('/api/clients');
  return data;
}

export async function getClient(id) {
  const { data } = await http.get(`/api/clients/${id}`);
  return data;
}

export async function createClient(payload) {
  const { data } = await http.post('/api/clients', payload);
  return data;
}

export async function updateClient(id, payload) {
  const { data } = await http.put(`/api/clients/${id}`, payload);
  return data;
}

export async function deleteClient(id) {
  const { data } = await http.delete(`/api/clients/${id}`);
  return data;
}
