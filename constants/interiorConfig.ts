// constants/interiorConfig.ts

export const INTERIOR_CONFIG = {
  // [1] 지역 및 기본 일당
  rates: {
    regions: {
      seoul: { name: "서울", pay: 290000 },
      gwangju: { name: "광주", pay: 280000 },
    },
    defaultRegion: "seoul",
    outOfTownSurcharge: 10000,   // 시외 현장 +10,000원
    leaderBonusMultiplier: 0.5,  // 오야지(팀장): 내 일당 + 0.5품 (50% 가산)
    discountOptions: [0, -10000, -20000, -30000], // 지인 할인
  },

  // [2] 경비 정산 원칙
  expenseRules: {
    mealClaimable: true,         // 식대/참값: 선결제 후 청구 가능
    gasClaimable: false,         // 주유비: 지원 불가 (청구 제외)
  },

  // [3] 목공 전용 자재 계산 기준
  woodworking: {
    gypsum: {
      "3x6": { name: "석고 3×6 (900×1800)", label: "석고 3×6 (0.9×1.8m)", areaSqm: 1.62 },
      "4x8": { name: "석고 4×8 (1200×2400)", label: "석고 4×8 (1.2×2.4m)", areaSqm: 2.88 },
    },
    usageTypes: {
      home1P: { label: "가정집 (도배 마감 - 1P 원피)", layerMultiplier: 1, lossRate: 0.08 },
      store2P: { label: "상가 (뻬인트 도장 - 2P 투피)", layerMultiplier: 2, lossRate: 0.12 },
    },
    spacing: {
      "300": { label: "300상 (원피 시공 - 촘촘하게)", bundlePerPyeong: 1.2 },
      "450": { label: "450상 (투피 시공 - 표준 간격)", bundlePerPyeong: 0.9 },
    },
    joinExtraRate: 0.15,
    sqmPerPyeong: 3.3058,
    lossRate: 0.10,
  },

  // 하위 호환용 materials 객체
  materials: {
    sqmPerPyeong: 3.3058,
    lossRate: 0.10,
    gypsum: {
      "3x6": { label: "석고 3×6 (0.9×1.8m)", areaSqm: 1.62 },
      "4x8": { label: "석고 4×8 (1.2×2.4m)", areaSqm: 2.88 },
    },
  },

  // [4] 사진 공간 태그
  roomTags: ["전체", "거실", "안방", "주방", "화장실", "베란다", "현관", "천장"],
};