import React, { useState, useEffect } from 'react';
import { Mail, Send, Eye } from 'lucide-react';
import { useSession } from '../../context/SessionContext';
import { useAuth } from '../../context/AuthContext';
import { sessionService } from '../../services/api';

const ChitPanel = () => {
  const { session, refreshSession } = useSession();
  const { user } = useAuth();
  
  const [toUser, setToUser] = useState(''); // 'chair' or userId
  const [message, setMessage] = useState('');
  // --- NEW STATES ---
  const [isViaEb, setIsViaEb] = useState(false);
  const [tag, setTag] = useState('General'); // General, Question, Reply
  
  const userDelegate = session?.delegates?.[user?.uid];
  const isChair = session?.chairUserId === user.uid; // Check if current user is Chair

  // --- FILTERING LOGIC ---
  const myChits = (session?.chits || []).filter(c => {
    const isParticipant = c.toUserId === user.uid || c.fromUserId === user.uid;
    // If I am Chair, I see chits involving me OR marked 'Via EB'
    const isEbVisible = c.isViaEb && isChair;
    return isParticipant || isEbVisible;
  }).sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp));

  const handleSend = async () => {
    if (!message || !toUser) return;
    
    let recipientName = "Chair";
    let recipientId = session.chairUserId;

    if (toUser !== 'chair') {
        const del = session.delegates[toUser];
        recipientName = del.country;
        recipientId = toUser;
    }

    await sessionService.sendChit({
        fromUserId: user.uid,
        toUserId: recipientId,
        fromCountry: userDelegate.country,
        toCountry: recipientName,
        message,
        isViaEb, // Send new field
        tag      // Send new field
    });
    
    setMessage('');
    setIsViaEb(false); // Reset
    setTag('General'); // Reset
    refreshSession();
  };

  return (
    <div className="bg-gray-800 p-6 rounded-xl shadow-2xl h-full flex flex-col">
      <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
        <Mail className="mr-2 text-yellow-400" /> Chit System
      </h2>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4 p-2 bg-gray-900/50 rounded-lg">
        {myChits.length === 0 && <p className="text-gray-500 text-center mt-10">No chits yet.</p>}
        {myChits.map((chit) => {
            const isMe = chit.fromUserId === user.uid;
            return (
                <div key={chit.id} className={`p-3 rounded-lg max-w-[90%] relative ${isMe ? 'ml-auto bg-yellow-900/50 border-l-4 border-yellow-500' : 'mr-auto bg-gray-700 border-l-4 border-blue-500'}`}>
                    
                    {/* Tags & Via EB Indicators */}
                    <div className="flex gap-2 mb-2">
                        {chit.isViaEb && (
                            <span className="bg-red-600 text-white text-[10px] px-2 py-0.5 rounded flex items-center">
                                <Eye className="w-3 h-3 mr-1"/> Via EB
                            </span>
                        )}
                        {chit.tag !== 'General' && (
                            <span className={`text-[10px] px-2 py-0.5 rounded text-white ${chit.tag === 'Question' ? 'bg-blue-600' : 'bg-green-600'}`}>
                                {chit.tag}
                            </span>
                        )}
                    </div>

                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span className="font-bold text-white">
                            {isMe ? `To: ${chit.toCountry}` : `From: ${chit.fromCountry}`}
                        </span>
                        <span>{new Date(chit.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                    <p className="text-white">{chit.message}</p>
                </div>
            );
        })}
      </div>

      {/* Compose Area */}
      <div className="space-y-3 bg-gray-700 p-3 rounded-lg">
        <div className="flex gap-2">
            <select 
                className="flex-1 bg-gray-900 text-white p-2 rounded border border-gray-600"
                value={toUser}
                onChange={(e) => setToUser(e.target.value)}
            >
                <option value="">Select Recipient...</option>
                <option value="chair" className="font-bold text-yellow-400">To Executive Board (Chair)</option>
                {Object.values(session?.delegates || {})
                    .filter(d => d.userId !== user.uid && d.role !== 'chair')
                    .map(d => (
                        <option key={d.userId} value={d.userId}>{d.country}</option>
                ))}
            </select>
            
            {/* Tag Selector */}
            <select
                className="bg-gray-900 text-white p-2 rounded border border-gray-600 w-32"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
            >
                <option value="General">General</option>
                <option value="Question">Question</option>
                <option value="Reply">Reply</option>
            </select>
        </div>

        <div className="flex gap-2 items-center">
            {/* Via EB Checkbox */}
            <label className="flex items-center gap-2 cursor-pointer bg-gray-900 px-3 py-2 rounded border border-gray-600 hover:bg-gray-800">
                <input 
                    type="checkbox" 
                    checked={isViaEb}
                    onChange={(e) => setIsViaEb(e.target.checked)}
                    className="accent-red-500 w-4 h-4"
                />
                <span className="text-xs text-gray-300 font-bold select-none">Via EB</span>
            </label>

            <input 
                className="flex-1 bg-gray-900 text-white p-2 rounded border border-gray-600"
                placeholder="Type message..."
                value={message}
                onChange={e => setMessage(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
            />
            <button onClick={handleSend} className="bg-yellow-600 hover:bg-yellow-700 p-2 rounded text-gray-900">
                <Send className="w-5 h-5" />
            </button>
        </div>
      </div>
    </div>
  );
};

export default ChitPanel;