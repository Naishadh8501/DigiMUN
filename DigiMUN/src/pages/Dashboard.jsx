import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSession } from '../context/SessionContext';
import Sidebar from '../components/layout/Sidebar';
import SpeakersList from '../components/dashboard/SpeakersList';
import ChatPanel from '../components/dashboard/ChatPanel';
import SetupPanel from '../components/dashboard/SetupPanel';
import VotingPanel from '../components/dashboard/VotingPanel';
import ChitPanel from '../components/dashboard/ChitPanel';
import MarkingPanel from '../components/dashboard/MarkingPanel';

const Dashboard = () => {
  const { user } = useAuth();
  const { session, loading } = useSession();
  const [view, setView] = useState('speakers');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (loading) return <div className="text-white bg-gray-900 h-screen flex items-center justify-center">Loading...</div>;

  const userDelegate = session?.delegates?.[user?.uid];
  const isChair = userDelegate?.role === 'chair';

  const renderContent = () => {
    if (!userDelegate) return <SetupPanel />;
    
    switch(view) {
        case 'speakers': return <SpeakersList />;
        case 'voting': return <VotingPanel />;
        case 'chat': return <ChatPanel />; 
        case 'chits': return <ChitPanel />;
        case 'marking': return isChair ? <MarkingPanel /> : <div className="p-10 text-center text-gray-400">Restricted Area</div>;
        default: return <SpeakersList />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans flex flex-col lg:flex-row">
       <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-yellow-600 rounded-full">
         <Menu className="h-6 w-6" />
       </button>

       <Sidebar 
          isOpen={isSidebarOpen} 
          setIsOpen={setIsSidebarOpen} 
          currentView={view} 
          setView={setView} 
          isChair={isChair} 
          userDelegate={userDelegate}
        />

       <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full pt-16 lg:pt-0">
             <div className="lg:col-span-2">
                {renderContent()}
             </div>
             <div className="lg:col-span-1 h-[60vh] lg:h-full">
                <ChatPanel />
             </div>
          </div>
       </main>
    </div>
  );
};

export default Dashboard;