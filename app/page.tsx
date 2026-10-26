'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import BottomNav, { type TabKey } from '@/components/BottomNav';
import Header from '@/components/Header';
import AskModal from '@/components/modals/AskModal';
import ConfirmModal, { type ConfirmModalData } from '@/components/modals/ConfirmModal';
import HomeAreaModal from '@/components/modals/HomeAreaModal';
import BillingTab from '@/components/tabs/BillingTab';
import MaterialTab, { DEFAULT_MATERIAL_FORM, type MaterialForm } from '@/components/tabs/MaterialTab';
import PhotoTab from '@/components/tabs/PhotoTab';
import ShiftTab from '@/components/tabs/ShiftTab';
import { usePhotos } from '@/hooks/usePhotos';
import { useShifts, type ShiftForm } from '@/hooks/useShifts';
import { useVoiceAssistant } from '@/hooks/useVoiceAssistant';
import {
  billingPeriodLabel,
  calculateShiftPay,
  calculateWoodworkingMaterials,
  generateKakaoBillText,
  selectBillingShifts,
  toLocalISODate,
  type BillingPeriod,
  type ShiftRecord,
} from '@/lib/calculations';
import type { ToolCallResult } from '@/lib/mcp/interiorTools';
import { speakText } from '@/lib/native/voiceBridge';
import { formatArea } from '@/lib/region';
import { shareTextContent } from '@/lib/native/shareBridge';

const TOAST_MS = 3500;

export default function ConstructionApp() {
  const [tab, setTab] = useState<TabKey>('공수');
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [confirmModalData, setConfirmModalData] = useState<ConfirmModalData | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), TOAST_MS);
  }, []);
  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  // -------------------------------------------------------------
  // 1. 공수 장부 & 달력
  // -------------------------------------------------------------
  const ledger = useShifts();
  const [view, setView] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });
  const [selectedDate, setSelectedDate] = useState(() => toLocalISODate());

  const goToDate = (date: string) => {
    setSelectedDate(date);
    const [y, m] = date.split('-').map(Number);
    if (y && m) setView({ year: y, month: m });
  };
  const prevMonth = () =>
    setView(({ year, month }) => (month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 }));
  const nextMonth = () =>
    setView(({ year, month }) => (month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 }));

  const [homeModalOpen, setHomeModalOpen] = useState(false);
  const showHomeModal = homeModalOpen || (ledger.hydrated && !ledger.homeArea);

  // 현장명을 바꾸면 기억된 현장 지역으로 시외 여부를 자동으로 맞춘다 (모르는 현장이면 시외 버튼은 그대로).
  const updateShiftForm = (patch: Partial<ShiftForm>) => {
    if (patch.site === undefined) return ledger.updateForm(patch);
    const siteArea = ledger.siteAreas[patch.site.trim()] ?? null;
    const outOfTown = ledger.outOfTownFor(siteArea);
    ledger.updateForm({ ...patch, siteArea, ...(outOfTown !== null && { isOutOfTown: outOfTown }) });
  };

  const openShiftConfirm = (form: ShiftForm, date: string) => {
    const site = form.site.trim();
    if (!site) {
      alert('현장 이름을 입력해주세요.');
      return;
    }
    const expense = parseInt(form.expense, 10) || 0;
    const pay = calculateShiftPay({
      region: form.region,
      isLeader: form.isLeader,
      isOutOfTown: form.isOutOfTown,
      discountAmount: form.discountAmount,
      shift: form.shift,
      expense,
    });

    setConfirmModalData({
      title: '공수 등록 전 확인',
      items: [
        { label: '작업 일자', value: date },
        { label: '현장명', value: site },
        {
          label: '현장 지역',
          value: form.siteArea
            ? `${formatArea(form.siteArea)} · ${form.isOutOfTown ? '시외 +1만' : '시내'}`
            : form.isOutOfTown ? '시외 +1만' : '미확인 · 시내',
        },
        { label: '적용 공수', value: `${form.shift}공수` },
        { label: '인건비 산출', value: `${pay.laborTotal.toLocaleString()}원` },
        { label: '작업 메모', value: form.memo.trim() || '없음' },
        { label: '최종 합산액', value: `${pay.grandTotal.toLocaleString()}원` },
      ],
      onConfirm: () => {
        const record: ShiftRecord = {
          id: Date.now().toString(),
          date,
          site,
          client: form.isLeader ? '아버지(오야지)' : form.client.trim() || '미지정',
          shift: form.shift,
          payPerShift: pay.payPerShift,
          expense,
          isOutOfTown: form.isOutOfTown,
          isPaid: false,
          memo: form.memo.trim(),
        };
        ledger.addShift(record);
        if (form.siteArea && !ledger.siteAreas[site]) ledger.rememberSiteArea(site, form.siteArea);
        goToDate(date);
        ledger.resetForm();
        setConfirmModalData(null);
        showToast('장부에 등록되었습니다.');
      },
    });
  };

  // -------------------------------------------------------------
  // 2. 목공 물량
  // -------------------------------------------------------------
  const [material, setMaterial] = useState<MaterialForm>(DEFAULT_MATERIAL_FORM);
  // 음성 액션이 한 턴에 "계산 → 발주서 공유"를 연달아 실행하므로 최신 값을 ref 로도 들고 있는다.
  const materialRef = useRef(material);
  const updateMaterial = (patch: Partial<MaterialForm>) => {
    materialRef.current = { ...materialRef.current, ...patch };
    setMaterial(materialRef.current);
  };
  const computeMaterials = (m: MaterialForm) =>
    calculateWoodworkingMaterials({
      pyeong: parseFloat(m.pyeong) || 0,
      wallCount: m.wallCount,
      usageType: m.usageType,
      spacingType: m.spacingType,
      hasJoin: m.hasJoin,
      boardType: m.boardType,
      site: m.site || ledger.form.site,
    });
  const materialResult = computeMaterials(material);

  const shareMaterialOrder = async () => {
    const { orderText } = computeMaterials(materialRef.current);
    const outcome = await shareTextContent('목공 자재 발주서', orderText);
    showToast(outcome.method === 'clipboard' && outcome.ok ? '자재 발주서가 카톡용으로 복사되었습니다.' : outcome.message);
  };

  // -------------------------------------------------------------
  // 3. 사진
  // -------------------------------------------------------------
  const photoStore = usePhotos();

  const handleCapture = async (file: File, siteName: string, room: string) => {
    try {
      await photoStore.capturePhoto(file, siteName, room);
      showToast(`[${room}] 사진이 저장되었습니다.`);
    } catch (err) {
      console.error(err);
      showToast('사진 저장에 실패했습니다. 다시 촬영해 주세요.');
    }
  };

  const handleDeletePhoto = (id: string) => {
    photoStore.removePhoto(id).catch((err) => {
      console.error(err);
      showToast('사진 삭제에 실패했습니다.');
    });
  };

  // -------------------------------------------------------------
  // 4. 정산(일보)
  // -------------------------------------------------------------
  const [billingPeriod, setBillingPeriodState] = useState<BillingPeriod>('currentMonth');
  const [uncheckedBillingSites, setUncheckedBillingSites] = useState<string[]>([]);

  const changeBillingPeriod = (period: BillingPeriod) => {
    setBillingPeriodState(period);
    setUncheckedBillingSites([]);
  };
  const toggleBillingSite = (site: string, checked: boolean) =>
    setUncheckedBillingSites((prev) => (checked ? prev.filter((s) => s !== site) : [...prev, site]));

  const openBillConfirm = (period: BillingPeriod, unchecked: string[]) => {
    const target = selectBillingShifts(ledger.shifts, period, view.year, view.month).filter(
      (s) => !unchecked.includes(s.site),
    );
    if (target.length === 0) {
      alert('청구할 내역이 없거나 현장을 선택하지 않았습니다.');
      return;
    }
    const totalShifts = target.reduce((acc, cur) => acc + cur.shift, 0);
    const grandTotal = target.reduce((acc, cur) => acc + cur.shift * cur.payPerShift + cur.expense, 0);

    setConfirmModalData({
      title: '청구서 카톡 전송 확인',
      items: [
        { label: '청구 기간', value: billingPeriodLabel(period, view.month, '전체 미수금') },
        { label: '청구 현장 수', value: `${new Set(target.map((s) => s.site)).size}곳` },
        { label: '총 출역 공수', value: `${totalShifts}공수` },
        { label: '최종 청구 금액', value: `${grandTotal.toLocaleString()}원` },
      ],
      onConfirm: async () => {
        const text = generateKakaoBillText({
          shifts: target,
          periodLabel: billingPeriodLabel(period, view.month),
          bankAccount: ledger.bankAccount,
        });
        setConfirmModalData(null);
        const outcome = await shareTextContent('공수 청구서', text);
        showToast(outcome.method === 'clipboard' && outcome.ok ? '카카오톡 청구서가 복사되었습니다.' : outcome.message);
      },
    });
  };

  // -------------------------------------------------------------
  // 5. AI 음성 에이전트 액션 반영
  // -------------------------------------------------------------
  const handleAgentAction = async (action: ToolCallResult) => {
    switch (action.tool) {
      case 'record_shift': {
        const d = action.draft;
        const form: ShiftForm = {
          site: d.site,
          client: d.client ?? '',
          shift: d.shift,
          region: d.region,
          isLeader: d.isLeader,
          isOutOfTown: d.isOutOfTown,
          discountAmount: d.discountAmount,
          expense: d.mealExpense ? String(d.mealExpense) : '',
          memo: d.memo ?? '',
          siteArea: d.siteArea,
        };
        setTab('공수');
        goToDate(d.date);
        ledger.setForm(form);
        openShiftConfirm(form, d.date);
        showToast(`📝 [${d.site}] 공수 폼이 채워졌습니다.`);
        break;
      }
      case 'mark_shift_paid': {
        setTab('공수');
        const count = ledger.markSitePaid(action.site);
        const msg = count > 0 ? `[${action.site}] 입금 완료 처리했습니다.` : `[${action.site}] 미입금 건이 없습니다.`;
        showToast(count > 0 ? `✅ ${msg}` : msg);
        await speakText(msg);
        break;
      }
      case 'calculate_materials': {
        const { input, result } = action;
        setTab('물량');
        updateMaterial({
          pyeong: String(input.pyeong),
          wallCount: input.wallCount,
          usageType: input.usageType,
          spacingType: input.spacingType,
          hasJoin: input.hasJoin,
          boardType: input.boardType,
          site: input.site ?? materialRef.current.site,
        });
        showToast(`📐 ${input.pyeong}평 · 석고 ${result.requiredBoards}장 · 다루끼 ${result.requiredLumber}단`);
        break;
      }
      case 'prepare_kakao_bill': {
        const { period, targetSites } = action;
        const norm = (s: string) => s.replace(/\s+/g, '');
        const periodSites = Array.from(
          new Set(selectBillingShifts(ledger.shifts, period, view.year, view.month).map((s) => s.site)),
        );
        const unchecked = targetSites
          ? periodSites.filter((s) => !targetSites.some((t) => norm(s).includes(norm(t)) || norm(t).includes(norm(s))))
          : [];
        setTab('일보');
        setBillingPeriodState(period);
        setUncheckedBillingSites(unchecked);
        openBillConfirm(period, unchecked);
        break;
      }
      case 'prepare_material_order': {
        setTab('물량');
        if (action.site) updateMaterial({ site: action.site });
        await shareMaterialOrder();
        break;
      }
      case 'filter_site_photos': {
        setTab('사진');
        const site = photoStore.applyFilter(action.site, action.room);
        const label = [site, action.room].filter(Boolean).join(' · ');
        showToast(label ? `📷 [${label}] 사진 필터링` : '📷 전체 사진 목록입니다.');
        break;
      }
      case 'ask_follow_up_question':
        break; // useVoiceAssistant 가 되묻기 모달/음성을 처리한다.
    }
  };

  const voice = useVoiceAssistant({
    getContext: () => ({
      today: toLocalISODate(),
      selectedDate,
      activeTab: tab,
      knownSites: ledger.knownSites,
      unpaidSites: ledger.unpaidSites,
      homeArea: ledger.homeArea,
      siteAreas: ledger.siteAreas,
    }),
    onAction: handleAgentAction,
    notify: showToast,
  });

  const handleMicPress = () => void voice.toggleListening();

  return (
    <>
      <div className="min-h-screen pb-32 select-none antialiased bg-[#e0f2e9] text-[#000]">
        <Header
          year={view.year}
          month={view.month}
          unpaidTotal={ledger.unpaidTotal}
          homeLabel={ledger.homeArea ? formatArea(ledger.homeArea) : null}
          onHomeClick={() => setHomeModalOpen(true)}
        />

        {/* 대화 피드백 & 토스트 */}
        {toast && (
          <div className="fixed top-28 left-1/2 -translate-x-1/2 z-50 bg-[#3c887e] text-white text-base font-bold px-6 py-3 rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-3 max-w-[90%] text-center">
            <span className="w-3 h-3 rounded-full bg-[#FACC15] animate-ping flex-shrink-0 border-2 border-black" />
            <span>{toast}</span>
          </div>
        )}

        <main className="max-w-md mx-auto p-4 space-y-6">
          {tab === '공수' && (
            <ShiftTab
              shifts={ledger.shifts}
              year={view.year}
              month={view.month}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              onPrevMonth={prevMonth}
              onNextMonth={nextMonth}
              form={ledger.form}
              onFormChange={updateShiftForm}
              onSubmit={() => openShiftConfirm(ledger.form, selectedDate)}
              onTogglePaid={ledger.togglePaid}
              onDelete={ledger.deleteShift}
            />
          )}

          {tab === '물량' && (
            <MaterialTab
              form={material}
              onChange={updateMaterial}
              result={materialResult}
              onShareOrder={() => void shareMaterialOrder()}
            />
          )}

          {tab === '사진' && (
            <PhotoTab
              photos={photoStore.displayedPhotos}
              sites={photoStore.sites}
              siteFilter={photoStore.siteFilter}
              onSiteFilterChange={photoStore.setSiteFilter}
              roomFilter={photoStore.roomFilter}
              onRoomFilterChange={photoStore.setRoomFilter}
              onCapture={handleCapture}
              onDelete={handleDeletePhoto}
            />
          )}

          {tab === '일보' && (
            <BillingTab
              shifts={ledger.shifts}
              year={view.year}
              month={view.month}
              period={billingPeriod}
              onPeriodChange={changeBillingPeriod}
              uncheckedSites={uncheckedBillingSites}
              onToggleSite={toggleBillingSite}
              bankAccount={ledger.bankAccount}
              onBankAccountChange={ledger.setBankAccount}
              onSend={() => openBillConfirm(billingPeriod, uncheckedBillingSites)}
            />
          )}
        </main>

        <BottomNav
          tab={tab}
          onTabChange={setTab}
          isListening={voice.isListening}
          isAnalyzing={voice.isAnalyzing}
          onMicPress={handleMicPress}
        />

        {voice.pendingQuestion && (
          <AskModal
            question={voice.pendingQuestion}
            isListening={voice.isListening}
            isAnalyzing={voice.isAnalyzing}
            onAnswer={handleMicPress}
            onCancel={voice.cancelQuestion}
          />
        )}

        {showHomeModal && (
          <HomeAreaModal
            initial={ledger.homeArea}
            onSave={(area) => {
              ledger.setHomeArea(area);
              setHomeModalOpen(false);
              showToast(`🏠 거주지: ${formatArea(area)} — 이 밖의 현장은 시외로 계산합니다.`);
            }}
            onCancel={ledger.homeArea ? () => setHomeModalOpen(false) : undefined}
          />
        )}

        {confirmModalData && (
          <ConfirmModal data={confirmModalData} onCancel={() => setConfirmModalData(null)} />
        )}
      </div>
    </>
  );
}
