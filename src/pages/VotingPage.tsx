import React, { useState } from 'react';
import { useCommittee } from '@/contexts/CommitteeContext';
import { useAuth } from '@/contexts/AuthContext';
import { COUNTRIES_FLAGS } from '@/data/mockData';
import { Vote, CheckCircle2, XCircle, MinusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

type VoteValue = 'for' | 'against' | 'abstain' | null;

export default function VotingPage() {
  const { 
    name, delegates, motions, updateMotionStatus, 
    activeVotingMotionId, delegateVotes, startVotingSession, castLiveVote,
    startCaucus, setPhase, resetTimer, updateCommitteeInfo
  } = useCommittee();
  
  const { isAdmin, userName } = useAuth();
  const navigate = useNavigate();
  const presentDelegates = delegates.filter(d => d.present);
  
  const [selectedMotionId, setSelectedMotionId] = useState<string>('');

  const pendingItems = motions.filter(m => m.status === 'pending');
  const pastMotions = motions.filter(m => m.status !== 'pending');
  
  const latestCompletedMotion = pastMotions.length > 0 ? pastMotions[0] : null;
  const myDelegate = delegates.find(d => d.country === userName);
  const myId = myDelegate?.id;

  if (!isAdmin) {
    if (activeVotingMotionId) {
        const activeMotion = motions.find(m => m.id === activeVotingMotionId);
        const myVote = myId ? delegateVotes[myId] : null;
        const isDraftRes = activeMotion?.type === 'Draft Resolution';

        return (
            <div className="space-y-6 max-w-4xl">
              <div className="flex items-center gap-3">
                 <div className="h-3 w-3 bg-destructive rounded-full animate-ping"></div>
                 <h1 className="font-heading text-2xl font-bold tracking-tight text-destructive">Live Voting in Progress</h1>
              </div>
              <Card className="border-primary shadow-lg border-2">
                 <CardHeader className="bg-primary/5 pb-4">
                    <div className="text-xs text-primary font-bold uppercase tracking-wider mb-1">{activeMotion?.type}</div>
                    <CardTitle className="font-heading text-xl">{activeMotion?.description}</CardTitle>
                 </CardHeader>
                 <CardContent className="pt-6 space-y-6">
                    <p className="text-center text-muted-foreground">
                      Please cast your vote. {isDraftRes ? "Abstentions are permitted for Draft Resolutions." : "Abstentions are not permitted for this motion."}
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                       <Button size="lg" className={`w-full sm:w-40 h-16 text-lg ${myVote === 'for' ? 'bg-success hover:bg-success/90 text-white ring-4 ring-success/30' : 'bg-muted text-foreground hover:bg-success/20'}`} onClick={() => myId && castLiveVote(myId, myVote === 'for' ? null : 'for')}>
                          <CheckCircle2 className="h-5 w-5 mr-2" /> For
                       </Button>
                       <Button size="lg" className={`w-full sm:w-40 h-16 text-lg ${myVote === 'against' ? 'bg-destructive hover:bg-destructive/90 text-white ring-4 ring-destructive/30' : 'bg-muted text-foreground hover:bg-destructive/20'}`} onClick={() => myId && castLiveVote(myId, myVote === 'against' ? null : 'against')}>
                          <XCircle className="h-5 w-5 mr-2" /> Against
                       </Button>
                       {isDraftRes && (
                         <Button size="lg" className={`w-full sm:w-40 h-16 text-lg ${myVote === 'abstain' ? 'bg-secondary-foreground text-secondary ring-4 ring-secondary-foreground/30' : 'bg-muted text-foreground hover:bg-secondary-foreground/20'}`} onClick={() => myId && castLiveVote(myId, myVote === 'abstain' ? null : 'abstain')}>
                            <MinusCircle className="h-5 w-5 mr-2" /> Abstain
                         </Button>
                       )}
                    </div>
                 </CardContent>
              </Card>
            </div>
        );
    }

    if (!latestCompletedMotion) {
      return (
        <div className="space-y-6 max-w-4xl">
          <h1 className="font-heading text-2xl font-bold tracking-tight">Voting Results</h1>
          <div className="text-center py-10 text-muted-foreground border border-dashed rounded-lg">
            No voting history available yet. The Chair has not started a vote.
          </div>
        </div>
      );
    }

    const isPass = latestCompletedMotion.status === 'passed';
    const fVotes = latestCompletedMotion.votes?.for_votes || 0;
    const aVotes = latestCompletedMotion.votes?.against || 0;
    const abVotes = latestCompletedMotion.votes?.abstain || 0;
    const subVotes = fVotes + aVotes;
    const fPercent = subVotes > 0 ? (fVotes / subVotes) * 100 : 0;

    return (
      <div className="space-y-6 max-w-4xl">
        <h1 className="font-heading text-2xl font-bold tracking-tight">Latest Vote Result</h1>
        <Card className="shadow-sm">
          <CardHeader className="pb-3 border-b border-border/50 bg-muted/10">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs text-primary font-bold uppercase tracking-wider mb-1">{latestCompletedMotion.type}</div>
                <CardTitle className="font-heading text-lg">{latestCompletedMotion.description}</CardTitle>
                <div className="text-xs text-muted-foreground mt-1">Proposed by {latestCompletedMotion.proposed_by}</div>
              </div>
              <Badge variant="outline" className={`px-3 py-1 ${isPass ? 'bg-success/15 text-success border-success/30' : 'bg-destructive/15 text-destructive border-destructive/30'}`}>
                {isPass ? '✓ PASSED' : '✗ FAILED'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="stat-card !p-4">
                <div className="font-heading text-3xl font-bold text-success">{fVotes}</div>
                <div className="text-xs text-muted-foreground mt-1">For</div>
              </div>
              <div className="stat-card !p-4">
                <div className="font-heading text-3xl font-bold text-destructive">{aVotes}</div>
                <div className="text-xs text-muted-foreground mt-1">Against</div>
              </div>
              <div className="stat-card !p-4">
                <div className="font-heading text-3xl font-bold text-muted-foreground">{abVotes}</div>
                <div className="text-xs text-muted-foreground mt-1">Abstain</div>
              </div>
            </div>
            
            <div className="space-y-2 mt-6">
              <div className="flex justify-between text-sm font-medium">
                <span className="text-muted-foreground">{fPercent.toFixed(1)}% in favor</span>
                <span className="text-muted-foreground">{fVotes + aVotes + abVotes} total votes cast</span>
              </div>
              <Progress value={fPercent} className="h-3" />
              <p className="text-xs text-center text-muted-foreground mt-2">
                (Percentage based on substantive votes: For & Against)
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeMotion = activeVotingMotionId 
     ? motions.find(m => m.id === activeVotingMotionId) 
     : motions.find(m => m.id === selectedMotionId);

  const totalVotes = Object.keys(delegateVotes).length;
  const forVotes = Object.values(delegateVotes).filter(v => v === 'for').length;
  const againstVotes = Object.values(delegateVotes).filter(v => v === 'against').length;
  const abstainVotes = Object.values(delegateVotes).filter(v => v === 'abstain').length;
  
  const substantiveVotes = forVotes + againstVotes;
  const forPercent = substantiveVotes > 0 ? (forVotes / substantiveVotes) * 100 : 0;
  
  const isDraftRes = activeMotion?.type === 'Draft Resolution';
  const targetVotes = isDraftRes 
     ? Math.ceil(presentDelegates.length * (2 / 3)) 
     : Math.floor(presentDelegates.length / 2) + 1;
     
  const passes = forVotes >= targetVotes;
  const allVoted = totalVotes === presentDelegates.length;

  const handleEndVoting = () => {
    if (activeMotion) {
      updateMotionStatus(activeMotion.id, passes ? 'passed' : 'failed', { 
         for_votes: forVotes, 
         against: againstVotes, 
         abstain: abstainVotes 
      });
      startVotingSession(null);
      setSelectedMotionId('');

      if (passes && activeMotion.type === 'Setting Agenda') {
         updateCommitteeInfo(name, activeMotion.description);
      }

      if (passes && (activeMotion.type === 'Moderated Caucus' || activeMotion.type === 'Unmoderated Caucus')) {
         startCaucus(activeMotion.id);
         setPhase(activeMotion.type === 'Moderated Caucus' ? 'moderated-caucus' : 'unmoderated-caucus');
         
         const timerSecs = activeMotion.type === 'Moderated Caucus' 
             ? (activeMotion.speaker_time || 60) 
             : (activeMotion.total_time ? activeMotion.total_time * 60 : 600);
         
         resetTimer(timerSecs);
         navigate('/motions');
      } else {
         setPhase('debate');
         resetTimer(90);
      }
    }
  };

  const voteButtonClass = (id: string, v: 'for' | 'against' | 'abstain') =>
    `h-8 w-8 ${delegateVotes[id] === v ? 'opacity-100 ring-2 ring-offset-1 ring-primary' : 'opacity-40 hover:opacity-80'} transition-all`;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold tracking-tight">Voting Procedure</h1>
        {isAdmin && selectedMotionId && !activeVotingMotionId && (
          <Button onClick={() => startVotingSession(selectedMotionId)}>
            Start Live Voting
          </Button>
        )}
        {isAdmin && activeVotingMotionId && (
          <Button variant="default" className="bg-success hover:bg-success/90" onClick={handleEndVoting}>
            Finalize Vote & Commit
          </Button>
        )}
      </div>

      {isAdmin && !activeVotingMotionId && pendingItems.length > 0 && (
         <Card className="border-primary/30">
           <CardContent className="p-4 flex gap-3 items-center">
             <label className="text-sm font-medium whitespace-nowrap">Select item to vote on:</label>
             <Select value={selectedMotionId} onValueChange={setSelectedMotionId}>
               <SelectTrigger>
                 <SelectValue placeholder="Choose a pending motion..." />
               </SelectTrigger>
               <SelectContent>
                 {pendingItems.map(m => (
                   <SelectItem key={m.id} value={m.id}>
                     {m.type} - {m.description}
                   </SelectItem>
                 ))}
               </SelectContent>
             </Select>
           </CardContent>
         </Card>
      )}

      {(!activeMotion && pendingItems.length === 0) && (
         <div className="text-center py-10 text-muted-foreground border border-dashed rounded-lg">
           No pending motions available for voting.
         </div>
      )}

      {activeMotion && (
        <Card>
          <CardHeader className="pb-3 border-b border-border/50 bg-muted/10">
            <div className="flex items-start justify-between">
               <div>
                  <div className="text-xs text-primary font-bold uppercase tracking-wider mb-1">{activeMotion.type}</div>
                  <CardTitle className="font-heading text-lg">{activeMotion.description}</CardTitle>
               </div>
               <div className="text-right">
                  <div className="text-xs text-muted-foreground">Votes required to pass</div>
                  <div className="font-mono text-xl font-bold text-foreground">{targetVotes}</div>
                  <div className="text-[10px] text-muted-foreground">{isDraftRes ? '2/3 Majority' : 'Simple Majority'}</div>
               </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="stat-card !p-4">
                <div className="font-heading text-2xl font-bold text-success">{forVotes}</div>
                <div className="text-xs text-muted-foreground">For</div>
              </div>
              <div className="stat-card !p-4">
                <div className="font-heading text-2xl font-bold text-destructive">{againstVotes}</div>
                <div className="text-xs text-muted-foreground">Against</div>
              </div>
              <div className="stat-card !p-4">
                <div className="font-heading text-2xl font-bold text-muted-foreground">{abstainVotes}</div>
                <div className="text-xs text-muted-foreground">Abstain</div>
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{totalVotes}/{presentDelegates.length} delegates voted</span>
                <span>{forPercent.toFixed(0)}% in favor (Substantive)</span>
              </div>
              <Progress value={forPercent} className="h-2" />
            </div>
            
            {allVoted && totalVotes > 0 && (
              <div className={`text-center p-3 rounded-lg font-heading font-semibold text-sm ${passes ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive'}`}>
                {passes ? '✓ THRESHOLD MET - MOTION WILL PASS' : '✗ THRESHOLD NOT MET - MOTION WILL FAIL'}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeVotingMotionId && activeMotion && (
        <Card className="border-primary/50 shadow-md">
          <CardHeader className="pb-3 bg-primary/5">
            <CardTitle className="font-heading text-base flex items-center justify-between text-primary">
              <div className="flex items-center gap-2">
                 <Vote className="h-4 w-4" /> Live Roll Call
              </div>
              <Badge variant="outline" className="text-xs font-normal border-primary/30">
                 Delegates can vote on their screens
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-4">
            {presentDelegates.map((d, i) => {
              const hasVoted = delegateVotes[d.id] !== undefined;
              return (
                <div key={d.id} className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${hasVoted ? 'bg-muted/30 border-border' : 'bg-background border-primary/30'} animate-fade-in`} style={{ animationDelay: `${i * 40}ms` }}>
                  <span className="text-lg">{COUNTRIES_FLAGS[d.country] || '🏳️'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{d.country}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      {hasVoted ? <span className="text-success flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Voted</span> : <span className="text-warning animate-pulse">Waiting for vote...</span>}
                    </div>
                  </div>
                  <div className="flex gap-1 bg-muted/50 p-1 rounded-md">
                    <Button size="icon" variant="ghost" className={voteButtonClass(d.id, 'for')} onClick={() => castLiveVote(d.id, delegateVotes[d.id] === 'for' ? null : 'for')}>
                      <CheckCircle2 className="h-5 w-5 text-success" />
                    </Button>
                    <Button size="icon" variant="ghost" className={voteButtonClass(d.id, 'against')} onClick={() => castLiveVote(d.id, delegateVotes[d.id] === 'against' ? null : 'against')}>
                      <XCircle className="h-5 w-5 text-destructive" />
                    </Button>
                    {isDraftRes && (
                      <Button size="icon" variant="ghost" className={voteButtonClass(d.id, 'abstain')} onClick={() => castLiveVote(d.id, delegateVotes[d.id] === 'abstain' ? null : 'abstain')}>
                        <MinusCircle className="h-5 w-5 text-muted-foreground" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}