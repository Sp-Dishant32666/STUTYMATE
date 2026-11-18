import { Archive, Camera, Clock, ShoppingBag } from 'lucide-react';
import { TabId } from '../types';

interface BottomNavProps {
  activeTab: TabId;
  onSelectTab: (tab: TabId) => void;
  hasActiveSession: boolean;
}

export function BottomNav({ activeTab, onSelectTab, hasActiveSession }: BottomNavProps) {
  const items: Array<{ id: TabId; label: string; icon: typeof Camera }> = [
    { id: 'scan', label: 'Scan', icon: Camera },
    { id: 'market', label: 'Market', icon: ShoppingBag },
    { id: 'chill', label: hasActiveSession ? 'Chilling' : 'Chill Bank', icon: Clock },
    { id: 'history', label: 'Archive', icon: Archive },
  ];

  return (
    <nav
      aria-label="Primary mobile navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 pb-safe"
    >
      <div className="grid grid-cols-4 h-[58px] max-w-lg mx-auto">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600 ${
                isActive ? 'text-blue-700' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Icon className="w-[21px] h-[21px]" strokeWidth={isActive ? 2.25 : 1.75} />
              <span className="text-[11px] font-medium tracking-tight leading-none mt-0.5 whitespace-nowrap">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
