import { useState } from 'react';
import { Check, Clock, ShoppingBag, SlidersHorizontal } from 'lucide-react';
import { formatMinutesAsHours } from '../lib/storage';
import { ChillPack, MarketplacePurchase } from '../types';

interface MarketplaceViewProps {
  pointsBalance: number;
  chillBankMinutes: number;
  purchases: MarketplacePurchase[];
  onBuyTime: (title: string, minutes: number, pointsCost: number) => void;
  onGoToChillBank: () => void;
}

const CHILL_PACKS: ChillPack[] = [
  {
    id: 'pack-10',
    title: 'Quick Reset',
    minutes: 10,
    pointsCost: 100,
    note: 'Short stretch or coffee break',
  },
  {
    id: 'pack-20',
    title: 'Daily Chill Pass',
    minutes: 20,
    pointsCost: 200,
    note: 'Standard 200 pts pack (~10 pages)',
    featured: true,
  },
  {
    id: 'pack-45',
    title: 'Deep Rest',
    minutes: 45,
    pointsCost: 450,
    note: 'Guilt-free meal or walk outside',
  },
  {
    id: 'pack-60',
    title: 'Study-Free Hour',
    minutes: 60,
    pointsCost: 600,
    note: 'Full 1 hour added to your bank',
  },
];

export function MarketplaceView({
  pointsBalance,
  chillBankMinutes,
  purchases,
  onBuyTime,
  onGoToChillBank,
}: MarketplaceViewProps) {
  const [customMinutes, setCustomMinutes] = useState(30);
  const [justBoughtId, setJustBoughtId] = useState<string | null>(null);

  const customCost = customMinutes * 10; // 200 pts = 20 mins -> 10 pts/min

  const handlePurchase = (id: string, title: string, minutes: number, cost: number) => {
    if (pointsBalance < cost) return;
    onBuyTime(title, minutes, cost);
    setJustBoughtId(id);
    window.setTimeout(() => {
      setJustBoughtId((prev) => (prev === id ? null : prev));
    }, 1800);
  };

  return (
    <div className="space-y-6">
      {/* Header & Exchange Rate Summary */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-1.5">
          <h1 className="text-xl font-bold text-slate-900">Chill Time Marketplace</h1>
          <p className="text-sm text-slate-600 max-w-xl">
            Spend study points to buy study-free chill minutes. Purchased time goes straight into
            your Chill Bank so you can relax now or save it for later.
          </p>
        </div>

        <div className="flex items-center gap-6 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
          <div>
            <div className="text-xs text-slate-500">Available Points</div>
            <div className="font-mono text-2xl font-bold text-blue-700 tabular-nums">
              {pointsBalance} <span className="text-sm font-medium text-slate-500">pts</span>
            </div>
          </div>
          <div className="h-10 w-px bg-slate-200" />
          <div>
            <div className="text-xs text-slate-500">Saved Chill Bank</div>
            <button
              type="button"
              onClick={onGoToChillBank}
              className="font-mono text-2xl font-bold text-slate-900 tabular-nums hover:text-blue-700 transition-colors text-left"
            >
              {formatMinutesAsHours(chillBankMinutes)}
            </button>
          </div>
        </div>
      </div>

      {/* Main 2-column layout on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Chill Time Packs */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Redeemable Chill Passes</h2>
            <span className="text-xs font-mono text-slate-500 tabular-nums">
              Rate: 200 pts = 20 min
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {CHILL_PACKS.map((pack) => {
              const canAfford = pointsBalance >= pack.pointsCost;
              const isJustBought = justBoughtId === pack.id;

              return (
                <div
                  key={pack.id}
                  className={`bg-white rounded-2xl border p-5 flex flex-col justify-between gap-4 transition-colors ${
                    pack.featured ? 'border-blue-300' : 'border-slate-200'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-base font-semibold text-slate-900">{pack.title}</span>
                      <span className="font-mono text-sm font-semibold text-slate-900 tabular-nums">
                        +{pack.minutes} min
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">{pack.note}</p>
                  </div>

                  <button
                    type="button"
                    disabled={!canAfford}
                    onClick={() =>
                      handlePurchase(pack.id, pack.title, pack.minutes, pack.pointsCost)
                    }
                    className={`w-full min-h-[46px] px-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
                      isJustBought
                        ? 'bg-emerald-700 text-white'
                        : canAfford
                        ? 'bg-slate-900 text-white hover:bg-slate-800'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {isJustBought ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Added to Chill Bank</span>
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="w-4 h-4" />
                        <span className="font-mono tabular-nums">Buy for {pack.pointsCost} pts</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Custom Time Builder */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-slate-700" />
                <h3 className="text-sm font-semibold text-slate-900">Custom Chill Duration</h3>
              </div>
              <span className="font-mono text-sm font-semibold text-slate-900 tabular-nums">
                {customMinutes} min · {customCost} pts
              </span>
            </div>

            <input
              type="range"
              min={5}
              max={120}
              step={5}
              value={customMinutes}
              onChange={(e) => setCustomMinutes(Number(e.target.value))}
              aria-label="Custom chill duration in minutes"
              className="w-full accent-blue-700 cursor-pointer h-2"
            />

            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-slate-500">
                Slide in 5-minute increments (10 pts per minute)
              </span>
              <button
                type="button"
                disabled={pointsBalance < customCost}
                onClick={() =>
                  handlePurchase(
                    'custom',
                    `Custom ${customMinutes}m Pass`,
                    customMinutes,
                    customCost
                  )
                }
                className="min-h-[44px] px-5 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0"
              >
                {justBoughtId === 'custom' ? 'Added!' : `Buy ${customMinutes} min`}
              </button>
            </div>
          </div>
        </div>

        {/* Purchase Ledger */}
        <aside className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Recent Redemptions</h2>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>

          {purchases.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center leading-relaxed">
              No passes bought yet. Scan notebook pages to earn points, or use your 4h 00m starter
              bank anytime.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {purchases.slice(0, 8).map((p) => (
                <div key={p.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate">{p.title}</div>
                    <div className="text-xs text-slate-500">
                      {new Date(p.purchasedAt).toLocaleDateString()} · +{p.minutesAdded}m saved
                    </div>
                  </div>
                  <span className="font-mono text-xs font-semibold text-slate-700 tabular-nums shrink-0">
                    −{p.pointsSpent} pts
                  </span>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
