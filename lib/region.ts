// lib/region.ts
// 시외 판정용 행정구역. 동 단위 지도 없이 시·도 + 시·군만 다룬다.
// 시외 기준 단위는 "시":
//  - 특별시·광역시·특별자치시(세종)는 시·도 전체가 하나의 단위 (광주 산다면 나주·담양부터 시외)
//  - 도는 시·군마다 별개 단위 (성남 산다면 같은 경기도 용인도 시외)

export const SIDO_LIST = [
  { name: '서울특별시', short: '서울', metro: true },
  { name: '부산광역시', short: '부산', metro: true },
  { name: '대구광역시', short: '대구', metro: true },
  { name: '인천광역시', short: '인천', metro: true },
  { name: '광주광역시', short: '광주', metro: true },
  { name: '대전광역시', short: '대전', metro: true },
  { name: '울산광역시', short: '울산', metro: true },
  { name: '세종특별자치시', short: '세종', metro: true },
  { name: '경기도', short: '경기', metro: false },
  { name: '강원특별자치도', short: '강원', metro: false },
  { name: '충청북도', short: '충북', metro: false },
  { name: '충청남도', short: '충남', metro: false },
  { name: '전북특별자치도', short: '전북', metro: false },
  { name: '전라남도', short: '전남', metro: false },
  { name: '경상북도', short: '경북', metro: false },
  { name: '경상남도', short: '경남', metro: false },
  { name: '제주특별자치도', short: '제주', metro: false },
] as const;

export type SidoName = (typeof SIDO_LIST)[number]['name'];
export const SIDO_NAMES = SIDO_LIST.map((s) => s.name) as [SidoName, ...SidoName[]];

export interface Area {
  sido: SidoName;
  sigungu: string | null; // 도 소속이면 시·군 (예: '성남시'), 광역시 등은 null 이어도 된다
}

const sidoInfo = (sido: string) => SIDO_LIST.find((s) => s.name === sido);
export const isMetro = (sido: string) => sidoInfo(sido)?.metro ?? false;

/** '성남시' / '성남' / ' 성남 시 ' → '성남' (비교용) */
const normSigungu = (s: string) => s.replace(/\s+/g, '').replace(/(시|군)$/, '');

/**
 * 거주지 기준 시외 여부. 판단할 수 없으면 null
 * (도 거주자인데 같은 도 현장의 시·군을 모르는 경우).
 */
export function isOutOfTownArea(home: Area, site: Area): boolean | null {
  if (home.sido !== site.sido) return true;
  if (isMetro(home.sido)) return false;
  if (!home.sigungu || !site.sigungu) return null;
  return normSigungu(home.sigungu) !== normSigungu(site.sigungu);
}

export function formatArea(area: Area): string {
  const short = sidoInfo(area.sido)?.short ?? area.sido;
  return area.sigungu ? `${short} ${area.sigungu}` : short;
}

/**
 * "광주 광산구", "경기도 성남시", "성남" 같은 짧은 대답을 Area 로 바꾼다 (AI 서버가 없을 때의 폴백용).
 * 시·도가 안 나오면 거주지와 같은 도라고 보고 시·군만 읽는다.
 */
export function parseAreaText(text: string, home: Area | null): Area | null {
  const flat = text.replace(/[.,?!]/g, ' ').replace(/\s+/g, ' ').trim();
  // 가장 앞에 나온 시·도를 고른다 ("경기 광주시"는 광주광역시가 아니라 경기도).
  const found = SIDO_LIST.map((s) => {
    const idx = [flat.indexOf(s.name), flat.indexOf(s.short)].filter((i) => i >= 0);
    return { s, idx: idx.length ? Math.min(...idx) : -1 };
  })
    .filter((f) => f.idx >= 0)
    .sort((a, b) => a.idx - b.idx)[0];
  const sido = found?.s;

  // 시·도를 지운 나머지의 첫 단어를 시·군으로 본다 ("김해요" → "김해").
  const rest = sido ? flat.replace(sido.name, '').replace(new RegExp(`^.*?${sido.short}(광역시|특별시|특별자치시|시|도)?`), '') : flat;
  const word = rest.trim().split(' ')[0]?.replace(/(이에요|에요|예요|이요|요|입니다|이야|야)$/, '') ?? '';
  const sigungu = /^[가-힣]{1,5}$/.test(word) ? word : null;

  if (sido) return { sido: sido.name, sigungu: sido.metro ? null : sigungu };
  if (home && !isMetro(home.sido) && sigungu) return { sido: home.sido, sigungu };
  return null;
}
