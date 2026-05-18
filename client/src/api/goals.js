import http from './http';

export async function getGoal(clientId) {
  try {
    const { data } = await http.get(`/api/clients/${clientId}/goals`);
    return data;
  } catch (e) {
    if (e.response?.status === 404) return null;
    throw e;
  }
}

export async function saveGoal(clientId, payload) {
  const { data } = await http.put(`/api/clients/${clientId}/goals`, payload);
  return data;
}
