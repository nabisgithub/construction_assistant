'use client';
// hooks/useShifts.ts
// 공수 장부 · 입금 계좌 · 공수 등록 폼 상태. 영속화는 lib/storage/shiftStorage 가 담당한다.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Region, ShiftRecord } from '@/lib/calculations';
import { isOutOfTownArea, type Area } from '@/lib/region';
import {
  SHIFTS_KEY,
  loadBankAccount,
  loadHomeArea,
  loadShifts,
  loadSiteAreas,
  saveBankAccount,
  saveHomeArea,
  saveShifts,
  saveSiteAreas,
} from '@/lib/storage/shiftStorage';

export interface ShiftForm {
  site: string;
  client: string;
  shift: number;
  region: Region;
  isLeader: boolean;
  isOutOfTown: boolean;
  discountAmount: number;
  expense: string; // 입력창 값 그대로 (원)
  memo: string;
  siteArea: Area | null; // 현장 지역 (시외 판정). 모르면 null
}

export const DEFAULT_SHIFT_FORM: ShiftForm = {
  site: '',
  client: '',
  shift: 1.0,
  region: 'seoul',
  isLeader: false,
  isOutOfTown: false,
  discountAmount: 0,
  expense: '',
  memo: '',
  siteArea: null,
};

const DEFAULT_BANK_ACCOUNT = '국민 123-456-78901 홍길동';

// 장부를 한 번도 저장한 적 없는 첫 실행에만 보여주는 예시 데이터.
function demoShifts(): ShiftRecord[] {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return [
    { id: '1', date: `${y}-${m}-01`, site: '서초 래미안', client: '김반장', shift: 1.0, payPerShift: 290000, expense: 12000, isOutOfTown: false, isPaid: true, memo: '거실 천장 다루끼 상 작업' },
    { id: '2', date: `${y}-${m}-02`, site: '용인 상가', client: '아버지(오야지)', shift: 0.5, payPerShift: 445000, expense: 15000, isOutOfTown: true, isPaid: false },
  ];
}

function hasSavedLedger(): boolean {
  try {
    return window.localStorage.getItem(SHIFTS_KEY) !== null;
  } catch {
    return false;
  }
}

export function useShifts() {
  const [shifts, setShifts] = useState<ShiftRecord[]>([]);
  const [bankAccount, setBankAccountState] = useState(DEFAULT_BANK_ACCOUNT);
  const [form, setForm] = useState<ShiftForm>(DEFAULT_SHIFT_FORM);
  const [homeArea, setHomeAreaState] = useState<Area | null>(null);
  const [siteAreas, setSiteAreas] = useState<Record<string, Area>>({});
  const [hydrated, setHydrated] = useState(false);
  const skipSave = useRef(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadShifts(), loadBankAccount(), loadHomeArea(), loadSiteAreas()])
      .then(([saved, account, home, areas]) => {
        if (cancelled) return;
        // loadShifts 가 Preferences → localStorage 를 동기화하므로 이후 localStorage 만 보면 된다.
        setShifts(saved.length === 0 && !hasSavedLedger() ? demoShifts() : saved);
        if (account) setBankAccountState(account);
        setHomeAreaState(home);
        setSiteAreas(areas);
        setHydrated(true);
      })
      .catch(console.error);
    return () => {
      cancelled = true;
    };
  }, []);

  // 불러온 직후(예시 데이터 포함)는 저장하지 않고, 이후 변경분만 저장한다.
  useEffect(() => {
    if (!hydrated) return;
    if (skipSave.current) {
      skipSave.current = false;
      return;
    }
    saveShifts(shifts).catch(console.error);
  }, [shifts, hydrated]);

  const setBankAccount = useCallback((value: string) => {
    setBankAccountState(value);
    saveBankAccount(value).catch(console.error);
  }, []);

  const setHomeArea = useCallback((area: Area) => {
    setHomeAreaState(area);
    saveHomeArea(area).catch(console.error);
  }, []);

  /** 확인된 현장 지역을 기억한다. 다음부터는 이 현장의 시외 여부를 묻지 않는다. */
  const rememberSiteArea = useCallback(
    (site: string, area: Area) => {
      const next = { ...siteAreas, [site]: area };
      setSiteAreas(next);
      saveSiteAreas(next).catch(console.error);
    },
    [siteAreas],
  );

  /** 거주지 기준 시외 여부. 거주지나 현장 지역을 몰라 판단할 수 없으면 null */
  const outOfTownFor = useCallback(
    (area: Area | null) => (homeArea && area ? isOutOfTownArea(homeArea, area) : null),
    [homeArea],
  );

  const addShift = useCallback((record: ShiftRecord) => {
    setShifts((prev) => [record, ...prev]);
  }, []);

  const togglePaid = useCallback((id: string) => {
    setShifts((prev) => prev.map((s) => (s.id === id ? { ...s, isPaid: !s.isPaid } : s)));
  }, []);

  const deleteShift = useCallback((id: string) => {
    setShifts((prev) => prev.filter((s) => s.id !== id));
  }, []);

  /** 해당 현장의 미입금 공수를 모두 입금 완료로 바꾸고, 바뀐 건수를 반환한다. */
  const markSitePaid = useCallback(
    (site: string) => {
      const count = shifts.filter((s) => s.site === site && !s.isPaid).length;
      setShifts((prev) => prev.map((s) => (s.site === site && !s.isPaid ? { ...s, isPaid: true } : s)));
      return count;
    },
    [shifts],
  );

  const updateForm = useCallback((patch: Partial<ShiftForm>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  }, []);

  // 등록 후에는 현장·식대·메모·가산 옵션만 비우고 지역·공수·거래처는 유지한다.
  const resetForm = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      site: '',
      expense: '',
      memo: '',
      siteArea: null,
      isLeader: false,
      isOutOfTown: false,
      discountAmount: 0,
    }));
  }, []);

  const knownSites = useMemo(() => Array.from(new Set(shifts.map((s) => s.site))), [shifts]);
  const unpaidSites = useMemo(
    () => Array.from(new Set(shifts.filter((s) => !s.isPaid).map((s) => s.site))),
    [shifts],
  );
  const unpaidTotal = useMemo(
    () => shifts.filter((s) => !s.isPaid).reduce((acc, cur) => acc + cur.shift * cur.payPerShift + cur.expense, 0),
    [shifts],
  );

  return {
    hydrated,
    homeArea,
    setHomeArea,
    siteAreas,
    rememberSiteArea,
    outOfTownFor,
    shifts,
    knownSites,
    unpaidSites,
    unpaidTotal,
    addShift,
    togglePaid,
    deleteShift,
    markSitePaid,
    bankAccount,
    setBankAccount,
    form,
    setForm,
    updateForm,
    resetForm,
  };
}
