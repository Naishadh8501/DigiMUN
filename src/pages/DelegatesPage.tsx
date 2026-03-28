import React, { useState } from 'react';
import { useCommittee } from '@/contexts/CommitteeContext';
import { useAuth } from '@/contexts/AuthContext';
import { COUNTRIES_FLAGS } from '@/data/mockData';
import { Search, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function DelegatesPage() {
  const { delegates, refreshData } = useCommittee();
  const { isAdmin } = useAuth();
  const [search, setSearch] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const filtered = delegates.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.country.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id: string, country: string) => {
    if (!window.confirm(`Are you sure you want to permanently remove ${country}?`)) return;
    
    setIsDeleting(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
      const response = await fetch(`${apiUrl}/delegates/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success(`${country} removed successfully`);
        refreshData(); // Refresh the list instantly
      } else {
        toast.error('Failed to remove delegate');
      }
    } catch (error) {
      toast.error('An error occurred while deleting');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold tracking-tight">Delegates List</h1>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search delegates..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left font-medium text-muted-foreground p-4">Delegate</th>
                  <th className="text-left font-medium text-muted-foreground p-4">Country</th>
                  <th className="text-center font-medium text-muted-foreground p-4">Status</th>
                  
                  {isAdmin && (
                    <>
                      <th className="text-center font-medium text-muted-foreground p-4">GSL Marks</th>
                      <th className="text-center font-medium text-muted-foreground p-4">Chits Marks</th>
                      <th className="text-center font-medium text-muted-foreground p-4">Mods Marks</th>
                      <th className="text-center font-bold text-primary p-4">Total Score</th>
                      <th className="text-center font-medium text-muted-foreground p-4">Actions</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.map((d, i) => (
                  <tr key={d.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors animate-fade-in" style={{ animationDelay: `${i * 30}ms` }}>
                    <td className="p-4 font-medium">{d.name}</td>
                    <td className="p-4">
                      <span className="flex items-center gap-2">
                        <span>{COUNTRIES_FLAGS[d.country] || '🏳️'}</span>
                        {d.country}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <Badge variant={d.present ? 'default' : 'secondary'} className={d.present ? 'bg-success/15 text-success border-0' : ''}>
                        {d.present ? 'Present' : 'Absent'}
                      </Badge>
                    </td>
                    
                    {isAdmin && (
                      <>
                        <td className="p-4 text-center font-mono text-muted-foreground">{Number(d.gsl_avg || 0).toFixed(2)}</td>
                        <td className="p-4 text-center font-mono text-muted-foreground">{Number(d.chits_score || 0).toFixed(2)}</td>
                        <td className="p-4 text-center font-mono text-muted-foreground">{Number(d.mod_avg || 0).toFixed(2)}</td>
                        <td className="p-4 text-center font-mono font-bold text-primary">{Number(d.total_score || 0).toFixed(2)}</td>
                        <td className="p-4 text-center">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => handleDelete(d.id, d.country)}
                            disabled={isDeleting}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}