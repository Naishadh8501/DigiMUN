import React, { useState, useEffect } from 'react';
import { useCommittee } from '@/contexts/CommitteeContext';
import { useAuth } from '@/contexts/AuthContext';
import { RUBRIC_CATEGORIES, COUNTRIES_FLAGS } from '@/data/mockData';
import { Shield, Download, Megaphone, Send, UserPlus, KeyRound } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip,
} from 'recharts';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001/api';

export default function AdminPanel() {
  const { isAdmin } = useAuth();
  const { delegates, updateDelegateScore, addAnnouncement } = useCommittee();
  const [selectedDelegates, setSelectedDelegates] = useState<string[]>([]);

  // Announcement State
  const [announceMsg, setAnnounceMsg] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);

  // Account Management State
  const [newDelName, setNewDelName] = useState('');
  const [newDelCountry, setNewDelCountry] = useState('');
  const [newDelPassword, setNewDelPassword] = useState('mun2026');
  const [resetPasswords, setResetPasswords] = useState<Record<string, string>>({});

  useEffect(() => {
    if (selectedDelegates.length === 0 && delegates.length > 0) {
      setSelectedDelegates([delegates[0]?.id, delegates[1]?.id].filter(Boolean));
    }
  }, [delegates, selectedDelegates.length]);

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-muted-foreground">Admin access required</p>
        </div>
      </div>
    );
  }

  const getTotal = (scores: Record<string, number> | undefined | null) =>
    Object.values(scores || {}).reduce((a, b) => a + b, 0);

  const ranked = [...delegates].sort((a, b) => (d => d.total_score || getTotal(d.scores))(b) - (d => d.total_score || getTotal(d.scores))(a));

  const radarData = RUBRIC_CATEGORIES.map(cat => {
    const entry: Record<string, unknown> = { category: cat.label, max: cat.max };
    selectedDelegates.forEach(id => {
      const d = delegates.find(del => del.id === id);
      if (d) entry[d.country] = (d.scores || {})[cat.key] || 0;
    });
    return entry;
  });

  const colors = ['hsl(230, 70%, 55%)', 'hsl(42, 92%, 50%)', 'hsl(152, 60%, 42%)', 'hsl(0, 72%, 51%)'];

  const toggleDelegate = (id: string) => {
    setSelectedDelegates(prev =>
      prev.includes(id) ? prev.filter(d => d !== id) : prev.length < 4 ? [...prev, id] : prev
    );
  };

  const handleExport = () => {
    let csv = 'Delegate,Country,' + RUBRIC_CATEGORIES.map(c => c.label).join(',') + ',Total\n';
    ranked.forEach(d => {
      csv += `"${d.name}","${d.country}",` + RUBRIC_CATEGORIES.map(c => (d.scores || {})[c.key] || 0).join(',') + `,${d.total_score || getTotal(d.scores)}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'digimun-marksheet.csv';
    a.click();
  };

  const handleSendAnnouncement = () => {
    if (!announceMsg.trim()) return;
    addAnnouncement({
      id: `a${Date.now()}`,
      message: announceMsg.trim(),
      urgent: isUrgent,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
    setAnnounceMsg('');
    setIsUrgent(false);
    toast.success('Announcement broadcasted to all delegates!');
  };

  const handleCreateDelegate = async () => {
    if (!newDelName.trim() || !newDelCountry.trim() || !newDelPassword.trim()) {
      toast.error("Please fill in all fields to create an account.");
      return;
    }
    
    try {
      const res = await fetch(`${API_URL}/delegates/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: `del_${Date.now()}`,
          name: newDelName.trim(),
          country: newDelCountry.trim(),
          password: newDelPassword.trim(),
          present: true,
          speeches: 0,
          scores: {}
        })
      });
      
      if (res.ok) {
        toast.success(`Account created for ${newDelCountry}!`);
        setNewDelName('');
        setNewDelCountry('');
        setNewDelPassword('mun2026');
      } else {
        const err = await res.json();
        toast.error(err.detail || "Failed to create delegate");
      }
    } catch (e) {
      toast.error("Network error while creating delegate");
    }
  };

  const handleUpdatePassword = async (id: string, country: string) => {
    const newPass = resetPasswords[id];
    if (!newPass || !newPass.trim()) {
      toast.error("Please enter a new password first.");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/auth/delegate/${id}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_password: newPass.trim() })
      });

      if (res.ok) {
        toast.success(`Password updated for ${country}!`);
        setResetPasswords(prev => ({ ...prev, [id]: '' }));
      } else {
        toast.error("Failed to update password.");
      }
    } catch (e) {
      toast.error("Network error while updating password.");
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold tracking-tight">Admin Panel</h1>
        <Button variant="outline" onClick={handleExport}>
          <Download className="h-4 w-4 mr-1.5" /> Export CSV
        </Button>
      </div>

      <Tabs defaultValue="marksheet">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="marksheet">Marksheet</TabsTrigger>
          <TabsTrigger value="radar">Radar Chart</TabsTrigger>
          <TabsTrigger value="rankings">Rankings</TabsTrigger>
          <TabsTrigger value="announcements">Announcements</TabsTrigger>
          <TabsTrigger value="accounts" className="text-primary">Account Management</TabsTrigger>
        </TabsList>

        <TabsContent value="marksheet" className="mt-4">
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left font-medium text-muted-foreground p-3 sticky left-0 bg-card z-10">Delegate</th>
                    {RUBRIC_CATEGORIES.map(c => (
                      <th key={c.key} className="text-center font-medium text-muted-foreground p-3 whitespace-nowrap">
                        {c.label}<br /><span className="text-[10px] font-normal">/{c.max}</span>
                      </th>
                    ))}
                    <th className="text-center font-medium text-muted-foreground p-3">Total<br /><span className="text-[10px] font-normal">/100</span></th>
                  </tr>
                </thead>
                <tbody>
                  {delegates.map(d => (
                    <tr key={d.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="p-3 sticky left-0 bg-card z-10">
                        <div className="flex items-center gap-2">
                          <span>{COUNTRIES_FLAGS[d.country] || '🏳️'}</span>
                          <div>
                            <div className="font-medium text-xs">{d.name}</div>
                            <div className="text-[10px] text-muted-foreground">{d.country}</div>
                          </div>
                        </div>
                      </td>
                      {RUBRIC_CATEGORIES.map(c => {
                        const currentScore = (d.scores || {})[c.key] || 0;
                        return (
                          <td key={c.key} className="p-2 text-center">
                            <Input
                              key={`${d.id}-${c.key}-${currentScore}`}
                              type="number"
                              min={0}
                              max={c.max}
                              defaultValue={currentScore}
                              onBlur={e => {
                                const val = Math.min(c.max, Math.max(0, parseInt(e.target.value) || 0));
                                if (val !== currentScore) {
                                  updateDelegateScore(d.id, c.key, val);
                                }
                              }}
                              className="w-14 h-8 text-center text-xs font-mono mx-auto"
                            />
                          </td>
                        );
                      })}
                      <td className="p-3 text-center font-heading font-bold">{d.total_score || getTotal(d.scores)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="radar" className="mt-4">
          <div className="grid lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardContent className="p-4">
                <ResponsiveContainer width="100%" height={400}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="category" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 20]} tick={{ fontSize: 10 }} />
                    {selectedDelegates.map((id, i) => {
                      const d = delegates.find(del => del.id === id);
                      if (!d) return null;
                      return (
                        <Radar
                          key={id}
                          name={d.country}
                          dataKey={d.country}
                          stroke={colors[i]}
                          fill={colors[i]}
                          fillOpacity={0.15}
                        />
                      );
                    })}
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="font-heading text-sm">Compare Delegates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {delegates.map(d => (
                  <button
                    key={d.id}
                    onClick={() => toggleDelegate(d.id)}
                    className={`w-full flex items-center gap-2 p-2 rounded-lg text-sm transition-colors ${
                      selectedDelegates.includes(d.id) ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted/50'
                    }`}
                  >
                    <span>{COUNTRIES_FLAGS[d.country] || '🏳️'}</span>
                    <span className="truncate">{d.country}</span>
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="rankings" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {ranked.map((d, i) => (
                  <div key={d.id} className="flex items-center gap-4 px-5 py-3.5 animate-fade-in" style={{ animationDelay: `${i * 40}ms` }}>
                    <span className={`font-heading font-bold text-lg w-8 text-center ${i < 3 ? 'text-accent' : 'text-muted-foreground'}`}>
                      {i + 1}
                    </span>
                    <span className="text-xl">{COUNTRIES_FLAGS[d.country] || '🏳️'}</span>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{d.name}</div>
                      <div className="text-xs text-muted-foreground">{d.country}</div>
                    </div>
                    <span className="font-heading font-bold text-lg">{d.total_score || getTotal(d.scores)}</span>
                    <span className="text-xs text-muted-foreground">/100</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="announcements" className="mt-4">
          <Card className="max-w-3xl">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="font-heading text-lg flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-primary" /> Broadcast Global Announcement
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <Textarea 
                placeholder="Type your official announcement here. It will instantly appear on all delegate dashboards..."
                value={announceMsg}
                onChange={(e) => setAnnounceMsg(e.target.value)}
                rows={5}
                className="resize-none"
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 bg-muted/30 p-2 rounded-md border border-border">
                  <Checkbox 
                    id="urgent-flag" 
                    checked={isUrgent} 
                    onCheckedChange={(checked) => setIsUrgent(checked as boolean)} 
                  />
                  <label htmlFor="urgent-flag" className="text-sm font-medium leading-none cursor-pointer text-destructive select-none">
                    Mark as URGENT (Red High-Alert)
                  </label>
                </div>
                <Button onClick={handleSendAnnouncement} disabled={!announceMsg.trim()} size="lg">
                  <Send className="h-4 w-4 mr-2" /> Broadcast Now
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* NEW ACCOUNT MANAGEMENT TAB */}
        <TabsContent value="accounts" className="mt-4">
          <div className="grid lg:grid-cols-3 gap-6">
            
            {/* Create Account Form */}
            <Card className="lg:col-span-1 h-fit">
              <CardHeader className="pb-3">
                <CardTitle className="font-heading text-lg flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-primary" /> Create Delegate
                </CardTitle>
                <CardDescription>Manually add late delegates</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Country / Delegation</label>
                  <Input placeholder="e.g., France" value={newDelCountry} onChange={e => setNewDelCountry(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Delegate Name</label>
                  <Input placeholder="e.g., Jane Doe" value={newDelName} onChange={e => setNewDelName(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Initial Password</label>
                  <Input value={newDelPassword} onChange={e => setNewDelPassword(e.target.value)} />
                </div>
                <Button className="w-full" onClick={handleCreateDelegate}>Create Account</Button>
              </CardContent>
            </Card>

            {/* Password Reset List */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3 border-b border-border/50">
                <CardTitle className="font-heading text-lg flex items-center gap-2">
                  <KeyRound className="h-5 w-5 text-primary" /> Manage Passwords
                </CardTitle>
                <CardDescription>Reset passwords for existing delegates</CardDescription>
              </CardHeader>
              <CardContent className="p-0 max-h-[500px] overflow-y-auto">
                <div className="divide-y divide-border">
                  {delegates.map(d => (
                    <div key={d.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{COUNTRIES_FLAGS[d.country] || '🏳️'}</span>
                        <div>
                          <div className="font-medium text-sm">{d.country}</div>
                          <div className="text-xs text-muted-foreground">{d.name}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input 
                          placeholder="New Password" 
                          type="text"
                          className="w-32 h-8 text-xs"
                          value={resetPasswords[d.id] || ''}
                          onChange={e => setResetPasswords(prev => ({ ...prev, [d.id]: e.target.value }))}
                        />
                        <Button 
                          size="sm" 
                          variant="secondary" 
                          className="h-8 text-xs"
                          onClick={() => handleUpdatePassword(d.id, d.country)}
                        >
                          Update
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

          </div>
        </TabsContent>

      </Tabs>
    </div>
  );
}