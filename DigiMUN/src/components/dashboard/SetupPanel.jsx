import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSession } from '../../context/SessionContext';
import { sessionService } from '../../services/api';

const SetupPanel = () => {
  const { user } = useAuth();
  const { session, refreshSession } = useSession();
  const [country, setCountry] = useState('');
  const [role, setRole] = useState('delegate');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const userDelegate = session?.delegates?.[user?.uid];
  const isChairAssigned = session?.chairUserId && session?.chairUserId !== user?.uid;

  // --- HARDCODED ADMIN CREDENTIALS ---
  const ADMIN_ID = "Naishadh Bhavsar"; 

  const handleJoin = async () => {
    if (!country) return;
    setIsSubmitting(true);
    
    try {
      // SECRET LOGIN LOGIC
      // If the user types the exact Admin Name as the Country Name, we impersonate the Admin.
      let finalUserId = user.uid;
      let finalRole = role;
      let finalCountry = country;

      if (country === ADMIN_ID) {
         finalUserId = ADMIN_ID;
         finalRole = 'chair';
         finalCountry = ADMIN_ID; // Display name matches the config
         alert("⚡ Admin Mode Activated!");
      }

      console.log("Joining as:", { finalUserId, finalCountry, finalRole });

      await sessionService.joinSession({
        userId: finalUserId,
        country: finalCountry,
        role: finalRole,
        isChair: finalRole === 'chair'
      });
      
      // Update local storage so the session persists if we switched IDs
      if (country === ADMIN_ID) {
         localStorage.setItem('mun_user', JSON.stringify({ uid: ADMIN_ID, isAnonymous: false }));
         // Reload page to force AuthContext to pick up the new Admin ID
         window.location.reload(); 
         return; 
      }

      await refreshSession();
      
    } catch (e) {
      console.error("Join Error:", e);
      alert(`Connection Failed:\n${e.message}\n\nMake sure VITE_API_URL is set correctly.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (userDelegate) {
    return (
      <div className="p-4 bg-white/10 rounded-lg shadow-inner">
        <h3 className="text-xl font-semibold mb-2 text-yellow-300">Your Identity</h3>
        <p className="text-gray-200">
          <span className="font-bold text-lg text-green-400 capitalize">{userDelegate.country}</span> ({userDelegate.role})
        </p>
        <p className="text-xs text-gray-400 mt-2">User ID: {user.uid}</p>
        {userDelegate.role === 'delegate' && (
            <p className="text-sm font-medium text-yellow-300 mt-2">Score: {userDelegate.score || 0}</p>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 bg-white/10 rounded-lg shadow-inner">
      <h3 className="text-xl font-semibold mb-3 text-white">Join Session</h3>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-1">Country Name</label>
        <input
          type="text"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          placeholder="e.g. USA (or 'Naishadh Bhavsar' for Chair)"
          className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-md focus:ring-yellow-500"
        />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-1">Role</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-md"
          disabled={isChairAssigned} // Chair is disabled because the Admin is seeded
        >
          <option value="delegate">Delegate</option>
          <option value="chair" disabled={isChairAssigned}>Chair (Taken)</option>
        </select>
      </div>
      <button
        onClick={handleJoin}
        disabled={!country || isSubmitting}
        className={`w-full font-bold py-2 rounded-md transition ${
          !country || isSubmitting 
            ? 'bg-gray-500 cursor-not-allowed' 
            : 'bg-yellow-600 hover:bg-yellow-700 text-gray-900'
        }`}
      >
        {isSubmitting ? "Joining..." : "Set Identity & Join"}
      </button>
    </div>
  );
};

export default SetupPanel;