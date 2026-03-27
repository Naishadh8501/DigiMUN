import React, { useState, useEffect } from 'react';
import { useCommittee } from '@/contexts/CommitteeContext';
import { useAuth } from '@/contexts/AuthContext';
import { COUNTRIES_FLAGS } from '@/data/mockData';
import type { Phase } from '@/data/mockData';
import { Clock, Users, Activity, Megaphone, Play, Pause, RotateCcw, AlertCircle, Gavel, ListOrdered, UserPlus, HelpCircle, Edit2, Hand, Check, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

export default function Dashboard() {
  const { 
    name, agenda, phase, setPhase, timerSeconds, timerTotal, timerRunning, 
    currentSpeaker, caucusCurrentSpeaker, activeCaucusId, motions,
    delegates, activityLog, announcements, speakersList, caucusSpeakersList,
    startTimer, pauseTimer, resetTimer, activeVotingMotionId, updateCommitteeInfo,
    startCaucus, startVotingSession, currentYieldType, yieldTarget,
    questionQueue, toggleQuestionRequest, updateYield
  } = useCommittee();
  
  const { isAdmin, userName } = useAuth();
  const myDelegate = delegates.find(d => d.country === userName);
  const myId = myDelegate?.id;
  
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState(name);

  useEffect(() => { setEditNameValue(name); }, [name]);

  const handleSaveName = () => {
     updateCommitteeInfo(editNameValue, agenda);
     setIsEditingName(false);
  };

  const activeCaucusMotion = activeCaucusId ? motions.find(m => m.id === activeCaucusId) : null;
  const activeVotingMotion = activeVotingMotionId ? motions.find(m => m.id === activeVotingMotionId) : null;
  
  const effectivePhase = activeVotingMotionId ? 'voting' 
    : activeCaucusMotion?.type === 'Moderated Caucus' ? 'moderated-caucus'
    : activeCaucusMotion?.type === 'Unmoderated Caucus' ? 'unmoderated-caucus'
    : phase;
  
  let phaseTitle = "General Debate";
  let currentTopic = agenda;
  
  let activeSpeakerId = currentSpeaker;
  if (effectivePhase === 'debate' && currentYieldType === 'delegate' && yieldTarget) {
     activeSpeakerId = yieldTarget;
  }

  let phaseColor = "text-primary";
  let PhaseIcon = Users;

  if (effectivePhase === 'voting') {
    phaseTitle = "Voting Procedure";
    currentTopic = activeVotingMotion ? activeVotingMotion.description : "Voting in progress...";
    activeSpeakerId = null;
    phaseColor = "text-success";
    PhaseIcon = Gavel;
  } else if (effectivePhase === 'moderated-caucus') {
    phaseTitle = "Moderated Caucus";
    currentTopic = activeCaucusMotion?.description || agenda;
    activeSpeakerId = caucusCurrentSpeaker;
    phaseColor = "text-warning";
  } else if (effectivePhase === 'unmoderated-caucus') {
    phaseTitle = "Unmoderated Caucus";
    currentTopic = activeCaucusMotion?.description || agenda;
    activeSpeakerId = null; 
    phaseColor = "text-destructive";
  } 

  const activeDelegate = activeSpeakerId ? delegates.find(d => d.id === activeSpeakerId) : null;
  const presentCount = delegates.filter(d => d.present).length;
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  const timerProgress = timerTotal > 0 ? ((timerTotal - timerSeconds) / timerTotal) * 100 : 0;

  const activeQueue = effectivePhase === 'moderated-caucus' ? (caucusSpeakersList || []) : (speakersList || []);
  const queueTitle = effectivePhase === 'moderated-caucus' ? "Caucus Queue" : effectivePhase === 'debate' ? "General Speakers List" : "Speaker Queue";

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          {isAdmin && isEditingName ? (
             <div className="flex items-center gap-2">
               <Input value={editNameValue} onChange={e => setEditNameValue(e.target.value)} className="h-10 text-xl font-bold w-96 font-heading" />
               <Button size="sm" onClick={handleSaveName}>Save</Button>
               <Button size="sm" variant="ghost" onClick={() => setIsEditingName(false)}>Cancel</Button>
             </div>
          ) : (
             <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground flex items-center gap-2 group">
               {name}
               {isAdmin && (
                 <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setIsEditingName(true)}>
                    <Edit2 className="h-5 w-5 text-muted-foreground"/>
                 </Button>
               )}
             </h1>
          )}
          <p className="text-muted-foreground mt-1 flex items-center gap-2">
            <span className="font-medium text-foreground">Agenda:</span> {agenda}
          </p>
        </div>
        
        <div className="flex flex-col items-end gap-2">
          <Badge variant="outline" className={`px-4 py-1.5 text-sm uppercase tracking-widest font-bold border-2 shadow-sm ${
            phaseColor.replace('text-', 'border-').concat('/50 ') + phaseColor + ' ' + phaseColor.replace('text-', 'bg-').concat('/5')
          }`}>
            {phaseTitle}
          </Badge>
          
          {isAdmin && (
            <Select value={effectivePhase} onValueChange={(v: Phase) => {
              setPhase(v);
              if (v === 'debate') {
                if (activeCaucusId) startCaucus(null);
                if (activeVotingMotionId) startVotingSession(null);
                resetTimer(90);
              }
            }}>
              <SelectTrigger className="w-[180px] h-8 text-xs border-muted-foreground/30">
                <SelectValue placeholder="Override Phase" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="debate">Force: General Debate</SelectItem>
                <SelectItem value="moderated-caucus">Force: Mod Caucus</SelectItem>
                <SelectItem value="unmoderated-caucus">Force: Unmod Caucus</SelectItem>
                <SelectItem value="voting">Force: Voting</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <Card className="border-primary/20 shadow-md overflow-hidden border-2 relative">
        <div className="absolute bottom-0 left-0 h-1.5 bg-primary transition-all duration-1000 ease-linear" style={{ width: `${timerProgress}%` }} />
        <CardContent className="p-6 sm:p-10">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            
            <div className="space-y-6">
              <div>
                <div className={`flex items-center gap-2 text-sm font-bold uppercase tracking-wider mb-2 ${phaseColor}`}>
                  <PhaseIcon className="h-5 w-5" /> Active Topic
                </div>
                <h2 className="font-heading text-2xl font-bold leading-tight">{currentTopic}</h2>
                {activeCaucusMotion && activeCaucusMotion.total_time && effectivePhase !== 'debate' && effectivePhase !== 'voting' && (
                  <Badge variant="secondary" className="mt-3 bg-muted">
                    Total Caucus Time: {activeCaucusMotion.total_time} mins
                  </Badge>
                )}
              </div>

              {effectivePhase !== 'unmoderated-caucus' && effectivePhase !== 'voting' && (
                <div className="pt-6 border-t border-border/50">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Current Speaker</div>
                  {activeDelegate ? (
                    <div className="flex flex-col gap-3">
                       <div className="flex items-center gap-4 bg-muted/30 p-4 rounded-xl border border-border/50">
                         <div className="text-5xl drop-shadow-sm">{COUNTRIES_FLAGS[activeDelegate.country] || '🏳️'}</div>
                         <div className="flex-1">
                           <div className="font-heading text-xl font-bold">{activeDelegate.country}</div>
                           <div className="text-sm text-muted-foreground">{activeDelegate.name}</div>
                         </div>
                       </div>
                       
                       {effectivePhase === 'debate' && currentYieldType === 'delegate' && yieldTarget && (
                          <Badge variant="secondary" className="w-fit bg-warning/10 text-warning border-warning/20">
                             <UserPlus className="h-3 w-3 mr-1.5" /> Time Yielded by {delegates.find(d => d.id === currentSpeaker)?.country}
                          </Badge>
                       )}

                       {effectivePhase === 'debate' && currentYieldType === 'questions' && (
                           <div className="bg-info/5 border border-info/20 p-3 rounded-lg">
                               <div className="flex items-center gap-2 font-medium text-info text-sm mb-2">
                                  <HelpCircle className="h-4 w-4" /> Active Q&A Session
                               </div>
                               
                               {yieldTarget ? (
                                   <div className="flex items-center gap-2">
                                       <Badge variant="default" className="bg-info text-info-foreground">
                                           Questioner: {delegates.find(d => d.id === yieldTarget)?.country}
                                       </Badge>
                                       {isAdmin && (
                                           <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={() => {
                                               updateYield('questions', null);
                                               toggleQuestionRequest(yieldTarget, 'remove');
                                           }}>
                                               <X className="h-3 w-3" />
                                           </Button>
                                       )}
                                   </div>
                               ) : isAdmin ? (
                                   <div className="mt-1">
                                      <div className="text-xs text-muted-foreground mb-2">Requests to Ask ({questionQueue.length}):</div>
                                      <div className="flex flex-wrap gap-2">
                                          {questionQueue.length === 0 ? (
                                              <span className="text-xs italic text-muted-foreground">Waiting for delegates...</span>
                                          ) : questionQueue.map(id => {
                                              const d = delegates.find(x => x.id === id);
                                              return d ? (
                                                  <Badge key={id} variant="secondary" className="cursor-pointer hover:bg-primary/20 flex items-center gap-1.5 py-1 px-2 border border-primary/20" onClick={() => updateYield('questions', id)}>
                                                      {COUNTRIES_FLAGS[d.country]} {d.country} <Check className="h-3 w-3 ml-1 text-success"/>
                                                  </Badge>
                                              ) : null;
                                          })}
                                      </div>
                                   </div>
                               ) : activeDelegate.id !== myId ? (
                                   <div className="mt-1">
                                      {questionQueue.includes(myId!) ? (
                                          <Button size="sm" variant="secondary" className="text-warning border-warning/30 hover:bg-warning/20 h-8" onClick={() => toggleQuestionRequest(myId!, 'remove')}>
                                              <Hand className="h-3.5 w-3.5 mr-1.5" /> Lower Placard
                                          </Button>
                                      ) : (
                                          <Button size="sm" variant="outline" className="border-info text-info hover:bg-info/10 h-8" onClick={() => toggleQuestionRequest(myId!, 'add')}>
                                              <Hand className="h-3.5 w-3.5 mr-1.5" /> Request to Ask
                                          </Button>
                                      )}
                                   </div>
                               ) : null}
                           </div>
                       )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 text-muted-foreground bg-muted/10 p-4 rounded-xl border border-dashed">
                      <Users className="h-6 w-6 opacity-50" />
                      <span>The floor is open. No active speaker.</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col items-center justify-center py-4 lg:border-l lg:border-border/50">
              <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">
                {effectivePhase === 'unmoderated-caucus' ? 'Caucus Time Remaining' : 'Speaker Time Remaining'}
              </div>
              <div className={`font-mono text-7xl sm:text-8xl font-bold tracking-tighter tabular-nums transition-colors duration-300 ${
                timerSeconds <= 30 && timerSeconds > 0 ? 'text-destructive animate-pulse' : 
                timerSeconds === 0 ? 'text-destructive' : 'text-foreground'
              }`}>
                {formatTime(timerSeconds)}
              </div>

              {isAdmin && (
                <div className="flex items-center gap-3 mt-8">
                  <Button size="lg" variant={timerRunning ? "outline" : "default"} className={`w-32 ${!timerRunning && timerSeconds > 0 ? 'bg-success hover:bg-success/90 text-white' : ''}`} onClick={() => timerRunning ? pauseTimer() : startTimer()}>
                    {timerRunning ? <Pause className="h-5 w-5 mr-2" /> : <Play className="h-5 w-5 mr-2" />}
                    {timerRunning ? 'Pause' : 'Start'}
                  </Button>
                  <Button size="lg" variant="outline" onClick={() => resetTimer()}>
                    <RotateCcw className="h-5 w-5 mr-2" /> Reset
                  </Button>
                </div>
              )}
            </div>

          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-sm text-muted-foreground">Attendance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2">
                <span className="font-heading text-4xl font-bold">{presentCount}</span>
                <span className="text-muted-foreground mb-1">/ {delegates.length}</span>
              </div>
              <Progress value={delegates.length > 0 ? (presentCount / delegates.length) * 100 : 0} className="h-2 mt-3" />
            </CardContent>
          </Card>
          
          <Card className="border-warning/30 bg-warning/5 max-h-[250px] flex flex-col">
            <CardHeader className="pb-2 flex flex-row items-center justify-between shrink-0">
              <CardTitle className="font-heading text-sm text-warning-foreground flex items-center gap-2">
                <Megaphone className="h-4 w-4" /> Announcements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 overflow-y-auto">
              {announcements.length === 0 ? (
                <p className="text-sm text-muted-foreground">No announcements</p>
              ) : (
                announcements.map(a => (
                  <div key={a.id} className="text-sm">
                    <div className="flex items-center gap-2 mb-1">
                      {a.urgent && <AlertCircle className="h-3 w-3 text-destructive" />}
                      <span className="font-medium text-foreground">{a.urgent ? 'URGENT' : 'Update'}</span>
                      <span className="text-xs text-muted-foreground ml-auto">{a.timestamp}</span>
                    </div>
                    <p className="text-foreground/80 pl-5">{a.message}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="flex flex-col h-[410px]">
          <CardHeader className="border-b border-border/50 pb-4 shrink-0">
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <ListOrdered className="h-5 w-5 text-primary" /> {queueTitle}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-y-auto">
            <div className="p-4 space-y-2">
              {(effectivePhase === 'unmoderated-caucus' || effectivePhase === 'voting') ? (
                <div className="text-center py-10 text-muted-foreground border border-dashed rounded-xl text-sm">
                  No formal queue for this phase.
                </div>
              ) : activeQueue.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground border border-dashed rounded-xl text-sm">
                  Queue is currently empty.
                </div>
              ) : (
                activeQueue.map((id, i) => {
                  const del = delegates.find(d => d.id === id);
                  if (!del) return null;
                  return (
                    <div key={id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border transition-colors hover:bg-muted/50">
                      <span className="text-xs font-mono text-muted-foreground w-4 text-center">{i + 1}</span>
                      <span className="text-lg">{COUNTRIES_FLAGS[del.country] || '🏳️'}</span>
                      <span className="text-sm font-medium truncate">{del.country}</span>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col h-[410px]">
          <CardHeader className="border-b border-border/50 pb-4 shrink-0">
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" /> Live Activity Feed
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-y-auto">
            <div className="p-4 space-y-4">
              {activityLog.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground border border-dashed rounded-xl text-sm">
                  No activity recorded yet.
                </div>
              ) : (
                activityLog.map((entry, i) => (
                  <div key={entry.id} className="flex gap-4 animate-fade-in" style={{ animationDelay: `${i * 30}ms` }}>
                    <div className="mt-1 shrink-0">
                      <div className={`h-2 w-2 rounded-full ring-4 ${
                        entry.type === 'motion' ? 'bg-warning ring-warning/20' :
                        entry.type === 'vote' ? 'bg-success ring-success/20' :
                        entry.type === 'speech' ? 'bg-primary ring-primary/20' :
                        'bg-muted-foreground ring-muted'
                      }`} />
                    </div>
                    <div className="flex-1 pb-4 border-b border-border/50 last:border-0 min-w-0">
                      <p className="text-sm">
                        <span className="font-semibold">{entry.actor}</span> {entry.description}
                      </p>
                      <span className="text-xs text-muted-foreground">{entry.timestamp}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}