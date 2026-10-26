// lib/localVoiceRouter.ts
// 오프라인/비상 폴백 라우터. /api/mcp 호출이 실패했을 때만 쓰인다.
// 키워드·정규식으로 발화를 해석해 서버와 같은 MCP 도구 실행기(interiorTools)로 액션을 만든다.
import { INTERIOR_CONFIG } from '@/constants/interiorConfig';
import type { CalculateMaterialsArgs, RecordShiftArgs } from '@/constants/interpretIntent';
import { toLocalISODate } from '@/lib/calculations';
import { parseAreaText } from '@/lib/region';
import {
  runCalculateMaterials,
  runFilterSitePhotos,
  runMarkShiftPaid,
  runPrepareKakaoBill,
  runPrepareMaterialOrder,
  runRecordShift,
  type ClientSnapshot,
  type ToolCallResult,
} from '@/lib/mcp/interiorTools';

export interface LocalRouteResult {
  actions: ToolCallResult[];
  message: string | null;
}

const EMPTY_SHIFT: RecordShiftArgs = {
  site: null, date: null, shift: null, region: null, isLeader: null,
  isOutOfTown: null, siteArea: null, discountAmount: null, mealExpense: null, client: null, memo: null,
};

const EMPTY_MATERIAL: CalculateMaterialsArgs = {
  pyeong: null, wallCount: null, usageType: null, spacingType: null, hasJoin: null, boardType: null, site: null,
};

const has = (text: string, ...words: string[]) => words.some((w) => text.includes(w));
const done = (actions: ToolCallResult[], message: string | null = null): LocalRouteResult => ({ actions, message });

/** 되묻기에 대한 짧은 대답에서 현장명만 남긴다. */
function cleanSiteAnswer(text: string): string {
  return text.replace(/[.,?!]/g, '').replace(/현장|이야|입니다|이요|에서|으로/g, '').trim() || text.trim();
}

/** 발화에 등록된 현장명(공백 무시)이 들어 있으면 그 현장을 돌려준다. */
function findSiteIn(text: string, sites: string[]): string | null {
  const flat = text.replace(/\s+/g, '');
  return sites.find((s) => flat.includes(s.replace(/\s+/g, '').replace(/현장$/, ''))) ?? null;
}

function shiftDate(today: string | undefined, daysAgo: number): string {
  const d = today ? new Date(`${today}T00:00:00`) : new Date();
  d.setDate(d.getDate() - daysAgo);
  return toLocalISODate(d);
}

export function routeLocally(text: string, snap: ClientSnapshot): LocalRouteResult {
  // [1] 직전 되묻기에 대한 대답
  const pending = snap.pendingQuestion;
  if (pending) {
    const draft = pending.draftData ?? {};
    switch (pending.questionType) {
      case 'ASK_SITE_NAME':
        return done([runRecordShift({ ...EMPTY_SHIFT, ...(draft as Partial<RecordShiftArgs>), site: cleanSiteAnswer(text) }, snap)]);
      case 'ASK_SITE_AREA': {
        const siteArea = parseAreaText(text, snap.homeArea ?? null);
        if (!siteArea) return done([], '지역을 알아듣지 못했습니다. 시나 군 이름으로 말씀해 주세요.');
        return done([runRecordShift({ ...EMPTY_SHIFT, ...(draft as Partial<RecordShiftArgs>), siteArea }, snap)]);
      }
      case 'ASK_PYEONG': {
        const num = text.match(/\d+(\.\d+)?/);
        if (!num) return done([], '숫자(평수)를 인식하지 못했습니다.');
        return done([runCalculateMaterials({ ...EMPTY_MATERIAL, ...(draft as Partial<CalculateMaterialsArgs>), pyeong: parseFloat(num[0]) })]);
      }
      case 'ASK_WHICH_SITE_PAID': {
        const site = findSiteIn(text, snap.unpaidSites ?? []) ?? cleanSiteAnswer(text);
        return done([runMarkShiftPaid({ site }, snap)]);
      }
    }
  }

  // [2] 입금 확인
  if (has(text, '입금', '돈 들어', '결제됐', '수금')) {
    const unpaid = snap.unpaidSites ?? [];
    if (unpaid.length === 0) return done([], '현재 미입금 현장이 없습니다.');
    return done([runMarkShiftPaid({ site: findSiteIn(text, unpaid) }, snap)]);
  }

  // [3] 청구서
  if (has(text, '청구서', '정산', '월말', '미수금')) {
    const period = has(text, '전체', '미수금') ? 'allUnpaid' : has(text, '저번', '지난') ? 'prevMonth' : 'currentMonth';
    return done([runPrepareKakaoBill({ period, targetSites: null })]);
  }

  // [4] 자재 발주서 (물량 계산보다 먼저 — "자재 발주서"에 '자재'가 들어 있다)
  if (has(text, '발주서', '자재 보내')) {
    return done([runPrepareMaterialOrder({ site: findSiteIn(text, snap.knownSites ?? []) })]);
  }

  // [5] 목공 물량 계산
  if (has(text, '석고', '다루끼', '자재', '물량', '몇 장')) {
    const pyeong = text.match(/(\d+(\.\d+)?)\s*평/);
    const isStore = has(text, '뻬인트', '빼인트', '페인트', '상가', '투피');
    const isHome = has(text, '가정집', '도배', '원피');
    const usageType = isStore ? 'store2P' : isHome ? 'home1P' : null;
    return done([
      runCalculateMaterials({
        ...EMPTY_MATERIAL,
        pyeong: pyeong ? parseFloat(pyeong[1]) : null,
        usageType,
        spacingType: usageType === 'store2P' ? '450' : usageType === 'home1P' ? '300' : null,
        hasJoin: has(text, '조인') ? true : null,
        wallCount: has(text, '천장', '덴죠', '5면') ? 5 : null,
        boardType: has(text, '사팔', '4x8', '4×8', '시하찌') ? '4x8' : has(text, '삼육', '3x6', '3×6') ? '3x6' : null,
      }),
    ]);
  }

  // [6] 사진 필터
  if (has(text, '사진') && has(text, '보여', '필터', '찾아')) {
    const room = INTERIOR_CONFIG.roomTags.find((r) => r !== '전체' && text.includes(r)) ?? null;
    return done([runFilterSitePhotos({ site: findSiteIn(text, snap.knownSites ?? []), room }, snap)]);
  }

  // [7] 기본: 공수 등록
  let shift: RecordShiftArgs['shift'] = 1;
  if (has(text, '반공수', '0.5')) shift = 0.5;
  else if (has(text, '공수 반', '공수반', '하루 반', '야간', '1.5')) shift = 1.5;
  else if (has(text, '이공', '2공', '이틀')) shift = 2;

  // 시외 여부는 직접 말했을 때만 정하고, 나머지는 거주지·현장 지역으로 runRecordShift 가 계산한다.
  const isOutOfTown = text.includes('시외');
  const isLeader = has(text, '오야지', '내가 팀장', '내가 반장');

  let mealExpense = 0;
  if (has(text, '식대', '밥값', '참값')) {
    const man = text.match(/(\d+)\s*만/);
    if (man) mealExpense = parseInt(man[1], 10) * 10000;
    else if (text.includes('만오천')) mealExpense = 15000;
    else if (text.includes('만원')) mealExpense = 10000;
  }

  const date = has(text, '그저께', '그제') ? shiftDate(snap.today, 2) : text.includes('어제') ? shiftDate(snap.today, 1) : null;

  // 현장명: 등록된 현장 → "OO에서/현장/아파트/…" 패턴 순으로 찾는다.
  const siteMatch = text.match(/([가-힣A-Za-z0-9]+)\s*(에서|현장|아파트|빌라|상가|오피스텔)/);
  const knownSite = findSiteIn(text, snap.knownSites ?? []);
  const site = knownSite ?? (siteMatch ? `${siteMatch[1]} ${siteMatch[2] === '에서' ? '현장' : siteMatch[2]}` : null);

  // 식별된 명령어를 지우고 남은 말을 메모로 쓴다.
  let memo = text;
  if (knownSite) memo = memo.replace(knownSite, '');
  else if (siteMatch) memo = memo.replace(siteMatch[0], '');
  memo = memo
    .replace(/(반공수|0\.5공수?|0\.5|야간|1\.5공수?|1\.5|공수 반|하루 반|이공|2공|이틀|1공수?|일공|한 공수|시외|오야지|내가 팀장|내가 반장|그저께|그제|어제|오늘)/g, '')
    .replace(/(\d+)\s*만\s*(원)?\s*(식대|밥값|참값)?|(만오천원?|만원)|(식대|밥값|참값)/g, '')
    .replace(/공수|현장|추가|적어|등록|찍어|해줘|줘|놔/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return done([
    runRecordShift(
      {
        ...EMPTY_SHIFT,
        site,
        date,
        shift,
        isLeader: isLeader || null,
        isOutOfTown: isOutOfTown || null,
        mealExpense: mealExpense || null,
        client: isLeader ? '아버지(오야지)' : null,
        memo: memo.length > 1 ? memo : null,
      },
      snap,
    ),
  ]);
}
