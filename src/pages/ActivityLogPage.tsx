import React, { useState } from 'react';
import { useCommittee } from '@/contexts/CommitteeContext';
import { Activity, Search, Mic2, Vote, MessageSquare, Gavel, Megaphone, Layers } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const typeIcons: Record<string, React.ReactNode> = {
  speech: <Mic2 className="h-3.5 w-3.5" />,
  vote: <Vote className="h-3.5 w-3.5" />,
  chit: <MessageSquare className="h-3.5 w-3.5" />,
  motion: <Gavel className="h-3.5 w-3.5" />,
  announcement: <Megaphone className="h-3.5 w-3.5" />,
  phase: <Layers className="h-3.5 w-3.5" />,
};

const typeColors: Record<string, string> = {
  speech: 'text-primary bg-primary/15',
  vote: 'text-success bg-success/15',
  chit: 'text-info bg-info/15',
  motion: 'text-warning bg-warning/15',
  announcement: 'text-destructive bg-destructive/15',
  phase: 'text-foreground bg-muted',
};

export default function ActivityLogPage() {
  const { activityLog } = useCommittee();
  const [search, setSearch] = useState('');

  const filtered = activityLog.filter(e =>
    e.description.toLowerCase().includes(search.toLowerCase()) ||
    e.actor.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold tracking-tight">Activity Log</h1>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search activity..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {filtered.map((entry, i) => (
              <div key={entry.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors animate-fade-in" style={{ animationDelay: `${i * 40}ms` }}>
                <div className={`p-1.5 rounded-md ${typeColors[entry.type]}`}>
                  {typeIcons[entry.type]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{entry.description}</p>
                  <p className="text-xs text-muted-foreground">{entry.actor}</p>
                </div>
                <span className="text-xs text-muted-foreground font-mono shrink-0">{entry.timestamp}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
