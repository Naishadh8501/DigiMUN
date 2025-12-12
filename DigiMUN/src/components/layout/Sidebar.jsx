import React from 'react';
import { Mic2, Vote, MessageSquare, Briefcase, X } from 'lucide-react';
import SetupPanel from '../dashboard/SetupPanel';

const Sidebar = ({ isOpen, setIsOpen, currentView, setView, isChair, userDelegate }) => {
  return (
    <div className={`fixed inset-y-0 left-0 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0 transition-transform duration-300 w-64 bg-gray-800 p-4 flex flex-col z-40 lg:flex-shrink-0`}>
       <div className='flex justify-between items-center mb-6'>
          <h1 className="text-3xl font-extrabold text-yellow-400">MUN Digital</h1>
          <button onClick={() => setIsOpen(false)} className="lg:hidden text-gray-400"><X /></button>
       </div>

       {userDelegate && (
         <>
           <SetupPanel />
           <nav className="mt-8 space-y-2 flex-1">
              <NavButton icon={Mic2} label="Debate" active={currentView === 'speakers'} onClick={() => setView('speakers')} />
              <NavButton icon={Vote} label="Voting" active={currentView === 'voting'} onClick={() => setView('voting')} />
              <NavButton icon={MessageSquare} label="Chits" active={currentView === 'chits'} onClick={() => setView('chits')} />
              {isChair && (
                <NavButton icon={Briefcase} label="Marking" active={currentView === 'marking'} onClick={() => setView('marking')} />
              )}
           </nav>
         </>
       )}
    </div>
  );
};

const NavButton = ({ icon: Icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full text-left flex items-center p-3 rounded-lg font-medium transition ${active ? 'bg-yellow-600 text-gray-900' : 'text-gray-300 hover:bg-gray-700'}`}
  >
    <Icon className="mr-3 h-5 w-5" /> {label}
  </button>
);

export default Sidebar;