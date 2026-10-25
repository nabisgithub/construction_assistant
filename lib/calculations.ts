// lib/calculations.ts
// 공수 단가 · 목공 자재 산출 · 청구서 텍스트 생성 순수 함수.
// app/page.tsx(UI)와 lib/mcp(서버 도구)가 같은 공식을 공유한다.
import { INTERIOR_CONFIG } from '@/constants/interiorConfig';

export type Region = keyof typeof INTERIOR_CONFIG.rates.regions;
export type WallCount = 4 | 5;
export type UsageType = keyof typeof INTERIOR_CONFIG.woodworking.usageTypes;
export type SpacingType = keyof typeof INTERIOR_CONFIG.woodworking.spacing;
export type BoardType = keyof typeof INTERIOR_CONFIG.woodworking.gypsum;

export interface ShiftRecord {
  id: string;
  date: string;
  site: string;
  client: string;
  shift: number;
  payPerShift: number;
  expense: number;
  isOutOfTown: boolean;
  isPaid: boolean;
  memo?: string;
}

// -------------------------------------------------------------
// [1] 공수 단가
// -------------------------------------------------------------
export interface ShiftPayParams {
  region: Region;
  isLeader: boolean;
  isOutOfTown: boolean;
  discountAmount: number;
  shift: number;
  expense: number;
}

export interface ShiftPayResult {
  basePay: number;
  payPerShift: number; // 1공수당 단가 (오야지·시외·할인 반영)
  laborTotal: number;  // 인건비 = 단가 × 공수
  expense: number;     // 식대/참값
  grandTotal: number;  // 인건비 + 식대
}

export function calculateShiftPay(params: ShiftPayParams): ShiftPayResult {
  const { rates } = INTERIOR_CONFIG;
  const basePay = rates.regions[params.region].pay;
  const payPerShift =
    basePay +
    (params.isLeader ? basePay * rates.leaderBonusMultiplier : 0) +
    (params.isOutOfTown ? rates.outOfTownSurcharge : 0) +
    params.discountAmount;
  const laborTotal = payPerShift * params.shift;
  return {
    basePay,
    payPerShift,
    laborTotal,
    expense: params.expense,
    grandTotal: laborTotal + params.expense,
  };
}

// -------------------------------------------------------------
// [2] 목공 물량 산출
// -------------------------------------------------------------
export interface WoodworkingParams {
  pyeong: number;
  wallCount: WallCount;
  usageType: UsageType;
  spacingType: SpacingType;
  hasJoin: boolean;
  boardType: BoardType;
  site?: string; // 발주서 표기용
}

export interface WoodworkingResult {
  areaSqm: number;
  wallFactor: number;
  requiredBoards: number; // 석고보드 장수
  requiredLumber: number; // 다루끼 단수 (1단 = 12개)
  orderText: string;
}

export function calculateWoodworkingMaterials(params: WoodworkingParams): WoodworkingResult {
  const { woodworking } = INTERIOR_CONFIG;
  const pyeong = params.pyeong > 0 ? params.pyeong : 0;
  const areaSqm = pyeong * woodworking.sqmPerPyeong;
  const boardSqm = woodworking.gypsum[params.boardType].areaSqm;
  const usage = woodworking.usageTypes[params.usageType];
  const spacing = woodworking.spacing[params.spacingType];

  const wallFactor = params.wallCount === 5 ? 1.25 : 1.0;
  const requiredBoards = pyeong > 0
    ? Math.ceil(((areaSqm * wallFactor) / boardSqm) * usage.layerMultiplier * (1 + usage.lossRate))
    : 0;

  const joinMultiplier = params.hasJoin ? 1 + woodworking.joinExtraRate : 1.0;
  const requiredLumber = pyeong > 0
    ? Math.ceil(pyeong * spacing.bundlePerPyeong * joinMultiplier)
    : 0;

  const usageLabel = params.usageType === 'home1P' ? '가정집 (도배 마감 - 1P 원피)' : '상가 (페인트 도장 - 2P 투피)';
  const spacingLabel = params.spacingType === '300' ? '300상 (원피)' : '450상 (투피)';

  const orderText = `[목공 자재 발주서]
• 시공 현장: ${params.site || '현장 미기재'} (${pyeong}평, ${params.wallCount}면)
• 마감 방식: ${usageLabel}
• 다루끼 간격: ${spacingLabel} ${params.hasJoin ? '(조인보강 포함)' : ''}
---------------------------
1. ${params.boardType === '3x6' ? '석고 3×6' : '석고 4×8'}: ${requiredBoards}장
2. 다루끼 (1단=12개): 약 ${requiredLumber}단
3. 권장 타카핀: 콘크리트 타카핀 / DT날 / 실타카 1짝
4. 천장 트랜스 보강용: 5T 합판 확인 요망`;

  return { areaSqm, wallFactor, requiredBoards, requiredLumber, orderText };
}

// -------------------------------------------------------------
// [3] 카카오톡 청구서
// -------------------------------------------------------------
export interface KakaoBillParams {
  shifts: ShiftRecord[];
  periodLabel: string; // 예: '10월', '전체 미입금건'
  bankAccount: string;
}

export function generateKakaoBillText({ shifts, periodLabel, bankAccount }: KakaoBillParams): string {
  const siteMap: { [site: string]: { shifts: number; total: number } } = {};
  let totalShifts = 0;
  let totalWages = 0;
  let totalMealExpense = 0;

  shifts.forEach((s) => {
    if (!siteMap[s.site]) siteMap[s.site] = { shifts: 0, total: 0 };
    siteMap[s.site].shifts += s.shift;
    siteMap[s.site].total += s.shift * s.payPerShift;
    totalShifts += s.shift;
    totalWages += s.shift * s.payPerShift;
    totalMealExpense += s.expense;
  });

  let text = `[${periodLabel} 공수 및 식대 청구서]\n---------------------------\n`;
  Object.keys(siteMap).forEach((siteName) => {
    const data = siteMap[siteName];
    text += `• ${siteName}: ${data.shifts}공수 (${data.total.toLocaleString()}원)\n`;
  });
  if (totalMealExpense > 0) {
    text += `• 선결제 식대/참값: ${totalMealExpense.toLocaleString()}원 (주유비 제외)\n`;
  }
  text += `---------------------------\n`;
  text += `총 출역: ${totalShifts}공수\n`;
  text += `총 청구금액: ${(totalWages + totalMealExpense).toLocaleString()}원\n\n`;
  text += `입금계좌: ${bankAccount}`;
  return text;
}
