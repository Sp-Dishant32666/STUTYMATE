export type TabId = 'scan' | 'market' | 'chill' | 'history';

export type DateStatus = 'matches_today' | 'old_date' | 'missing_date';
export type ContentRichness = 'empty' | 'sparse' | 'moderate' | 'dense' | 'exceptional';
export type VerificationStatus = 'verified' | 'exception_approved' | 'rejected';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface PageAnalysisResult {
  isNotebookPage: boolean;
  cornerDateText: string | null;
  normalizedCornerDate: string | null;
  dateStatus: DateStatus;
  cornerDateNote: string;
  isRepeatedPage: boolean;
  matchedScanId: string | null;
  matchedScanDate: string | null;
  topic: string;
  contentSummary: string;
  contentRichness: ContentRichness;
  calculatedPoints: number;
  openingQuestion: string;
}

export interface ScanRecord {
  id: string;
  scannedAt: string;
  scannedDateKey: string; // YYYY-MM-DD
  cornerDate: string | null;
  dateStatus: DateStatus;
  isRepeatedPage: boolean;
  matchedScanId: string | null;
  topic: string;
  summary: string;
  contentRichness: ContentRichness;
  pointsAwarded: number;
  status: VerificationStatus;
  thumbnailDataUrl: string;
  chatTranscript?: ChatMessage[];
}

export interface MarketplacePurchase {
  id: string;
  title: string;
  minutesAdded: number;
  pointsSpent: number;
  purchasedAt: string;
}

export interface ActiveChillSession {
  totalSeconds: number;
  remainingSeconds: number;
  isRunning: boolean;
  startedAt: string;
  lastTickAt: number;
}

export interface LedgerState {
  pointsBalance: number;
  chillBankMinutes: number; // Starts at 240 mins (4 hours)
  dailyChillUsedDate: string; // YYYY-MM-DD
  dailyChillUsedMinutes: number;
  purchases: MarketplacePurchase[];
  activeSession: ActiveChillSession | null;
}

export interface ChillPack {
  id: string;
  title: string;
  minutes: number;
  pointsCost: number;
  note: string;
  featured?: boolean;
}
