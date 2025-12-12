import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSession } from '../context/SessionContext';
import Sidebar from '../components/layout/Sidebar';
import SpeakersList from '../components/dashboard/SpeakersList';
import ChatPanel from '../components/dashboard/ChatPanel';
import SetupPanel from '../components/dashboard/SetupPanel';
import VotingPanel from '../components/dashboard/VotingPanel'; // <--- ADDED IMPORT

const Dashboard = () => {
  const { user } = useAuth();
  const { session, loading } = useSession();
  const [view, setView] = useState('speakers');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (loading) return <div className="text-white bg-gray-900 h-screen flex items-center justify-center">Loading...</div>;

  const userDelegate = session?.delegates?.[user?.uid];
  const isChair = userDelegate?.role === 'chair';

  const renderContent = () => {
    // 1. Force user to join first
    if (!userDelegate) return <SetupPanel />;
    
    // 2. Switch Main Content based on Sidebar Selection
    switch(view) {
        case 'speakers': 
            return <SpeakersList />;
        case 'voting': 
            return <VotingPanel />; // <--- ADDED CASE
        case 'chat': 
            return <ChatPanel />; 
        case 'chits':
            return <div className="p-4 text-gray-400">Chit System Coming Soon...</div>;
        case 'marking':
            return <div className="p-4 text-gray-400">Marking System Coming Soon...</div>;
        default: 
            return <SpeakersList />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans flex flex-col lg:flex-row">
       {/* Mobile Menu Toggle */}
       <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-yellow-600 rounded-full">
         <Menu className="h-6 w-6" />
       </button>

       {/* Sidebar Navigation */}
       <Sidebar 
          isOpen={isSidebarOpen} 
          setIsOpen={setIsSidebarOpen} 
          currentView={view} 
          setView={setView} 
          isChair={isChair} 
          userDelegate={userDelegate}
        />

       {/* Main Content Area */}
       <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full pt-16 lg:pt-0">
             {/* Center Panel (Switches between Debate, Vote, etc.) */}
             <div className="lg:col-span-2">
                {renderContent()}
             </div>

             {/* Right Panel (Always Chat, unless on mobile) */}
             <div className="lg:col-span-1 h-[60vh] lg:h-full">
                <ChatPanel />
             </div>
          </div>
       </main>
    </div>
  );
};

export default Dashboard;