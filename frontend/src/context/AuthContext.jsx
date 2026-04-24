import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { adminGetMe, adminLogin } from '../api/admin';
import { vendorGetMe, vendorLogin } from '../api/vendor';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [adminUser, setAdminUser] = useState(null);
  const [vendorUser, setVendorUser] = useState(null);
  const [adminLoading, setAdminLoading] = useState(true);
  const [vendorLoading, setVendorLoading] = useState(true);

  // Bootstrap admin session
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) { setAdminLoading(false); return; }
    adminGetMe()
      .then((r) => setAdminUser(r.data.user))
      .catch(() => localStorage.removeItem('adminToken'))
      .finally(() => setAdminLoading(false));
  }, []);

  // Bootstrap vendor session
  useEffect(() => {
    const token = localStorage.getItem('vendorToken');
    if (!token) { setVendorLoading(false); return; }
    vendorGetMe()
      .then((r) => setVendorUser(r.data.user))
      .catch(() => localStorage.removeItem('vendorToken'))
      .finally(() => setVendorLoading(false));
  }, []);

  const loginAdmin = useCallback(async (email, password) => {
    const { data } = await adminLogin({ email, password });
    localStorage.setItem('adminToken', data.token);
    setAdminUser(data.user);
    return data.user;
  }, []);

  const logoutAdmin = useCallback(() => {
    localStorage.removeItem('adminToken');
    setAdminUser(null);
  }, []);

  const loginVendor = useCallback(async (email, password) => {
    const { data } = await vendorLogin({ email, password });
    localStorage.setItem('vendorToken', data.token);
    setVendorUser(data.user);
    return data.user;
  }, []);

  const logoutVendor = useCallback(() => {
    localStorage.removeItem('vendorToken');
    setVendorUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      adminUser, adminLoading, loginAdmin, logoutAdmin,
      vendorUser, vendorLoading, loginVendor, logoutVendor,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
