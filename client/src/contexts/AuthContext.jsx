import React, { createContext, useContext, useState } from 'react';
import { getToken, getUser, clearAuth, saveAuth } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(getToken);
  const [user,  setUser]  = useState(getUser);

  function login(newToken, newUser) {
    saveAuth(newToken, newUser);
    setToken(newToken);
    setUser(newUser);
  }

  function logout() {
    clearAuth();
    setToken(null);
    setUser({});
  }

  return (
    <AuthContext.Provider value={{ token, user, login, logout, isAdmin: user?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
