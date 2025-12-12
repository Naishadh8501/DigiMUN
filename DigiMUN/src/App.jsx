import React from 'react';
import { AuthProvider } from './context/AuthContext';
import { SessionProvider } from './context/SessionContext';
import Dashboard from './pages/Dashboard';

const App = () => {
  return (
    <AuthProvider>
      <SessionProvider>
        <Dashboard />
      </SessionProvider>
    </AuthProvider>
  );
};

export default App;