import { createContext, useContext, useEffect, useState } from 'react';
import client, { clearSession, getToken } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('mms_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(() => !!getToken());

  // Validate the stored token on boot and refresh the cached user.
  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    client
      .get('/auth/me')
      .then(({ data }) => {
        if (cancelled) return;
        localStorage.setItem('mms_user', JSON.stringify(data.user));
        setUser(data.user);
      })
      .catch(() => {
        if (cancelled) return;
        clearSession();
        setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function login(email, password) {
    const { data } = await client.post('/auth/login', { email, password });
    localStorage.setItem('mms_token', data.token);
    localStorage.setItem('mms_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }

  async function register(name, email, password) {
    const { data } = await client.post('/auth/register', { name, email, password });
    localStorage.setItem('mms_token', data.token);
    localStorage.setItem('mms_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }

  async function logout() {
    try {
      await client.post('/auth/logout');
    } catch {
      // best effort — the cookie is cleared server-side either way
    }
    clearSession();
    setUser(null);
  }

  async function logoutEverywhere() {
    try {
      await client.post('/auth/logout-all');
    } catch {
      // ignore — still drop the local session below
    }
    clearSession();
    setUser(null);
  }

  function updateUser(next) {
    localStorage.setItem('mms_user', JSON.stringify(next));
    setUser(next);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role ?? null,
        loading,
        login,
        register,
        logout,
        logoutEverywhere,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
