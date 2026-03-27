import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCommittee } from '@/contexts/CommitteeContext';
import { useTheme } from '@/contexts/ThemeContext';
import {
  LayoutDashboard, Users, Mic2, Scale, Vote, MessageSquare, FileText,
  ClipboardList, Activity, Shield, Sun, Moon, LogOut, Gavel,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
// IMPORT FIX: Added TooltipProvider here
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

const PHASE_LABELS: Record<string, string> = {
  'debate': 'General Debate',
  'moderated-caucus': 'Mod. Caucus',
  'unmoderated-caucus': 'Unmod. Caucus',
  'voting': 'Voting',
};

const PHASE_CLASSES: Record<string, string> = {
  'debate': 'phase-badge-debate',
  'moderated-caucus': 'phase-badge-mod',
  'unmoderated-caucus': 'phase-badge-unmod',
  'voting': 'phase-badge-voting',
};

interface NavItem {
  to: string;
  icon: React.ReactNode;
  label: string;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { to: '/', icon: <LayoutDashboard className="h-4 w-4" />, label: 'Dashboard' },
  { to: '/delegates', icon: <Users className="h-4 w-4" />, label: 'Delegates' },
  { to: '/speakers', icon: <Mic2 className="h-4 w-4" />, label: 'Speakers List' },
  { to: '/motions', icon: <Gavel className="h-4 w-4" />, label: 'Motions & Points' },
  { to: '/voting', icon: <Vote className="h-4 w-4" />, label: 'Voting' },
  { to: '/echit', icon: <MessageSquare className="h-4 w-4" />, label: 'E-Chit' },
  { to: '/resolutions', icon: <FileText className="h-4 w-4" />, label: 'Resolutions' },
  { to: '/verbatim', icon: <ClipboardList className="h-4 w-4" />, label: 'Verbatim' },
  { to: '/activity', icon: <Activity className="h-4 w-4" />, label: 'Activity Log' },
  { to: '/admin', icon: <Shield className="h-4 w-4" />, label: 'Admin Panel', adminOnly: true },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { role, userName, logout, isAdmin } = useAuth();
  const { phase, timerSeconds, timerRunning } = useCommittee();
  const { theme, toggle } = useTheme();
  const location = useLocation();
  const [collapsed, setCollapsed] = React.useState(false);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const filteredNav = navItems.filter(n => !n.adminOnly || isAdmin);

  return (
    // IMPLEMENTATION FIX: Wrapped the entire layout in TooltipProvider
    <TooltipProvider>
      <div className="min-h-screen flex bg-background">
        {/* Sidebar */}
        <aside className={`flex flex-col border-r border-border bg-card transition-all duration-300 ${collapsed ? 'w-16' : 'w-60'}`}>
          <div className="p-4 border-b border-border">
            <button onClick={() => setCollapsed(!collapsed)} className="flex items-center gap-2 w-full">
              {/* LOGO INTEGRATION */}
              <img src="/logo.png" alt="DigiMUN Logo" className="h-8 w-8 object-contain shrink-0" />
              {!collapsed && <span className="font-heading font-bold text-sm truncate">DigiMUN</span>}
            </button>
          </div>

          <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
            {filteredNav.map(item => {
              const active = location.pathname === item.to;
              return (
                <Tooltip key={item.to} delayDuration={collapsed ? 100 : 1000}>
                  <TooltipTrigger asChild>
                    <Link
                      to={item.to}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
                        active
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      }`}
                    >
                      {item.icon}
                      {!collapsed && <span>{item.label}</span>}
                    </Link>
                  </TooltipTrigger>
                  {collapsed && <TooltipContent side="right">{item.label}</TooltipContent>}
                </Tooltip>
              );
            })}
          </nav>

          <div className="p-3 border-t border-border space-y-2">
            <button onClick={toggle} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 w-full transition-colors">
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {!collapsed && <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
            </button>
            <button onClick={logout} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 w-full transition-colors">
              <LogOut className="h-4 w-4" />
              {!collapsed && <span>Logout</span>}
            </button>
          </div>
        </aside>

        {/* Main */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar */}
          <header className="h-14 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-6 shrink-0">
            <div className="flex items-center gap-3">
              <span className={`phase-badge ${PHASE_CLASSES[phase]}`}>
                {PHASE_LABELS[phase]}
              </span>
              <div className={`font-mono text-sm font-medium ${timerRunning ? 'text-primary timer-active' : 'text-muted-foreground'} px-2 py-1 rounded-md bg-muted/50`}>
                {formatTime(timerSeconds)}
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-muted-foreground">{userName}</span>
              <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-medium capitalize">{role}</span>
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 overflow-y-auto p-6">
            <div className="page-enter">
              {children}
            </div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}