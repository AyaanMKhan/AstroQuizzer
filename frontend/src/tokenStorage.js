export function storeToken(token) {
  try { localStorage.setItem('jwtToken', token || ''); } catch {}
}

export function retrieveToken() {
  try { return localStorage.getItem('jwtToken') || ''; } catch { return ''; }
}

export function clearToken() {
  try { localStorage.removeItem('jwtToken'); } catch {}
}