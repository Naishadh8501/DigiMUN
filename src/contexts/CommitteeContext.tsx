// eslint-disable-next-line react-refresh/only-export-components
import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { toast } from 'sonner';
import type { Phase, Delegate, Motion, Chit, Announcement, ActivityEntry, ActivePoint, PointType, Verbatim, VerbatimPermission, Resolution } from '@/data/mockData';

// Dynamically configure API and WebSocket URLs for local dev and Render production
const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001/api';
// Automatically convert http:// to ws:// and https:// to wss://
const WS_URL = import.meta.env.VITE_WS_URL || API_URL.replace(/^http/, 'ws') + '/ws';
// -----------------------------------

const POINT_PRIORITY: Record<PointType, number> = {
  'Personal Privilege': 1,
  'Information': 2,
  'Order': 3,
  'Inquiry': 4
};

interface CommitteeState {
  name: string;
  agenda: string;
  phase: Phase;
  timerSeconds: number;       
  timerDbSeconds: number;     
  timerRunning: boolean;
  timerTotal: number;
  lastStartedAt: number | null; 
  speakersList: string[];
  currentSpeaker: string | null;
  floorOpen: boolean;
  motionsFloorOpen: boolean; 
  activeVotingMotionId: string | null; 
  delegateVotes: Record<string, 'for' | 'against' | 'abstain'>; 
  activeCaucusId: string | null; 
  caucusSpeakersList: string[]; 
  caucusCurrentSpeaker: string | null; 
  caucusFloorOpen: boolean; 
  currentYieldType: 'questions' | 'delegate' | null; 
  yieldTarget: string | null; 
  questionQueue: string[];
  activePoints: ActivePoint[]; 
  delegates: Delegate[];
  motions: Motion[];
  chits: Chit[];
  announcements: Announcement[];
  activityLog: ActivityEntry[];
  verbatims: Verbatim[]; 
  verbatimPermissions: VerbatimPermission[]; 
  resolutions: Resolution[]; // NEW
}

interface CommitteeActions {
  updateCommitteeInfo: (name: string, agenda: string) => void;
  setPhase: (p: Phase) => void;
  startTimer: (seconds?: number) => void;
  pauseTimer: () => void;
  resetTimer: (seconds?: number) => void;
  setTimerTotal: (total: number) => void;
  toggleFloor: (isOpen: boolean) => void;
  toggleMotionsFloor: (isOpen: boolean) => void; 
  startVotingSession: (motionId: string | null) => void; 
  castLiveVote: (delegateId: string, vote: 'for' | 'against' | 'abstain' | null) => void; 
  startCaucus: (motionId: string | null) => void; 
  toggleCaucusFloor: (isOpen: boolean) => void; 
  addCaucusSpeaker: (id: string) => void; 
  removeCaucusSpeaker: (id: string) => void; 
  nextCaucusSpeaker: () => void; 
  updateYield: (type: 'questions' | 'delegate' | null, target: string | null) => void; 
  toggleQuestionRequest: (id: string, action: 'add' | 'remove' | 'clear') => void;
  addSpeaker: (id: string) => void;
  removeSpeaker: (id: string) => void;
  nextSpeaker: () => void;
  addMotion: (m: Motion) => void;
  updateMotionStatus: (id: string, status: string, votes?: any) => void; 
  raisePoint: (type: PointType, delegate: string) => void; 
  dismissPoint: (id: string) => void; 
  sendChit: (c: Chit) => void;
  updateChitEBStatus: (chitId: string, eb_status: string, marks: number) => void;
  addAnnouncement: (a: Announcement) => void;
  addActivityEntry: (entry: ActivityEntry) => void;
  updateDelegateScore: (delegateId: string, category: string, score: number) => void;
  addVerbatim: (v: Verbatim) => void;
  grantVerbatimPermission: (p: VerbatimPermission) => void;
  removeVerbatimPermission: (delegateId: string, topic: string) => void;
  uploadResolution: (formData: FormData) => Promise<boolean>; // NEW
  reviewResolution: (id: string, status: 'approved' | 'rejected', marks: number) => Promise<void>; // NEW
}

type ContextType = CommitteeState & CommitteeActions;
const CommitteeContext = createContext<ContextType | undefined>(undefined);

export function CommitteeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CommitteeState>({
    name: 'Loading...',
    agenda: 'Connecting to database...',
    phase: 'debate' as Phase,
    timerSeconds: 90,
    timerDbSeconds: 90,
    timerRunning: false,
    timerTotal: 90,
    lastStartedAt: null,
    speakersList: [],
    currentSpeaker: null,
    floorOpen: false,
    motionsFloorOpen: false,
    activeVotingMotionId: null,
    delegateVotes: {},
    activeCaucusId: null,
    caucusSpeakersList: [],
    caucusCurrentSpeaker: null,
    caucusFloorOpen: false,
    currentYieldType: null,
    yieldTarget: null,
    questionQueue: [],
    activePoints: [],
    delegates: [],
    motions: [],
    chits: [],
    announcements: [],
    activityLog: [],
    verbatims: [], 
    verbatimPermissions: [],
    resolutions: [] // NEW
  });

  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  const ws = useRef<WebSocket | null>(null);
  const lastMutationRef = useRef<number>(0);
  const lockState = () => { lastMutationRef.current = Date.now(); };
  
  const role = localStorage.getItem('digimun-role') || '';
  const isAdmin = role === 'chair' || role === 'vice-chair';

  useEffect(() => {
    let isMounted = true;
    const connectWs = () => {
      ws.current = new WebSocket(WS_URL);
      
      ws.current.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        const myUsername = localStorage.getItem('digimun-username') || '';

        // --- NEW: RESOLUTION WS HANDLERS ---
        if (msg.type === 'RESOLUTION_UPLOADED') {
          lockState();
          setState(p => ({ ...p, resolutions: [msg.data, ...p.resolutions] }));
          if (isAdmin) {
            toast.info('New Draft Resolution Submitted', { description: `${msg.data.title} by ${msg.data.uploaded_by}`, icon: '📄' });
          }
        }

        if (msg.type === 'RESOLUTION_REVIEWED') {
          lockState();
          setState(p => ({
            ...p,
            resolutions: p.resolutions.map(r => r.id === msg.data.id ? { ...r, status: msg.data.status, marks: msg.data.marks } : r)
          }));
          
          if (!isAdmin) {
            const updatedRes = stateRef.current.resolutions.find(r => r.id === msg.data.id);
            if (updatedRes && (updatedRes.uploaded_by === myUsername || updatedRes.authors.includes(myUsername))) {
               toast[msg.data.status === 'approved' ? 'success' : 'error'](
                 `Resolution ${msg.data.status.toUpperCase()}`,
                 { description: `The EB has reviewed: ${updatedRes.title}` }
               );
            }
          }
        }
        // -----------------------------------

        if (msg.type === 'COMMITTEE_INFO_UPDATE') {
           lockState();
           setState(p => ({ ...p, name: msg.data.name, agenda: msg.data.agenda }));
        }

        if (msg.type === 'VERBATIM_UPDATE') { lockState(); setState(p => ({ ...p, verbatims: [msg.data, ...p.verbatims] })); }
        if (msg.type === 'VERBATIM_PERMS_UPDATE') { lockState(); setState(p => ({ ...p, verbatimPermissions: msg.data.permissions })); }
        
        if (msg.type === 'SPEECH_FINISHED') {
           const activeDel = stateRef.current.delegates.find(d => d.country === myUsername);
           if (msg.data.delegateId === activeDel?.id) {
              toast.info('Your speech has concluded.', { 
                description: 'Please go to the Verbatim page to upload your transcript for marking.', 
                duration: 10000 
              });
           }
        }

        if (msg.type === 'YIELD_UPDATE') {
           lockState();
           setState(p => ({ ...p, currentYieldType: msg.data.type, yieldTarget: msg.data.target }));
        }

        if (msg.type === 'QUESTION_QUEUE_UPDATE') {
           lockState();
           setState(p => ({ ...p, questionQueue: msg.data.question_queue || [] }));
        }

        if (msg.type === 'CAUCUS_SESSION_UPDATE') {
           lockState();
           setState(p => ({ ...p, activeCaucusId: msg.data.active_caucus_id, ...(msg.data.active_caucus_id === null ? { caucusSpeakersList: [], caucusCurrentSpeaker: null, caucusFloorOpen: false } : {}) }));
        }
        if (msg.type === 'CAUCUS_SPEAKER_UPDATE') {
           lockState();
           setState(p => ({ ...p, caucusSpeakersList: msg.data.caucus_speakers_list || [], caucusCurrentSpeaker: msg.data.caucus_current_speaker }));
        }
        if (msg.type === 'CAUCUS_FLOOR_UPDATE') {
           lockState();
           setState(p => ({ ...p, caucusFloorOpen: msg.data.caucus_floor_open }));
        }

        if (msg.type === 'VOTING_SESSION_UPDATE') {
           lockState();
           setState(p => ({ ...p, activeVotingMotionId: msg.data.motionId, delegateVotes: msg.data.votes || {} }));
        }
        
        if (msg.type === 'DELEGATE_VOTE_CAST') {
           lockState();
           setState(p => {
              const newVotes = { ...(p.delegateVotes || {}) };
              if (msg.data.vote === null) delete newVotes[msg.data.delegateId];
              else newVotes[msg.data.delegateId] = msg.data.vote;
              return { ...p, delegateVotes: newVotes };
           });
        }
        
        if (msg.type === 'POINT_RAISED') {
          if (isAdmin) {
            toast.warning(`Point of ${msg.data.type} raised by ${msg.data.delegate}`, { duration: 8000, icon: '✋' });
          }
          setState(prev => {
            const newPoints = [...prev.activePoints, msg.data];
            newPoints.sort((a, b) => POINT_PRIORITY[a.type] - POINT_PRIORITY[b.type] || a.timestamp - b.timestamp);
            return { ...prev, activePoints: newPoints };
          });
        }
        
        if (msg.type === 'POINT_DISMISSED') {
          setState(prev => ({ ...prev, activePoints: prev.activePoints.filter(p => p.id !== msg.data.id) }));
        }

        if (msg.type === 'MOTIONS_FLOOR_UPDATE') {
          lockState();
          setState(prev => ({ ...prev, motionsFloorOpen: msg.data.motions_floor_open }));
        }

        if (msg.type === 'MOTION_STATUS_UPDATE') {
           lockState();
           setState(prev => {
             const motion = prev.motions.find(m => m.id === msg.data.id);
             
             if (motion && motion.status === 'pending' && msg.data.updates.status !== 'pending') {
               const isPass = msg.data.updates.status === 'passed';
               toast[isPass ? 'success' : 'error'](`Motion ${isPass ? 'Passed' : 'Failed'}`, {
                 description: `${motion.type} - ${motion.description}`,
                 duration: 7000
               });
             }

             return {
               ...prev,
               motions: prev.motions.map(m => m.id === msg.data.id ? { 
                 ...m, 
                 status: msg.data.updates.status as 'pending' | 'passed' | 'failed',
                 votes: {
                   for_votes: msg.data.updates.votes_for || 0,
                   against: msg.data.updates.votes_against || 0,
                   abstain: msg.data.updates.votes_abstain || 0
                 }
               } : m)
             };
           });
        }

        // --- NEW CHIT NOTIFICATION LOGIC ---
        if (msg.type === 'CHIT_UPDATE') { 
          lockState(); 
          setState(prev => ({ ...prev, chits: [...prev.chits, msg.data] })); 

          if (isAdmin && msg.data.via_eb && msg.data.eb_status === 'pending') {
            toast('EB Action Required: Pending Chit', {
              description: `From ${msg.data.from_delegate} to ${msg.data.to_delegate}`,
              icon: '🛡️',
            });
          } else if (!isAdmin && msg.data.to_delegate === myUsername && msg.data.from_delegate !== myUsername) {
            if (!msg.data.via_eb || msg.data.eb_status === 'approved') {
              toast('New E-Chit Received', {
                description: `From ${msg.data.from_delegate}`,
                icon: '✉️',
              });
            }
          }
        }

        if (msg.type === 'CHIT_EB_UPDATE') { 
          lockState(); 
          setState(prev => ({ ...prev, chits: prev.chits.map(c => c.id === msg.data.chitId ? { ...c, eb_status: msg.data.eb_status, marks: msg.data.marks } : c) })); 

          if (!isAdmin && msg.data.eb_status === 'approved') {
            const updatedChit = stateRef.current.chits.find(c => c.id === msg.data.chitId);
            if (updatedChit && updatedChit.to_delegate === myUsername) {
              toast('Approved E-Chit Received', {
                description: `Routed from ${updatedChit.from_delegate} via EB`,
                icon: '✉️',
              });
            }
          }
        }
        // ------------------------------------

        if (msg.type === 'MOTION_UPDATE') { lockState(); setState(prev => ({ ...prev, motions: [msg.data, ...prev.motions] })); }
        if (msg.type === 'PHASE_UPDATE') { lockState(); setState(prev => ({ ...prev, phase: msg.data.phase })); }
        if (msg.type === 'SCORE_UPDATE') { lockState(); setState(prev => ({ ...prev, delegates: prev.delegates.map(d => d.id === msg.data.delegateId ? { ...d, scores: { ...d.scores, [msg.data.category]: msg.data.score } } : d) })); }
        if (msg.type === 'ACTIVITY_UPDATE') { lockState(); setState(prev => ({ ...prev, activityLog: [msg.data, ...prev.activityLog] })); }
        if (msg.type === 'ANNOUNCEMENT_UPDATE') { lockState(); setState(prev => ({ ...prev, announcements: [msg.data, ...prev.announcements] })); }
        
        if (msg.type === 'TIMER_UPDATE') {
          lockState();
          const { timer_seconds, timer_running, timer_total, last_started_at } = msg.data;
          const safeRunning = timer_seconds <= 0 ? false : timer_running;
          const safeSeconds = timer_seconds <= 0 ? 0 : timer_seconds;
          setState(prev => ({ ...prev, timerSeconds: safeSeconds, timerDbSeconds: safeSeconds, timerRunning: safeRunning, timerTotal: timer_total, lastStartedAt: safeRunning ? last_started_at : null }));
        }
        
        if (msg.type === 'SPEAKER_UPDATE') { lockState(); setState(prev => ({ ...prev, speakersList: msg.data.speakers_list || [], currentSpeaker: msg.data.current_speaker })); }
        if (msg.type === 'FLOOR_UPDATE') { lockState(); setState(prev => ({ ...prev, floorOpen: msg.data.floor_open })); }
      };

      ws.current.onclose = () => { if (isMounted) setTimeout(connectWs, 3000); };
    };

    connectWs();
    return () => { isMounted = false; ws.current?.close(); };
  }, [isAdmin]);

  useEffect(() => {
    const syncDatabase = async () => {
      try {
        const currentRole = localStorage.getItem('digimun-role') || '';

        const [delegatesRes, motionsRes, chitsRes, committeeRes, activityRes, announceRes, verbatimRes, resolutionsRes] = await Promise.all([
          fetch(`${API_URL}/delegates/`, { headers: { 'X-Role': currentRole } }), 
          fetch(`${API_URL}/motions/`), 
          fetch(`${API_URL}/chits/`),
          fetch(`${API_URL}/committee/`), 
          fetch(`${API_URL}/activity/`), 
          fetch(`${API_URL}/announcements/`),
          fetch(`${API_URL}/verbatims/`),
          fetch(`${API_URL}/resolutions/`) // NEW
        ]);

        const delegates = await delegatesRes.json();
        const motions = await motionsRes.json();
        const chits = await chitsRes.json();
        const committee = await committeeRes.json();
        const activityLog = await activityRes.json();
        const announcements = await announceRes.json();
        const verbatims = await verbatimRes.json();
        const resolutions = await resolutionsRes.json(); // NEW

        setState(prev => {
          const dbRunning = committee.timer_running === true;
          const dbLastStarted = committee.last_started_at ? Number(committee.last_started_at) : null;
          let newTimerRunning = dbRunning;
          let newTimerSeconds = committee.timer_seconds;
          let newTimerTotal = committee.timer_total;
          let newLastStartedAt = dbLastStarted;

          if (dbRunning && dbLastStarted) {
            const elapsed = Math.floor((Date.now() - dbLastStarted) / 1000);
            newTimerSeconds = Math.max(0, committee.timer_seconds - elapsed);
          }
          if (newTimerSeconds <= 0) {
            newTimerSeconds = 0; newTimerRunning = false; newLastStartedAt = null;
          }

          const safeSpeakers = JSON.stringify(prev.speakersList) === JSON.stringify(committee.speakers_list || []) 
            ? prev.speakersList : (committee.speakers_list || []);
          const safeCaucusSpeakers = JSON.stringify(prev.caucusSpeakersList) === JSON.stringify(committee.caucus_speakers_list || []) 
            ? prev.caucusSpeakersList : (committee.caucus_speakers_list || []);

          return {
            ...prev, delegates, motions, chits, activityLog, announcements, verbatims, resolutions,
            name: committee.name, agenda: committee.agenda, phase: committee.phase as Phase,
            speakersList: safeSpeakers, currentSpeaker: committee.current_speaker,
            floorOpen: committee.floor_open, motionsFloorOpen: committee.motions_floor_open, 
            activeVotingMotionId: committee.active_voting_motion_id, 
            delegateVotes: committee.delegate_votes || {}, 
            activeCaucusId: committee.active_caucus_id,
            caucusSpeakersList: safeCaucusSpeakers,
            caucusCurrentSpeaker: committee.caucus_current_speaker,
            caucusFloorOpen: committee.caucus_floor_open,
            currentYieldType: committee.current_yield_type, 
            yieldTarget: committee.yield_target,
            questionQueue: committee.question_queue || [], 
            verbatimPermissions: committee.verbatim_permissions || [],
            timerRunning: newTimerRunning, timerSeconds: newTimerSeconds, timerDbSeconds: committee.timer_seconds,
            timerTotal: newTimerTotal, lastStartedAt: newLastStartedAt,
          };
        });
      } catch (error) { console.error(error); }
    };
    syncDatabase(); 
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (state.timerRunning) {
      interval = setInterval(() => {
        setState(prev => {
          if (!prev.timerRunning) return prev;
          if (prev.lastStartedAt) {
            const elapsed = Math.floor((Date.now() - prev.lastStartedAt) / 1000);
            const remaining = Math.max(0, prev.timerDbSeconds - elapsed);
            if (remaining <= 0) { lockState(); return { ...prev, timerSeconds: 0, timerRunning: false }; }
            if (remaining !== prev.timerSeconds) return { ...prev, timerSeconds: remaining };
            return prev;
          } else {
            if (prev.timerSeconds <= 1) { lockState(); return { ...prev, timerSeconds: 0, timerRunning: false }; }
            return { ...prev, timerSeconds: prev.timerSeconds - 1 };
          }
        });
      }, state.lastStartedAt ? 250 : 1000);
    }
    return () => clearInterval(interval);
  }, [state.timerRunning, state.lastStartedAt]);

  // --- NEW: RESOLUTION ACTIONS ---
  const uploadResolution = async (formData: FormData): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/resolutions/`, { method: 'POST', body: formData });
      if (res.ok) {
        const newRes = await res.json();
        if (ws.current?.readyState === WebSocket.OPEN) ws.current.send(JSON.stringify({ type: 'RESOLUTION_UPLOADED', data: newRes }));
        setState(p => ({ ...p, resolutions: [newRes, ...p.resolutions] }));
        return true;
      }
      return false;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  const reviewResolution = async (id: string, status: 'approved' | 'rejected', marks: number) => {
    try {
      const res = await fetch(`${API_URL}/resolutions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, marks })
      });
      if (res.ok) {
        if (ws.current?.readyState === WebSocket.OPEN) ws.current.send(JSON.stringify({ type: 'RESOLUTION_REVIEWED', data: { id, status, marks } }));
        setState(p => ({
          ...p,
          resolutions: p.resolutions.map(r => r.id === id ? { ...r, status, marks } : r)
        }));
      }
    } catch (e) {
      console.error(e);
    }
  };
  // -------------------------------

  const updateCommitteeInfo = async (newName: string, newAgenda: string) => {
    lockState();
    try {
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({ type: 'COMMITTEE_INFO_UPDATE', data: { name: newName, agenda: newAgenda } }));
      }
      await fetch(`${API_URL}/committee/info`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, agenda: newAgenda })
      });
      setState(p => ({ ...p, name: newName, agenda: newAgenda }));
    } catch(e) { console.error(e); }
  };

  const updateYield = async (type: 'questions' | 'delegate' | null, target: string | null) => {
    lockState();
    try {
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({ type: 'YIELD_UPDATE', data: { type, target } }));
      }
      await fetch(`${API_URL}/committee/yield`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_yield_type: type, yield_target: target })
      });
      setState(p => ({ ...p, currentYieldType: type, yieldTarget: target }));
      if (type !== 'questions') {
        toggleQuestionRequest('', 'clear');
      }
    } catch(e) { console.error(e); }
  };

  const toggleQuestionRequest = async (id: string, action: 'add' | 'remove' | 'clear') => {
    lockState();
    let newQueue = [...(stateRef.current.questionQueue || [])];
    
    if (action === 'clear') {
      newQueue = [];
    } else if (action === 'add' && !newQueue.includes(id)) {
      newQueue.push(id);
    } else if (action === 'remove') {
      newQueue = newQueue.filter(x => x !== id);
    } else {
      return;
    }

    setState(p => ({ ...p, questionQueue: newQueue }));
    
    try {
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({ type: 'QUESTION_QUEUE_UPDATE', data: { question_queue: newQueue } }));
      }
      await fetch(`${API_URL}/committee/question_queue`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question_queue: newQueue })
      });
    } catch (e) { console.error(e); }
  };

  const startCaucus = async (motionId: string | null) => {
    lockState();
    try {
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({ type: 'CAUCUS_SESSION_UPDATE', data: { active_caucus_id: motionId } }));
      }
      await fetch(`${API_URL}/committee/caucus_session`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active_caucus_id: motionId })
      });
      setState(p => ({ ...p, activeCaucusId: motionId, ...(motionId === null ? { caucusSpeakersList: [], caucusCurrentSpeaker: null, caucusFloorOpen: false } : {}) }));
    } catch (e) { console.error(e); }
  };

  const toggleCaucusFloor = async (isOpen: boolean) => {
    lockState();
    try {
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({ type: 'CAUCUS_FLOOR_UPDATE', data: { caucus_floor_open: isOpen } }));
      }
      await fetch(`${API_URL}/committee/caucus_floor`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caucus_floor_open: isOpen })
      });
      setState(p => ({ ...p, caucusFloorOpen: isOpen }));
    } catch (e) { console.error(e); }
  };

  const addCaucusSpeaker = async (id: string) => {
    lockState();
    if ((state.caucusSpeakersList || []).includes(id)) return;
    const newList = [...(state.caucusSpeakersList || []), id];
    setState(p => ({ ...p, caucusSpeakersList: newList }));
    try {
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({ type: 'CAUCUS_SPEAKER_UPDATE', data: { caucus_speakers_list: newList, caucus_current_speaker: state.caucusCurrentSpeaker } }));
      }
      await fetch(`${API_URL}/committee/caucus_speakers`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caucus_speakers_list: newList, caucus_current_speaker: state.caucusCurrentSpeaker })
      });
    } catch(e) {}
  };
  
  const removeCaucusSpeaker = async (id: string) => {
    lockState();
    const newList = (state.caucusSpeakersList || []).filter(s => s !== id);
    setState(p => ({ ...p, caucusSpeakersList: newList }));
    try {
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({ type: 'CAUCUS_SPEAKER_UPDATE', data: { caucus_speakers_list: newList, caucus_current_speaker: state.caucusCurrentSpeaker } }));
      }
      await fetch(`${API_URL}/committee/caucus_speakers`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caucus_speakers_list: newList, caucus_current_speaker: state.caucusCurrentSpeaker })
      });
    } catch(e) {}
  };
  
  const nextCaucusSpeaker = async () => {
    lockState();
    
    const outgoingSpk = stateRef.current.caucusCurrentSpeaker;
    if (outgoingSpk) {
       const activeMotion = stateRef.current.motions.find(m => m.id === stateRef.current.activeCaucusId);
       grantVerbatimPermission({ delegateId: outgoingSpk, type: 'mod_caucus', topic: activeMotion?.description || stateRef.current.agenda });
       if (ws.current?.readyState === WebSocket.OPEN) ws.current.send(JSON.stringify({ type: 'SPEECH_FINISHED', data: { delegateId: outgoingSpk } }));
    }

    let newList: string[] = [];
    let nextSpk: string | null = null;
    const currentQueue = state.caucusSpeakersList || [];

    if (currentQueue.length > 0) {
      const [next, ...rest] = currentQueue;
      nextSpk = next;
      newList = rest;
      
      const del = stateRef.current.delegates.find(d => d.id === nextSpk);
      if (del) addActivityEntry({ id: `act${Date.now()}`, type: 'speech', actor: del.country, description: `Recognized to speak in Caucus`, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
    }

    const newTimerSeconds = nextSpk ? state.timerTotal : state.timerSeconds;
    const newTimerRunning = false; 
    const now = null;

    setState(p => ({
      ...p,
      caucusCurrentSpeaker: nextSpk,
      caucusSpeakersList: newList,
      timerSeconds: newTimerSeconds,
      timerDbSeconds: newTimerSeconds,
      timerRunning: newTimerRunning,
      lastStartedAt: now
    }));
    
    try {
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({ type: 'CAUCUS_SPEAKER_UPDATE', data: { caucus_speakers_list: newList, caucus_current_speaker: nextSpk } }));
      }
      await fetch(`${API_URL}/committee/caucus_speakers`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caucus_speakers_list: newList, caucus_current_speaker: nextSpk })
      });
    } catch(e) {}
    await updateTimerInDB(newTimerSeconds, newTimerRunning, state.timerTotal, now);
  };

  const startVotingSession = async (motionId: string | null) => {
    lockState();
    try {
      if (ws.current?.readyState === WebSocket.OPEN) ws.current.send(JSON.stringify({ type: 'VOTING_SESSION_UPDATE', data: { motionId, votes: {} } }));
      await fetch(`${API_URL}/committee/voting_session`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active_voting_motion_id: motionId, delegate_votes: {} }) });
      setState(p => ({ ...p, activeVotingMotionId: motionId, delegateVotes: {} }));
      
      if (motionId) {
         const motionObj = stateRef.current.motions.find(m => m.id === motionId);
         if (motionObj) addActivityEntry({ id: `act${Date.now()}`, type: 'vote', actor: 'Chair', description: `Initiated voting on: ${motionObj.type}`, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
      }
    } catch (e) { console.error(e); }
  };

  const castLiveVote = async (delegateId: string, vote: 'for' | 'against' | 'abstain' | null) => {
    lockState();
    try {
      if (ws.current?.readyState === WebSocket.OPEN) ws.current.send(JSON.stringify({ type: 'DELEGATE_VOTE_CAST', data: { delegateId, vote } }));
      await fetch(`${API_URL}/committee/cast_vote`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ delegate_id: delegateId, vote }) });
      setState(p => {
        const newVotes = { ...(p.delegateVotes || {}) };
        if (vote === null) delete newVotes[delegateId];
        else newVotes[delegateId] = vote;
        return { ...p, delegateVotes: newVotes };
      });
    } catch (e) { console.error(e); }
  };

  const raisePoint = (type: PointType, delegate: string) => {
    const pt: ActivePoint = { id: `pt${Date.now()}`, type, delegate, timestamp: Date.now() };
    if (ws.current?.readyState === WebSocket.OPEN) ws.current.send(JSON.stringify({ type: 'POINT_RAISED', data: pt }));
    setState(prev => {
      const newPoints = [...prev.activePoints, pt];
      newPoints.sort((a, b) => POINT_PRIORITY[a.type] - POINT_PRIORITY[b.type] || a.timestamp - b.timestamp);
      return { ...prev, activePoints: newPoints };
    });
    addActivityEntry({ id: `act${Date.now()}`, type: 'announcement', actor: delegate, description: `Raised a Point of ${type}`, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
  };

  const dismissPoint = (id: string) => {
    if (ws.current?.readyState === WebSocket.OPEN) ws.current.send(JSON.stringify({ type: 'POINT_DISMISSED', data: { id } }));
    setState(prev => ({ ...prev, activePoints: prev.activePoints.filter(p => p.id !== id) }));
  };

  const toggleMotionsFloor = async (isOpen: boolean) => {
    lockState();
    try {
      if (ws.current?.readyState === WebSocket.OPEN) ws.current.send(JSON.stringify({ type: 'MOTIONS_FLOOR_UPDATE', data: { motions_floor_open: isOpen } }));
      await fetch(`${API_URL}/committee/motions_floor`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ motions_floor_open: isOpen }) });
      setState(p => ({ ...p, motionsFloorOpen: isOpen }));
    } catch (e) {}
  };

  const updateMotionStatus = async (id: string, status: string, votes: any = null) => {
    lockState();
    const payload = { status, votes_for: votes?.for_votes || 0, votes_against: votes?.against || 0, votes_abstain: votes?.abstain || 0 };
    
    const motionObj = stateRef.current.motions.find(m => m.id === id);
    if (motionObj && status !== 'pending') {
        const isPass = status === 'passed';
        toast[isPass ? 'success' : 'error'](`Vote Finalized: Motion ${isPass ? 'Passed' : 'Failed'}`, { description: `${motionObj.type} - ${motionObj.description}` });
        addActivityEntry({ id: `act${Date.now()}`, type: 'vote', actor: 'Committee', description: `Motion ${isPass ? 'Passed' : 'Failed'}: ${motionObj.type}`, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
    }

    try {
      if (ws.current?.readyState === WebSocket.OPEN) ws.current.send(JSON.stringify({ type: 'MOTION_STATUS_UPDATE', data: { id, updates: payload } }));
      await fetch(`${API_URL}/motions/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      
      setState(prev => ({
        ...prev,
        motions: prev.motions.map(m => m.id === id ? { 
          ...m, status: status as 'pending' | 'passed' | 'failed',
          votes: votes ? { for_votes: votes.for_votes || 0, against: votes.against || 0, abstain: votes.abstain || 0 } : m.votes
        } : m)
      }));
    } catch (e) {}
  };

  const updateSpeakersInDB = async (newList: string[], current: string | null) => {
    lockState();
    try {
      if (ws.current?.readyState === WebSocket.OPEN) ws.current.send(JSON.stringify({ type: 'SPEAKER_UPDATE', data: { speakers_list: newList, current_speaker: current } }));
      await fetch(`${API_URL}/committee/speakers`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ speakers_list: newList, current_speaker: current }) });
    } catch (e) {}
  };

  const updateTimerInDB = async (seconds: number, running: boolean, total: number, lastStarted: number | null) => {
    lockState();
    try {
      if (ws.current?.readyState === WebSocket.OPEN) ws.current.send(JSON.stringify({ type: 'TIMER_UPDATE', data: { timer_seconds: seconds, timer_running: running, timer_total: total, last_started_at: lastStarted } }));
      await fetch(`${API_URL}/committee/timer`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ timer_seconds: seconds, timer_running: running, timer_total: total, last_started_at: lastStarted }) });
    } catch (e) {}
  };

  const toggleFloor = async (isOpen: boolean) => {
    lockState();
    try {
      if (ws.current?.readyState === WebSocket.OPEN) ws.current.send(JSON.stringify({ type: 'FLOOR_UPDATE', data: { floor_open: isOpen } }));
      await fetch(`${API_URL}/committee/floor`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ floor_open: isOpen }) });
      setState(p => ({ ...p, floorOpen: isOpen }));
    } catch (e) {}
  };

  const setPhase = async (phase: Phase) => {
    lockState();
    try {
      if (ws.current?.readyState === WebSocket.OPEN) ws.current.send(JSON.stringify({ type: 'PHASE_UPDATE', data: { phase } }));
      await fetch(`${API_URL}/committee/phase?phase=${phase}`, { method: 'PUT' });
      setState(p => ({ ...p, phase }));
      addActivityEntry({ id: `act${Date.now()}`, type: 'phase', actor: 'Chair', description: `Committee transitioned to ${phase.replace('-', ' ')}`, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
    } catch (e) {}
  };

  const addMotion = async (m: Motion) => {
    lockState();
    try {
      if (ws.current?.readyState === WebSocket.OPEN) ws.current.send(JSON.stringify({ type: 'MOTION_UPDATE', data: m }));
      const res = await fetch(`${API_URL}/motions/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(m) });
      if (res.ok) { 
         const newMotion = await res.json(); 
         setState(p => ({ ...p, motions: [newMotion, ...p.motions] })); 
         addActivityEntry({ id: `act${Date.now()}`, type: 'motion', actor: m.proposed_by, description: `Raised a motion: ${m.type}`, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
      }
    } catch (e) {}
  };

  const sendChit = async (c: Chit) => {
    lockState();
    try {
      if (ws.current?.readyState === WebSocket.OPEN) ws.current.send(JSON.stringify({ type: 'CHIT_UPDATE', data: c }));
      const res = await fetch(`${API_URL}/chits/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(c) });
      if (res.ok) { const newChit = await res.json(); setState(p => ({ ...p, chits: [...p.chits, newChit] })); }
    } catch (e) {}
  };

  const updateChitEBStatus = async (chitId: string, eb_status: string, marks: number) => {
    lockState();
    try {
      if (ws.current?.readyState === WebSocket.OPEN) ws.current.send(JSON.stringify({ type: 'CHIT_EB_UPDATE', data: { chitId, eb_status, marks } }));
      await fetch(`${API_URL}/chits/${chitId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ eb_status, marks }) });
      setState(p => ({ ...p, chits: p.chits.map(c => c.id === chitId ? { ...c, eb_status, marks } : c) }));
    } catch (e) {}
  };

  const updateDelegateScore = async (delegateId: string, category: string, score: number) => {
    lockState();
    try {
      if (ws.current?.readyState === WebSocket.OPEN) ws.current.send(JSON.stringify({ type: 'SCORE_UPDATE', data: { delegateId, category, score } }));
      await fetch(`${API_URL}/delegates/${delegateId}/scores?category=${category}&score=${score}`, { method: 'PUT' });
      setState(p => ({ ...p, delegates: p.delegates.map(d => d.id === delegateId ? { ...d, scores: { ...d.scores, [category]: score } } : d ) }));
    } catch (e) {}
  };

  const addActivityEntry = async (entry: ActivityEntry) => {
    lockState();
    try {
      if (ws.current?.readyState === WebSocket.OPEN) ws.current.send(JSON.stringify({ type: 'ACTIVITY_UPDATE', data: entry }));
      const res = await fetch(`${API_URL}/activity/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entry) });
      if (res.ok) { const newEntry = await res.json(); setState(p => ({ ...p, activityLog: [newEntry, ...p.activityLog] })); }
    } catch (e) {}
  };

  const addAnnouncement = async (a: Announcement) => {
    lockState();
    try {
      if (ws.current?.readyState === WebSocket.OPEN) ws.current.send(JSON.stringify({ type: 'ANNOUNCEMENT_UPDATE', data: a }));
      const res = await fetch(`${API_URL}/announcements/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(a) });
      if (res.ok) { const newAnnounce = await res.json(); setState(p => ({ ...p, announcements: [newAnnounce, ...p.announcements] })); }
    } catch (e) {}
  };

  const startTimer = async (seconds?: number) => {
    lockState();
    const newTotal = seconds ?? state.timerTotal; const newSeconds = seconds ?? state.timerSeconds; const now = Date.now();
    setState(p => ({ ...p, timerRunning: true, timerSeconds: newSeconds, timerDbSeconds: newSeconds, timerTotal: newTotal, lastStartedAt: now }));
    await updateTimerInDB(newSeconds, true, newTotal, now);
  };
  
  const pauseTimer = async () => {
    lockState(); const currentSecs = stateRef.current.timerSeconds;
    setState(p => ({ ...p, timerRunning: false, timerDbSeconds: currentSecs, timerSeconds: currentSecs, lastStartedAt: null }));
    await updateTimerInDB(currentSecs, false, state.timerTotal, null);
  };
  
  const resetTimer = async (seconds?: number) => {
    lockState(); const newTotal = seconds ?? state.timerTotal;
    setState(p => ({ ...p, timerSeconds: newTotal, timerDbSeconds: newTotal, timerRunning: false, timerTotal: newTotal, lastStartedAt: null }));
    await updateTimerInDB(newTotal, false, newTotal, null);
  };

  const setTimerTotal = async (total: number) => {
    lockState(); setState(p => ({ ...p, timerTotal: total }));
    await updateTimerInDB(state.timerSeconds, state.timerRunning, total, state.lastStartedAt);
  }

  const addSpeaker = async (id: string) => {
    lockState(); if ((state.speakersList || []).includes(id)) return;
    const newList = [...(state.speakersList || []), id];
    setState(p => ({ ...p, speakersList: newList })); await updateSpeakersInDB(newList, state.currentSpeaker);
  };
  
  const removeSpeaker = async (id: string) => {
    lockState(); const newList = (state.speakersList || []).filter(s => s !== id);
    setState(p => ({ ...p, speakersList: newList })); await updateSpeakersInDB(newList, state.currentSpeaker);
  };
  
  const nextSpeaker = async () => {
    lockState(); 

    const outgoingSpk = stateRef.current.currentSpeaker;
    if (outgoingSpk) {
       grantVerbatimPermission({ delegateId: outgoingSpk, type: 'gsl', topic: stateRef.current.agenda });
       if (ws.current?.readyState === WebSocket.OPEN) ws.current.send(JSON.stringify({ type: 'SPEECH_FINISHED', data: { delegateId: outgoingSpk } }));
    }

    let newList: string[] = []; let nextSpk: string | null = null;
    const currentQueue = state.speakersList || [];
    
    if (currentQueue.length > 0) { 
      const [next, ...rest] = currentQueue; 
      nextSpk = next; 
      newList = rest; 
      
      const del = stateRef.current.delegates.find(d => d.id === nextSpk);
      if (del) addActivityEntry({ id: `act${Date.now()}`, type: 'speech', actor: del.country, description: `Recognized to speak in General Debate`, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
    }
    
    const newTimerSeconds = nextSpk ? state.timerTotal : state.timerSeconds; 
    const newTimerRunning = false; 
    const now = null; 

    updateYield(null, null);
    toggleQuestionRequest('', 'clear');

    setState(p => ({ 
      ...p, currentSpeaker: nextSpk, speakersList: newList, 
      timerSeconds: newTimerSeconds, timerDbSeconds: newTimerSeconds, 
      timerRunning: newTimerRunning, lastStartedAt: now 
    }));
    
    await updateSpeakersInDB(newList, nextSpk); 
    await updateTimerInDB(newTimerSeconds, newTimerRunning, state.timerTotal, now);
  };

  const addVerbatim = async (v: Verbatim) => {
    lockState();
    try {
      if (ws.current?.readyState === WebSocket.OPEN) ws.current.send(JSON.stringify({ type: 'VERBATIM_UPDATE', data: v }));
      const res = await fetch(`${API_URL}/verbatims/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(v) });
      if (res.ok) { const newV = await res.json(); setState(p => ({ ...p, verbatims: [newV, ...p.verbatims] })); }
    } catch(e) {}
  };

  const grantVerbatimPermission = async (p: VerbatimPermission) => {
    lockState();
    const newPerms = [...stateRef.current.verbatimPermissions, p];
    setState(prev => ({ ...prev, verbatimPermissions: newPerms }));
    try {
      if (ws.current?.readyState === WebSocket.OPEN) ws.current.send(JSON.stringify({ type: 'VERBATIM_PERMS_UPDATE', data: { permissions: newPerms } }));
      await fetch(`${API_URL}/committee/verbatim_permissions`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ verbatim_permissions: newPerms }) });
    } catch(e) {}
  };

  const removeVerbatimPermission = async (delegateId: string, topic: string) => {
    lockState();
    const newPerms = stateRef.current.verbatimPermissions.filter(p => !(p.delegateId === delegateId && p.topic === topic));
    setState(prev => ({ ...prev, verbatimPermissions: newPerms }));
    try {
      if (ws.current?.readyState === WebSocket.OPEN) ws.current.send(JSON.stringify({ type: 'VERBATIM_PERMS_UPDATE', data: { permissions: newPerms } }));
      await fetch(`${API_URL}/committee/verbatim_permissions`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ verbatim_permissions: newPerms }) });
    } catch(e) {}
  };

  return (
    <CommitteeContext.Provider value={{
      ...state, setPhase, startTimer, pauseTimer, resetTimer, setTimerTotal, toggleFloor, toggleMotionsFloor,
      updateCommitteeInfo, startVotingSession, castLiveVote,
      startCaucus, toggleCaucusFloor, addCaucusSpeaker, removeCaucusSpeaker, nextCaucusSpeaker, updateYield, toggleQuestionRequest,
      addSpeaker, removeSpeaker, nextSpeaker, addMotion, updateMotionStatus,
      raisePoint, dismissPoint, sendChit, updateChitEBStatus, addAnnouncement, addActivityEntry, updateDelegateScore,
      addVerbatim, grantVerbatimPermission, removeVerbatimPermission,
      uploadResolution, reviewResolution
    }}>
      {children}
    </CommitteeContext.Provider>
  );
}

export function useCommittee() {
  const ctx = useContext(CommitteeContext);
  if (!ctx) throw new Error('useCommittee must be used within CommitteeProvider');
  return ctx;
}