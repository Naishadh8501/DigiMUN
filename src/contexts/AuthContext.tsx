import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Role } from '@/data/mockData';

interface AuthContextType {
  role: Role | null;
  userName: string;
  login: (role: Role, name: string) => void;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role | null>(() => {
    const saved = localStorage.getItem('digimun-role');
    return saved as Role | null;
  });
  const [userName, setUserName] = useState(() => localStorage.getItem('digimun-user') || '');

  const login = (r: Role, name: string) => {
    setRole(r);
    setUserName(name);
    localStorage.setItem('digimun-role', r);
    localStorage.setItem('digimun-user', name);
  };

  const logout = () => {
    setRole(null);
    setUserName('');
    localStorage.removeItem('digimun-role');
    localStorage.removeItem('digimun-user');
  };

  const isAdmin = role === 'chair' || role === 'vice-chair';

  // NEW: Dynamically apply the admin theme based on the user's role
  useEffect(() => {
    if (isAdmin) {
      document.documentElement.classList.add('theme-admin');
    } else {
      document.documentElement.classList.remove('theme-admin');
    }
  }, [isAdmin]);

  return (
    <AuthContext.Provider value={{ role, userName, login, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}