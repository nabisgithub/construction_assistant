'use client';
// components/modals/HomeAreaModal.tsx
// 처음 실행 시 거주지 설정. 거주지 밖 현장을 시외(+1만)로 계산하는 기준이 된다.
import { useState } from 'react';
import { Home } from 'lucide-react';
import { SIDO_LIST, type Area, type SidoName } from '@/lib/region';

interface HomeAreaModalProps {
  initial: Area | null;
  onSave: (area: Area) => void;
  onCancel?: () => void; // 처음 설정할 때는 닫을 수 없다
}

export default function HomeAreaModal({ initial, onSave, onCancel }: HomeAreaModalProps) {
  const [sido, setSido] = useState<SidoName | null>(initial?.sido ?? null);
  const [sigungu, setSigungu] = useState(initial?.sigungu ?? '');

  const selected = SIDO_LIST.find((s) => s.name === sido);
  const needsSigungu = selected ? !selected.metro : false;
  const canSave = !!selected && (!needsSigungu || sigungu.trim().length > 0);

  return (
    <div className="fixed inset-0 z-50 bg-[#e0f2e9]/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-xl p-7 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-5 animate-in fade-in duration-200">
        <div className="flex items-center gap-3 font-black text-2xl border-b-4 border-black pb-4">
          <Home className="w-8 h-8 text-[#3c887e]" strokeWidth={3} />
          어디 사세요?
        </div>
        <p className="text-base font-bold text-black/70">
          사시는 곳 밖의 현장은 시외(+1만)로 계산합니다. 광역시는 시 전체, 도는 시·군 단위입니다.
        </p>

        <div className="grid grid-cols-3 gap-2">
          {SIDO_LIST.map((s) => (
            <button
              key={s.name}
              type="button"
              onClick={() => setSido(s.name)}
              className={`py-3 rounded-xl text-base font-bold border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all ${
                sido === s.name ? 'bg-[#3c887e] text-white' : 'bg-white'
              }`}
            >
              {s.short}
            </button>
          ))}
        </div>

        {needsSigungu && (
          <div>
            <label className="block text-base font-bold mb-2">시·군</label>
            <input
              type="text"
              placeholder="예: 성남시, 담양군"
              value={sigungu}
              onChange={(e) => setSigungu(e.target.value)}
              className="w-full text-lg font-bold p-4 bg-white border-4 border-black rounded-xl outline-none focus:bg-[#e0f2e9] shadow-[inset_0px_4px_0px_rgba(0,0,0,0.05)]"
            />
          </div>
        )}

        <div className={`grid gap-4 pt-2 ${onCancel ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {onCancel && (
            <button
              onClick={onCancel}
              className="py-4 bg-white border-4 border-black font-black text-lg rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
            >
              취소
            </button>
          )}
          <button
            disabled={!canSave}
            onClick={() => selected && onSave({ sido: selected.name, sigungu: needsSigungu ? sigungu.trim() : null })}
            className={`py-4 border-4 border-black font-black text-lg rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all ${
              canSave ? 'bg-[#FACC15] text-black' : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }`}
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
