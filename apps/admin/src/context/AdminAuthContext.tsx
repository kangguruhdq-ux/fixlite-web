import { toast } from '@pixellift/ui';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, RoleType } from '@pixellift/types';
import { adminApi } from '../services/api';

interface AdminAuthContextType {
  adminUser: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  hasPermission: (allowedRoles: RoleType[]) => boolean;
  updateAdminUser: (updates: Partial<User>) => void;
  refreshUser: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('pixellift_admin_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function checkAuth() {
      if (!token) {
        setAdminUser(null);
        setIsLoading(false);
        return;
      }

      try {
        const u = await adminApi.getMe();
        if (u.role === 'User') {
          throw new Error('Non-admin role');
        }
        if(localStorage.getItem('pixellift_admin_token') === token) setAdminUser(u);
      } catch {
        localStorage.removeItem('pixellift_admin_token');
        setToken(null);
        setAdminUser(null);
      } finally {
        setIsLoading(false);
      }
    }
    checkAuth();
  }, [token]);

  const login = async (email: string, pass: string) => {
    const session = await adminApi.login(email, pass);
    if (session.user.role === 'User') {
      throw new Error('Akses ditolak: Akun ini tidak memiliki hak akses administrator.');
    }
    localStorage.setItem('pixellift_admin_token', session.token);
    setToken(session.token);
    setAdminUser(session.user);
    toast.success('Selamat datang, ' + session.user.name + '!');
  };

  const logout = () => {
    toast.success('Anda berhasil keluar dari dashboard admin.');
    localStorage.removeItem('pixellift_admin_token');
    setToken(null);
    setAdminUser(null);
  };

  const refreshUser = async () => {
    try {
      const u = await adminApi.getMe();
      setAdminUser(u);
    } catch (e) {
      console.error('Failed to refresh user:', e);
    }
  };

  const updateAdminUser = (updates: Partial<User>) => {
    setAdminUser((prev) => (prev ? { ...prev, ...updates } : null));
  };

  const hasPermission = (allowedRoles: RoleType[]) => {
    if (!adminUser) return false;
    if (adminUser.role === 'Super Admin') return true; // Super admin has access to everything
    return allowedRoles.includes(adminUser.role);
  };

  return (
    <AdminAuthContext.Provider
      value={{
        adminUser,
        token,
        isLoading,
        login,
        logout,
        hasPermission,
        updateAdminUser,
        refreshUser,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
};

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return context;
}
