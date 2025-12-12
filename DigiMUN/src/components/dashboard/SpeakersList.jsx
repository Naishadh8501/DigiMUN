import React, { useState, useEffect } from 'react';
import { Mic2, Clock, XCircle, Plus, X, Zap, Forward } from 'lucide-react';
import { useSession } from '../../context/SessionContext';
import { useAuth } from '../../context/AuthContext';
import { sessionService } from '../../services/api';

const SpeakersList = () => {
  const { session, refreshSession } = useSession();
  const { user } = useAuth();
  
  const userDelegate = session?.delegates?.[user?.uid];
  const isChair = userDelegate?.role === 'chair';
  const list = session?.speakersList || [];
  const currentSpeaker = list.find(s => s.isSpeaking);
  
  // Timer Logic
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (!currentSpeaker || !session?.currentSpeechStart) {
        setTimeLeft(session?.sessionConfig?.gslTime || 90);
        return;
    }

    const interval = setInterval(() => {
        const start = new Date(session.currentSpeechStart).getTime();
        const now = new Date().getTime();
        // Server is UTC, but JS Date objects handle conversions automatically if formatted right.
        // However, simple delta is safer.
        // Assuming server time and client time are reasonably synced or we rely on elapsed.
        // Better approach for simple apps:
        // Calculate seconds elapsed since start.
        
        // This relies on client clock being accurate.
        // Ideally we sync an offset, but this is usually "good enough" for MVP.
        const elapsedSeconds = Math.floor((now - start) / 1000);
        const remaining = (session.sessionConfig.gslTime) - elapsedSeconds;
        
        setTimeLeft(remaining > 0 ? remaining : 0);
    }, 1000);

    return () => clearInterval(interval);
  }, [session?.currentSpeechStart, currentSpeaker]);

  const handleChairAction = async (action, speakerId) => {
    let updatedList = [...list];
    
    if (action === 'start') {
      updatedList = updatedList.map(s => ({ ...s, isSpeaking: s.userId === speakerId }));
    } else if (action === 'end') {
      updatedList = updatedList.filter(s => s.userId !== currentSpeaker?.userId);
    }

    await sessionService.updateSpeakersList(updatedList, action); // Pass action for Timer
    refreshSession();
  };

  const handleYield = async (to) => {
      // For now, Yielding just sends a specialized chat message and ends speech
      await sessionService.sendMessage({
          userId: user.uid,
          country: userDelegate.country,
          message: `Yields to ${to}`,
          type: 'yield'
      });
      // If yielding to chair, end speech
      if (to === 'Chair') {
          // Chair must end it, or we trigger it if we trust delegates
      }
  };

  const toggleGSL = async () => {
    const inList = list.some(s => s.userId === user.uid);
    let updatedList = [...list];

    if (inList) updatedList = list.filter(s => s.userId !== user.uid);
    else updatedList.push({ userId: user.uid, country: userDelegate.country, isSpeaking: false });
    
    await sessionService.updateSpeakersList(updatedList, 'update');
    refreshSession();
  };

  return (
    <div className="bg-gray-800 p-6 rounded-xl shadow-2xl h-full overflow-y-auto">
      <h2 className="text-3xl font-extrabold text-white mb-4 flex items-center">
        <Mic2 className="mr-2 h-6 w-6 text-yellow-400" /> Debate
      </h2>
      
      {/* Current Speaker */}
      <div className={`mb-8 border rounded-lg p-4 ${currentSpeaker ? 'bg-green-900/30 border-green-500' : 'bg-gray-700/30 border-gray-600'}`}>
        <h3 className="text-xl font-bold text-gray-300 mb-3 flex items-center"><Zap className="mr-2" /> Current Speaker</h3>
        {currentSpeaker ? (
          <div>
            <div className="flex justify-between items-center mb-4">
                <p className="text-4xl font-extrabold text-white">{currentSpeaker.country}</p>
                <div className="text-right">
                    <span className={`text-5xl font-mono font-bold ${timeLeft < 10 ? 'text-red-500' : 'text-white'}`}>
                        {Math.floor(timeLeft / 60)}:{timeLeft % 60 < 10 ? '0' : ''}{timeLeft % 60}
                    </span>
                </div>
            </div>
            
            {/* YIELDS (Visible to Speaker) */}
            {user.uid === currentSpeaker.userId && (
                <div className="flex gap-2 mt-4 pt-4 border-t border-gray-600">
                    <span className="text-sm text-gray-400 self-center">Yield to:</span>
                    <button onClick={() => handleYield('Chair')} className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded text-sm">Chair</button>
                    <button onClick={() => handleYield('Questions')} className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-sm">Questions</button>
                    <button onClick={() => handleYield('Delegate')} className="px-3 py-1 bg-purple-600 hover:bg-purple-500 rounded text-sm">Delegate</button>
                </div>
            )}

            {/* CHAIR CONTROLS */}
            {isChair && (
                 <button onClick={() => handleChairAction('end')} className="w-full mt-4 py-2 bg-red-600 hover:bg-red-700 rounded font-bold text-white">
                   Stop Speaker
                 </button>
            )}
          </div>
        ) : (
          <p className="text-gray-400 italic">The floor is open.</p>
        )}
      </div>

      {/* GSL Controls */}
      {!isChair && userDelegate && (
        <button 
          onClick={toggleGSL}
          className={`px-4 py-3 w-full font-bold rounded-lg mb-6 flex items-center justify-center gap-2 ${list.some(s => s.userId === user.uid) ? 'bg-red-600/80 hover:bg-red-600' : 'bg-green-600/80 hover:bg-green-600'}`}
        >
          {list.some(s => s.userId === user.uid) ? <><X/> Remove from GSL</> : <><Plus/> Add to GSL</>}
        </button>
      )}

      {/* Queue */}
      <div className="space-y-2">
        {list.filter(s => !s.isSpeaking).map((s, idx) => (
           <div key={s.userId} className="flex justify-between items-center p-3 bg-gray-700 rounded-lg">
              <span className="text-lg text-white font-medium"><span className="text-gray-400 mr-2">{idx + 1}.</span> {s.country}</span>
              {isChair && (
                 <button onClick={() => handleChairAction('start', s.userId)} className="p-2 bg-blue-600 hover:bg-blue-500 rounded-full text-white">
                    <Mic2 className="h-4 w-4" />
                 </button>
              )}
           </div>
        ))}
        {list.length === 0 && !currentSpeaker && <div className="text-center text-gray-500 py-4">No speakers in queue.</div>}
      </div>
    </div>
  );
};

export default SpeakersList;