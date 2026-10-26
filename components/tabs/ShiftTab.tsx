'use client';
// components/tabs/ShiftTab.tsx
// 탭 1: 공수 달력, 일자별 상세, 공수 등록 폼
import { useState } from 'react';
import { AlertCircle, Check, ChevronLeft, ChevronRight, Coffee, MapPin, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { INTERIOR_CONFIG } from '@/constants/interiorConfig';
import { calculateShiftPay, type ShiftRecord } from '@/lib/calculations';
import type { ShiftForm } from '@/hooks/useShifts';

interface ShiftTabProps {
  shifts: ShiftRecord[];
  year: number;
  month: number;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  form: ShiftForm;
  onFormChange: (patch: Partial<ShiftForm>) => void;
  onSubmit: () => void;
  onTogglePaid: (id: string) => void;
  onDelete: (id: string) => void;
}

function calendarDays(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const totalDays = new Date(year, month, 0).getDate();
  return [...Array<null>(firstDay).fill(null), ...Array.from({ length: totalDays }, (_, i) => i + 1)];
}

export default function ShiftTab({
  shifts,
  year,
  month,
  selectedDate,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
  form,
  onFormChange,
  onSubmit,
  onTogglePaid,
  onDelete,
}: ShiftTabProps) {
  const [siteFilter, setSiteFilter] = useState('전체');

  const allSites = ['전체', ...Array.from(new Set(shifts.map((s) => s.site)))];
  const filteredShifts = siteFilter === '전체' ? shifts : shifts.filter((s) => s.site === siteFilter);
  const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;
  const currentMonthShifts = filteredShifts.filter((s) => s.date.startsWith(monthPrefix));

  const totalMonthShifts = currentMonthShifts.reduce((acc, cur) => acc + cur.shift, 0);
  const grandMonthTotal = currentMonthShifts.reduce((acc, cur) => acc + cur.shift * cur.payPerShift + cur.expense, 0);

  const getDayInfo = (day: number) => {
    const dateKey = `${monthPrefix}-${String(day).padStart(2, '0')}`;
    const dayShifts = filteredShifts.filter((s) => s.date === dateKey);
    return {
      dateKey,
      dayTotalShift: dayShifts.reduce((acc, cur) => acc + cur.shift, 0),
      hasUnpaid: dayShifts.some((s) => !s.isPaid),
      hasMemo: dayShifts.some((s) => s.memo && s.memo.trim() !== ''),
    };
  };

  const selectedDateShifts = filteredShifts.filter((s) => s.date === selectedDate);

  const { laborTotal } = calculateShiftPay({
    region: form.region,
    isLeader: form.isLeader,
    isOutOfTown: form.isOutOfTown,
    discountAmount: form.discountAmount,
    shift: form.shift,
    expense: 0,
  });

  const handleDelete = (id: string) => {
    if (confirm('이 기록을 삭제하시겠습니까?')) onDelete(id);
  };

  return (
    <>
      {/* 요약 카드 */}
      <div className="bg-[#3c887e] text-white p-6 rounded-xl border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex justify-between items-center text-base font-bold mb-3">
          <span>이달의 출역 합계</span>
          <span className="bg-[#FACC15] text-black px-3 py-1 rounded-full border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-bold">
            {currentMonthShifts.length}일 근무
          </span>
        </div>
        <div className="flex justify-between items-baseline mt-2">
          <div>
            <span className="text-5xl font-black tracking-tight">{totalMonthShifts.toFixed(1)}</span>
            <span className="text-2xl font-bold ml-1.5">공수</span>
          </div>
          <div className="text-right">
            <div className="text-3xl font-black bg-white text-black px-3 py-1 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-md inline-block">
              {grandMonthTotal.toLocaleString()}원
            </div>
          </div>
        </div>

        {allSites.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pt-5 mt-5 border-t-4 border-black no-scrollbar">
            {allSites.map((site) => (
              <button
                key={site}
                onClick={() => setSiteFilter(site)}
                className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap border-2 border-black transition-all ${
                  siteFilter === site
                    ? 'bg-[#FACC15] text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] translate-y-0'
                    : 'bg-white text-black hover:bg-[#ceb5a7] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                }`}
              >
                {site}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 브루탈리즘 달력 */}
      <div className="bg-white p-5 rounded-xl border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex justify-between items-center px-2 py-1 mb-4">
          <button onClick={onPrevMonth} className="p-3 bg-[#ceb5a7] rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="text-2xl font-black tracking-tight">
            {year}.{String(month).padStart(2, '0')}
          </div>
          <button onClick={onNextMonth} className="p-3 bg-[#ceb5a7] rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all">
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>

        <div className="grid grid-cols-7 text-center text-sm font-bold border-b-4 border-black pb-3 mb-3">
          <div className="text-rose-600">SUN</div><div>MON</div><div>TUE</div><div>WED</div><div>THU</div><div>FRI</div><div className="text-blue-600">SAT</div>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {calendarDays(year, month).map((day, idx) => {
            if (day === null) return <div key={`empty-${idx}`} className="h-16" />;

            const { dateKey, dayTotalShift, hasUnpaid, hasMemo } = getDayInfo(day);
            const isSelected = selectedDate === dateKey;

            return (
              <button
                key={dateKey}
                onClick={() => onSelectDate(dateKey)}
                className={`relative h-16 p-1 flex flex-col justify-between items-center border-2 border-transparent transition-all ${
                  isSelected
                    ? 'bg-[#a17c6b] text-white border-black shadow-[inset_0_0_0_2px_rgba(0,0,0,1)] rounded-xl'
                    : 'hover:bg-[#e0f2e9] hover:border-black rounded-xl'
                }`}
              >
                {/* 메모 표시 (노란색 점) */}
                {hasMemo && (
                  <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#FACC15] border border-black rounded-full shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] z-10 animate-pulse"></div>
                )}

                <span className={`text-base font-bold ${isSelected ? 'text-white' : idx % 7 === 0 ? 'text-rose-600' : idx % 7 === 6 ? 'text-blue-600' : 'text-black'}`}>
                  {day}
                </span>

                {dayTotalShift > 0 && (
                  <div className={`w-full py-0.5 rounded border border-black text-xs font-bold tracking-tight ${
                    isSelected
                      ? 'bg-white text-black'
                      : hasUnpaid
                      ? 'bg-rose-500 text-white'
                      : 'bg-[#5b7b7a] text-white'
                  }`}>
                    {dayTotalShift}공
                  </div>
                )}
                {dayTotalShift === 0 && <div className="h-4" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* 선택 날짜 상세 */}
      <div className="bg-white p-6 rounded-xl border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-5">
        <div className="text-2xl font-black border-b-4 border-black pb-4">
          📍 {selectedDate}
        </div>

        {selectedDateShifts.length > 0 ? (
          <div className="space-y-4">
            {selectedDateShifts.map((item) => (
              <div
                key={item.id}
                className={`p-5 rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${
                  item.isPaid ? 'bg-white' : 'bg-[#ceb5a7]'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="w-full">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-sm font-bold px-3 py-1 rounded bg-[#5b7b7a] text-white border-2 border-black">
                        {item.client}
                      </span>
                      {item.isOutOfTown && (
                        <span className="text-sm font-bold px-3 py-1 rounded bg-[#FACC15] text-black border-2 border-black">
                          시외+1만
                        </span>
                      )}
                    </div>

                    <div className="flex justify-between items-center w-full">
                      <div>
                        <div className="text-xl font-bold">{item.site}</div>
                        <div className="text-base font-semibold mt-1">
                          {item.shift}공수 · {(item.shift * item.payPerShift).toLocaleString()}원
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <button
                          onClick={() => onTogglePaid(item.id)}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all ${
                            item.isPaid ? 'bg-emerald-400 text-black' : 'bg-rose-500 text-white'
                          }`}
                        >
                          {item.isPaid ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                          {item.isPaid ? '입금완료' : '미입금'}
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-black hover:bg-rose-500 hover:text-white p-2 border-2 border-transparent hover:border-black rounded-xl transition-all"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    {/* 메모 노출 영역 (포스트잇 느낌) */}
                    {item.memo && (
                      <div className="mt-4 p-3 bg-[#FACC15] border-2 border-black rounded-lg text-sm font-bold shadow-[inset_0px_2px_0px_rgba(255,255,255,0.3)]">
                        📝 {item.memo}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-5 text-center font-bold text-lg text-[#5b7b7a]">
            기록된 공수가 없습니다.
          </div>
        )}

        {/* 공수 등록 폼 */}
        <div className="pt-6 border-t-4 border-black space-y-5">
          <div className="text-xl font-black flex items-center gap-2">
            <Plus className="w-7 h-7 text-[#5b7b7a]" /> 공수 추가
          </div>

          <input
            type="text"
            placeholder="현장 이름 (예: 서초 래미안 302호)"
            value={form.site}
            onChange={(e) => onFormChange({ site: e.target.value })}
            className="w-full text-lg font-bold p-4 bg-white border-4 border-black rounded-xl outline-none focus:bg-[#e0f2e9] shadow-[inset_0px_4px_0px_rgba(0,0,0,0.05)] transition-colors"
          />

          <div>
            <label className="block text-base font-bold mb-2">기준 지역</label>
            <div className="grid grid-cols-2 gap-3">
              {(['seoul', 'gwangju'] as const).map((region) => (
                <button
                  key={region}
                  type="button"
                  onClick={() => onFormChange({ region })}
                  className={`py-3.5 rounded-xl font-bold text-base border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all ${
                    form.region === region ? 'bg-[#5b7b7a] text-white' : 'bg-white'
                  }`}
                >
                  {INTERIOR_CONFIG.rates.regions[region].name} ({INTERIOR_CONFIG.rates.regions[region].pay / 10000}만)
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => onFormChange({ isLeader: !form.isLeader })}
              className={`py-3.5 rounded-xl font-bold text-base border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 ${
                form.isLeader ? 'bg-[#FACC15] text-black' : 'bg-white'
              }`}
            >
              <ShieldCheck className="w-5 h-5" /> 오야지 (+0.5품)
            </button>
            <button
              type="button"
              onClick={() => onFormChange({ isOutOfTown: !form.isOutOfTown })}
              className={`py-3.5 rounded-xl font-bold text-base border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 ${
                form.isOutOfTown ? 'bg-[#a17c6b] text-white' : 'bg-white'
              }`}
            >
              <MapPin className="w-5 h-5" /> 시외 (+1만)
            </button>
          </div>

          <div>
            <div className="flex justify-between text-base font-bold mb-2">
              <span>가변 할인</span>
              <span className="text-rose-600 bg-rose-100 px-2 py-0.5 rounded border-2 border-black">
                단가: {laborTotal.toLocaleString()}원
              </span>
            </div>
            <div className="flex gap-2">
              {INTERIOR_CONFIG.rates.discountOptions.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => onFormChange({ discountAmount: amt })}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all ${
                    form.discountAmount === amt ? 'bg-black text-white' : 'bg-white'
                  }`}
                >
                  {amt === 0 ? '정상' : `${amt / 10000}만`}
                </button>
              ))}
            </div>
          </div>

          {/* 공수 선택 */}
          <div className="grid grid-cols-2 gap-3 mt-5">
            {[0.5, 1.0, 1.5, 2.0].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => onFormChange({ shift: val })}
                className={`py-4 rounded-xl text-base font-bold border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all ${
                  form.shift === val ? 'bg-[#3c887e] text-white' : 'bg-white'
                }`}
              >
                {val}공
              </button>
            ))}
          </div>

          {/* 작업 메모 포스트잇 */}
          <div className="pt-3">
            <label className="block text-base font-bold mb-2 flex items-center gap-2">
              📝 작업 메모 <span className="text-sm font-normal text-gray-500">(선택)</span>
            </label>
            <textarea
              placeholder="오늘 어떤 작업을 하셨나요? (마이크로 말하면 자동으로 채워집니다)"
              value={form.memo}
              onChange={(e) => onFormChange({ memo: e.target.value })}
              rows={2}
              className="w-full text-base font-bold p-4 bg-[#FACC15] border-4 border-black rounded-xl outline-none focus:bg-[#fde047] shadow-[inset_0px_4px_0px_rgba(0,0,0,0.05)] transition-colors resize-none placeholder-black/50"
            />
          </div>

          <div className="pt-1">
            <label className="block text-base font-bold mb-2 flex items-center gap-2">
              <Coffee className="w-5 h-5" /> 선결제 식대 청구
            </label>
            <input
              type="number"
              placeholder="사비 지출 밥값 (원)"
              value={form.expense}
              onChange={(e) => onFormChange({ expense: e.target.value })}
              className="w-full text-lg font-bold p-4 bg-white border-4 border-black rounded-xl outline-none focus:bg-[#e0f2e9] shadow-[inset_0px_4px_0px_rgba(0,0,0,0.05)] transition-colors"
            />
          </div>

          <button
            type="button"
            onClick={onSubmit}
            className="w-full py-5 bg-[#FACC15] text-black font-black text-xl rounded-xl border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all mt-5"
          >
            장부 저장하기
          </button>
        </div>
      </div>
    </>
  );
}
