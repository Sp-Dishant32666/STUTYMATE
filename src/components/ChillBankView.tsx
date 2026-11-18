import { useState } from 'react';
import { BookmarkCheck, Coffee, Pause, Play, Square } from 'lucide-react';
import { formatMinutesAsHours } from '../lib/storage';
import { ActiveChillSession } from '../types';

interface ChillBankViewProps {
  chillBankMinutes: number;
  dailyChillUsedMinutes: number;
  activeSession: ActiveChillSession | null;
  onStartSession: (minutes: number) => void;
  onTogglePause: () => void;
  onSaveRemainingAndStop: () => void;
  onGoToMarket: () => void;
}

const PRESET_DURATIONS = [10, 15, 20, 30, 45, 60];

function formatClock(totalSeconds: number): string {
  const clamped = Math.max(0, totalSeconds);
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function ChillBankView({
  chillBankMinutes,
  dailyChillUsedMinutes,
  activeSession,
  onStartSession,
  onTogglePause,
  onSaveRemainingAndStop,
  onGoToMarket,
}: ChillBankViewProps) {
  const [selectedMinutes, setSelectedMinutes] = useState<number>(20);

  const effectiveSelected = Math.min(selectedMinutes, Math.max(1, chillBankMinutes));

  const progressRatio = activeSession
    ? Math.max(0, Math.min(1, activeSession.remainingSeconds / activeSession.totalSeconds))
    : 1;
  const radius = 84;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progressRatio);

  const remainingWholeMinutes = activeSession
    ? Math.floor(activeSession.remainingSeconds / 60)
    : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Main Timer / Session Launcher */}
      <section className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Chill Time Bank</h1>
            <p className="text-sm text-slate-600 mt-1">
              You start with 4 hours saved. Spend chill time now or keep it banked for later.
            </p>
          </div>
          <Coffee className="w-6 h-6 text-slate-400 shrink-0" />
        </div>

        {activeSession ? (
          <div className="py-4 flex flex-col items-center space-y-6">
            {/* Circular SVG Timer */}
            <div className="relative w-52 h-52 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
                <circle
                  cx="100"
                  cy="100"
                  r={radius}
                  fill="none"
                  stroke="#E2E8F0"
                  strokeWidth="10"
                />
                <circle
                  cx="100"
                  cy="100"
                  r={radius}
                  fill="none"
                  stroke={activeSession.remainingSeconds === 0 ? '#059669' : '#1D4ED8'}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  className="transition-[stroke-dashoffset] duration-300"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-xs font-medium text-slate-500">
                  {activeSession.remainingSeconds === 0
                    ? 'Session Complete'
                    : activeSession.isRunning
                    ? 'Study-Free Chill'
                    : 'Paused'}
                </span>
                <span className="font-mono text-4xl font-bold text-slate-900 tabular-nums mt-1">
                  {formatClock(activeSession.remainingSeconds)}
                </span>
              </div>
            </div>

            <div className="w-full max-w-sm flex flex-col sm:flex-row items-stretch gap-3">
              {activeSession.remainingSeconds > 0 && (
                <button
                  type="button"
                  onClick={onTogglePause}
                  className="flex-1 min-h-[48px] px-4 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors"
                >
                  {activeSession.isRunning ? (
                    <>
                      <Pause className="w-4 h-4" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      <span>Resume</span>
                    </>
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={onSaveRemainingAndStop}
                className="flex-1 min-h-[48px] px-4 rounded-xl bg-slate-900 text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors"
              >
                <Square className="w-4 h-4" />
                <span>
                  {activeSession.remainingSeconds === 0
                    ? 'Back to Study'
                    : `Save ${remainingWholeMinutes}m & Stop`}
                </span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700">Choose chill duration</span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {chillBankMinutes > 0 ? `${effectiveSelected} min` : '0 min available'}
                </span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {PRESET_DURATIONS.map((mins) => {
                  const disabled = chillBankMinutes < mins;
                  const active = effectiveSelected === mins && !disabled;
                  return (
                    <button
                      key={mins}
                      type="button"
                      disabled={disabled}
                      onClick={() => setSelectedMinutes(mins)}
                      className={`min-h-[44px] rounded-xl font-mono text-sm font-semibold tabular-nums border transition-colors ${
                        active
                          ? 'bg-slate-900 text-white border-slate-900'
                          : disabled
                          ? 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed'
                          : 'bg-white text-slate-800 border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      {mins}m
                    </button>
                  );
                })}
              </div>
            </div>

            {chillBankMinutes > 0 && (
              <div className="space-y-2">
                <input
                  type="range"
                  min={1}
                  max={Math.min(180, chillBankMinutes)}
                  step={1}
                  value={effectiveSelected}
                  onChange={(e) => setSelectedMinutes(Number(e.target.value))}
                  aria-label="Select minutes for chill session"
                  className="w-full accent-blue-700 cursor-pointer h-2"
                />
                <div className="flex justify-between text-xs text-slate-500">
                  <span>1 min</span>
                  <span>Up to {Math.min(180, chillBankMinutes)} min</span>
                </div>
              </div>
            )}

            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                disabled={chillBankMinutes <= 0}
                onClick={() => onStartSession(effectiveSelected)}
                className="flex-1 min-h-[48px] px-5 rounded-xl bg-blue-700 text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-blue-800 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
              >
                <Play className="w-4 h-4" />
                <span>Start {effectiveSelected}m Chill Session</span>
              </button>

              <button
                type="button"
                onClick={onGoToMarket}
                className="min-h-[48px] px-5 rounded-xl border border-slate-300 bg-white text-slate-800 text-sm font-medium hover:bg-slate-50 transition-colors whitespace-nowrap"
              >
                Buy More Time
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Bank Stats Sidebar */}
      <aside className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
        <div className="flex items-center gap-2.5">
          <BookmarkCheck className="w-5 h-5 text-emerald-700" />
          <h2 className="text-base font-semibold text-slate-900">Saved Time Balance</h2>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-[#F7F7F5]">
            <div className="text-xs text-slate-500">Saved for Later</div>
            <div className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
              {formatMinutesAsHours(chillBankMinutes)}
            </div>
          </div>
          <div className="p-4 rounded-xl bg-[#F7F7F5]">
            <div className="text-xs text-slate-500">Chilled Today</div>
            <div className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
              {formatMinutesAsHours(dailyChillUsedMinutes)}
            </div>
          </div>
        </div>

        <div className="space-y-2.5 text-sm text-slate-600 pt-2 border-t border-slate-100">
          <p className="leading-relaxed">
            Your bank starts with <strong className="font-semibold text-slate-900">4 hours</strong>{' '}
            of chill time. Unused time never expires at midnight—it stays saved here across days.
          </p>
          <p className="leading-relaxed">
            If you finish a break early, tap <strong className="font-semibold text-slate-900">Save &amp; Stop</strong>{' '}
            to put remaining minutes right back into your bank.
          </p>
        </div>
      </aside>
    </div>
  );
}
