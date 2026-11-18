import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Camera,
  CheckCircle2,
  FlipHorizontal2,
  ImagePlus,
  Loader2,
  RotateCcw,
  ShieldAlert,
  ShieldX,
} from 'lucide-react';
import {
  compressImageDataUrl,
  formatTodayDisplay,
  getTodayDateKey,
} from '../lib/storage';
import { ChatMessage, PageAnalysisResult, ScanRecord } from '../types';
import { VerificationChatSheet } from './VerificationChatSheet';

interface ScannerViewProps {
  scans: ScanRecord[];
  pointsBalance: number;
  onScanFinalized: (record: ScanRecord, pointsToAdd: number) => void;
}

export function ScannerView({
  scans,
  pointsBalance,
  onScanFinalized,
}: ScannerViewProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);

  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  const [lastOutcome, setLastOutcome] = useState<{
    status: 'verified' | 'exception_approved' | 'rejected' | 'not_notebook';
    topic: string;
    summary: string;
    points: number;
    cornerDate: string | null;
    cornerNote: string;
    richness: string;
    previewUrl: string;
  } | null>(null);

  const [pendingVerification, setPendingVerification] = useState<{
    imageDataUrl: string;
    thumbnailDataUrl: string;
    analysis: PageAnalysisResult;
    matchedScan: ScanRecord | null;
  } | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera access is unavailable in this browser. You can upload a page photo instead.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1600 },
          height: { ideal: 1200 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraReady(true);
    } catch {
      setCameraError(
        'Camera permission was declined or no camera was found. Use Upload Photo below to scan a page.'
      );
    }
  }, [facingMode, stopCamera]);

  useEffect(() => {
    if (!capturedDataUrl) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [capturedDataUrl, startCamera, stopCamera]);

  const runAnalysis = async (rawDataUrl: string) => {
    setIsAnalyzing(true);
    setAnalyzeError(null);
    setLastOutcome(null);

    try {
      const analysisImage = await compressImageDataUrl(rawDataUrl, 1280, 0.85);
      const thumbImage = await compressImageDataUrl(rawDataUrl, 512, 0.72);
      setCapturedDataUrl(analysisImage);

      const todayKey = getTodayDateKey();
      const todayDisplay = formatTodayDisplay();

      const recentScansPayload = scans.slice(0, 8).map((s) => ({
        id: s.id,
        scannedAt: s.scannedAt,
        cornerDate: s.cornerDate,
        topic: s.topic,
        summary: s.summary,
        thumbnailDataUrl: s.thumbnailDataUrl,
      }));

      const response = await fetch('/api/analyze-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageDataUrl: analysisImage,
          todayDate: todayKey,
          todayDisplay,
          previousScans: recentScansPayload,
        }),
      });

      const data = (await response.json()) as PageAnalysisResult & { error?: string };
      if (!response.ok) {
        throw new Error(data.error || 'Could not analyze notebook page.');
      }

      if (!data.isNotebookPage) {
        setLastOutcome({
          status: 'not_notebook',
          topic: data.topic || 'Unrecognized Page',
          summary: data.contentSummary || 'No readable study notes detected on this capture.',
          points: 0,
          cornerDate: data.cornerDateText,
          cornerNote: data.cornerDateNote,
          richness: data.contentRichness,
          previewUrl: thumbImage,
        });
        return;
      }

      const needsChat = data.isRepeatedPage || data.dateStatus !== 'matches_today';
      if (needsChat) {
        const matched = data.matchedScanId
          ? scans.find((s) => s.id === data.matchedScanId) || null
          : null;
        setPendingVerification({
          imageDataUrl: analysisImage,
          thumbnailDataUrl: thumbImage,
          analysis: data,
          matchedScan: matched,
        });
        return;
      }

      const pts = Math.max(0, Number(data.calculatedPoints) || 0);
      const newRecord: ScanRecord = {
        id: `scan-${Date.now()}`,
        scannedAt: new Date().toISOString(),
        scannedDateKey: todayKey,
        cornerDate: data.cornerDateText,
        dateStatus: data.dateStatus,
        isRepeatedPage: false,
        matchedScanId: null,
        topic: data.topic || 'Study Notes',
        summary: data.contentSummary,
        contentRichness: data.contentRichness,
        pointsAwarded: pts,
        status: 'verified',
        thumbnailDataUrl: thumbImage,
      };

      onScanFinalized(newRecord, pts);
      setLastOutcome({
        status: 'verified',
        topic: newRecord.topic,
        summary: newRecord.summary,
        points: pts,
        cornerDate: data.cornerDateText,
        cornerNote: data.cornerDateNote,
        richness: data.contentRichness,
        previewUrl: thumbImage,
      });
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : 'Scan failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCaptureFromCamera = async () => {
    const video = videoRef.current;
    if (!video || !cameraReady || isAnalyzing) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 960;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    stopCamera();
    await runAnalysis(dataUrl);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const reader = new FileReader();
    reader.onload = async () => {
      if (typeof reader.result === 'string') {
        stopCamera();
        await runAnalysis(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetScanner = () => {
    setCapturedDataUrl(null);
    setAnalyzeError(null);
    setLastOutcome(null);
  };

  const handleVerificationComplete = (outcome: {
    allowed: boolean;
    awardedPoints: number;
    transcript: ChatMessage[];
  }) => {
    if (!pendingVerification) return;
    const { analysis, thumbnailDataUrl, matchedScan } = pendingVerification;
    const todayKey = getTodayDateKey();
    const pts = outcome.allowed ? outcome.awardedPoints : 0;

    const record: ScanRecord = {
      id: `scan-${Date.now()}`,
      scannedAt: new Date().toISOString(),
      scannedDateKey: todayKey,
      cornerDate: analysis.cornerDateText,
      dateStatus: analysis.dateStatus,
      isRepeatedPage: analysis.isRepeatedPage,
      matchedScanId: matchedScan?.id || analysis.matchedScanId,
      topic: analysis.topic || 'Study Notes',
      summary: analysis.contentSummary,
      contentRichness: analysis.contentRichness,
      pointsAwarded: pts,
      status: outcome.allowed ? 'exception_approved' : 'rejected',
      thumbnailDataUrl,
      chatTranscript: outcome.transcript,
    };

    onScanFinalized(record, pts);
    setLastOutcome({
      status: outcome.allowed ? 'exception_approved' : 'rejected',
      topic: record.topic,
      summary: record.summary,
      points: pts,
      cornerDate: record.cornerDate,
      cornerNote: analysis.cornerDateNote,
      richness: record.contentRichness,
      previewUrl: thumbnailDataUrl,
    });
    setPendingVerification(null);
  };

  const todayKey = getTodayDateKey();
  const todayScans = scans.filter((s) => s.scannedDateKey === todayKey);
  const todayPoints = todayScans.reduce((acc, s) => acc + s.pointsAwarded, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Camera & Capture Column */}
        <section className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col">
          <div className="px-4 sm:px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-3">
            <div>
              <h1 className="text-base sm:text-lg font-semibold text-slate-900">
                Notebook Scanner
              </h1>
              <p className="text-xs text-slate-500">
                Today: {formatTodayDisplay()} · Write today’s date in the top corner
              </p>
            </div>
            {!capturedDataUrl && !cameraError && (
              <button
                type="button"
                onClick={() =>
                  setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))
                }
                className="min-h-[40px] min-w-[40px] px-3 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <FlipHorizontal2 className="w-4 h-4" />
                <span className="hidden sm:inline">Flip</span>
              </button>
            )}
          </div>

          {/* Viewfinder Frame */}
          <div className="relative bg-slate-950 aspect-[4/3] sm:aspect-[16/11] w-full overflow-hidden flex items-center justify-center">
            {capturedDataUrl ? (
              <img
                src={capturedDataUrl}
                alt="Captured notebook page"
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain bg-slate-950"
              />
            ) : cameraError ? (
              <div className="p-6 text-center max-w-sm space-y-3">
                <Camera className="w-10 h-10 text-slate-400 mx-auto" />
                <p className="text-sm text-slate-200 leading-relaxed">{cameraError}</p>
                <button
                  type="button"
                  onClick={() => startCamera()}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-white/10 text-white text-xs font-medium hover:bg-white/20 transition-colors"
                >
                  Retry Camera
                </button>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                {/* Corner Date Framing Guide */}
                <div className="pointer-events-none absolute inset-4">
                  <div className="absolute top-0 right-0 w-24 h-12 border-t-2 border-r-2 border-amber-300/90 rounded-tr-lg flex items-start justify-end p-1.5">
                    <span className="text-[11px] font-medium text-amber-200 bg-slate-950/65 px-1.5 py-0.5 rounded">
                      Corner date
                    </span>
                  </div>
                  <div className="absolute bottom-0 left-0 w-10 h-10 border-b-2 border-l-2 border-white/50 rounded-bl-lg" />
                </div>
              </>
            )}

            {isAnalyzing && (
              <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-xs flex flex-col items-center justify-center gap-3 text-white p-6">
                <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
                <div className="text-sm font-medium text-center">
                  Checking corner date, past pages &amp; study content…
                </div>
              </div>
            )}
          </div>

          {/* Natural Thumb Zone Capture Controls */}
          <div className="p-4 sm:p-5 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {capturedDataUrl ? (
              <button
                type="button"
                onClick={handleResetScanner}
                disabled={isAnalyzing}
                className="flex-1 min-h-[48px] px-5 rounded-xl bg-slate-900 text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-slate-800 disabled:opacity-50 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Scan Another Page</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCaptureFromCamera}
                disabled={!cameraReady || isAnalyzing}
                className="flex-1 min-h-[48px] px-5 rounded-xl bg-blue-700 text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-blue-800 disabled:opacity-40 transition-colors"
              >
                <Camera className="w-5 h-5" />
                <span>Scan Notebook Page</span>
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isAnalyzing}
              className="min-h-[48px] px-4 rounded-xl border border-slate-300 bg-white text-slate-800 text-sm font-medium flex items-center justify-center gap-2 hover:bg-slate-50 disabled:opacity-50 transition-colors shrink-0"
            >
              <ImagePlus className="w-4 h-4" />
              <span>Upload Photo</span>
            </button>
          </div>
        </section>

        {/* Right / Secondary Column: Scan Result + Today's Ledger */}
        <section className="lg:col-span-5 flex flex-col gap-5">
          {analyzeError && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
              <ShieldX className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="text-sm font-semibold text-red-900">Scan Error</div>
                <p className="text-xs text-red-800 leading-relaxed">{analyzeError}</p>
              </div>
            </div>
          )}

          {lastOutcome && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  {lastOutcome.status === 'verified' ||
                  lastOutcome.status === 'exception_approved' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
                  ) : lastOutcome.status === 'rejected' ? (
                    <ShieldX className="w-5 h-5 text-red-700 shrink-0" />
                  ) : (
                    <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0" />
                  )}
                  <h2 className="text-base font-semibold text-slate-900">
                    {lastOutcome.status === 'verified'
                      ? 'Page Verified'
                      : lastOutcome.status === 'exception_approved'
                      ? 'Allowed After Explanation'
                      : lastOutcome.status === 'rejected'
                      ? 'Not Allowed'
                      : 'Not a Notebook Page'}
                  </h2>
                </div>
                <span
                  className={`font-mono text-base font-bold tabular-nums ${
                    lastOutcome.points > 0 ? 'text-emerald-700' : 'text-slate-500'
                  }`}
                >
                  +{lastOutcome.points} pts
                </span>
              </div>

              <div className="space-y-1.5">
                <div className="text-sm font-semibold text-slate-900">{lastOutcome.topic}</div>
                <p className="text-sm text-slate-600 leading-relaxed">{lastOutcome.summary}</p>
              </div>

              <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span>Corner: {lastOutcome.cornerDate || 'Not found'}</span>
                <span aria-hidden="true">·</span>
                <span className="capitalize">Density: {lastOutcome.richness}</span>
                <span aria-hidden="true">·</span>
                <span>{lastOutcome.cornerNote}</span>
              </div>
            </div>
          )}

          {/* Today's Study Summary */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-5 flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-slate-900">Today’s Study Ledger</h2>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3.5 rounded-xl bg-[#F7F7F5]">
                  <div className="text-xs text-slate-500">Earned Today</div>
                  <div className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
                    {todayPoints} <span className="text-sm font-medium text-slate-500">pts</span>
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-[#F7F7F5]">
                  <div className="text-xs text-slate-500">Pages Today</div>
                  <div className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
                    {todayScans.length}
                  </div>
                </div>
              </div>

              <div className="space-y-2.5 pt-1 text-sm text-slate-600">
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span>Average full page</span>
                  <span className="font-mono font-semibold text-slate-900 tabular-nums">
                    ~20 pts
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span>20 min chill pass</span>
                  <span className="font-mono font-semibold text-slate-900 tabular-nums">
                    200 pts
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span>Current balance</span>
                  <span className="font-mono font-semibold text-blue-700 tabular-nums">
                    {pointsBalance} pts
                  </span>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed pt-3 border-t border-slate-100">
              Every page is compared against your earlier scans and checked for today’s date in the
              corner. Repeated or undated pages require a valid reason in chat.
            </p>
          </div>
        </section>
      </div>

      {pendingVerification && (
        <VerificationChatSheet
          isOpen={true}
          newImageDataUrl={pendingVerification.imageDataUrl}
          analysis={pendingVerification.analysis}
          matchedPreviousScan={pendingVerification.matchedScan}
          todayDate={getTodayDateKey()}
          onComplete={handleVerificationComplete}
          onCancel={() => {
            setPendingVerification(null);
            setCapturedDataUrl(null);
          }}
        />
      )}
    </div>
  );
}
