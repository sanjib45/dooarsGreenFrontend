/**
 * Central Axios API Client — Production Grade
 * ──────────────────────────────────────────────────────────────
 * Features:
 *  ✅ 15-second request timeout (matches backend)
 *  ✅ Access token attached automatically from localStorage
 *  ✅ On 401 TOKEN_EXPIRED → silently calls POST /auth/refresh
 *     (httpOnly cookie sent automatically)
 *  ✅ All in-flight requests are queued during refresh, retried after
 *  ✅ On permanent 401 (TOKEN_INVALID / refresh failed) → soft logout
 *     with toast message — does NOT cause sudden page "vanish"
 *  ✅ Network timeout shows user-friendly toast
 */
import axios from 'axios';
import toast  from 'react-hot-toast';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5005/api';

// ── Axios instance ────────────────────────────────────────────────────────
const client = axios.create({
  baseURL:         BASE_URL,
  timeout:         15_000,   // 15 seconds — generous for slow MongoDB queries
  withCredentials: true,     // send httpOnly refreshToken cookie automatically
  headers: { 'Content-Type': 'application/json' },
});

// ── Token refresh state ───────────────────────────────────────────────────
let isRefreshing     = false;
let refreshListeners = [];

const subscribeTokenRefresh = (cb) => refreshListeners.push(cb);

const resolveListeners = (newToken) => {
  refreshListeners.forEach(cb => cb(newToken));
  refreshListeners = [];
};

const rejectListeners = () => {
  refreshListeners.forEach(cb => cb(null));
  refreshListeners = [];
};

// ── Soft logout — keeps page visible, shows toast, then redirects ─────────
const softLogout = (reason = 'Session expired') => {
  // Clear all possible auth storage keys
  ['accessToken', 'token', 'isAuthenticated', 'user'].forEach(
    k => localStorage.removeItem(k)
  );
  toast.error(`${reason} — please login again`, {
    id:       'session-expired',
    duration: 3000,
  });
  // Small delay so the toast is visible before redirect
  setTimeout(() => {
    window.location.replace('/login');
  }, 1500);
};

// ── Request interceptor: attach access token ──────────────────────────────
client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor: silent refresh on 401 TOKEN_EXPIRED ────────────
client.interceptors.response.use(
  (res) => res,  // 2xx — pass through unchanged

  async (error) => {
    const original = error.config;
    const status   = error.response?.status;
    const code     = error.response?.data?.code;

    // ── Network timeout / no response ────────────────────────────────────
    if (error.code === 'ECONNABORTED') {
      toast.error('Request timed out — server is taking too long.', { id: 'timeout-err' });
      return Promise.reject(error);
    }
    if (!error.response) {
      toast.error('Cannot reach the server — check your connection.', { id: 'network-err' });
      return Promise.reject(error);
    }

    // ── 401 TOKEN_EXPIRED: attempt silent refresh ─────────────────────────
    if (status === 401 && code === 'TOKEN_EXPIRED' && !original._retry) {
      original._retry = true;

      // If a refresh is already in flight, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh((newToken) => {
            if (!newToken) return reject(error);
            original.headers.Authorization = `Bearer ${newToken}`;
            resolve(client(original));
          });
        });
      }

      isRefreshing = true;

      try {
        // The browser automatically sends the httpOnly cookie here
        const { data } = await axios.post(
          `${BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true, timeout: 15_000 }
        );

        const newToken = data?.data?.accessToken;
        if (!newToken) throw new Error('No token in refresh response');

        localStorage.setItem('accessToken', newToken);
        resolveListeners(newToken);
        isRefreshing = false;

        // Retry the original request with the fresh token
        original.headers.Authorization = `Bearer ${newToken}`;
        return client(original);

      } catch (refreshError) {
        rejectListeners();
        isRefreshing = false;
        softLogout('Session expired');
        return Promise.reject(refreshError);
      }
    }

    // ── 401 TOKEN_INVALID or NO_TOKEN: hard session failure ───────────────
    // But ONLY if it's not the logout endpoint (that one can 401 safely)
    if (status === 401 && !original._retry && !original.url?.includes('/auth/')) {
      softLogout('Invalid session');
    }

    return Promise.reject(error);
  }
);

export default client;
