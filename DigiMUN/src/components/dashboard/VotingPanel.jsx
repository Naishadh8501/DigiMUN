import React, { useState } from 'react';
import { Vote, PieChart } from 'lucide-react';
import { useSession } from '../../context/SessionContext';
import { useAuth } from '../../context/AuthContext';
import { sessionService } from '../../services/api';

const VotingPanel = () => {
  const { session, refreshSession } = useSession();
  const { user } = useAuth();
  
  // Local state for Chair creating a vote
  const [topic, setTopic] = useState('');
  const [type, setType] = useState('procedural');
  const [options, setOptions] = useState('Yes,No,Abstain');

  const userDelegate = session?.delegates?.[user?.uid];
  const isChair = userDelegate?.role === 'chair';
  const voteData = session?.voteData || { active: false };
  const hasVoted = voteData.voters?.includes(user?.uid);

  const startVote = async () => {
    await sessionService.startVote({
      topic,
      type,
      options: options.split(',').map(o => o.trim())
    });
    refreshSession();
  };

  const castVote = async (option) => {
    try {
      await sessionService.castVote({ userId: user.uid, vote: option });
      refreshSession();
    } catch (e) {
      alert("Vote failed or already cast.");
    }
  };

  const endVote = async () => {
    await sessionService.endVote();
    refreshSession();
  };

  return (
    <div className="bg-gray-800 p-6 rounded-xl shadow-2xl h-full">
      <h2 className="text-3xl font-extrabold text-white mb-6 flex items-center">
        <Vote className="mr-2 text-purple-400" /> Voting Floor
      </h2>

      {/* ACTIVE VOTE VIEW */}
      {voteData.active ? (
        <div className="space-y-6">
          <div className="bg-purple-900/30 p-4 rounded-lg border border-purple-500">
            <h3 className="text-xl font-bold text-white mb-1">Current Motion:</h3>
            <p className="text-2xl text-purple-300 font-serif italic">"{voteData.topic}"</p>
            <span className="text-xs uppercase tracking-widest text-gray-400 mt-2 block">{voteData.type} Vote</span>
          </div>

          {!hasVoted && !isChair ? (
            <div className="grid grid-cols-2 gap-4 mt-6">
              {voteData.options.map(opt => (
                <button
                  key={opt}
                  onClick={() => castVote(opt)}
                  className="p-4 bg-gray-700 hover:bg-purple-600 text-white font-bold rounded-lg transition transform hover:scale-105"
                >
                  {opt}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-700/50 rounded-lg">
              <PieChart className="mx-auto h-12 w-12 text-gray-500 mb-2" />
              <p className="text-gray-300">
                {isChair ? "Delegates are voting..." : "Vote Submitted. Waiting for results..."}
              </p>
            </div>
          )}

          {/* RESULTS (Visible to Chair or after logic change) */}
          <div className="mt-8">
            <h4 className="font-bold text-gray-400 mb-2">Live Tally (Total: {voteData.totalVotes})</h4>
            <div className="space-y-2">
              {Object.entries(voteData.results || {}).map(([opt, count]) => (
                <div key={opt} className="flex items-center justify-between text-sm">
                  <span className="text-white w-20">{opt}</span>
                  <div className="flex-1 mx-2 h-4 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-purple-500" 
                      style={{ width: `${voteData.totalVotes ? (count / voteData.totalVotes) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-gray-300">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {isChair && (
            <button onClick={endVote} className="w-full mt-6 bg-red-600 hover:bg-red-700 text-white p-3 rounded-lg font-bold">
              End Voting Session
            </button>
          )}
        </div>
      ) : (
        /* IDLE VIEW (Create Vote) */
        isChair ? (
          <div className="bg-gray-700 p-4 rounded-lg">
            <h3 className="text-lg font-bold text-white mb-4">Open a New Motion</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400">Motion Topic</label>
                <input 
                  className="w-full bg-gray-900 text-white p-2 rounded border border-gray-600" 
                  value={topic} 
                  onChange={e => setTopic(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400">Type</label>
                <select 
                  className="w-full bg-gray-900 text-white p-2 rounded border border-gray-600"
                  value={type}
                  onChange={e => setType(e.target.value)}
                >
                  <option value="procedural">Procedural (All vote)</option>
                  <option value="substantive">Substantive (Yes/No/Abs)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400">Options (comma separated)</label>
                <input 
                  className="w-full bg-gray-900 text-white p-2 rounded border border-gray-600" 
                  value={options} 
                  onChange={e => setOptions(e.target.value)}
                />
              </div>
              <button 
                onClick={startVote}
                className="w-full bg-green-600 hover:bg-green-700 text-white p-2 rounded font-bold"
              >
                Start Vote
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <Vote className="h-16 w-16 mb-4 opacity-50" />
            <p>No active voting session.</p>
          </div>
        )
      )}
    </div>
  );
};

export default VotingPanel;