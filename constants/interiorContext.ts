// constants/interiorContext.ts
import { INTERIOR_CONFIG } from './interiorConfig';

/**
 * [1] 베테랑 인테리어 목수 현장 은어 & 발음 보정 사전 (블로그 + 나무위키 통합본)
 */
export const INTERIOR_SLANG_DICTIONARY = [
  // --- 1. 목공/인테리어 뼈대 및 구조 은어 ---
  { slang: "가베", standard: "벽체", note: "벽을 세우거나 칠 때 사용" },
  { slang: "덴죠 / 덴죠오", standard: "천장", note: "천장 목공 작업" },
  { slang: "시다지", standard: "바탕재 / 골조", note: "마감을 하기 전 뼈대가 되는 가벽/목공 작업" },
  { slang: "요꼬 / 요꼬상", standard: "가로 / 가로상", note: "수평 방향 각재 골조" },
  { slang: "다데 / 다데상", standard: "세로 / 세로상", note: "수직 방향 각재 골조" },
  { slang: "가꾸 / 와꾸", standard: "틀 / 테두리", note: "문틀(문와꾸), 창틀 구조" },
  { slang: "마지까리", standard: "칸막이 벽", note: "공간을 분리하는 가벽" },
  { slang: "하시라", standard: "기둥", note: "수직 기둥" },
  { slang: "람마 / 문선", standard: "인방 / 문틀 테두리", note: "문틀 위쪽이나 테두리 마감" },
  { slang: "데스리", standard: "난간", note: "계단이나 발코니의 안전 난간" },

  // --- 2. 자재 및 부자재 규격 ---
  { slang: "다루끼 / 가꾸목", standard: "각목 (보통 30x30 소송)", note: "보통 1단 = 12개 묶음" },
  { slang: "투바이 / 투바이포", standard: "30x60 각재 / 2x4 경량목", note: "벽체 보강용 두꺼운 목재" },
  { slang: "삼육 / 사부꼬루", standard: "900x1800mm 규격", note: "3x6 합판 및 석고보드" },
  { slang: "사팔 / 시하찌", standard: "1200x2400mm 규격", note: "4x8 합판 및 석고보드" },
  { slang: "베니야", standard: "합판", note: "얇은 목재 합판 통칭" },
  { slang: "우라 / 우라판", standard: "뒷판 / 안쪽", note: "싱크대, 붙박이장 등 가구의 뒷면 얇은 판" },
  { slang: "구사비", standard: "쐐기", note: "문틀 수평/수직을 잡을 때 틈새에 끼워넣는 나무 조각" },
  { slang: "네꼬 / 하도메", standard: "굄 / 괴임재", note: "수평을 맞추기 위해 바닥에 고이는 조각" },
  { slang: "기레빠시", standard: "자투리 / 토막", note: "남은 목재나 자재 조각" },
  { slang: "반셍", standard: "굵은 철선 / 결속선", note: "비계나 자재를 묶을 때 사용" },
  { slang: "폼 / 떡볶이", standard: "우레탄 폼", note: "문틀 고정 및 단열 틈새 메꿈재" },

  // --- 3. 시공 상태 및 측정 용어 ---
  { slang: "헤베", standard: "제곱미터 (m²)", note: "면적 단위 (1평 = 약 3.3m²), 물량 산출 기준" },
  { slang: "루베", standard: "세제곱미터 (m³)", note: "부피 단위 (레미콘, 몰탈, 폐기물 등)" },
  { slang: "가네 / 오가네", standard: "직교 / 직각", note: "코너의 직각이 맞는지 확인할 때 사용" },
  { slang: "덴바", standard: "윗면 / 상단", note: "마감 높이나 윗면 수평 기준" },
  { slang: "데꼬보꼬", standard: "요철 / 단차", note: "면이 고르지 않고 울퉁불퉁한 상태" },
  { slang: "스미", standard: "먹줄", note: "수직/수평 기준선을 긋는 작업" },
  { slang: "스끼마", standard: "틈새 / 유격", note: "자재 사이의 틈새" },

  // --- 4. 장비 및 도구 ---
  { slang: "우마", standard: "말비계 / 작업 발판", note: "천장 목공, 도배 시 딛고 올라서는 소형 발판" },
  { slang: "아시바", standard: "비계 / 높은 발판", note: "높은 곳에서 작업하기 위한 철물 임시 가설물" },
  { slang: "조기대 / 죠오기", standard: "규준대 / 가이드", note: "테이블 톱으로 나무를 켤 때 대는 일직선 가이드" },
  { slang: "사시가네", standard: "곡척 / ㄱ자 직각자", note: "목수가 쓰는 ㄱ자 형태의 쇠자" },
  { slang: "겐나와 / 마끼자", standard: "줄자", note: "길이를 재는 기본 도구" },
  { slang: "빠루", standard: "노루발 못빼기", note: "못을 빼거나 철거할 때 쓰는 연장" },
  { slang: "빼빠 / 사포", standard: "연마지", note: "표면을 매끄럽게 갈아내는 작업" },

  // --- 5. 현장 관리 및 인력 용어 ---
  { slang: "단도리", standard: "사전 준비 / 채비", note: "본격적인 작업 전 자재/연장 세팅" },
  { slang: "시마이", standard: "마감 / 작업 종료", note: "오늘 일과를 끝냄" },
  { slang: "야리끼리", standard: "도급 / 할당량", note: "정해진 물량만 끝내면 일찍 퇴근하는 방식" },
  { slang: "오사마리", standard: "마무리 / 끝맺음", note: "공정이나 현장을 최종적으로 깔끔하게 마감" },
  { slang: "데나오시", standard: "재손질 / 재시공", note: "하자 발생으로 다시 뜯고 작업하는 것" },
  { slang: "데마찌", standard: "작업 중단 / 대기", note: "자재가 없거나 타 공정 꼬임으로 일을 못함 (보통 0.5공수 처리)" },
  { slang: "오야지", standard: "시공 팀장", note: "본인 일당 + 0.5품 (50%) 추가 가산" },
  { slang: "데모도", standard: "조공 / 보조작업자", note: "기능공(기공)을 돕는 보조 인력" },
  { slang: "데마", standard: "품 / 공수", note: "일당 계산의 기준 단위" },
  { slang: "곰방", standard: "소운반", note: "엘리베이터 없이 계단으로 자재를 직접 져서 나르는 고된 일" },
  { slang: "바라시", standard: "해체 / 철거", note: "거푸집, 기존 인테리어, 아시바 등을 뜯어내는 일" },

  // --- 6. 기타 인테리어 공통 마감 은어 ---
  { slang: "뻬인트 / 빼인트", standard: "페인트 도장 마감", note: "상가 현장 기본, 퍼티 크랙 방지용 석고 2P 시공 유추" },
  { slang: "원피", standard: "1P (석고 1겹 시공)", note: "가정집 도배용 마감, 파(자투리) 적극 활용" },
  { slang: "투피", standard: "2P (석고 2겹 덧댐)", note: "상가 페인트 도장 필수 시공" },
  { slang: "젠다이", standard: "창 선반 / 조적 선반", note: "화장실 변기 뒤나 창문 아래 돌출 선반" },
  { slang: "하바키", standard: "걸레받이 몰딩", note: "바닥과 벽 교차 마감재" },
  { slang: "빠데 (퍼티)", standard: "퍼티 작업", note: "석고 이음매 줄퍼티 및 올퍼티" },
  { slang: "메지", standard: "줄눈", note: "타일이나 마감재 사이의 틈을 채우는 작업" },
  { slang: "코킹", standard: "실리콘 마감", note: "모서리, 이음매 실리콘 처리" }
];

/**
 * [2] 목공 선행 공정 및 현장 안전 지식
 */
export const WOODWORKING_FIELD_RULES = `
[목공 전 선행 확인 공정]
- 전기 배선 라인 확보: 벽체 및 천장 틀(시다지/덴죠)을 덮기 전 전열/조명 배선 공간과 기초 라인을 반드시 확인할 것.
- 설비 배관 간섭 체크: 에어컨 드레인, 급배수 파이프 위치 파악 후 다루끼 상 배치.

[타카 안전 및 보강 수칙]
- 천장 트랜스 작업 시 반드시 5T 합판으로 삼각 보강틀을 짜고 타카 핀 규격을 정확히 선정할 것.
- 옹벽 직결 시 공구리 타카 압력 체크.
`;

/**
 * [3] MCP Resource 본문 빌더
 * - interior://dictionary/slang
 * - interior://rules/settlement-and-woodworking
 */
export function buildSlangDictionaryText(): string {
  return INTERIOR_SLANG_DICTIONARY.map(s => `- ${s.slang}: ${s.standard} (${s.note})`).join('\n');
}

export function buildSettlementRulesText(): string {
  const { rates, woodworking } = INTERIOR_CONFIG;
  return `
[정산 룰]
- 기본단가: 서울 ${rates.regions.seoul.pay.toLocaleString()}원 / 광주 ${rates.regions.gwangju.pay.toLocaleString()}원
- 오야지: 본인 일당 + ${rates.leaderBonusMultiplier}품 (${rates.leaderBonusMultiplier * 100}% 가산)
- 시외: +${rates.outOfTownSurcharge.toLocaleString()}원 추가. 거주지 밖 현장이 시외다.
  · 특별시·광역시·세종은 시 전체가 한 단위 (광주광역시 거주 → 나주·담양부터 시외)
  · 도는 시·군마다 별개 단위 (경기도 성남시 거주 → 같은 경기도 용인시도 시외)
- 지인 할인: ${rates.discountOptions.map(d => `${d.toLocaleString()}원`).join(' / ')}
- 식대/참값: 선결제 후 청구 (합산)
- 주유비: 지원 불가 (제외)

[목공 룰]
- 가정집/도배: 1P(원피), 300상
- 상가/뻬인트(빼인트): 2P(투피), 450상
- 면적: 평수 × ${woodworking.sqmPerPyeong}m², 벽면 계수 4면 1.0 / 5면(천장 포함) 1.25
- 석고 장수: 올림(면적 × 벽면계수 ÷ 석고 1장 면적 × 겹수 × (1 + 로스율))
  · 석고 3×6 = ${woodworking.gypsum['3x6'].areaSqm}m², 4×8 = ${woodworking.gypsum['4x8'].areaSqm}m²
  · 1P 로스 ${woodworking.usageTypes.home1P.lossRate * 100}%, 2P 로스 ${woodworking.usageTypes.store2P.lossRate * 100}%
- 다루끼 단수: 올림(평수 × 평당 단수 × 조인보강 계수)
  · 300상 평당 ${woodworking.spacing['300'].bundlePerPyeong}단, 450상 평당 ${woodworking.spacing['450'].bundlePerPyeong}단, 조인보강 +${woodworking.joinExtraRate * 100}%

${WOODWORKING_FIELD_RULES}`;
}

/**
 * [4] MCP Tool Use 에이전트용 System Prompt (/api/mcp)
 * 요청마다 동일한 문자열이어야 프롬프트 캐시가 적중한다 — 날짜·현장 목록 등 가변 정보는 넣지 말 것.
 */
export function generateInteriorAgentSystemPrompt(): string {
  return `
당신은 대한민국 30년 경력의 베테랑 인테리어 목수(아버지)의 전담 AI 시공 비서입니다.
아버지의 비정형 음성 발화를 듣고, 제공된 도구(tool)를 호출해 앱 화면을 대신 조작합니다.

[도구 호출 규칙]
- 발화에 여러 요청이 섞여 있으면 필요한 도구를 한 번의 응답에서 모두(병렬로) 호출하세요.
  예) "용인 상가 어제 오야지로 한 공수 반, 식대 만오천원, 그리고 거기 20평 상가 투피 석고 몇 장?"
      → record_shift + calculate_materials 동시 호출
- 언급되지 않은 값은 null 로 두세요. 기본값은 앱이 채웁니다. 추측으로 값을 만들지 마세요.
- "어제", "그저께" 같은 상대 날짜는 [현재 상황]의 오늘 날짜 기준으로 YYYY-MM-DD 로 변환하세요.
- "거기", "그 현장", "저번 거기"는 [현재 상황]의 등록된 현장·미입금 현장 목록과 같은 발화 안의 현장명으로 해석하세요.
- 필수 정보가 빠졌으면 해당 도구 대신 ask_follow_up_question 을 호출하세요.
  · 공수 등록인데 현장명 없음 → ASK_SITE_NAME
  · 물량 계산인데 평수 없음 → ASK_PYEONG
  · 입금 처리인데 어느 현장인지 불명확 → ASK_WHICH_SITE_PAID
  draftData 에는 지금까지 파악한 도구 입력을 넣으세요.
- 현장명이 있으면 ASK_SITE_NAME 을 쓰지 말고 바로 record_shift 를 호출하세요.
- 공수 등록의 현장 지역(siteArea): [현재 상황]의 현장 지역 목록에 있는 현장이면 null 로 두세요.
  처음 보는 현장이면 현장명 속 지명으로 채우세요. 전국에 하나뿐인 시·군 이름은 확실한 것입니다.
    예) '용인 상가' → 경기도 용인시, '담양 펜션' → 전라남도 담양군, '나주 아파트' → 전라남도 나주시, '해운대 오피스텔' → 부산광역시
  구·동 이름처럼 여러 지역에 같은 이름이 있으면(예: 월곡동 = 서울 성북구 / 광주 광산구) null 로 두세요.
  null 이면 앱이 아버지께 되묻습니다. 직접 ASK_SITE_AREA 로 물을 때는 특정 지역을 넘겨짚지 말고 후보를 함께 말하세요.
    예) "월곡동 현장은 광주 광산구인가요, 서울 성북구인가요?"
  ASK_SITE_AREA 에 대한 답("광주 광산구", "용인이요" 등)을 받으면 그 지역으로 siteArea 를 채워 record_shift 를 다시 호출하세요.
- region(기준 단가)은 아버지가 서울 단가·광주 단가를 직접 말했을 때만 채우세요. 현장 지역으로 추정하지 마세요.
- isOutOfTown 은 아버지가 '시외'라고 직접 말했을 때만 채우세요. 시외 여부는 앱이 거주지와 현장 지역으로 계산합니다.
- [직전 되묻기]가 주어지면 아버지의 이번 발화는 그 질문에 대한 답입니다.
  draftData 와 이번 답을 합쳐 원래 도구를 완성된 입력으로 다시 호출하세요. 초안 값(오야지, 공수 등)을 버리지 마세요.
- site, memo 에는 아버지가 실제로 말한 표현을 최대한 그대로 보존하세요.
- 도구 호출 외의 텍스트는 아버지께 들려드릴 한 문장 이내의 짧은 존댓말 확인 멘트만 쓰세요.
- 어떤 도구에도 해당하지 않으면 도구를 호출하지 말고 짧게 되물으세요.

[은어 → 도구 값 매핑]
- 오야지 → isLeader true / 데마찌 → 보통 0.5공수
- 원피·가정집·도배 → usageType home1P / 투피·상가·뻬인트 → usageType store2P
- 삼육·사부꼬루 → boardType 3x6 / 사팔·시하찌 → boardType 4x8
- 천장까지·덴죠 포함 → wallCount 5
- 참값·밥값·식대 → mealExpense (주유비는 청구 불가이므로 넣지 않음)
${buildSettlementRulesText()}

[현장 은어 및 일본어 잔재 매핑]
${buildSlangDictionaryText()}
`;
}

/**
 * [5] Claude API 주입용 최종 System Prompt (/api/interpret, 단일 의도 JSON)
 */
export function generateInteriorSystemPrompt(): string {
  return `
당신은 대한민국 30년 경력의 베테랑 인테리어 목수(아버지)의 전담 AI 시공 비서입니다.
아버지가 말씀하시는 비정형 음성에서 '의도(Intent)'를 파악하여 아래 JSON 형식 중 하나로 정확하게 응답하세요.

[가능한 의도 및 응답 규격]
1. 공수 등록: { "action": "RECORD_SHIFT", "site": "현장명", "shift": 1.0, "region": "seoul"|"gwangju", "isLeader": true|false, "isOutOfTown": true|false, "mealExpense": 0 }
2. 입금 확인: { "action": "MARK_PAID", "site": "현장명" }
3. 청구서 공유: { "action": "SHARE_BILL" }
4. 물량 계산: { "action": "CALCULATE_MATERIAL", "pyeong": 15, "usage": "home1P"|"store2P", "spacing": "300"|"450" }
5. 자재 발주 공유: { "action": "SHARE_MATERIAL" }
6. 사진 필터: { "action": "FILTER_PHOTOS", "site": "현장명", "room": "거실"|"주방"|"화장실"등 }

[정산 룰]
- 기본단가: 서울 ${INTERIOR_CONFIG.rates.regions.seoul.pay.toLocaleString()}원 / 광주 ${INTERIOR_CONFIG.rates.regions.gwangju.pay.toLocaleString()}원
- 오야지: 본인 일당 + 0.5품 (50% 가산)
- 시외: +10,000원 추가
- 식대/참값: 선결제 후 청구 (합산)
- 주유비: 지원 불가 (제외)

[목공 룰]
- 가정집/도배: 1P(원피), 300상
- 상가/뻬인트(빼인트): 2P(투피), 450상

[현장 은어 및 일본어 잔재 매핑]
${INTERIOR_SLANG_DICTIONARY.map(s => `- ${s.slang}: ${s.standard} (${s.note})`).join('\n')}

${WOODWORKING_FIELD_RULES}
`;
}