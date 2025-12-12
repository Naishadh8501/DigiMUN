import React, { useState, useRef, useEffect } from 'react';
import { Send, CheckCircle, XCircle } from 'lucide-react';
import { useSession } from '../../context/SessionContext';
import { useAuth } from '../../context/AuthContext';
import { sessionService } from '../../services/api';

const ChatPanel = () => {
  const { session, refreshSession } = useSession();
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const chatEndRef = useRef(null);
  
  const userDelegate = session?.delegates?.[user?.uid];
  const isChair = userDelegate?.role === 'chair';

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session?.chatLog]);

  const handleSend = async () => {
    if (!message.trim()) return;

    // Detect commands locally or let backend handle logic
    const isMotion = message.toLowerCase().startsWith('motion for');
    
    await sessionService.sendMessage({
      userId: user.uid,
      country: userDelegate.country,
      message,
      isMotion
    });
    
    setMessage('');
    refreshSession();
  };

  return (
    <div className="flex flex-col h-full bg-gray-700 rounded-xl shadow-2xl">
      <div className="p-4 border-b border-gray-600">
        <h3 className="text-xl font-bold text-white flex items-center">
          <Send className="mr-2 h-5 w-5 text-blue-400"/> Committee Chat
        </h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {(session?.chatLog || []).map((chat) => (
          <div key={chat.id} className={`p-2 rounded-lg max-w-[80%] ${chat.userId === user.uid ? 'ml-auto bg-blue-600 text-white' : 'mr-auto bg-gray-600 text-white'}`}>
             <p className="text-xs font-bold mb-1 text-blue-200">{chat.country}</p>
             <p>{chat.message}</p>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      <div className="p-4 border-t border-gray-600 flex">
         <input
           type="text"
           value={message}
           onChange={(e) => setMessage(e.target.value)}
           onKeyDown={(e) => e.key === 'Enter' && handleSend()}
           className="flex-1 px-4 py-2 bg-gray-800 text-white rounded-l-lg outline-none"
           placeholder="Type a message..."
         />
         <button onClick={handleSend} className="bg-blue-600 text-white p-3 rounded-r-lg">
            <Send className="h-5 w-5" />
         </button>
      </div>
    </div>
  );
};

export default ChatPanel;