// constants/interpretIntent.ts
// 음성 발화 → 구조화된 "의도(Intent)" 스키마.
// route.ts(서버)와 이후 page.tsx(클라이언트) 양쪽에서 공유한다.
import { z } from 'zod';

/** 아버지의 음성에서 파악 가능한 의도 목록 */
export const INTENT_ACTIONS = [
  'RECORD_SHIFT',      // 공수 등록
  'MARK_PAID',         // 입금 확인
  'SHARE_BILL',        // 청구서/정산 공유
  'CALCULATE_MATERIAL',// 목공 물량 계산
  'SHARE_MATERIAL',    // 자재 발주서 공유
  'FILTER_PHOTOS',     // 현장 사진 필터
  'UNKNOWN',           // 판단 불가
] as const;

export type IntentAction = (typeof INTENT_ACTIONS)[number];

/**
 * 구조화 출력(Structured Outputs)용 스키마.
 * - 모든 필드는 필수이며, 해당 없는 값은 null 로 채운다(strict 스키마 요구사항).
 * - action 만 항상 유효한 열거값이어야 한다.
 */
export const IntentSchema = z.object({
  action: z.enum(INTENT_ACTIONS).describe('파악된 의도. 6가지 중 어디에도 안 맞으면 UNKNOWN.'),

  // 공수(RECORD_SHIFT) / 입금(MARK_PAID) / 사진(FILTER_PHOTOS) 공용
  site: z.string().nullable().describe("현장명. 예: '방배동 현장'. 없으면 null."),

  // 공수(RECORD_SHIFT)
  shift: z.number().nullable().describe('공수(품). 반공수 0.5, 하루 1.0, 야간 1.5. 없으면 null.'),
  region: z.enum(['seoul', 'gwangju']).nullable().describe('지역(서울/광주). 언급 없으면 null.'),
  isLeader: z.boolean().nullable().describe('오야지(시공 팀장) 여부. 언급 없으면 null.'),
  isOutOfTown: z.boolean().nullable().describe('시외 현장 여부. 언급 없으면 null.'),
  mealExpense: z.number().nullable().describe('식대/참값(원 단위 정수). 없으면 null.'),
  memo: z.string().nullable().describe('공수와 무관한 작업 메모. 없으면 null.'),

  // 물량(CALCULATE_MATERIAL)
  pyeong: z.number().nullable().describe('물량 계산 대상 평수. 없으면 null.'),
  usage: z.enum(['home1P', 'store2P']).nullable().describe('가정집=home1P, 상가=store2P. 없으면 null.'),
  spacing: z.enum(['300', '450']).nullable().describe('상 간격(300/450). 없으면 null.'),

  // 사진(FILTER_PHOTOS)
  room: z.string().nullable().describe("공간 태그. 예: '거실', '화장실'. 없으면 null."),

  // 청구서(SHARE_BILL)
  period: z
    .enum(['currentMonth', 'prevMonth', 'allUnpaid'])
    .nullable()
    .describe('청구 기간(이번달/지난달/전체 미수금). 없으면 null.'),

  // 참고용
  normalized: z.string().nullable().describe('은어를 표준어로 바꾼 정규화 문장(참고용). 없으면 null.'),
  confidence: z.number().nullable().describe('의도 파악 확신도 0~1.'),
});

export type Intent = z.infer<typeof IntentSchema>;

/**
 * generateInteriorSystemPrompt() 뒤에 붙여 출력 형식을 못박는 지시문.
 */
export const INTENT_SYSTEM_SUFFIX = `
---
[출력 규칙 — 반드시 준수]
- 응답은 제공된 구조화 출력(JSON) 스키마로만 한다. 자유 서술/설명 금지.
- 해당 없는 필드는 전부 null 로 채운다.
- 6가지 action(공수 등록 / 입금 확인 / 청구서 공유 / 물량 계산 / 자재 발주 공유 / 사진 필터) 중
  어디에도 명확히 해당하지 않으면 action = "UNKNOWN" 으로 응답한다.
- [현재 상황]에 주어진 '등록된 현장'·'미입금 현장' 목록을 이용해
  "그 현장", "저번 거기", "지난번 그곳" 같은 지시 표현을 실제 현장명으로 해석한다.
- 은어(가베, 헤베, 덴죠, 오야지, 시다지 등)는 표준어로 해석하되,
  site 와 memo 값에는 아버지가 실제로 말한 표현을 최대한 그대로 보존한다.
- normalized 에는 은어를 표준어로 치환한 문장을 넣는다(디버깅용).
`;
