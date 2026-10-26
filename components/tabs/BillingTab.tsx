// components/tabs/BillingTab.tsx
// 탭 4: 월말 정산 및 청구서 공유
import { Check, CheckSquare } from 'lucide-react';
import {
  billingPeriodLabel,
  generateKakaoBillText,
  selectBillingShifts,
  type BillingPeriod,
  type ShiftRecord,
} from '@/lib/calculations';

interface BillingTabProps {
  shifts: ShiftRecord[];
  year: number;
  month: number;
  period: BillingPeriod;
  onPeriodChange: (period: BillingPeriod) => void;
  uncheckedSites: string[];
  onToggleSite: (site: string, checked: boolean) => void;
  bankAccount: string;
  onBankAccountChange: (value: string) => void;
  onSend: () => void;
}

const PERIOD_BUTTONS: { period: BillingPeriod; label: string; activeClass: string }[] = [
  { period: 'prevMonth', label: '지난 달', activeClass: 'bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' },
  { period: 'currentMonth', label: '이번 달', activeClass: 'bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' },
  { period: 'allUnpaid', label: '전체 미수금', activeClass: 'bg-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' },
];

export default function BillingTab({
  shifts,
  year,
  month,
  period,
  onPeriodChange,
  uncheckedSites,
  onToggleSite,
  bankAccount,
  onBankAccountChange,
  onSend,
}: BillingTabProps) {
  const baseShifts = selectBillingShifts(shifts, period, year, month);
  const sites = Array.from(new Set(baseShifts.map((s) => s.site)));
  const billingShifts = baseShifts.filter((s) => !uncheckedSites.includes(s.site));
  const preview = generateKakaoBillText({ shifts: billingShifts, periodLabel: billingPeriodLabel(period, month), bankAccount });

  return (
    <div className="bg-white p-6 rounded-xl border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-6">
      <div className="border-b-4 border-black pb-4">
        <h2 className="text-3xl font-black text-black">정산 청구서</h2>
      </div>

      <div>
        <label className="block text-base font-bold mb-2">정산 기간 선택</label>
        <div className="grid grid-cols-3 gap-2 bg-[#ceb5a7] p-2 rounded-xl border-4 border-black shadow-[inset_0px_4px_0px_rgba(0,0,0,0.1)]">
          {PERIOD_BUTTONS.map((b) => (
            <button
              key={b.period}
              onClick={() => onPeriodChange(b.period)}
              className={`py-3.5 rounded-xl text-base font-bold border-2 border-black transition-all ${
                period === b.period ? b.activeClass : 'bg-transparent border-transparent'
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-base font-bold mb-2">청구할 현장 체크</label>
        <div className="space-y-3">
          {sites.length === 0 ? (
            <div className="font-bold text-lg p-6 bg-[#e0f2e9] border-4 border-black rounded-xl text-center">
              해당 기간 미입금 건이 없습니다.
            </div>
          ) : (
            sites.map((site) => {
              const checked = !uncheckedSites.includes(site);
              return (
                <label key={site} className="flex items-center gap-4 p-5 bg-white hover:bg-[#e0f2e9] border-4 border-black rounded-xl cursor-pointer shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-colors">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => onToggleSite(site, e.target.checked)}
                      className="w-7 h-7 appearance-none border-2 border-black rounded bg-white checked:bg-[#3c887e] outline-none cursor-pointer"
                    />
                    {checked && <Check className="absolute top-0.5 left-0.5 w-6 h-6 text-white pointer-events-none" />}
                  </div>
                  <span className="text-xl font-bold">{site}</span>
                </label>
              );
            })
          )}
        </div>
      </div>

      <div>
        <label className="block text-base font-bold mb-2">입금 계좌</label>
        <input
          type="text"
          value={bankAccount}
          onChange={(e) => onBankAccountChange(e.target.value)}
          className="w-full text-lg font-bold p-4 bg-white border-4 border-black rounded-xl outline-none focus:bg-[#e0f2e9] shadow-[inset_0px_4px_0px_rgba(0,0,0,0.05)]"
        />
      </div>

      <div className="bg-[#ceb5a7] p-5 rounded-xl font-bold text-sm whitespace-pre-wrap leading-relaxed border-4 border-black shadow-[inset_0px_4px_0px_rgba(0,0,0,0.1)]">
        {preview}
      </div>

      <button
        onClick={onSend}
        className={`w-full py-5 rounded-xl text-xl font-black border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center justify-center gap-3 ${
          billingShifts.length > 0 ? 'bg-[#FACC15] text-black' : 'bg-gray-200 text-gray-500 cursor-not-allowed'
        }`}
        disabled={billingShifts.length === 0}
      >
        <CheckSquare className="w-7 h-7" /> 카톡 보내기
      </button>
    </div>
  );
}
