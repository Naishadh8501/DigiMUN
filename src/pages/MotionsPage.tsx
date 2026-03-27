import React, { useState, useEffect } from 'react';
import { useCommittee } from '@/contexts/CommitteeContext';
import { useAuth } from '@/contexts/AuthContext';
import type { Motion, PointType } from '@/data/mockData';
import { Gavel, AlertTriangle, HelpCircle, Hand, Plus, Clock, Unlock, Lock, Info, X, Play, Pause, SkipForward, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { COUNTRIES_FLAGS } from '@/data/mockData';
import { toast } from 'sonner';

const motionTypes = [
  'Setting Agenda', 'Moderated Caucus', 'Unmoderated Caucus', 'Suspend Debate', 'Table Debate',
  'Close Debate', 'Adjourn Meeting', 'Others'
];

const pointTypes: { type: PointType; icon: React.ReactNode; desc: string }[] = [
  { type: 'Personal Privilege', icon: <Hand className="h-4 w-4" />, desc: 'Physical discomfort or inability to hear' },
  { type: 'Information', icon: <Info className="h-4 w-4" />, desc: 'Ask a factual question to a speaker' },
  { type: 'Order', icon: <AlertTriangle className="h-4 w-4" />, desc: 'Procedural rules are being violated' },
  { type: 'Inquiry', icon: <HelpCircle className="h-4 w-4" />, desc: 'Question to the Chair regarding procedure' },
];

export default function MotionsPage() {
  const { 
    motions, addMotion, motionsFloorOpen, toggleMotionsFloor, raisePoint, activePoints, dismissPoint,
    activeCaucusId, startCaucus, delegates, updateDelegateScore,
    caucusSpeakersList, caucusCurrentSpeaker, caucusFloorOpen, toggleCaucusFloor, 
    addCaucusSpeaker, removeCaucusSpeaker, nextCaucusSpeaker,
    timerSeconds, timerRunning, startTimer, pauseTimer, setPhase, resetTimer
  } = useCommittee();
  
  const { userName, isAdmin } = useAuth(); 
  const [open, setOpen] = useState(false);
  const [motionType, setMotionType] = useState('');
  const [customType, setCustomType] = useState(''); 
  const [desc, setDesc] = useState('');
  const [totalTime, setTotalTime] = useState('');
  const [speakerTime, setSpeakerTime] = useState('');
  const [modMarks, setModMarks] = useState('');

  const [selectedCaucusDel, setSelectedCaucusDel] = useState('');

  const myDelegate = delegates.find(d => d.country === userName);
  const myId = myDelegate?.id;

  const isModCaucus = motionType === 'Moderated Caucus';
  const tt = parseInt(totalTime) || 0;
  const st = parseInt(speakerTime) || 0;
  const isDivisible = st > 0 && (tt * 60) % st === 0;
  const modCaucusError = isModCaucus && st > 0 && tt > 0 && !isDivisible;

  const currentCaucusDel = caucusCurrentSpeaker ? delegates.find(d => d.id === caucusCurrentSpeaker) : null;

  // Auto-load marks if the delegate already has them for Mod Caucus
  useEffect(() => {
    if (currentCaucusDel) {
      setModMarks(currentCaucusDel.scores?.modCaucus?.toString() || '');
    } else {
      setModMarks('');
    }
  }, [currentCaucusDel?.id, currentCaucusDel?.scores]);

  const handleAssignModMarks = () => {
    if (currentCaucusDel && modMarks !== '') {
      const score = parseInt(modMarks) || 0;
      updateDelegateScore(currentCaucusDel.id, 'modCaucus', score);
      toast.success(`Mod Caucus marks (${score}/10) saved for ${currentCaucusDel.country}`);
    }
  };

  const handleSubmit = () => {
    const finalType = motionType === 'Others' ? customType : motionType;
    if (!finalType || !desc.trim()) return;
    
    const m: Motion = {
      id: `m${Date.now()}`,
      type: finalType,
      proposed_by: userName,
      description: desc,
      status: 'pending',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    if (motionType === 'Moderated Caucus' || motionType === 'Unmoderated Caucus') {
      m.total_time = tt || null;
    }
    if (motionType === 'Moderated Caucus') {
      m.speaker_time = st || null;
    }

    addMotion(m);
    
    setOpen(false);
    setMotionType('');
    setCustomType('');
    setDesc('');
    setTotalTime('');
    setSpeakerTime('');
  };

  const statusColor: Record<string, string> = {
    pending: 'bg-warning/15 text-warning',
    passed: 'bg-success/15 text-success',
    failed: 'bg-destructive/15 text-destructive',
  };

  const getDisruptionScore = (m: Motion) => {
    if (m.type === 'Unmoderated Caucus') return 100000 + (m.total_time || 0); 
    if (m.type === 'Moderated Caucus') {
      const participants = (m.total_time && m.speaker_time) ? (m.total_time * 60) / m.speaker_time : 0;
      return 10000 + participants; 
    }
    return 0;
  };

  const safeMotions = motions || [];
  const safeCaucusList = caucusSpeakersList || []; 

  const pendingMotions = safeMotions.filter(m => m.status === 'pending').sort((a, b) => getDisruptionScore(b) - getDisruptionScore(a));
  const pastMotions = safeMotions.filter(m => m.status !== 'pending');

  const activeCaucusMotion = activeCaucusId ? safeMotions.find(m => m.id === activeCaucusId) : null;
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  
  const availableCaucusDelegates = delegates.filter(d => d.present && !safeCaucusList.includes(d.id) && d.id !== caucusCurrentSpeaker);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold tracking-tight">Motions & Points</h1>
        <div className="flex gap-3">
          {isAdmin && (
             <Button variant={motionsFloorOpen ? "destructive" : "default"} onClick={() => toggleMotionsFloor(!motionsFloorOpen)}>
               {motionsFloorOpen ? <><Lock className="h-4 w-4 mr-1.5" /> Close Floor</> : <><Unlock className="h-4 w-4 mr-1.5" /> Open Floor</>}
             </Button>
          )}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button disabled={!isAdmin && !motionsFloorOpen}>
                <Plus className="h-4 w-4 mr-1.5" /> Raise Motion
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-heading">Raise a Motion</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <Select value={motionType} onValueChange={setMotionType}>
                  <SelectTrigger><SelectValue placeholder="Motion type..." /></SelectTrigger>
                  <SelectContent>
                    {motionTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>

                {motionType === 'Others' && (
                  <Input placeholder="Specify custom motion type..." value={customType} onChange={e => setCustomType(e.target.value)} />
                )}

                {(motionType === 'Moderated Caucus' || motionType === 'Unmoderated Caucus') && (
                  <div className="flex gap-3">
                    <div className="flex-1 space-y-1">
                      <label className="text-xs text-muted-foreground">Total Time (mins)</label>
                      <Input type="number" placeholder="e.g. 15" value={totalTime} onChange={e => setTotalTime(e.target.value)} />
                    </div>
                    {motionType === 'Moderated Caucus' && (
                      <div className="flex-1 space-y-1">
                        <label className="text-xs text-muted-foreground">Speaker Time (secs)</label>
                        <Input type="number" placeholder="e.g. 60" value={speakerTime} onChange={e => setSpeakerTime(e.target.value)} />
                      </div>
                    )}
                  </div>
                )}

                {modCaucusError && (
                  <p className="text-xs text-destructive font-medium bg-destructive/10 p-2 rounded-md">
                    Total time ({tt * 60}s) must be perfectly divisible by speaker time ({st}s).
                  </p>
                )}

                <Textarea placeholder="Description / Topic..." value={desc} onChange={e => setDesc(e.target.value)} rows={3} />
                
                <Button 
                  className="w-full" 
                  onClick={handleSubmit} 
                  disabled={
                    (motionType !== 'Others' && !motionType) || 
                    (motionType === 'Others' && !customType.trim()) || 
                    !desc.trim() || 
                    (motionType === 'Moderated Caucus' && (!totalTime || !speakerTime || modCaucusError))
                  }
                >
                  Submit Motion
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {!isAdmin && !motionsFloorOpen && (
        <div className="bg-warning/10 border border-warning/20 text-warning p-3 rounded-lg text-sm flex items-center gap-2">
          <Lock className="h-4 w-4" /> The floor is currently closed for raising motions.
        </div>
      )}

      {/* --- ACTIVE CAUCUS UI --- */}
      {activeCaucusMotion && (
         <Card className="border-primary shadow-lg border-2 overflow-hidden">
           <div className="bg-primary text-primary-foreground p-3 flex justify-between items-center">
             <div className="flex items-center gap-2 font-heading font-bold">
               <Users className="h-5 w-5" />
               Active {activeCaucusMotion.type}
             </div>
             {isAdmin && (
               <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={() => { 
                 startCaucus(null); 
                 setPhase('debate'); 
                 resetTimer(90); 
               }}>
                 End Caucus
               </Button>
             )}
           </div>
           <CardContent className="p-0">
             <div className="p-4 border-b bg-muted/10">
               <div className="font-heading text-lg font-bold">{activeCaucusMotion.description}</div>
               <div className="text-sm text-muted-foreground mt-1">
                 Total Time: {activeCaucusMotion.total_time} mins
                 {activeCaucusMotion.speaker_time && ` • Speaker Time: ${activeCaucusMotion.speaker_time} secs`}
               </div>
             </div>

             {/* Unmod UI */}
             {activeCaucusMotion.type === 'Unmoderated Caucus' && (
               <div className="p-8 flex flex-col items-center justify-center">
                 <div className={`font-mono text-7xl font-bold mb-6 ${timerSeconds < 60 ? 'text-destructive' : 'text-foreground'}`}>
                    {formatTime(timerSeconds)}
                 </div>
                 {isAdmin && (
                   <Button size="lg" onClick={() => timerRunning ? pauseTimer() : startTimer()}>
                     {timerRunning ? <Pause className="h-5 w-5 mr-2" /> : <Play className="h-5 w-5 mr-2" />}
                     {timerRunning ? 'Pause Timer' : 'Start Timer'}
                   </Button>
                 )}
               </div>
             )}

             {/* Mod Caucus UI */}
             {activeCaucusMotion.type === 'Moderated Caucus' && (
               <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x">
                 
                 {/* Speaker Timer Side */}
                 <div className="p-6 flex flex-col items-center justify-center">
                   <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Current Speaker</div>
                   {currentCaucusDel ? (
                     <div className="text-center mb-6">
                       <div className="text-4xl mb-2">{COUNTRIES_FLAGS[currentCaucusDel.country] || '🏳️'}</div>
                       <div className="font-heading text-xl font-bold">{currentCaucusDel.country}</div>
                     </div>
                   ) : (
                     <div className="text-muted-foreground text-center mb-6 py-4">No active speaker</div>
                   )}
                   
                   <div className={`font-mono text-5xl font-bold mb-6 ${timerSeconds <= 15 && timerSeconds > 0 ? 'text-destructive animate-pulse' : 'text-foreground'}`}>
                      {formatTime(timerSeconds)}
                   </div>
                   
                   {isAdmin && (
                     <div className="flex gap-2">
                       <Button variant="outline" size="sm" onClick={() => timerRunning ? pauseTimer() : startTimer()}>
                         {timerRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                       </Button>
                       <Button size="sm" onClick={nextCaucusSpeaker}>
                         <SkipForward className="h-4 w-4 mr-2" /> Next Speaker
                       </Button>
                     </div>
                   )}

                   {/* EB MARKING UI */}
                   {isAdmin && currentCaucusDel && (
                     <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t border-border/50 w-full max-w-[220px]">
                        <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                          Marks:
                        </span>
                        <Input
                          type="number"
                          className="w-16 h-8 text-xs font-mono text-center"
                          placeholder="0"
                          max="10"
                          min="0"
                          value={modMarks}
                          onChange={(e) => setModMarks(e.target.value)}
                        />
                        <Button size="sm" variant="secondary" className="h-8 text-xs" onClick={handleAssignModMarks}>
                          Save
                        </Button>
                     </div>
                   )}
                 </div>

                 {/* Queue Side */}
                 <div className="p-4 flex flex-col h-[400px]">
                   <div className="flex justify-between items-center mb-4">
                     <div className="font-heading font-bold text-sm">Speaker Queue ({safeCaucusList.length})</div>
                     {isAdmin ? (
                       <Button size="sm" variant={caucusFloorOpen ? "destructive" : "default"} onClick={() => toggleCaucusFloor(!caucusFloorOpen)} className="h-7 text-xs">
                         {caucusFloorOpen ? <Lock className="h-3 w-3 mr-1" /> : <Unlock className="h-3 w-3 mr-1" />}
                         {caucusFloorOpen ? 'Close Floor' : 'Open Floor'}
                       </Button>
                     ) : (
                       caucusFloorOpen && myId && !safeCaucusList.includes(myId) && myId !== caucusCurrentSpeaker && (
                         <Button size="sm" onClick={() => addCaucusSpeaker(myId)} className="h-7 text-xs bg-success hover:bg-success/90">
                           <Hand className="h-3 w-3 mr-1" /> Add Myself
                         </Button>
                       )
                     )}
                   </div>

                   {isAdmin && (
                     <div className="flex gap-2 mb-4">
                       <Select value={selectedCaucusDel} onValueChange={setSelectedCaucusDel}>
                         <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Add delegate..." /></SelectTrigger>
                         <SelectContent>
                           {availableCaucusDelegates.map(d => (
                             <SelectItem key={d.id} value={d.id}>{COUNTRIES_FLAGS[d.country]} {d.country}</SelectItem>
                           ))}
                         </SelectContent>
                       </Select>
                       <Button size="sm" className="h-8" disabled={!selectedCaucusDel} onClick={() => { addCaucusSpeaker(selectedCaucusDel); setSelectedCaucusDel(''); }}>
                         Add
                       </Button>
                     </div>
                   )}

                   <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                     {safeCaucusList.length === 0 ? (
                        <div className="text-sm text-muted-foreground text-center py-6 border border-dashed rounded-lg">Queue is empty</div>
                     ) : safeCaucusList.map((id, i) => {
                       const del = delegates.find(d => d.id === id);
                       if (!del) return null;
                       return (
                         <div key={id} className="flex items-center justify-between p-2 rounded-md bg-muted/40 border text-sm">
                           <div className="flex items-center gap-2">
                             <span className="text-muted-foreground font-mono text-xs w-4">{i + 1}</span>
                             <span>{COUNTRIES_FLAGS[del.country] || '🏳️'}</span>
                             <span>{del.country}</span>
                           </div>
                           {isAdmin && (
                             <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => removeCaucusSpeaker(id)}>
                               <X className="h-3 w-3" />
                             </Button>
                           )}
                         </div>
                       )
                     })}
                   </div>
                 </div>
               </div>
             )}
           </CardContent>
         </Card>
      )}

      {isAdmin && activePoints.length > 0 && (
        <Card className="border-warning/50">
          <CardHeader className="pb-3 bg-warning/5 border-b border-warning/20">
            <CardTitle className="font-heading text-base flex items-center gap-2 text-warning-foreground">
              <Hand className="h-4 w-4" /> Active Points ({activePoints.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-2">
            {activePoints.map(pt => (
              <div key={pt.id} className="flex items-center justify-between p-3 rounded-lg border bg-background">
                <div>
                  <div className="font-bold text-sm">{pt.delegate}</div>
                  <div className="text-xs text-muted-foreground">Point of {pt.type}</div>
                </div>
                <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => dismissPoint(pt.id)}>
                   <X className="h-4 w-4 mr-1.5" /> Dismiss
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {!isAdmin && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {pointTypes.map(p => (
            <Card 
              key={p.type} 
              className="cursor-pointer hover:border-primary/40 transition-colors bg-muted/20"
              onClick={() => raisePoint(p.type, userName)}
            >
              <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                <div className="p-2 rounded-full bg-background border shadow-sm text-foreground">{p.icon}</div>
                <div className="text-sm font-medium">{p.type}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-base flex items-center gap-2">
            <Gavel className="h-4 w-4 text-primary" /> Pending Motions (Order of Disruption)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {pendingMotions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No pending motions</p>
          ) : pendingMotions.map((m, i) => (
            <div key={m.id} className="flex items-start gap-4 p-4 rounded-lg bg-primary/5 border border-primary/20 animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="font-mono text-xl font-bold text-primary/40 pt-1">{i + 1}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-sm font-medium">{m.type}</span>
                  <Badge variant="secondary" className={`border-0 text-xs ${statusColor[m.status]}`}>{m.status}</Badge>
                  {m.total_time && (
                    <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary text-[10px]">
                      <Clock className="h-3 w-3 mr-1" />
                      {m.total_time} min {m.speaker_time ? `/ ${m.speaker_time} sec` : ''}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-foreground/80">{m.description}</p>
                <p className="text-xs text-muted-foreground mt-1">Proposed by {m.proposed_by} · {m.timestamp}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {pastMotions.length > 0 && (
         <Card>
           <CardHeader className="pb-3">
             <CardTitle className="font-heading text-base flex items-center gap-2 text-muted-foreground">
               Past Motions
             </CardTitle>
           </CardHeader>
           <CardContent className="space-y-3 opacity-70">
             {pastMotions.map((m) => (
               <div key={m.id} className="flex items-start gap-4 p-3 rounded-lg bg-muted/30">
                 <div className="flex-1">
                   <div className="flex items-center gap-2 mb-1">
                     <span className="text-sm font-medium">{m.type}</span>
                     <Badge variant="secondary" className={`border-0 text-[10px] ${statusColor[m.status]}`}>{m.status}</Badge>
                   </div>
                   <p className="text-sm text-muted-foreground">{m.description}</p>
                   <p className="text-xs text-muted-foreground mt-1">Proposed by {m.proposed_by} · {m.timestamp}</p>
                 </div>
               </div>
             ))}
           </CardContent>
         </Card>
      )}
    </div>
  );
}