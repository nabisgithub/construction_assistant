// lib/storage/shiftStorage.ts
// 공수 장부 · 입금 계좌 영속화.
// 안드로이드 앱에서는 @capacitor/preferences(네이티브 SharedPreferences)를 원본으로 삼고
// localStorage를 미러로 유지해, 시스템이 웹뷰 캐시를 정리해도 장부가 보존되게 한다.
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import type { ShiftRecord } from '@/lib/calculations';

export const SHIFTS_KEY = 'father_shifts_v13';
export const BANK_ACCOUNT_KEY = 'father_bank_account';

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
