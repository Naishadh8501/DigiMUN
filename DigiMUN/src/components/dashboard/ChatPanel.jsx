import React, { useState, useRef, useEffect } from 'react';
import { Send, AlertCircle, Info, HelpCircle } from 'lucide-react';
import { useSession } from '../../context/SessionContext';
import { useAuth } from '../../context/AuthContext';
import { sessionService } from '../../services/api';

const ChatPanel = () => {
  const { session, refreshSession } = useSession();
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [msgType, setMsgType] = useState('chat'); // chat, point_order, point_info, point_priv
  const chatEndRef = useRef(null);
  
  const userDelegate = session?.delegates?.[user?.uid];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session?.chatLog]);

  const handleSend = async () => {
    if (!message.trim()) return;
    
    await sessionService.sendMessage({
      userId: user.uid,
      country: userDelegate.country,
      message,
      type: msgType
    });
    
    setMessage('');
    setMsgType('chat'); // Reset to default
    refreshSession();
  };

  const getStyle = (type) => {
      switch(type) {
          case 'point_order': return 'bg-red-900/50 border-red-500 border-l-4';
          case 'point_info': return 'bg-blue-900/50 border-blue-500 border-l-4';
          case 'point_priv': return 'bg-yellow-900/50 border-yellow-500 border-l-4';
          case 'motion': return 'bg-purple-900/50 border-purple-500 border-l-4';
          default: return 'bg-gray-600';
      }
  };

  return (
    <div className="flex flex-col h-full bg-gray-700 rounded-xl shadow-2xl">
      <div className="p-4 border-b border-gray-600 bg-gray-800 rounded-t-xl">
        <h3 className="text-xl font-bold text-white flex items-center">
          <Send className="mr-2 h-5 w-5 text-blue-400"/> Floor Feed
        </h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {(session?.chatLog || []).map((chat) => (
          <div key={chat.id} className={`p-2 rounded-lg max-w-[95%] ${chat.userId === user.uid ? 'ml-auto bg-blue-600' : getStyle(chat.type)} text-white`}>
             <p className="text-xs font-bold mb-1 opacity-70 flex justify-between">
                <span>{chat.country}</span>
                {chat.type !== 'chat' && <span className="uppercase text-[10px] bg-white/20 px-1 rounded">{chat.type.replace('_', ' ')}</span>}
             </p>
             <p>{chat.message}</p>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      <div className="p-4 border-t border-gray-600 space-y-2 bg-gray-800 rounded-b-xl">
         <select 
            value={msgType}
            onChange={(e) => setMsgType(e.target.value)}
            className="w-full bg-gray-700 text-xs text-white p-1 rounded border border-gray-600"
         >
             <option value="chat">General Message</option>
             <option value="motion">Motion</option>
             <option value="point_order">Point of Order (Rules Violation)</option>
             <option value="point_info">Point of Information (Question)</option>
             <option value="point_priv">Point of Personal Privilege</option>
         </select>
         <div className="flex">
            <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-l-lg outline-none border border-gray-600"
            placeholder={msgType === 'chat' ? "Type a message..." : "State your point..."}
            />
            <button onClick={handleSend} className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-r-lg">
                <Send className="h-5 w-5" />
            </button>
         </div>
      </div>
    </div>
  );
};

export default ChatPanel;