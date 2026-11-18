import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Send, ShieldX, X } from 'lucide-react';
import { ChatMessage, PageAnalysisResult, ScanRecord } from '../types';

interface VerificationChatSheetProps {
  isOpen: boolean;
  newImageDataUrl: string;
  analysis: PageAnalysisResult;
  matchedPreviousScan: ScanRecord | null;
  todayDate: string;
  onComplete: (outcome: {
    allowed: boolean;
    awardedPoints: number;
    transcript: ChatMessage[];
  }) => void;
  onCancel: () => void;
}

export function VerificationChatSheet({
  isOpen,
  newImageDataUrl,
  analysis,
  matchedPreviousScan,
  todayDate,
  onComplete,
  onCancel,
}: VerificationChatSheetProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [terminalState, setTerminalState] = useState<{
    decision: 'approved' | 'rejected';
    awardedPoints: number;
  } | null>(null);

  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const defaultPrompt =
      analysis.openingQuestion && analysis.openingQuestion.trim().length > 0
        ? analysis.openingQuestion
        : analysis.isRepeatedPage
        ? `This page looks similar to a page you already scanned${
            matchedPreviousScan
              ? ` on ${new Date(matchedPreviousScan.scannedAt).toLocaleDateString()}`
              : ''
          }. Why is this page repeated?`
        : `The corner date on this page (${
            analysis.cornerDateText || 'not detected'
          }) does not match today's date. Can you explain why you're scanning this page today?`;

    setMessages([
      {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: defaultPrompt,
        timestamp: new Date().toISOString(),
      },
    ]);
    setInput('');
    setErrorMsg(null);
    setTerminalState(null);
  }, [isOpen, analysis, matchedPreviousScan]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, isSending]);

  if (!isOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isSending || terminalState) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setErrorMsg(null);
    setIsSending(true);

    try {
      const response = await fetch('/api/verify-repetition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newImageDataUrl,
          matchedImageDataUrl: matchedPreviousScan?.thumbnailDataUrl || null,
          todayDate,
          initialAnalysis: {
            dateStatus: analysis.dateStatus,
            cornerDateText: analysis.cornerDateText,
            isRepeatedPage: analysis.isRepeatedPage,
            matchedScanDate: analysis.matchedScanDate,
            topic: analysis.topic,
            calculatedPoints: analysis.calculatedPoints,
          },
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Could not verify explanation.');
      }

      const assistantMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: data.reply,
        timestamp: new Date().toISOString(),
      };
      const updatedTranscript = [...nextMessages, assistantMsg];
      setMessages(updatedTranscript);

      if (data.decision === 'approved' || data.decision === 'rejected') {
        const awarded = data.decision === 'approved' ? Math.max(0, Number(data.awardedPoints) || 0) : 0;
        setTerminalState({
          decision: data.decision,
          awardedPoints: awarded,
        });
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Verification request failed.');
    } finally {
      setIsSending(false);
    }
  };

  const flagHeadline = analysis.isRepeatedPage
    ? 'Repeated Page Detected'
    : analysis.dateStatus === 'old_date'
    ? 'Corner Date Mismatch'
    : 'Missing Corner Date';

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="verify-chat-title"
    >
      <div className="w-full md:max-w-2xl bg-white rounded-t-3xl md:rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Mobile sheet drag handle */}
        <div className="md:hidden pt-3 pb-1 flex justify-center">
          <div className="w-10 h-1.5 bg-slate-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div className="min-w-0">
              <h2 id="verify-chat-title" className="text-base font-semibold text-slate-900 truncate">
                {flagHeadline}
              </h2>
              <p className="text-xs text-slate-500 truncate">
                {analysis.topic} · Base value {analysis.calculatedPoints} pts
              </p>
            </div>
          </div>
          {!terminalState && (
            <button
              type="button"
              onClick={onCancel}
              aria-label="Discard scan"
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Visual Evidence Strip */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-4 overflow-x-auto">
          <div className="flex items-center gap-3 shrink-0">
            <img
              src={newImageDataUrl}
              alt="Current scanned notebook page"
              referrerPolicy="no-referrer"
              className="w-14 h-16 object-cover rounded-lg border border-slate-200 bg-white"
            />
            <div className="text-xs">
              <div className="font-semibold text-slate-900">New Scan</div>
              <div className="text-slate-500">
                Corner: {analysis.cornerDateText ? analysis.cornerDateText : 'None found'}
              </div>
            </div>
          </div>

          {matchedPreviousScan && (
            <>
              <div className="h-10 w-px bg-slate-200 shrink-0" />
              <div className="flex items-center gap-3 shrink-0">
                <img
                  src={matchedPreviousScan.thumbnailDataUrl}
                  alt="Matched earlier notebook page"
                  referrerPolicy="no-referrer"
                  className="w-14 h-16 object-cover rounded-lg border border-amber-300 bg-white"
                />
                <div className="text-xs">
                  <div className="font-semibold text-amber-800">Matched Old Pic</div>
                  <div className="text-slate-500">
                    Shown {new Date(matchedPreviousScan.scannedAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Chat Messages */}
        <div ref={listRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3.5 min-h-[220px]">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    isUser
                      ? 'bg-blue-700 text-white rounded-br-sm'
                      : 'bg-slate-100 text-slate-900 rounded-bl-sm'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            );
          })}

          {isSending && (
            <div className="flex justify-start">
              <div className="bg-slate-100 text-slate-500 rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm">
                Reviewing your explanation…
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800">
              {errorMsg}
            </div>
          )}
        </div>

        {/* Terminal Decision or Input Bar */}
        {terminalState ? (
          <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-3">
            <div
              className={`flex items-center justify-between gap-3 rounded-xl px-4 py-3 border ${
                terminalState.decision === 'approved'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-red-50 border-red-200 text-red-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {terminalState.decision === 'approved' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
                ) : (
                  <ShieldX className="w-5 h-5 text-red-700 shrink-0" />
                )}
                <span className="text-sm font-semibold">
                  {terminalState.decision === 'approved'
                    ? 'Allowed — Explanation Verified'
                    : 'Not Allowed — Scan Rejected'}
                </span>
              </div>
              <span className="font-mono text-sm font-semibold tabular-nums">
                {terminalState.decision === 'approved'
                  ? `+${terminalState.awardedPoints} pts`
                  : '0 pts'}
              </span>
            </div>

            <button
              type="button"
              onClick={() =>
                onComplete({
                  allowed: terminalState.decision === 'approved',
                  awardedPoints: terminalState.awardedPoints,
                  transcript: messages,
                })
              }
              className="w-full min-h-[46px] rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors"
            >
              {terminalState.decision === 'approved'
                ? 'Collect Points & Save Scan'
                : 'Done'}
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleSend}
            className="p-3.5 border-t border-slate-200 bg-white flex items-center gap-2.5 pb-safe"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Explain why this page is repeated or undated…"
              disabled={isSending}
              className="flex-1 min-h-[44px] px-4 rounded-xl border border-slate-300 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
            />
            <button
              type="submit"
              disabled={!input.trim() || isSending}
              aria-label="Send explanation"
              className="min-h-[44px] min-w-[44px] px-4 rounded-xl bg-blue-700 text-white font-medium text-sm flex items-center justify-center gap-1.5 disabled:opacity-40 hover:bg-blue-800 transition-colors shrink-0"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Reply</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
