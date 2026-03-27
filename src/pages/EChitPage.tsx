import React, { useState, useRef } from 'react';
import { useCommittee } from '@/contexts/CommitteeContext';
import { useAuth } from '@/contexts/AuthContext';
import type { Chit } from '@/data/mockData';
import { Send, Inbox, ShieldAlert, Check, X, Reply, CornerDownRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

export default function EChitPage() {
  const { chits, sendChit, delegates, updateDelegateScore, updateChitEBStatus } = useCommittee();
  const { userName, isAdmin } = useAuth();
  
  const [toDelegate, setToDelegate] = useState('');
  const [message, setMessage] = useState('');
  const [chitType, setChitType] = useState<Chit['type']>('general');
  const [isViaEB, setIsViaEB] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  
  const [marksToAssign, setMarksToAssign] = useState<Record<string, string>>({});
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState('');

  const recipients = isAdmin
    ? delegates.map(d => d.country)
    : ['Chair', ...delegates.map(d => d.country).filter(c => c !== userName)];

  const handleSend = () => {
    if (!toDelegate || !message.trim()) return;
    
    // Forcefully mandate EB routing for questions and answers
    const forceViaEB = (!isAdmin) && (isViaEB || chitType === 'question' || chitType === 'answer');
    const initialEbStatus = forceViaEB ? 'pending' : 'approved';
    
    const newChit: Chit = {
      id: `c${Date.now()}`,
      from_delegate: isAdmin ? 'Chair' : userName,
      to_delegate: toDelegate,
      message: message.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read: false,
      type: chitType,
      via_eb: forceViaEB, 
      eb_status: initialEbStatus,
      marks: 0
    };
    
    sendChit(newChit);
    setMessage('');
    setIsViaEB(false);
  };

  const submitInlineReply = (parentChit: Chit) => {
    if (!replyMessage.trim()) return;

    let newType: Chit['type'] = 'general';
    if (parentChit.type === 'question') newType = 'answer';
    else if (parentChit.type === 'answer') newType = 'general';
    
    const forceViaEB = !isAdmin && newType === 'answer';
    const initialEbStatus = forceViaEB ? 'pending' : 'approved';

    const quotedText = parentChit.message.split('\n').map(line => `> ${line}`).join('\n');
    const trailingMessage = `${replyMessage.trim()}\n\n> --- Replying to ${parentChit.from_delegate} ---\n${quotedText}`;

    const newChit: Chit = {
      id: `c${Date.now()}`,
      from_delegate: isAdmin ? 'Chair' : userName, 
      to_delegate: parentChit.from_delegate, 
      message: trailingMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read: false,
      type: newType,
      via_eb: forceViaEB,
      eb_status: initialEbStatus,
      marks: 0
    };

    sendChit(newChit);
    setReplyingToId(null);
    setReplyMessage('');
  };

  const handleEBAction = (chit: Chit, status: 'approved' | 'rejected') => {
    // Only assign marks if it's a question or answer
    const isMarkable = chit.type === 'question' || chit.type === 'answer';
    const marks = isMarkable ? (parseInt(marksToAssign[chit.id]) || 0) : 0;
    
    updateChitEBStatus(chit.id, status, marks);
    
    if (marks > 0 && status === 'approved') {
      const del = delegates.find(d => d.country === chit.from_delegate);
      if (del) updateDelegateScore(del.id, 'chits', marks);
    }
  };

  const handleReply = (c: Chit) => {
    setToDelegate(c.from_delegate);
    setChitType('answer');
    setMessage(`\n\n--- Replying to [${c.type}] ---\n${c.message}`);
    if (c.type === 'question' && !isAdmin) setIsViaEB(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => messageInputRef.current?.focus(), 500);
  };

  const filteredInbox = chits.filter(c => {
    if (!isAdmin && c.to_delegate !== userName && c.from_delegate !== userName) return false;
    if (!isAdmin && c.to_delegate === userName && c.via_eb && c.eb_status === 'pending') return false;
    if (filterType !== 'all' && c.type !== filterType) return false;
    return true;
  });

  const sortedFilteredInbox = [...filteredInbox].reverse();
  const pendingEBChits = chits.filter(c => c.via_eb && c.eb_status === 'pending').reverse();

  const typeColors: Record<string, string> = {
    general: 'bg-primary/15 text-primary',
    'request-speak': 'bg-success/15 text-success',
    'request-motion': 'bg-warning/15 text-warning',
    'question': 'bg-info/15 text-info',
    'answer': 'bg-accent/15 text-accent',
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <h1 className="font-heading text-2xl font-bold tracking-tight">E-Chit</h1>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* COMPOSE SECTION */}
        <Card className="lg:col-span-2 h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-base">Compose New Chit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={toDelegate} onValueChange={setToDelegate}>
              <SelectTrigger><SelectValue placeholder="Send to..." /></SelectTrigger>
              <SelectContent>
                {recipients.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
            
            <Select value={chitType} onValueChange={(v: Chit['type']) => setChitType(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="question">Question</SelectItem>
                <SelectItem value="answer">Reply / Answer</SelectItem>
                <SelectItem value="request-speak">Request to Speak</SelectItem>
                <SelectItem value="request-motion">Request Motion</SelectItem>
              </SelectContent>
            </Select>
            
            {!isAdmin && (
              <div className="flex items-center space-x-2 bg-muted/30 p-2 rounded-md border border-border">
                <Checkbox 
                  id="via-eb" 
                  checked={isViaEB || chitType === 'question' || chitType === 'answer'} 
                  onCheckedChange={(checked) => setIsViaEB(checked as boolean)} 
                  disabled={chitType === 'question' || chitType === 'answer'} 
                />
                <label htmlFor="via-eb" className="text-sm font-medium leading-none cursor-pointer">
                  Route via Executive Board (EB) {(chitType === 'question' || chitType === 'answer') && '(Required)'}
                </label>
              </div>
            )}
            
            <Textarea 
              ref={messageInputRef}
              placeholder="Write your message..." 
              value={message} 
              onChange={e => setMessage(e.target.value)} 
              rows={6} 
            />
            <Button className="w-full" onClick={handleSend} disabled={!toDelegate || !message.trim()}>
              <Send className="h-4 w-4 mr-1.5" /> Send Chit
            </Button>
          </CardContent>
        </Card>

        {/* INBOX & EB SECTION */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* EB APPROVAL QUEUE */}
          {isAdmin && pendingEBChits.length > 0 && (
            <Card className="border-warning/50 shadow-sm">
              <CardHeader className="pb-3 bg-warning/5 border-b border-warning/20">
                <CardTitle className="font-heading text-base flex items-center gap-2 text-warning-foreground">
                  <ShieldAlert className="h-4 w-4 text-warning" /> EB Action Required ({pendingEBChits.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                  {pendingEBChits.map((c) => {
                    const isMarkable = c.type === 'question' || c.type === 'answer';
                    const maxMarks = 5; // Questions and Answers are out of 5
                    
                    return (
                      <div key={c.id} className="p-3 rounded-lg border border-warning/30 bg-background">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold">{c.from_delegate}</span>
                            <span className="text-xs text-muted-foreground">→ {c.to_delegate}</span>
                          </div>
                          <Badge variant="secondary" className={`border-0 text-[10px] ${typeColors[c.type]}`}>
                            {c.type.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-sm text-foreground/80 mb-3 p-2 bg-muted/30 rounded-md border whitespace-pre-wrap">{c.message}</p>
                        
                        <div className="flex items-center gap-2 justify-end mt-2 pt-2 border-t">
                          <div className="flex items-center gap-2 mr-auto">
                            {/* ONLY SHOW MARKING UI FOR QUESTIONS AND ANSWERS */}
                            {isMarkable && (
                              <>
                                <label className="text-xs font-medium text-muted-foreground">
                                  Assign Marks to <span className="text-foreground font-bold">{c.from_delegate}</span>:
                                </label>
                                <div className="flex items-center gap-1">
                                  <Input 
                                    type="number" 
                                    className="w-16 h-8 text-xs font-mono" 
                                    placeholder="0"
                                    min="0"
                                    max={maxMarks}
                                    value={marksToAssign[c.id] || ''}
                                    onChange={(e) => {
                                      const val = Math.min(maxMarks, Math.max(0, parseInt(e.target.value) || 0));
                                      setMarksToAssign({...marksToAssign, [c.id]: val.toString()})
                                    }}
                                  />
                                  <span className="text-xs text-muted-foreground">/ {maxMarks}</span>
                                </div>
                              </>
                            )}
                          </div>
                          <Button size="sm" variant="outline" className="h-8 text-destructive hover:bg-destructive/10" onClick={() => handleEBAction(c, 'rejected')}>
                            <X className="h-3.5 w-3.5 mr-1" /> Reject
                          </Button>
                          <Button size="sm" className="h-8 bg-success hover:bg-success/90 text-white" onClick={() => handleEBAction(c, 'approved')}>
                            <Check className="h-3.5 w-3.5 mr-1" /> Approve
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* INBOX */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="font-heading text-base flex items-center gap-2">
                  <Inbox className="h-4 w-4 text-primary" /> Messages
                </CardTitle>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-32 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="question">Question</SelectItem>
                    <SelectItem value="answer">Answers</SelectItem>
                    <SelectItem value="request-speak">Speak Req.</SelectItem>
                    <SelectItem value="request-motion">Motion Req.</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                {sortedFilteredInbox.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No messages</p>
                ) : sortedFilteredInbox.map((c, i) => {
                  const canReply = replyingToId !== c.id && c.from_delegate !== 'Chair' && (
                    isAdmin || c.to_delegate === userName
                  );

                  return (
                    <div key={c.id} className={`p-3 rounded-lg border ${c.read ? 'border-border bg-muted/20' : 'border-primary/30 bg-primary/5'} animate-fade-in`} style={{ animationDelay: `${i * 30}ms` }}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold">{c.from_delegate}</span>
                          <span className="text-xs text-muted-foreground">→ {c.to_delegate}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {c.via_eb && (
                            <Badge variant="outline" className="text-[9px] border-muted-foreground/30 text-muted-foreground">
                              Via EB: {c.eb_status} {isAdmin && c.marks > 0 ? `(+${c.marks})` : ''}
                            </Badge>
                          )}
                          <Badge variant="secondary" className={`border-0 text-[10px] ${typeColors[c.type]}`}>
                            {c.type === 'request-speak' ? 'Speak' : c.type === 'request-motion' ? 'Motion' : c.type}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">{c.timestamp}</span>
                        </div>
                      </div>
                      <p className="text-sm text-foreground/80 whitespace-pre-wrap">{c.message}</p>
                      
                      {canReply && (
                        <div className="mt-3 pt-2 border-t border-border/50 flex justify-end gap-2">
                          <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground hover:text-foreground" onClick={() => handleReply(c)}>
                            <Reply className="h-3 w-3 mr-1.5" /> Full Reply
                          </Button>
                          <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={() => setReplyingToId(c.id)}>
                            <CornerDownRight className="h-3 w-3 mr-1.5" /> Quick Reply
                          </Button>
                        </div>
                      )}

                      {replyingToId === c.id && (
                        <div className="mt-3 pt-3 border-t border-border/50 animate-in fade-in slide-in-from-top-2">
                          <div className="flex gap-2 items-start">
                            <CornerDownRight className="h-4 w-4 text-muted-foreground mt-2 shrink-0" />
                            <div className="flex-1 space-y-2">
                              <div className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                                Replying to {c.from_delegate}
                                {(!isAdmin && (c.type === 'question' || c.type === 'answer')) && (
                                  <span className="text-info bg-info/10 px-1.5 py-0.5 rounded">Will route via EB for approval</span>
                                )}
                                {isAdmin && (
                                  <span className="text-success bg-success/10 px-1.5 py-0.5 rounded">Official EB Reply</span>
                                )}
                              </div>
                              <Textarea 
                                placeholder="Write your trailing reply..." 
                                value={replyMessage}
                                onChange={e => setReplyMessage(e.target.value)}
                                rows={3}
                                autoFocus
                                className="text-sm"
                              />
                              <div className="flex justify-end gap-2">
                                <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setReplyingToId(null); setReplyMessage(''); }}>
                                  Cancel
                                </Button>
                                <Button size="sm" className="h-8 text-xs" disabled={!replyMessage.trim()} onClick={() => submitInlineReply(c)}>
                                  <Send className="h-3 w-3 mr-1.5" /> Send Reply
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}