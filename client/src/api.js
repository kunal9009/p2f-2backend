export function getToken() {
  return localStorage.getItem('tm_token');
}

export function getUser() {
  try {
    const raw = localStorage.getItem('tm_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
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
      return { success: false, message: 'Session expired' };
    }
    return await res.json();
  } catch (err) {
    return { success: false, message: err.message };
  }
}
