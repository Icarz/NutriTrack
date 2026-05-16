import http from './http';

export async function login(email, password) {
  const { data } = await http.post('/api/auth/login', { email, password });
  if (data?.token) localStorage.setItem('token', data.token);
  return data;
}

export function logout() {
  localStorage.removeItem('token');
  return http.post('/api/auth/logout').catch(() => null);
}

export async function getMe() {
  const { data } = await http.get('/api/auth/me');
  return data;
}
