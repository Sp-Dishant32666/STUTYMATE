import { useState } from 'react';
import { CheckCircle2, FileText, ShieldAlert, ShieldX, Trash2, X } from 'lucide-react';
import { ScanRecord, VerificationStatus } from '../types';

interface ArchiveViewProps {
  scans: ScanRecord[];
  onDeleteScan: (id: string) => void;
}

type FilterMode = 'all' | VerificationStatus;

export function ArchiveView({ scans, onDeleteScan }: ArchiveViewProps) {
  const [filter, setFilter] = useState<FilterMode>('all');
  const [selectedScan, setSelectedScan] = useState<ScanRecord | null>(null);

  const filtered = scans.filter((s) => (filter === 'all' ? true : s.status === filter));

  const getStatusLabel = (status: VerificationStatus) => {
    switch (status) {
      case 'verified':
        return 'Verified';
      case 'exception_approved':
        return 'Allowed via Chat';
      case 'rejected':
        return 'Not Allowed';
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Scanned Notebook Archive</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Stored locally on your device so new scans are checked against past pages.
          </p>
        </div>

        {/* Interactive Filter Controls */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl self-start sm:self-auto overflow-x-auto max-w-full">
          {(
            [
              { id: 'all', label: 'All' },
              { id: 'verified', label: 'Verified' },
              { id: 'exception_approved', label: 'Allowed' },
              { id: 'rejected', label: 'Rejected' },
            ] as Array<{ id: FilterMode; label: string }>
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`min-h-[36px] px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                filter === tab.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-2">
          <FileText className="w-8 h-8 text-slate-300 mx-auto" />
          <div className="text-sm font-semibold text-slate-900">No scans in this view</div>
          <p className="text-xs text-slate-500">
            Scan a notebook page with the camera to start building your study record.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
          {filtered.map((scan) => (
            <button
              key={scan.id}
              type="button"
              onClick={() => setSelectedScan(scan)}
              className="w-full p-4 sm:px-5 flex items-center gap-4 text-left hover:bg-slate-50 transition-colors"
            >
              <img
                src={scan.thumbnailDataUrl}
                alt={scan.topic}
                referrerPolicy="no-referrer"
                className="w-14 h-16 rounded-lg object-cover border border-slate-200 bg-slate-100 shrink-0"
              />

              <div className="flex-1 min-w-0 space-y-1">
                <div className="text-sm font-semibold text-slate-900 truncate">{scan.topic}</div>
                <div className="text-xs text-slate-500 truncate">
                  {new Date(scan.scannedAt).toLocaleDateString()} · Corner:{' '}
                  {scan.cornerDate || 'None'} · {getStatusLabel(scan.status)}
                </div>
              </div>

              <div className="text-right shrink-0 space-y-1">
                <div
                  className={`font-mono text-sm font-semibold tabular-nums ${
                    scan.pointsAwarded > 0 ? 'text-emerald-700' : 'text-slate-400'
                  }`}
                >
                  +{scan.pointsAwarded} pts
                </div>
                <div className="flex justify-end">
                  {scan.status === 'verified' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : scan.status === 'exception_approved' ? (
                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                  ) : (
                    <ShieldX className="w-4 h-4 text-red-600" />
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedScan && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-6"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full md:max-w-xl bg-white rounded-t-3xl md:rounded-2xl border border-slate-200 max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-slate-900 truncate">
                {selectedScan.topic}
              </h2>
              <button
                type="button"
                onClick={() => setSelectedScan(null)}
                aria-label="Close scan details"
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              <img
                src={selectedScan.thumbnailDataUrl}
                alt={selectedScan.topic}
                referrerPolicy="no-referrer"
                className="w-full max-h-72 object-contain rounded-xl bg-slate-950 border border-slate-200"
              />

              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">
                  {new Date(selectedScan.scannedAt).toLocaleString()} · Corner:{' '}
                  {selectedScan.cornerDate || 'None'}
                </span>
                <span className="font-mono font-bold text-slate-900 tabular-nums">
                  +{selectedScan.pointsAwarded} pts
                </span>
              </div>

              <p className="text-sm text-slate-700 leading-relaxed">{selectedScan.summary}</p>

              {selectedScan.chatTranscript && selectedScan.chatTranscript.length > 0 && (
                <div className="pt-3 border-t border-slate-200 space-y-2.5">
                  <div className="text-xs font-semibold text-slate-700">
                    Verification Chat Transcript
                  </div>
                  <div className="space-y-2">
                    {selectedScan.chatTranscript.map((m) => (
                      <div
                        key={m.id}
                        className={`rounded-xl px-3.5 py-2 text-xs leading-relaxed ${
                          m.role === 'user'
                            ? 'bg-blue-50 text-blue-950 ml-6'
                            : 'bg-slate-100 text-slate-800 mr-6'
                        }`}
                      >
                        {m.content}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between pb-safe">
              <button
                type="button"
                onClick={() => {
                  onDeleteScan(selectedScan.id);
                  setSelectedScan(null);
                }}
                className="min-h-[42px] px-3.5 rounded-xl text-xs font-medium text-red-700 hover:bg-red-50 flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Scan</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedScan(null)}
                className="min-h-[42px] px-5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
