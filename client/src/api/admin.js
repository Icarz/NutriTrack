import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

function client(secret) {
  return axios.create({
    baseURL,
    headers: { 'x-admin-secret': secret },
  });
}

export async function getAccounts(secret) {
  const { data } = await client(secret).get('/api/admin/nutritionists');
  return data;
}

export async function createAccount(secret, payload) {
  const { data } = await client(secret).post('/api/admin/nutritionists', payload);
  return data;
}

export async function updateAccount(secret, id, payload) {
  const { data } = await client(secret).put(`/api/admin/nutritionists/${id}`, payload);
  return data;
}

export async function deleteAccount(secret, id) {
  const { data } = await client(secret).delete(`/api/admin/nutritionists/${id}`);
  return data;
}

export async function resetPassword(secret, id, new_password) {
  const { data } = await client(secret).post(
    `/api/admin/nutritionists/${id}/reset-password`,
    { new_password }
  );
  return data;
}
