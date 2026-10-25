// lib/mcp/interiorMcpServer.ts
// 인테리어 목공 도메인 MCP 서버.
// - Resources: 은어 사전 / 정산·목공 룰 / 클라이언트 상태 스냅샷
// - Tools: Claude 가 호출하는 7개 도구. 실행 결과(ToolCallResult)는 클라이언트 UI 가 그대로 반영한다.
// 요청마다 클라이언트 스냅샷이 다르므로 createInteriorMcpServer(snapshot) 로 요청 단위 인스턴스를 만든다.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { INTERIOR_CONFIG } from '@/constants/interiorConfig';
import { buildSettlementRulesText, buildSlangDictionaryText } from '@/constants/interiorContext';
import {
  AskFollowUpQuestionInput,
  CalculateMaterialsInput,
  FilterSitePhotosInput,
  MarkShiftPaidInput,
  PrepareKakaoBillInput,
  PrepareMaterialOrderInput,
  RecordShiftInput,
  type AskFollowUpQuestionArgs,
  type BillingPeriod,
  type CalculateMaterialsArgs,
  type FilterSitePhotosArgs,
  type FollowUpQuestionType,
  type MarkShiftPaidArgs,
  type PrepareKakaoBillArgs,
  type PrepareMaterialOrderArgs,
  type RecordShiftArgs,
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

function toCallToolResult(result: ToolCallResult): CallToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(result) }],
    structuredContent: result as unknown as Record<string, unknown>,
  };
}

// -------------------------------------------------------------
// MCP 서버
// -------------------------------------------------------------
export function createInteriorMcpServer(snapshot: ClientSnapshot): McpServer {
  const server = new McpServer({ name: 'interior-woodworking', version: '1.0.0' });

  // --- Resources ---
  server.registerResource(
    'slang-dictionary',
    'interior://dictionary/slang',
    { title: '현장 은어 사전', description: '가베·덴죠·시다지·다루끼·오야지·데마찌 등 목공 현장 은어', mimeType: 'text/plain' },
    async (uri) => ({ contents: [{ uri: uri.href, mimeType: 'text/plain', text: buildSlangDictionaryText() }] }),
  );
  server.registerResource(
    'settlement-and-woodworking-rules',
    'interior://rules/settlement-and-woodworking',
    { title: '정산·목공 산출 룰', description: '지역 단가, 오야지 가산, 시외 수당, 석고/다루끼 산출 공식, 안전 수칙', mimeType: 'text/plain' },
    async (uri) => ({ contents: [{ uri: uri.href, mimeType: 'text/plain', text: buildSettlementRulesText() }] }),
  );
  server.registerResource(
    'client-snapshot',
    'interior://state/client-snapshot',
    { title: '클라이언트 상태', description: '현재 탭, 선택 날짜, 등록 현장, 미수금 현장, 직전 되묻기', mimeType: 'application/json' },
    async (uri) => ({ contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(snapshot) }] }),
  );

  // --- Tools --- (등록 순서 = listTools 순서. 프롬프트 캐시를 위해 순서를 바꾸지 말 것)
  server.registerTool(
    'record_shift',
    {
      title: '공수 등록',
      description: '공수(품)와 식대·메모를 장부에 등록할 초안을 만든다. 현장명이 없으면 ask_follow_up_question(ASK_SITE_NAME)을 대신 호출할 것.',
      inputSchema: RecordShiftInput,
    },
    async (args) => toCallToolResult(runRecordShift(args, snapshot)),
  );
  server.registerTool(
    'mark_shift_paid',
    {
      title: '입금 완료 처리',
      description: '미입금 현장의 공수를 입금 완료로 처리한다. 어느 현장인지 불명확하면 ask_follow_up_question(ASK_WHICH_SITE_PAID).',
      inputSchema: MarkShiftPaidInput,
    },
    async (args) => toCallToolResult(runMarkShiftPaid(args, snapshot)),
  );
  server.registerTool(
    'calculate_materials',
    {
      title: '목공 물량 계산',
      description: '평수·벽면수·용도·상간격·조인보강·석고규격으로 석고보드 장수와 다루끼 단수를 계산하고 물량 탭에 반영한다. 평수가 없으면 ask_follow_up_question(ASK_PYEONG).',
      inputSchema: CalculateMaterialsInput,
    },
    async (args) => toCallToolResult(runCalculateMaterials(args)),
  );
  server.registerTool(
    'prepare_kakao_bill',
    {
      title: '카톡 청구서 준비',
      description: '정산 탭으로 이동해 기간·대상 현장의 청구서 확인/공유 모달을 띄운다.',
      inputSchema: PrepareKakaoBillInput,
    },
    async (args) => toCallToolResult(runPrepareKakaoBill(args)),
  );
  server.registerTool(
    'prepare_material_order',
    {
      title: '자재 발주서 공유',
      description: '현재 산출된 자재 발주서를 카카오톡 공유로 보낸다.',
      inputSchema: PrepareMaterialOrderInput,
    },
    async (args) => toCallToolResult(runPrepareMaterialOrder(args)),
  );
  server.registerTool(
    'filter_site_photos',
    {
      title: '현장 사진 필터',
      description: '사진 탭으로 이동해 현장명과 공간 태그(거실/안방/주방/화장실/베란다/현관/천장)로 사진을 거른다.',
      inputSchema: FilterSitePhotosInput,
    },
    async (args) => toCallToolResult(runFilterSitePhotos(args, snapshot)),
  );
  server.registerTool(
    'ask_follow_up_question',
    {
      title: '되묻기',
      description: '필수 정보(현장명·평수·입금 현장)가 빠졌을 때 아버지께 음성과 모달로 되묻는다.',
      inputSchema: AskFollowUpQuestionInput,
    },
    async (args) => toCallToolResult(runAskFollowUpQuestion(args)),
  );

  return server;
}
