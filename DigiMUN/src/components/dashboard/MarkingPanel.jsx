import React, { useState } from 'react';
import { Briefcase, Plus, TrendingUp } from 'lucide-react';
import { useSession } from '../../context/SessionContext';
import { sessionService } from '../../services/api';

const MarkingPanel = () => {
  const { session, refreshSession } = useSession();
  const delegates = Object.values(session?.delegates || {}).filter(d => d.role !== 'chair');

  const handleMark = async (userId, score) => {
    try {
        await sessionService.markDelegate({ userId, score });
        refreshSession();
    } catch (e) {
        alert("Failed to mark.");
    }
  };

  return (
    <div className="bg-gray-800 p-6 rounded-xl shadow-2xl h-full overflow-y-auto">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
        <Briefcase className="mr-2 text-green-400" /> Delegate Marking
      </h2>

      <div className="grid gap-4">
        {delegates.map(del => (
            <div key={del.userId} className="bg-gray-700 p-4 rounded-lg flex justify-between items-center">
                <div>
                    <h3 className="text-xl font-bold text-white">{del.country}</h3>
                    <p className="text-green-400 font-mono flex items-center">
                        <TrendingUp className="w-4 h-4 mr-1"/> Score: {del.score}
                    </p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => handleMark(del.userId, 5)} className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-white text-sm font-bold">+5 Speech</button>
                    <button onClick={() => handleMark(del.userId, 2)} className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-white text-sm font-bold">+2 Point</button>
                    <button onClick={() => handleMark(del.userId, -1)} className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-white text-sm font-bold">-1 Penalty</button>
                </div>
            </div>
        ))}
      </div>
    </div>
  );
};

export default MarkingPanel;