// components/tabs/MaterialTab.tsx
// 탭 2: 목공 자재 산출기
import { Share2 } from 'lucide-react';
import type { BoardType, SpacingType, UsageType, WallCount, WoodworkingResult } from '@/lib/calculations';

export interface MaterialForm {
  pyeong: string; // 입력창 값 그대로
  wallCount: WallCount;
  usageType: UsageType;
  spacingType: SpacingType;
  hasJoin: boolean;
  boardType: BoardType;
  site: string; // 발주서 표기용 (음성으로 지정 시)
}

export const DEFAULT_MATERIAL_FORM: MaterialForm = {
  pyeong: '15',
  wallCount: 4,
  usageType: 'home1P',
  spacingType: '300',
  hasJoin: false,
  boardType: '3x6',
  site: '',
};

interface MaterialTabProps {
  form: MaterialForm;
  onChange: (patch: Partial<MaterialForm>) => void;
  result: WoodworkingResult;
  onShareOrder: () => void;
}

const smallToggle = (active: boolean, activeClass: string) =>
  `py-3 rounded-xl text-base font-bold border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all ${
    active ? activeClass : 'bg-white'
  }`;

const largeToggle = (active: boolean, activeClass: string, extra: string) =>
  `${extra} rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all ${
    active ? activeClass : 'bg-white'
  }`;

export default function MaterialTab({ form, onChange, result, onShareOrder }: MaterialTabProps) {
  return (
    <div className="bg-white p-6 rounded-xl border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-6">
      <div className="border-b-4 border-black pb-4">
        <h2 className="text-3xl font-black">자재 산출기</h2>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-base font-bold mb-2">평수</label>
          <input
            type="number"
            value={form.pyeong}
            onChange={(e) => onChange({ pyeong: e.target.value })}
            className="w-full text-2xl font-bold p-4 bg-white border-4 border-black rounded-xl outline-none focus:bg-[#e0f2e9] shadow-[inset_0px_4px_0px_rgba(0,0,0,0.05)]"
          />
        </div>
        <div>
          <label className="block text-base font-bold mb-2">시공 벽면 수</label>
          <div className="grid grid-cols-1 gap-3">
            <button onClick={() => onChange({ wallCount: 4 })} className={smallToggle(form.wallCount === 4, 'bg-[#5b7b7a] text-white')}>
              벽 4면
            </button>
            <button onClick={() => onChange({ wallCount: 5 })} className={smallToggle(form.wallCount === 5, 'bg-[#5b7b7a] text-white')}>
              천장포함 (5면)
            </button>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-base font-bold mb-2">마감 용도 (석고 겹수)</label>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => onChange({ usageType: 'home1P', spacingType: '300' })}
            className={largeToggle(form.usageType === 'home1P', 'bg-[#a17c6b] text-white', 'p-5 text-left')}
          >
            <div className="text-xl font-bold">가정집</div>
            <div className="text-base font-semibold mt-1">원피 (1P)</div>
          </button>
          <button
            onClick={() => onChange({ usageType: 'store2P', spacingType: '450' })}
            className={largeToggle(form.usageType === 'store2P', 'bg-[#a17c6b] text-white', 'p-5 text-left')}
          >
            <div className="text-xl font-bold">상가</div>
            <div className="text-base font-semibold mt-1">투피 (2P)</div>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-base font-bold mb-2">상 간격</label>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => onChange({ spacingType: '300' })} className={smallToggle(form.spacingType === '300', 'bg-[#3c887e] text-white')}>
              300상
            </button>
            <button onClick={() => onChange({ spacingType: '450' })} className={smallToggle(form.spacingType === '450', 'bg-[#3c887e] text-white')}>
              450상
            </button>
          </div>
        </div>
        <div>
          <label className="block text-base font-bold mb-2">조인 보강</label>
          <button onClick={() => onChange({ hasJoin: !form.hasJoin })} className={`w-full ${smallToggle(form.hasJoin, 'bg-[#FACC15] text-black')}`}>
            {form.hasJoin ? '보강 (+15%)' : '기본 간격'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button onClick={() => onChange({ boardType: '3x6' })} className={largeToggle(form.boardType === '3x6', 'bg-black text-white', 'py-4 text-base font-bold')}>
          석고 3×6
        </button>
        <button onClick={() => onChange({ boardType: '4x8' })} className={largeToggle(form.boardType === '4x8', 'bg-black text-white', 'py-4 text-base font-bold')}>
          석고 4×8
        </button>
      </div>

      <div className="p-6 bg-[#e0f2e9] rounded-xl border-4 border-black shadow-[inset_0px_4px_0px_rgba(0,0,0,0.05)] space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-lg font-bold">석고보드 ({form.boardType}):</span>
          <span className="text-2xl font-black bg-white px-4 py-1.5 border-2 border-black rounded-lg">{result.requiredBoards}장</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-lg font-bold">다루끼 (1단=12개):</span>
          <span className="text-2xl font-black bg-white px-4 py-1.5 border-2 border-black rounded-lg">{result.requiredLumber}단</span>
        </div>
      </div>

      <button
        onClick={onShareOrder}
        className="w-full py-5 bg-[#3c887e] text-white font-black text-xl rounded-xl border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all flex justify-center items-center gap-3"
      >
        <Share2 className="w-6 h-6" /> 발주서 보내기
      </button>
    </div>
  );
}
