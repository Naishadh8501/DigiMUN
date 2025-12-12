import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // SIMULATED AUTH - Replace with actual JWT check from localStorage
    const storedUser = localStorage.getItem('mun_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      // Create a temporary ID for anonymous users if not logged in
      const tempId = `user_${Math.random().toString(36).substr(2, 9)}`;
      const tempUser = { uid: tempId, isAnonymous: true };
      setUser(tempUser);
      localStorage.setItem('mun_user', JSON.stringify(tempUser));
    }
    setLoading(false);
  }, []);

  const login = (userData) => {
    setUser(userData);
    localStorage.setItem('mun_user', JSON.stringify(userData));
  };

  return (
    <AuthContext.Provider value={{ user, loading, login }}>
      {children}
    </AuthContext.Provider>
  );
};