import { Clock, Flame } from 'lucide-react';
import { formatMinutesAsHours } from '../lib/storage';
import { TabId } from '../types';

interface TopBarProps {
  activeTab: TabId;
  onSelectTab: (tab: TabId) => void;
  pointsBalance: number;
  chillBankMinutes: number;
  hasActiveSession: boolean;
  activeRemainingSeconds: number | null;
}

const NAV_ITEMS: Array<{ id: TabId; label: string }> = [
  { id: 'scan', label: 'Scanner' },
  { id: 'market', label: 'Marketplace' },
  { id: 'chill', label: 'Chill Bank' },
  { id: 'history', label: 'Archive' },
];

function formatCompactTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function TopBar({
  activeTab,
  onSelectTab,
  pointsBalance,
  chillBankMinutes,
  hasActiveSession,
  activeRemainingSeconds,
}: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 bg-[#F7F7F5]/90 backdrop-blur-md border-b border-slate-200/80">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-[52px] md:h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-element Brand wordmark */}
        <button
          type="button"
          onClick={() => onSelectTab('scan')}
          className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
        >
          PageLedger
        </button>

        {/* Zone 2: Desktop single-line nav links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`py-1.5 transition-colors whitespace-nowrap shrink-0 border-b-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                  isActive
                    ? 'text-slate-900 border-blue-600 font-semibold'
                    : 'text-slate-600 border-transparent hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Single primary action / live bank readout */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => onSelectTab(hasActiveSession ? 'chill' : 'market')}
            className={`min-h-[38px] md:min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-2.5 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
              hasActiveSession
                ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                : 'bg-slate-900 text-white hover:bg-slate-800'
            }`}
          >
            {hasActiveSession && activeRemainingSeconds !== null ? (
              <>
                <Clock className="w-4 h-4 shrink-0" />
                <span className="font-mono tabular-nums">
                  Chill {formatCompactTimer(activeRemainingSeconds)}
                </span>
              </>
            ) : (
              <>
                <span className="font-mono tabular-nums">{pointsBalance} pts</span>
                <span className="text-slate-400" aria-hidden="true">
                  ·
                </span>
                <span className="font-mono tabular-nums flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-amber-400 hidden sm:inline" />
                  {formatMinutesAsHours(chillBankMinutes)}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
