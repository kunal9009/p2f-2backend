export function getToken() {
  return localStorage.getItem('tm_token');
}

export function getUser() {
  try { return JSON.parse(localStorage.getItem('tm_user') || '{}'); }
  catch { return {}; }
}

export function saveAuth(token, user) {
  localStorage.setItem('tm_token', token);
  localStorage.setItem('tm_user', JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem('tm_token');
  localStorage.removeItem('tm_user');
}

export async function api(url, method = 'GET', body = null) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + getToken(),
    },
  };
  if (body) opts.body = JSON.stringify(body);
  try {
    const res = await fetch(url, opts);
    if (res.status === 401) {
      clearAuth();
      window.location.href = '/app/login';
      return {};
    }
    return await res.json();
  } catch (err) {
    console.error('API error:', err);
    return { success: false, message: err.message };
  }
}
