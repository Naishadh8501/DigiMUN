import React, { useState, useEffect } from 'react';
import { useCommittee } from '@/contexts/CommitteeContext';
import { useAuth } from '@/contexts/AuthContext';
import { COUNTRIES_FLAGS } from '@/data/mockData';
import { FileText, Upload, History, UserPlus, CheckCircle2, Clock, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

export default function VerbatimPage() {
  const { delegates, verbatims, verbatimPermissions, addVerbatim, grantVerbatimPermission, removeVerbatimPermission, activeCaucusId, motions, agenda } = useCommittee();
  const { userName, isAdmin } = useAuth();
  
  const myDelegate = delegates.find(d => d.country === userName);
  const myId = myDelegate?.id;

  // EB Special Permission State
  const [specialDel, setSpecialDel] = useState('');
  const [specialType, setSpecialType] = useState<'gsl' | 'mod_caucus'>('mod_caucus');
  const [specialTopic, setSpecialTopic] = useState('');

  // Upload States (for delegates)
  const [uploadTexts, setUploadTexts] = useState<Record<string, string>>({});

  const myPermissions = verbatimPermissions.filter(p => p.delegateId === myId);
  const activeCaucusMotion = activeCaucusId ? motions.find(m => m.id === activeCaucusId) : null;
  const passedModCaucuses = motions.filter(m => m.type === 'Moderated Caucus' && m.status === 'passed');

  // Auto-fill GSL topic with the current agenda
  useEffect(() => {
    if (specialType === 'gsl' && agenda) {
      setSpecialTopic(agenda);
    } else if (specialType === 'mod_caucus') {
      setSpecialTopic('');
    }
  }, [specialType, agenda]);

  const handleGrantSpecial = () => {
    if (specialDel && specialTopic.trim()) {
      grantVerbatimPermission({ delegateId: specialDel, type: specialType, topic: specialTopic });
      setSpecialDel('');
      setSpecialTopic(specialType === 'gsl' ? agenda : '');
    }
  };

  const handleUpload = (perm: typeof verbatimPermissions[0], index: number) => {
    const text = uploadTexts[`${perm.delegateId}-${index}`];
    if (!text?.trim() || !myId) return;

    addVerbatim({
      id: `v${Date.now()}`,
      delegate_id: myId,
      type: perm.type,
      topic: perm.topic,
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    // Remove the permission since it has been fulfilled
    removeVerbatimPermission(perm.delegateId, perm.topic);
    
    // Clear text
    setUploadTexts(prev => {
      const next = { ...prev };
      delete next[`${perm.delegateId}-${index}`];
      return next;
    });
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold tracking-tight">Verbatim Speeches</h1>
      </div>

      {/* DELEGATE UPLOAD SECTION */}
      {!isAdmin && myPermissions.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2 text-warning">
            <Upload className="h-5 w-5" /> Pending Uploads Required
          </h2>
          {myPermissions.map((perm, i) => (
            <Card key={i} className="border-warning/50 shadow-sm bg-warning/5">
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <Badge variant="secondary" className="mb-1">{perm.type === 'gsl' ? 'General Speakers List' : 'Moderated Caucus'}</Badge>
                    <div className="font-bold text-sm">Topic: {perm.topic}</div>
                  </div>
                </div>
                <Textarea 
                  placeholder="Paste the exact transcript of your speech here..."
                  rows={5}
                  value={uploadTexts[`${perm.delegateId}-${i}`] || ''}
                  onChange={(e) => setUploadTexts({...uploadTexts, [`${perm.delegateId}-${i}`]: e.target.value})}
                />
                <div className="flex justify-end">
                  <Button onClick={() => handleUpload(perm, i)} className="bg-warning text-warning-foreground hover:bg-warning/90">
                    <CheckCircle2 className="h-4 w-4 mr-1.5" /> Submit Transcript
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* EB SPECIAL PERMISSIONS PANEL */}
      {isAdmin && (
        <Card className="border-primary/30 shadow-sm">
          <CardHeader className="pb-3 bg-muted/20">
            <CardTitle className="font-heading text-base flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-primary" /> Grant Special Upload Permission
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 grid md:grid-cols-4 gap-3">
            <Select value={specialDel} onValueChange={setSpecialDel}>
              <SelectTrigger><SelectValue placeholder="Select Delegate" /></SelectTrigger>
              <SelectContent>
                {delegates.filter(d => d.present).map(d => (
                  <SelectItem key={d.id} value={d.id}>{COUNTRIES_FLAGS[d.country]} {d.country}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={specialType} onValueChange={(v: 'gsl' | 'mod_caucus') => setSpecialType(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mod_caucus">Moderated Caucus</SelectItem>
                <SelectItem value="gsl">GSL</SelectItem>
              </SelectContent>
            </Select>

            {/* DYNAMIC TOPIC DROPDOWN / INPUT */}
            {specialType === 'mod_caucus' ? (
              <Select value={specialTopic} onValueChange={setSpecialTopic}>
                <SelectTrigger>
                  <SelectValue placeholder={passedModCaucuses.length > 0 ? "Select Caucus Topic" : "No passed caucuses"} />
                </SelectTrigger>
                <SelectContent>
                  {passedModCaucuses.map(m => (
                    <SelectItem key={m.id} value={m.description}>
                      {m.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input 
                placeholder="Topic / Agenda" 
                value={specialTopic} 
                onChange={e => setSpecialTopic(e.target.value)} 
              />
            )}

            <Button onClick={handleGrantSpecial} disabled={!specialDel || !specialTopic.trim()}>
              Grant Access
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ADMIN PENDING TRACKER */}
      {isAdmin && verbatimPermissions.length > 0 && (
        <Card className="border-warning/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-warning flex items-center gap-2">
              <Clock className="h-4 w-4" /> Awaiting Uploads ({verbatimPermissions.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2">
              {verbatimPermissions.map((p, i) => {
                const del = delegates.find(d => d.id === p.delegateId);
                return (
                  <Badge key={i} variant="outline" className="border-warning/50 bg-warning/5 flex items-center gap-2 py-1">
                    <span>{COUNTRIES_FLAGS[del?.country || '']} {del?.country}</span>
                    <span className="text-[10px] text-muted-foreground truncate max-w-[150px]">({p.topic})</span>
                    <X className="h-3 w-3 cursor-pointer hover:text-destructive ml-1" onClick={() => removeVerbatimPermission(p.delegateId, p.topic)} />
                  </Badge>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* SPEECH ARCHIVE (VISIBLE TO ALL) */}
      <Card>
        <CardHeader className="pb-3 border-b border-border/50 flex flex-row items-center justify-between">
          <CardTitle className="font-heading text-lg flex items-center gap-2">
            <History className="h-5 w-5 text-primary" /> Official Committee Archive
          </CardTitle>
          <Badge variant="secondary" className="font-normal">{verbatims.length} Transcripts</Badge>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[600px] overflow-y-auto p-4 space-y-4">
            {verbatims.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground border border-dashed rounded-xl">
                <FileText className="h-8 w-8 mx-auto mb-3 opacity-20" />
                <p>No speeches have been archived yet.</p>
              </div>
            ) : (
              verbatims.map((v, i) => {
                const del = delegates.find(d => d.id === v.delegate_id);
                return (
                  <div key={v.id} className="p-4 rounded-xl border bg-muted/10 animate-fade-in" style={{ animationDelay: `${i * 30}ms` }}>
                    <div className="flex items-start justify-between mb-3 border-b border-border/50 pb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{COUNTRIES_FLAGS[del?.country || '']}</span>
                        <div>
                          <div className="font-bold">{del?.country}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                            <Badge variant="outline" className="text-[9px] h-4 px-1">{v.type === 'gsl' ? 'GSL' : 'Mod Caucus'}</Badge>
                            {v.topic}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">{v.timestamp}</div>
                    </div>
                    <div className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed pl-2 border-l-2 border-primary/20">
                      {v.text}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}