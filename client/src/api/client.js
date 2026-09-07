import axios from 'axios';

const client = axios.create({
  baseURL: '/api',
  withCredentials: true, // send/receive the refresh-token cookie
});

export function getToken() {
  return localStorage.getItem('mms_token');
}

export function setToken(token) {
  localStorage.setItem('mms_token', token);
}

export function clearSession() {
  localStorage.removeItem('mms_token');
  localStorage.removeItem('mms_user');
}

client.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const AUTH_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/logout',
  '/auth/forgot-password',
  '/auth/reset-password',
];
const isAuthCall = (url = '') => AUTH_PATHS.some((p) => url.includes(p));

// One shared refresh promise so a burst of 401s triggers a single /auth/refresh.
let refreshing = null;

function redirectToLogin() {
  const path = window.location.pathname;
  if (!path.startsWith('/login')) {
    const redirect = encodeURIComponent(path + window.location.search);
    window.location.assign(`/login?redirect=${redirect}`);
  }
}

client.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { config, response } = error;
    const status = response?.status;
    const code = response?.data?.code;
    const url = config?.url || '';

    // Access token rejected — try to refresh once, then replay the request.
    if (status === 401 && config && !config._retry && !isAuthCall(url)) {
      config._retry = true;
      try {
        refreshing = refreshing || client.post('/auth/refresh');
        const { data } = await refreshing;
        refreshing = null;
        setToken(data.token);
        localStorage.setItem('mms_user', JSON.stringify(data.user));
        config.headers.Authorization = `Bearer ${data.token}`;
        return client(config);
      } catch (refreshErr) {
        refreshing = null;
        clearSession();
        if (!url.endsWith('/auth/me')) redirectToLogin();
        return Promise.reject(refreshErr);
      }
    }

    if (status === 401 && !isAuthCall(url)) {
      clearSession();
      if (!url.endsWith('/auth/me')) redirectToLogin();
    } else if (
      status === 403 &&
      code === 'FORBIDDEN' &&
      !window.location.pathname.startsWith('/forbidden')
    ) {
      window.location.assign('/forbidden');
    }

    return Promise.reject(error);
  }
);

export default client;
