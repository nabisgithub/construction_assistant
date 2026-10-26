// lib/mcp/interiorTools.ts
// 인테리어 MCP 도구 실행기(순수 함수)와 결과 타입.
// MCP SDK 에 의존하지 않으므로 서버(interiorMcpServer)와 클라이언트 오프라인 폴백(localVoiceRouter)이 함께 쓴다.
import { INTERIOR_CONFIG } from '@/constants/interiorConfig';
import type {
  AskFollowUpQuestionArgs,
  BillingPeriod,
  CalculateMaterialsArgs,
  FilterSitePhotosArgs,
  FollowUpQuestionType,
  MarkShiftPaidArgs,
  PrepareKakaoBillArgs,
  PrepareMaterialOrderArgs,
  RecordShiftArgs,
} from '@/constants/interpretIntent';
import {
  calculateShiftPay,
  calculateWoodworkingMaterials,
  type ShiftPayResult,
  type WoodworkingParams,
  type WoodworkingResult,
} from '@/lib/calculations';

/** 클라이언트가 함께 보내는 현재 상태 (interior://state/client-snapshot) */
export interface PendingQuestion {
  questionType: FollowUpQuestionType;
  ttsMessage?: string;
  draftData?: Record<string, unknown> | null;
}

export interface ClientSnapshot {
  today?: string;
  selectedDate?: string;
  activeTab?: string;
  knownSites?: string[];
  unpaidSites?: string[];
  pendingQuestion?: PendingQuestion | null;
}

/** 도구 실행 결과 → 클라이언트 액션 */
export type ToolCallResult =
  | {
      tool: 'record_shift';
      draft: {
        site: string;
        date: string;
        shift: number;
        region: 'seoul' | 'gwangju';
        isLeader: boolean;
        isOutOfTown: boolean;
        discountAmount: number;
        mealExpense: number;
        client: string | null;
        memo: string | null;
      };
      pay: ShiftPayResult;
    }
  | { tool: 'mark_shift_paid'; site: string }
  | { tool: 'calculate_materials'; input: WoodworkingParams; result: WoodworkingResult }
  | { tool: 'prepare_kakao_bill'; period: BillingPeriod; targetSites: string[] | null }
  | { tool: 'prepare_material_order'; site: string | null }
  | { tool: 'filter_site_photos'; site: string | null; room: string | null }
  | {
      tool: 'ask_follow_up_question';
      questionType: FollowUpQuestionType;
      ttsMessage: string;
      draftData: Record<string, unknown> | null;
    };

export type InteriorToolName = ToolCallResult['tool'];

const PHOTO_ROOMS = INTERIOR_CONFIG.roomTags.filter(r => r !== '전체');

function ask(
  questionType: FollowUpQuestionType,
  ttsMessage: string,
  draftData: Record<string, unknown> | null,
): ToolCallResult {
  return { tool: 'ask_follow_up_question', questionType, ttsMessage, draftData };
}

function stripNulls(obj: object): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== null && v !== undefined));
}

/** 발화 속 현장명을 등록된 목록과 대조 (완전 일치 → 부분 포함 순) */
function matchSite(spoken: string, candidates: string[]): string | null {
  const norm = (s: string) => s.replace(/\s+/g, '').replace(/현장$/, '');
  const target = norm(spoken);
  if (!target) return null;
  const exact = candidates.find(c => norm(c) === target);
  if (exact) return exact;
  const partial = candidates.filter(c => norm(c).includes(target) || target.includes(norm(c)));
  return partial.length === 1 ? partial[0] : null;
}

// -------------------------------------------------------------
// 도구 실행기 (순수 함수)
// -------------------------------------------------------------
export function runRecordShift(args: RecordShiftArgs, snap: ClientSnapshot): ToolCallResult {
  const site = args.site?.trim();
  if (!site) {
    return ask('ASK_SITE_NAME', '어느 현장에서 일하셨나요?', stripNulls(args));
  }
  const draft = {
    site: matchSite(site, snap.knownSites ?? []) ?? site,
    date: args.date ?? snap.selectedDate ?? snap.today ?? new Date().toISOString().slice(0, 10),
    shift: args.shift ?? 1,
    region: args.region ?? (INTERIOR_CONFIG.rates.defaultRegion as 'seoul' | 'gwangju'),
    isLeader: args.isLeader ?? false,
    isOutOfTown: args.isOutOfTown ?? false,
    discountAmount: args.discountAmount ?? 0,
    mealExpense: args.mealExpense ?? 0,
    client: args.client ?? null,
    memo: args.memo ?? null,
  };
  const pay = calculateShiftPay({
    region: draft.region,
    isLeader: draft.isLeader,
    isOutOfTown: draft.isOutOfTown,
    discountAmount: draft.discountAmount,
    shift: draft.shift,
    expense: draft.mealExpense,
  });
  return { tool: 'record_shift', draft, pay };
}

export function runMarkShiftPaid(args: MarkShiftPaidArgs, snap: ClientSnapshot): ToolCallResult {
  const unpaid = snap.unpaidSites ?? [];
  const matched = args.site ? matchSite(args.site, unpaid) : unpaid.length === 1 ? unpaid[0] : null;
  if (!matched) {
    const tts = unpaid.length
      ? `어느 현장 입금이 들어왔나요? 미입금 현장은 ${unpaid.join(', ')}입니다.`
      : '미입금 현장이 없습니다. 어느 현장 입금인지 다시 말씀해 주세요.';
    return ask('ASK_WHICH_SITE_PAID', tts, stripNulls(args));
  }
  return { tool: 'mark_shift_paid', site: matched };
}

export function runCalculateMaterials(args: CalculateMaterialsArgs): ToolCallResult {
  if (!args.pyeong || args.pyeong <= 0) {
    return ask('ASK_PYEONG', '몇 평 현장인가요?', stripNulls(args));
  }
  const usageType = args.usageType ?? 'home1P';
  const input: WoodworkingParams = {
    pyeong: args.pyeong,
    wallCount: args.wallCount ?? 4,
    usageType,
    spacingType: args.spacingType ?? (usageType === 'store2P' ? '450' : '300'),
    hasJoin: args.hasJoin ?? false,
    boardType: args.boardType ?? '3x6',
    site: args.site ?? undefined,
  };
  return { tool: 'calculate_materials', input, result: calculateWoodworkingMaterials(input) };
}

export function runPrepareKakaoBill(args: PrepareKakaoBillArgs): ToolCallResult {
  return {
    tool: 'prepare_kakao_bill',
    period: args.period ?? 'currentMonth',
    targetSites: args.targetSites?.length ? args.targetSites : null,
  };
}

export function runPrepareMaterialOrder(args: PrepareMaterialOrderArgs): ToolCallResult {
  return { tool: 'prepare_material_order', site: args.site ?? null };
}

export function runFilterSitePhotos(args: FilterSitePhotosArgs, snap: ClientSnapshot): ToolCallResult {
  const room = args.room && PHOTO_ROOMS.includes(args.room) ? args.room : null;
  const site = args.site ? matchSite(args.site, snap.knownSites ?? []) ?? args.site : null;
  return { tool: 'filter_site_photos', site, room };
}

export function runAskFollowUpQuestion(args: AskFollowUpQuestionArgs): ToolCallResult {
  return ask(args.questionType, args.ttsMessage, args.draftData ?? null);
}
