// lib/storage/shiftStorage.ts
// 공수 장부 · 입금 계좌 영속화.
// 안드로이드 앱에서는 @capacitor/preferences(네이티브 SharedPreferences)를 원본으로 삼고
// localStorage를 미러로 유지해, 시스템이 웹뷰 캐시를 정리해도 장부가 보존되게 한다.
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import type { ShiftRecord } from '@/lib/calculations';
import type { Area } from '@/lib/region';

export const SHIFTS_KEY = 'father_shifts_v13';
export const BANK_ACCOUNT_KEY = 'father_bank_account';
export const HOME_AREA_KEY = 'father_home_area';
export const SITE_AREAS_KEY = 'father_site_areas';

const isBrowser = () => typeof window !== 'undefined';

function readLocal(key: string): string | null {
  if (!isBrowser()) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLocal(key: string, value: string): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // 쿼터 초과 등 — 네이티브 환경에서는 Preferences가 원본이므로 무시한다.
  }
}

// -------------------------------------------------------------
// [1] 동기화 읽기/쓰기
// -------------------------------------------------------------
async function readSynced(key: string): Promise<string | null> {
  const local = readLocal(key);
  if (!Capacitor.isNativePlatform()) return local;

  const { value } = await Preferences.get({ key });
  if (value !== null) {
    // 웹뷰 캐시가 지워졌다면 localStorage를 다시 채운다.
    if (local !== value) writeLocal(key, value);
    return value;
  }
  // 네이티브 저장소가 비어 있고 웹뷰에만 남아 있으면 Preferences로 백필한다.
  if (local !== null) await Preferences.set({ key, value: local });
  return local;
}

async function writeSynced(key: string, value: string): Promise<void> {
  writeLocal(key, value);
  if (Capacitor.isNativePlatform()) await Preferences.set({ key, value });
}

// -------------------------------------------------------------
// [2] 공수 장부
// -------------------------------------------------------------
export async function loadShifts(): Promise<ShiftRecord[]> {
  const raw = await readSynced(SHIFTS_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ShiftRecord[]) : [];
  } catch {
    return [];
  }
}

export async function saveShifts(shifts: ShiftRecord[]): Promise<void> {
  await writeSynced(SHIFTS_KEY, JSON.stringify(shifts));
}

// -------------------------------------------------------------
// [3] 입금 계좌
// -------------------------------------------------------------
export async function loadBankAccount(): Promise<string | null> {
  return readSynced(BANK_ACCOUNT_KEY);
}

export async function saveBankAccount(bankAccount: string): Promise<void> {
  await writeSynced(BANK_ACCOUNT_KEY, bankAccount);
}

// -------------------------------------------------------------
// [4] 거주지 · 현장별 지역 (시외 판정용)
// -------------------------------------------------------------
async function readJson<T>(key: string): Promise<T | null> {
  const raw = await readSynced(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function loadHomeArea(): Promise<Area | null> {
  return readJson<Area>(HOME_AREA_KEY);
}

export async function saveHomeArea(area: Area): Promise<void> {
  await writeSynced(HOME_AREA_KEY, JSON.stringify(area));
}

/** 현장명 → 지역. 현장마다 한 번 확인하면 이후에는 묻지 않는다. */
export async function loadSiteAreas(): Promise<Record<string, Area>> {
  return (await readJson<Record<string, Area>>(SITE_AREAS_KEY)) ?? {};
}

export async function saveSiteAreas(siteAreas: Record<string, Area>): Promise<void> {
  await writeSynced(SITE_AREAS_KEY, JSON.stringify(siteAreas));
}
