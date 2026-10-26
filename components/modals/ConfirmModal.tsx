// components/modals/ConfirmModal.tsx
// 공수 등록 / 청구서 전송 최종 검수 모달
import { ShieldCheck } from 'lucide-react';

export interface ConfirmModalData {
  title: string;
  items: { label: string; value: string }[];
  onConfirm: () => void;
}

interface ConfirmModalProps {
  data: ConfirmModalData;
  onCancel: () => void;
}

export default function ConfirmModal({ data, onCancel }: ConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-[#e0f2e9]/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm rounded-xl p-7 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-6 animate-in fade-in duration-200">
        <div className="flex items-center gap-3 font-black text-2xl border-b-4 border-black pb-4">
          <ShieldCheck className="w-8 h-8 text-[#3c887e]" strokeWidth={3} />
          {data.title}
        </div>

        <div className="space-y-4 bg-[#ceb5a7] p-6 rounded-xl border-4 border-black shadow-[inset_0px_4px_0px_rgba(0,0,0,0.1)]">
          {data.items.map((item, i) => (
            <div key={i} className="flex justify-between items-center text-base">
              <span className="font-bold text-black/70">{item.label}</span>
              <span className="font-black text-xl text-right max-w-[60%] line-clamp-2">{item.value}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4 pt-3">
          <button
            onClick={onCancel}
            className="py-4 bg-white border-4 border-black font-black text-lg rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
          >
            수정
          </button>
          <button
            onClick={data.onConfirm}
            className="py-4 bg-[#FACC15] border-4 border-black text-black font-black text-lg rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
