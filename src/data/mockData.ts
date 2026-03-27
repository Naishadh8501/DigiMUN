export type Role = 'chair' | 'vice-chair' | 'delegate';
export type Phase = 'debate' | 'moderated-caucus' | 'unmoderated-caucus' | 'voting';
export type PointType = 'Personal Privilege' | 'Information' | 'Order' | 'Inquiry';

export interface ActivePoint {
  id: string;
  type: PointType;
  delegate: string;
  timestamp: number;
}

export interface Delegate {
  id: string;
  name: string;
  country: string;
  present: boolean;
  speeches: number;
  votes: { for_votes: number; against: number; abstain: number };
  scores: Record<string, number>;
  gsl_avg?: number;
  chits_score?: number;
  mod_avg?: number;
  total_score?: number;
}

export interface Motion {
  id: string;
  type: string;
  proposed_by: string; 
  description: string;
  status: 'pending' | 'passed' | 'failed';
  timestamp: string;
  total_time?: number | null;
  speaker_time?: number | null;
  votes?: { for_votes: number; against: number; abstain: number };
}

export interface Chit {
  id: string;
  from_delegate: string;
  to_delegate: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'general' | 'request-speak' | 'request-motion' | 'question' | 'answer';
  via_eb: boolean;
  eb_status: string;
  marks: number;
}

export interface Announcement {
  id: string;
  message: string;
  urgent: boolean;
  timestamp: string;
}

export interface ActivityEntry {
  id: string;
  type: 'motion' | 'vote' | 'speech' | 'chit' | 'phase' | 'announcement';
  description: string;
  actor: string;
  timestamp: string;
}

// NEW: Updated Resolution Interface for PDF Uploads
export interface Resolution {
  id: string;
  title: string;
  file_path: string;
  uploaded_by: string;
  authors: string[];
  signatories: string[];
  status: 'pending' | 'approved' | 'rejected';
  marks: number;
  timestamp: string;
}

export const RUBRIC_CATEGORIES = [
  { key: 'research', label: 'Research', max: 10 },
  { key: 'gsl', label: 'GSL', max: 10 },
  { key: 'agenda', label: 'Agenda Setting', max: 10 },
  { key: 'chits', label: 'Chits', max: 10 },
  { key: 'modCaucus', label: 'Moderated Caucus', max: 10 },
  { key: 'consultation', label: 'Consultation', max: 10 },
  { key: 'documentation', label: 'Documentation', max: 20 },
  { key: 'rop', label: 'ROP', max: 5 },
  { key: 'lobbying', label: 'Lobbying', max: 5 },
] as const;

export const COUNTRIES_FLAGS: Record<string, string> = {
  'United States': '🇺🇸',
  'India': '🇮🇳',
  'Mexico': '🇲🇽',
  'Egypt': '🇪🇬',
  'Japan': '🇯🇵',
  'Sweden': '🇸🇪',
  'Senegal': '🇸🇳',
  'China': '🇨🇳',
  'Brazil': '🇧🇷',
  'Nigeria': '🇳🇬',
};

export interface Verbatim {
  id: string;
  delegate_id: string;
  type: 'gsl' | 'mod_caucus';
  topic: string;
  text: string;
  timestamp: string;
}

export interface VerbatimPermission {
  delegateId: string;
  type: 'gsl' | 'mod_caucus';
  topic: string;
}