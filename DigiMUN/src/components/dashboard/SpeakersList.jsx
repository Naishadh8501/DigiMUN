import React, { useState, useEffect } from 'react';
import { Mic2, Clock, Play, Pause, XCircle, Plus, X, Zap } from 'lucide-react';
import { useSession } from '../../context/SessionContext';
import { useAuth } from '../../context/AuthContext';
import { sessionService } from '../../services/api';

const formatTime = (seconds) => {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min}:${sec < 10 ? '0' : ''}${sec}`;
};

const SpeakersList = () => {
  const { session, refreshSession } = useSession();
  const { user } = useAuth();
  
  const userDelegate = session?.delegates?.[user?.uid];
  const isChair = userDelegate?.role === 'chair';
  const list = session?.speakersList || [];
  const currentSpeaker = list.find(s => s.isSpeaking);
  
  // Local timer state - Note: In a real app, sync start timestamp with server to avoid drift
  const [timer, setTimer] = useState(currentSpeaker?.timeRemaining || 0);

  useEffect(() => {
    setTimer(currentSpeaker?.timeRemaining || 0);
  }, [currentSpeaker?.userId]);

  useEffect(() => {
    let interval;
    if (currentSpeaker && timer > 0) {
      interval = setInterval(() => setTimer(t => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [currentSpeaker, timer]);

  const handleChairAction = async (action, speakerId) => {
    // You would map these to specific API endpoints
    let updatedList = [...list];
    
    if (action === 'start') {
      updatedList = updatedList.map(s => ({
        ...s,
        isSpeaking: s.userId === speakerId,
        timeRemaining: session.sessionConfig.gslTime
      }));
    } else if (action === 'end') {
      updatedList = updatedList.filter(s => s.userId !== currentSpeaker?.userId);
    }

    await sessionService.updateSpeakersList(updatedList);
    refreshSession();
  };

  const toggleGSL = async () => {
    const inList = list.some(s => s.userId === user.uid);
    let updatedList = [...list];

    if (inList) {
       updatedList = list.filter(s => s.userId !== user.uid);
    } else {
       updatedList.push({
         userId: user.uid,
         country: userDelegate.country,
         timeRemaining: session.sessionConfig.gslTime,
         isSpeaking: false
       });
    }
    await sessionService.updateSpeakersList(updatedList);
    refreshSession();
  };

  return (
    <div className="bg-gray-800 p-6 rounded-xl shadow-2xl h-full overflow-y-auto">
      <h2 className="text-3xl font-extrabold text-white mb-4 flex items-center">
        <Mic2 className="mr-2 h-6 w-6 text-yellow-400" /> 
        Debate: <span className='text-yellow-400 ml-2 capitalize'>{session?.state}</span>
      </h2>
      
      {/* Current Speaker */}
      <div className="mb-8 border border-yellow-500 rounded-lg p-4 bg-yellow-900/30">
        <h3 className="text-xl font-bold text-yellow-400 mb-3 flex items-center"><Zap className="mr-2" /> Current Speaker</h3>
        {currentSpeaker ? (
          <div className="flex justify-between items-center">
            <p className="text-2xl font-extrabold text-white">{currentSpeaker.country}</p>
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-yellow-400" />
              <span className="text-3xl font-mono text-yellow-400">{formatTime(timer)}</span>
              {isChair && (
                 <button onClick={() => handleChairAction('end')} className="ml-4 p-2 bg-red-600 rounded-full text-white">
                   <XCircle className="h-5 w-5" />
                 </button>
              )}
            </div>
          </div>
        ) : (
          <p className="text-gray-400 italic">The floor is open.</p>
        )}
      </div>

      {/* Controls */}
      {!isChair && userDelegate && (
        <button 
          onClick={toggleGSL}
          className={`px-4 py-2 w-full font-semibold rounded-lg mb-6 flex items-center justify-center gap-2 ${list.some(s => s.userId === user.uid) ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
        >
          {list.some(s => s.userId === user.uid) ? <><X className="w-4 h-4"/> Remove from GSL</> : <><Plus className="w-4 h-4"/> Add to GSL</>}
        </button>
      )}

      {/* Queue */}
      <div className="space-y-2">
        {list.filter(s => !s.isSpeaking).map((s, idx) => (
           <div key={s.userId} className="flex justify-between items-center p-3 bg-gray-700 rounded-lg">
              <span className="text-lg text-white">{idx + 1}. {s.country}</span>
              {isChair && (
                 <button onClick={() => handleChairAction('start', s.userId)} className="p-1 bg-blue-600 rounded-full text-white">
                    <Mic2 className="h-4 w-4" />
                 </button>
              )}
           </div>
        ))}
      </div>
    </div>
  );
};

export default SpeakersList;