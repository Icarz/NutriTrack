import http from './http';

export async function getLogs(clientId) {
  const { data } = await http.get(`/api/clients/${clientId}/logs`);
  return data;
}

export async function createLog(clientId, payload) {
  const { data } = await http.post(`/api/clients/${clientId}/logs`, payload);
  return data;
}

export async function updateLog(logId, payload) {
  const { data } = await http.put(`/api/logs/${logId}`, payload);
  return data;
}

export async function deleteLog(logId) {
  const { data } = await http.delete(`/api/logs/${logId}`);
  return data;
}
