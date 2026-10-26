// components/BottomNav.tsx
// 하단 탭 네비게이션 & 중앙 마이크 FAB (분석 중 로딩 상태 포함)
import { Calculator, Calendar as CalendarIcon, Camera, FileText, LoaderCircle, Mic } from 'lucide-react';

export type TabKey = '공수' | '물량' | '사진' | '일보';

interface BottomNavProps {
  tab: TabKey;
  onTabChange: (tab: TabKey) => void;
  isListening: boolean;
  isAnalyzing: boolean;
  onMicPress: () => void;
}

const tabClass = (active: boolean) =>
  `flex-1 flex flex-col items-center transition-colors ${active ? 'text-[#3c887e]' : 'text-black hover:text-[#5b7b7a]'}`;

export default function BottomNav({ tab, onTabChange, isListening, isAnalyzing, onMicPress }: BottomNavProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t-4 border-black px-4 py-3">
      <div className="max-w-md mx-auto flex justify-between items-center relative h-16">
        <button onClick={() => onTabChange('공수')} className={tabClass(tab === '공수')}>
          <CalendarIcon className="w-7 h-7 mb-1.5" strokeWidth={tab === '공수' ? 3 : 2} />
          <span className="text-sm font-bold">공수</span>
        </button>
        <button onClick={() => onTabChange('물량')} className={`${tabClass(tab === '물량')} pr-6`}>
          <Calculator className="w-7 h-7 mb-1.5" strokeWidth={tab === '물량' ? 3 : 2} />
          <span className="text-sm font-bold">물량</span>
        </button>

        {/* 마이크 FAB */}
        <div className="absolute left-1/2 -top-12 -translate-x-1/2 z-50">
          <button
            onClick={onMicPress}
            disabled={isAnalyzing}
            aria-label={isAnalyzing ? 'AI 비서 분석 중' : isListening ? '음성 인식 중지' : '음성 명령'}
            className={`w-20 h-20 rounded-full flex items-center justify-center border-4 border-black transition-all ${
              isListening
                ? 'bg-rose-500 text-white animate-pulse shadow-[0_0_20px_rgba(244,63,94,0.6)]'
                : isAnalyzing
                ? 'bg-[#3c887e] text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] cursor-wait'
                : 'bg-[#FACC15] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1'
            }`}
          >
            {isAnalyzing ? (
              <LoaderCircle className="w-8 h-8 animate-spin" strokeWidth={3} />
            ) : (
              <Mic className="w-8 h-8" strokeWidth={3} />
            )}
          </button>
        </div>

        <button onClick={() => onTabChange('사진')} className={`${tabClass(tab === '사진')} pl-6`}>
          <Camera className="w-7 h-7 mb-1.5" strokeWidth={tab === '사진' ? 3 : 2} />
          <span className="text-sm font-bold">사진</span>
        </button>
        <button onClick={() => onTabChange('일보')} className={tabClass(tab === '일보')}>
          <FileText className="w-7 h-7 mb-1.5" strokeWidth={tab === '일보' ? 3 : 2} />
          <span className="text-sm font-bold">정산</span>
        </button>
      </div>
    </div>
  );
}
