import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSession } from '../../context/SessionContext';
import { sessionService } from '../../services/api';

const SetupPanel = () => {
  const { user } = useAuth();
  const { session, refreshSession } = useSession();
  const [country, setCountry] = useState('');
  const [role, setRole] = useState('delegate');

  const userDelegate = session?.delegates?.[user?.uid];
  const isChairAssigned = session?.chairUserId && session?.chairUserId !== user?.uid;

  const handleJoin = async () => {
    if (!country) return;
    try {
      await sessionService.joinSession({
        userId: user.uid,
        country,
        role,
        isChair: role === 'chair'
      });
      refreshSession();
    } catch (e) {
      console.error("Error joining:", e);
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
          placeholder="e.g. USA"
          className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-md focus:ring-yellow-500"
        />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-1">Role</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-md"
          disabled={isChairAssigned && role !== 'chair'}
        >
          <option value="delegate">Delegate</option>
          <option value="chair" disabled={isChairAssigned}>Chair</option>
        </select>
      </div>
      <button
        onClick={handleJoin}
        disabled={!country}
        className="w-full bg-yellow-600 hover:bg-yellow-700 text-gray-900 font-bold py-2 rounded-md transition disabled:bg-gray-500"
      >
        Set Identity & Join
      </button>
    </div>
  );
};

export default SetupPanel;