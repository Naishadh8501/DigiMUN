import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { sessionService } from '../services/api';

const SessionContext = createContext();

export const useSession = () => useContext(SessionContext);

export const SessionProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Poll for updates (Replacing Firebase onSnapshot)
  // In production, you might want to use WebSockets (Socket.io) instead of setInterval
  const fetchSession = useCallback(async () => {
    try {
      const { data } = await sessionService.getSession();
      setSession(data);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch session", err);
      // For development, allow fallback to null/error state
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSession();
    const interval = setInterval(fetchSession, 3000); // Poll every 3 seconds
    return () => clearInterval(interval);
  }, [fetchSession]);

  // Actions wrapped to update local state optimistically or re-fetch
  const updateSessionState = async (updates) => {
    try {
      await sessionService.updateSession(updates);
      fetchSession(); // Re-fetch immediately
    } catch (err) {
      console.error("Update failed", err);
    }
  };

  return (
    <SessionContext.Provider value={{ session, loading, error, updateSessionState, refreshSession: fetchSession }}>
      {children}
    </SessionContext.Provider>
  );
};