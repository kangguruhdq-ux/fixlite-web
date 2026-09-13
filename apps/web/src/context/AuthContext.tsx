import { toast } from '@pixellift/ui';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, MembershipTier } from '@pixellift/types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (name: string, email: string, pass: string) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  loginDemoUser: () => Promise<void>;
  upgradeTierSimulated: (tier: MembershipTier, customAmount?: number, couponCode?: string, paymentMethod?: string) => Promise<string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('pixellift_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadUser() {
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const u = await api.getMe();
        if(localStorage.getItem('pixellift_token') === token) setUser(u);
      } catch {
        localStorage.removeItem('pixellift_token');
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }
    loadUser();
  }, [token]);

  const login = async (email: string, pass: string) => {
    const session = await api.login(email, pass);
    localStorage.setItem('pixellift_token', session.token);
    setToken(session.token);
    setUser(session.user);
    toast.success('Selamat datang, ' + session.user.name + '!');
  };

  const register = async (name: string, email: string, pass: string) => {
    const session = await api.register(name, email, pass);
    localStorage.setItem('pixellift_token', session.token);
    setToken(session.token);
    setUser(session.user);
    toast.success('Selamat datang, ' + session.user.name + '!');
  };

  const refreshProfile = async () => { setUser(await api.getMe()); };
  const logout = () => {
    toast.success('Anda berhasil logout. Proyek lokal tetap tersimpan.');
    localStorage.removeItem('pixellift_token');
    setToken(null);
    setUser(null);
  };

  const loginDemoUser = async () => {
    await login('user@pixellift.test', 'Demo123!');
  };

  const upgradeTierSimulated = async (tier: MembershipTier, customAmount?: number, couponCode?: string, paymentMethod?: string) => {
    const defaultAmount = tier === 'Pro' ? 12 : tier === 'Unlimited' ? 29 : 0;
    const amount = typeof customAmount === 'number' ? customAmount : defaultAmount;
    const transaction = await api.simulateCheckout(tier, amount, paymentMethod || 'Simulated Card', couponCode);
    if (user) {
      setUser({ ...user, membership: tier });
    }
    return transaction.invoiceNumber;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        refreshProfile,
        loginDemoUser,
        upgradeTierSimulated,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
