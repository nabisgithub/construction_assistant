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
 * [3] Claude API 주입용 최종 System Prompt
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