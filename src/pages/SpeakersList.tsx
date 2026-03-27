import React, { useState, useEffect } from 'react';
import { useCommittee } from '@/contexts/CommitteeContext';
import { useAuth } from '@/contexts/AuthContext';
import { COUNTRIES_FLAGS } from '@/data/mockData';
import { Play, Pause, RotateCcw, Plus, X, SkipForward, Mic2, UserPlus, HelpCircle, Gavel, Unlock, Lock, Hand, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from 'sonner';

export default function SpeakersList() {
  const { isAdmin, userName } = useAuth();
  const {
    delegates, speakersList, currentSpeaker, timerSeconds, timerRunning, timerTotal, floorOpen,
    currentYieldType, yieldTarget, updateYield, questionQueue, toggleQuestionRequest,
    addSpeaker, removeSpeaker, nextSpeaker, startTimer, pauseTimer, resetTimer, setTimerTotal, toggleFloor,
    updateDelegateScore
  } = useCommittee();
  
  const [selectedDelegate, setSelectedDelegate] = useState('');
  const [yieldDialogOpen, setYieldDialogOpen] = useState(false);
  const [delegateToYieldTo, setDelegateToYieldTo] = useState('');
  const [marks, setMarks] = useState('');

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  const progress = timerTotal > 0 ? ((timerTotal - timerSeconds) / timerTotal) * 100 : 0;
  
  const activeDelId = currentYieldType === 'delegate' && yieldTarget ? yieldTarget : currentSpeaker;
  const currentDel = delegates.find(d => d.id === activeDelId);
  const originalDel = currentYieldType === 'delegate' ? delegates.find(d => d.id === currentSpeaker) : null;
  
  const availableDelegates = delegates.filter(d => d.present && !(speakersList || []).includes(d.id) && d.id !== currentSpeaker);
  const yieldableDelegates = delegates.filter(d => d.present && d.id !== currentSpeaker);
  
  const myDelegate = delegates.find(d => d.country === userName);
  const myId = myDelegate?.id;

  const isMyTurn = myId === currentSpeaker;
  const showYieldOptions = isAdmin || isMyTurn;

  useEffect(() => {
    if (currentDel) {
      setMarks(currentDel.scores?.gsl?.toString() || '');
    } else {
      setMarks('');
    }
  }, [currentDel?.id, currentDel?.scores]);

  const handleAssignMarks = () => {
    if (currentDel && marks !== '') {
      const score = parseInt(marks) || 0;
      updateDelegateScore(currentDel.id, 'gsl', score);
      toast.success(`GSL marks (${score}/10) saved for ${currentDel.country}`);
    }
  };

  const handleYieldToDelegate = () => {
    if (delegateToYieldTo) {
      pauseTimer();
      updateYield('delegate', delegateToYieldTo);
      setYieldDialogOpen(false);
      setDelegateToYieldTo('');
    }
  };

  const handleYieldToQuestions = () => {
    pauseTimer();
    updateYield('questions', null);
  };

  const handleYieldToChair = () => {
    nextSpeaker(); 
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold tracking-tight">Speakers List</h1>
      </div>

      <Card className="overflow-hidden">
        <div className="relative">
          <div className="absolute bottom-0 left-0 h-1 bg-primary transition-all duration-1000" style={{ width: `${progress}%` }} />
          <CardContent className="p-6">
            {currentDel ? (
              <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                <div className="flex-1 flex items-center gap-6">
                  <div className="text-5xl">{COUNTRIES_FLAGS[currentDel.country] || '🏳️'}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <div className="text-xs text-primary font-medium uppercase tracking-wider">
                        Now Speaking
                      </div>
                      {currentYieldType === 'questions' && <Badge variant="secondary" className="bg-info/15 text-info border-0 text-[10px]">Q&A Mode</Badge>}
                      {originalDel && <Badge variant="secondary" className="bg-warning/15 text-warning border-0 text-[10px]">Yielded by {originalDel.country}</Badge>}
                    </div>
                    <div className="font-heading text-2xl font-bold">{currentDel.name}</div>
                    <div className="text-sm text-muted-foreground">{currentDel.country}</div>

                    {/* DELEGATE VIEW: REQUEST TO ASK QUESTION */}
                    {currentYieldType === 'questions' && !isAdmin && !yieldTarget && activeDelId !== myId && (
                        <div className="mt-3">
                            {questionQueue.includes(myId!) ? (
                                <Button size="sm" variant="secondary" className="text-warning border-warning/30 hover:bg-warning/20" onClick={() => toggleQuestionRequest(myId!, 'remove')}>
                                    <Hand className="h-4 w-4 mr-1.5" /> Lower Placard
                                </Button>
                            ) : (
                                <Button size="sm" variant="outline" className="border-info text-info hover:bg-info/10" onClick={() => toggleQuestionRequest(myId!, 'add')}>
                                    <Hand className="h-4 w-4 mr-1.5" /> Request to Ask Question
                                </Button>
                            )}
                        </div>
                    )}

                    {/* ADMIN VIEW: QUESTION APPROVAL QUEUE */}
                    {currentYieldType === 'questions' && isAdmin && !yieldTarget && (
                        <div className="mt-4 w-full border-t border-border/50 pt-3">
                            <div className="text-xs font-medium text-muted-foreground mb-2">Delegates Requesting to Ask ({questionQueue.length}):</div>
                            {questionQueue.length === 0 ? (
                                <div className="text-xs text-muted-foreground italic">Waiting for requests...</div>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {questionQueue.map(id => {
                                        const d = delegates.find(x => x.id === id);
                                        return d ? (
                                            <Badge key={id} variant="secondary" className="cursor-pointer hover:bg-primary/20 flex items-center gap-1.5 py-1 px-2 border border-primary/20" onClick={() => updateYield('questions', id)}>
                                                {COUNTRIES_FLAGS[d.country]} {d.country} <Check className="h-3 w-3 ml-1 text-success"/>
                                            </Badge>
                                        ) : null;
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-3 w-full sm:w-auto">
                  <div className={`font-mono text-5xl font-bold ${timerSeconds <= 30 && timerSeconds > 0 ? 'text-destructive animate-pulse' : 'text-foreground'} ${timerRunning ? 'timer-active' : ''}`}>
                    {formatTime(timerSeconds)}
                  </div>
                  
                  {showYieldOptions && !currentYieldType && timerSeconds > 0 && !timerRunning && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="w-32">Yield Time...</Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setYieldDialogOpen(true)}>
                          <UserPlus className="h-4 w-4 mr-2" /> Yield to Delegate
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleYieldToQuestions}>
                          <HelpCircle className="h-4 w-4 mr-2" /> Yield to Questions
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleYieldToChair} className="text-destructive focus:text-destructive">
                          <Gavel className="h-4 w-4 mr-2" /> Yield to Chair
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}

                  {/* ACTIVE QUESTIONER VIEW */}
                  {currentYieldType === 'questions' && yieldTarget && (
                       <div className="flex items-center gap-2 mt-2">
                           <Badge variant="default" className="bg-info text-info-foreground py-1">
                              Active Questioner: {delegates.find(d => d.id === yieldTarget)?.country}
                           </Badge>
                           {isAdmin && (
                             <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => {
                                 updateYield('questions', null);
                                 toggleQuestionRequest(yieldTarget, 'remove');
                             }}>
                                 <X className="h-4 w-4" />
                             </Button>
                           )}
                       </div>
                  )}

                  {currentYieldType === 'delegate' && isAdmin && (
                     <Button variant="outline" size="sm" className="text-destructive mt-2" onClick={() => updateYield(null, null)}>
                        Cancel Yield
                     </Button>
                  )}

                  {/* EB MARKING UI */}
                  {isAdmin && (
                    <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-border/50 w-full">
                       <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                         GSL Marks:
                       </span>
                       <Input
                         type="number"
                         className="w-16 h-8 text-xs font-mono text-center"
                         placeholder="0"
                         max="10"
                         min="0"
                         value={marks}
                         onChange={(e) => setMarks(e.target.value)}
                       />
                       <Button size="sm" variant="secondary" className="h-8 text-xs" onClick={handleAssignMarks}>
                         Save
                       </Button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <Mic2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="text-base">No active speaker</p>
              </div>
            )}
          </CardContent>
        </div>
        
        {isAdmin && (
          <div className="border-t border-border p-3 flex flex-wrap items-center justify-between gap-4 bg-muted/10">
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className={!timerRunning && timerSeconds > 0 ? "bg-success/10 text-success hover:bg-success/20" : ""} onClick={() => timerRunning ? pauseTimer() : startTimer()}>
                {timerRunning ? <Pause className="h-3.5 w-3.5 mr-1.5" /> : <Play className="h-3.5 w-3.5 mr-1.5" />}
                {timerRunning ? 'Pause' : 'Start Timer'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => resetTimer()}>
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Reset
              </Button>
              <Button size="sm" onClick={nextSpeaker}>
                <SkipForward className="h-3.5 w-3.5 mr-1.5" /> Next Speaker
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Default Time (s):</span>
              <Input 
                type="number" 
                className="w-16 h-8 text-xs font-mono" 
                value={timerTotal}
                onChange={e => {
                  const val = parseInt(e.target.value);
                  if (val > 0) setTimerTotal(val);
                }}
              />
            </div>
          </div>
        )}
      </Card>

      <Dialog open={yieldDialogOpen} onOpenChange={setYieldDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">Yield to Delegate</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Select value={delegateToYieldTo} onValueChange={setDelegateToYieldTo}>
              <SelectTrigger>
                <SelectValue placeholder="Select delegate..." />
              </SelectTrigger>
              <SelectContent>
                {yieldableDelegates.map(d => (
                  <SelectItem key={d.id} value={d.id}>
                    {COUNTRIES_FLAGS[d.country]} {d.country}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button className="w-full" onClick={handleYieldToDelegate} disabled={!delegateToYieldTo}>
              Confirm Yield & Pause Timer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {isAdmin && (
        <Card>
          <CardContent className="p-4 flex flex-col sm:flex-row gap-4">
            <div className="flex-1 flex gap-2">
              <Select value={selectedDelegate} onValueChange={setSelectedDelegate}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Add delegate to queue..." />
                </SelectTrigger>
                <SelectContent>
                  {availableDelegates.map(d => (
                    <SelectItem key={d.id} value={d.id}>
                      {COUNTRIES_FLAGS[d.country]} {d.name} — {d.country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button disabled={!selectedDelegate} onClick={() => { addSpeaker(selectedDelegate); setSelectedDelegate(''); }}>
                <Plus className="h-4 w-4 mr-1.5" /> Add
              </Button>
            </div>
            
            <Button variant={floorOpen ? "destructive" : "default"} onClick={() => toggleFloor(!floorOpen)} className="sm:w-36">
              {floorOpen ? <><Lock className="h-4 w-4 mr-1.5" /> Close Floor</> : <><Unlock className="h-4 w-4 mr-1.5" /> Open Floor</>}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="font-heading text-base">Queue ({(speakersList || []).length})</CardTitle>
          
          {!isAdmin && floorOpen && myId && !(speakersList || []).includes(myId) && myId !== currentSpeaker && (
             <Button size="sm" onClick={() => addSpeaker(myId)} className="bg-success hover:bg-success/90 text-white">
               <Hand className="h-4 w-4 mr-1.5" /> Add Myself
             </Button>
          )}
          {!isAdmin && floorOpen && (speakersList || []).includes(myId!) && (
             <Badge variant="outline" className="bg-muted text-muted-foreground">You are in queue</Badge>
          )}
        </CardHeader>
        <CardContent>
          {(speakersList || []).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Speaker queue is empty</p>
          ) : (
            <div className="space-y-2">
              {(speakersList || []).map((id, i) => {
                const del = delegates.find(d => d.id === id);
                if (!del) return null;
                return (
                  <div key={id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
                    <span className="text-xs font-mono text-muted-foreground w-5 text-center">{i + 1}</span>
                    <span className="text-lg">{COUNTRIES_FLAGS[del.country] || '🏳️'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{del.name}</div>
                      <div className="text-xs text-muted-foreground">{del.country}</div>
                    </div>
                    {isAdmin && (
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeSpeaker(id)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}