import { useEffect, useState } from 'react';
import { ArchiveView } from './components/ArchiveView';
import { BottomNav } from './components/BottomNav';
import { ChillBankView } from './components/ChillBankView';
import { MarketplaceView } from './components/MarketplaceView';
import { ScannerView } from './components/ScannerView';
import { TopBar } from './components/TopBar';
import {
  deleteScanRecord,
  getInitialLedgerState,
  getTodayDateKey,
  loadAllScans,
  saveLedgerState,
  saveScanRecord,
} from './lib/storage';
import { LedgerState, MarketplacePurchase, ScanRecord, TabId } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('scan');
  const [ledger, setLedger] = useState<LedgerState>(() => {
    const initial = getInitialLedgerState();
    if (initial.activeSession && initial.activeSession.isRunning) {
      const elapsedSec = Math.floor((Date.now() - initial.activeSession.lastTickAt) / 1000);
      const nextRemaining = Math.max(0, initial.activeSession.remainingSeconds - elapsedSec);
      return {
        ...initial,
        activeSession: {
          ...initial.activeSession,
          remainingSeconds: nextRemaining,
          isRunning: nextRemaining > 0,
          lastTickAt: Date.now(),
        },
      };
    }
    return initial;
  });
  const [scans, setScans] = useState<ScanRecord[]>([]);

  useEffect(() => {
    loadAllScans().then(setScans);
  }, []);

  useEffect(() => {
    saveLedgerState(ledger);
  }, [ledger]);

  // Live Chill Session countdown ticker
  useEffect(() => {
    if (!ledger.activeSession || !ledger.activeSession.isRunning) {
      return;
    }

    const interval = window.setInterval(() => {
      setLedger((prev) => {
        const session = prev.activeSession;
        if (!session || !session.isRunning) return prev;

        const now = Date.now();
        const deltaSec = Math.max(1, Math.floor((now - session.lastTickAt) / 1000));
        const nextRemaining = Math.max(0, session.remainingSeconds - deltaSec);

        return {
          ...prev,
          activeSession: {
            ...session,
            remainingSeconds: nextRemaining,
            isRunning: nextRemaining > 0,
            lastTickAt: now,
          },
        };
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [ledger.activeSession?.isRunning]);

  const handleScanFinalized = async (record: ScanRecord, pointsToAdd: number) => {
    await saveScanRecord(record);
    setScans((prev) => [record, ...prev]);
    if (pointsToAdd > 0) {
      setLedger((prev) => ({
        ...prev,
        pointsBalance: prev.pointsBalance + pointsToAdd,
      }));
    }
  };

  const handleDeleteScan = async (id: string) => {
    await deleteScanRecord(id);
    setScans((prev) => prev.filter((s) => s.id !== id));
  };

  const handleBuyTime = (title: string, minutes: number, pointsCost: number) => {
    setLedger((prev) => {
      if (prev.pointsBalance < pointsCost) return prev;
      const purchase: MarketplacePurchase = {
        id: `buy-${Date.now()}`,
        title,
        minutesAdded: minutes,
        pointsSpent: pointsCost,
        purchasedAt: new Date().toISOString(),
      };
      return {
        ...prev,
        pointsBalance: prev.pointsBalance - pointsCost,
        chillBankMinutes: prev.chillBankMinutes + minutes,
        purchases: [purchase, ...prev.purchases],
      };
    });
  };

  const handleStartChillSession = (minutes: number) => {
    setLedger((prev) => {
      if (prev.activeSession || prev.chillBankMinutes < minutes || minutes <= 0) {
        return prev;
      }
      const totalSeconds = minutes * 60;
      return {
        ...prev,
        chillBankMinutes: prev.chillBankMinutes - minutes,
        activeSession: {
          totalSeconds,
          remainingSeconds: totalSeconds,
          isRunning: true,
          startedAt: new Date().toISOString(),
          lastTickAt: Date.now(),
        },
      };
    });
  };

  const handleTogglePause = () => {
    setLedger((prev) => {
      if (!prev.activeSession || prev.activeSession.remainingSeconds <= 0) return prev;
      return {
        ...prev,
        activeSession: {
          ...prev.activeSession,
          isRunning: !prev.activeSession.isRunning,
          lastTickAt: Date.now(),
        },
      };
    });
  };

  const handleSaveRemainingAndStop = () => {
    setLedger((prev) => {
      const session = prev.activeSession;
      if (!session) return prev;

      const today = getTodayDateKey();
      const elapsedMinutes = Math.max(
        0,
        Math.round((session.totalSeconds - session.remainingSeconds) / 60)
      );
      const returnedMinutes = Math.floor(session.remainingSeconds / 60);
      const baseDaily =
        prev.dailyChillUsedDate === today ? prev.dailyChillUsedMinutes : 0;

      return {
        ...prev,
        chillBankMinutes: prev.chillBankMinutes + returnedMinutes,
        dailyChillUsedDate: today,
        dailyChillUsedMinutes: baseDaily + elapsedMinutes,
        activeSession: null,
      };
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F7F5] text-slate-900">
      <TopBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        pointsBalance={ledger.pointsBalance}
        chillBankMinutes={ledger.chillBankMinutes}
        hasActiveSession={Boolean(ledger.activeSession)}
        activeRemainingSeconds={ledger.activeSession?.remainingSeconds ?? null}
      />

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 pt-5 pb-24 md:pb-12">
        {activeTab === 'scan' && (
          <ScannerView
            scans={scans}
            pointsBalance={ledger.pointsBalance}
            onScanFinalized={handleScanFinalized}
          />
        )}

        {activeTab === 'market' && (
          <MarketplaceView
            pointsBalance={ledger.pointsBalance}
            chillBankMinutes={ledger.chillBankMinutes}
            purchases={ledger.purchases}
            onBuyTime={handleBuyTime}
            onGoToChillBank={() => setActiveTab('chill')}
          />
        )}

        {activeTab === 'chill' && (
          <ChillBankView
            chillBankMinutes={ledger.chillBankMinutes}
            dailyChillUsedMinutes={ledger.dailyChillUsedMinutes}
            activeSession={ledger.activeSession}
            onStartSession={handleStartChillSession}
            onTogglePause={handleTogglePause}
            onSaveRemainingAndStop={handleSaveRemainingAndStop}
            onGoToMarket={() => setActiveTab('market')}
          />
        )}

        {activeTab === 'history' && (
          <ArchiveView scans={scans} onDeleteScan={handleDeleteScan} />
        )}
      </main>

      <BottomNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        hasActiveSession={Boolean(ledger.activeSession)}
      />
    </div>
  );
}
