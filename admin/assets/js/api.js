/* ============================================================
   Thin fetch wrapper for the admin API. Same-origin, cookie-based
   session auth (no tokens in localStorage — keeps XSS from being
   able to steal a bearer token).
   ============================================================ */

const API_BASE = '../backend/api';

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function apiRequest(path, { method = 'GET', params = null, body = null, isForm = false } = {}) {
  let url = `${API_BASE}/${path}`;
  if (params) {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
    ).toString();
    if (qs) url += (url.includes('?') ? '&' : '?') + qs;
  }

  const opts = { method, credentials: 'same-origin', headers: {} };
  if (body !== null) {
    if (isForm) {
      opts.body = body; // FormData — browser sets multipart headers
    } else {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
  }

  let res;
  try {
    res = await fetch(url, opts);
  } catch (e) {
    throw new ApiError('Cannot reach the backend. Is it running?', 0);
  }

  if (res.status === 401) {
    window.location.href = 'login.html';
    throw new ApiError('Not authenticated', 401);
  }

  let json = {};
  try { json = await res.json(); } catch (e) { /* empty body */ }

  if (!res.ok || json.error) {
    throw new ApiError(json.message || `Request failed (${res.status})`, res.status);
  }
  return json;
}

const Api = {
  get: (path, params) => apiRequest(path, { method: 'GET', params }),
  post: (path, body, params) => apiRequest(path, { method: 'POST', body, params }),
  put: (path, body, params) => apiRequest(path, { method: 'PUT', body, params }),
  del: (path, params) => apiRequest(path, { method: 'DELETE', params }),
  upload: (path, formData, params) => apiRequest(path, { method: 'POST', body: formData, params, isForm: true }),
};
