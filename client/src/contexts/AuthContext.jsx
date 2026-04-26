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
    setUser(null);
  }

  const isAdmin = user?.role === 'admin';
  const permissionsRestricted = !!user?.permissionsRestricted;
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];

  // Section-level visibility:
  //   admin                          → always true
  //   permissionsRestricted = false  → see everything (default)
  //   permissionsRestricted = true   → only sections in `permissions` array
  function hasSection(id) {
    if (isAdmin) return true;
    if (!permissionsRestricted) return true;
    return permissions.includes(id);
  }

  return (
    <AuthContext.Provider value={{
      token, user, login, logout,
      isAdmin, permissionsRestricted, permissions, hasSection,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
