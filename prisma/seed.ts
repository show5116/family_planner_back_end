import {
  PrismaClient,
  PermissionCategory,
  PermissionCode,
  StorageType,
} from '@prisma/client';

const prisma = new PrismaClient();

// 카테고리별 키워드 → 보관 방법별 기본 유통기한
const EXPIRY_PRESETS: {
  category: string;
  keyword: string;
  storageType: StorageType;
  defaultDays: number;
}[] = [
  // ── 채소 ──────────────────────────────
  {
    category: '채소',
    keyword: '시금치',
    storageType: StorageType.FRIDGE,
    defaultDays: 5,
  },
  {
    category: '채소',
    keyword: '상추',
    storageType: StorageType.FRIDGE,
    defaultDays: 5,
  },
  {
    category: '채소',
    keyword: '깻잎',
    storageType: StorageType.FRIDGE,
    defaultDays: 5,
  },
  {
    category: '채소',
    keyword: '부추',
    storageType: StorageType.FRIDGE,
    defaultDays: 5,
  },
  {
    category: '채소',
    keyword: '열무',
    storageType: StorageType.FRIDGE,
    defaultDays: 5,
  },
  {
    category: '채소',
    keyword: '미나리',
    storageType: StorageType.FRIDGE,
    defaultDays: 5,
  },
  {
    category: '채소',
    keyword: '파',
    storageType: StorageType.FRIDGE,
    defaultDays: 7,
  },
  {
    category: '채소',
    keyword: '대파',
    storageType: StorageType.FRIDGE,
    defaultDays: 7,
  },
  {
    category: '채소',
    keyword: '쪽파',
    storageType: StorageType.FRIDGE,
    defaultDays: 7,
  },
  {
    category: '채소',
    keyword: '양파',
    storageType: StorageType.PANTRY,
    defaultDays: 30,
  },
  {
    category: '채소',
    keyword: '마늘',
    storageType: StorageType.FRIDGE,
    defaultDays: 21,
  },
  {
    category: '채소',
    keyword: '마늘',
    storageType: StorageType.PANTRY,
    defaultDays: 14,
  },
  {
    category: '채소',
    keyword: '생강',
    storageType: StorageType.FRIDGE,
    defaultDays: 30,
  },
  {
    category: '채소',
    keyword: '당근',
    storageType: StorageType.FRIDGE,
    defaultDays: 21,
  },
  {
    category: '채소',
    keyword: '무',
    storageType: StorageType.FRIDGE,
    defaultDays: 21,
  },
  {
    category: '채소',
    keyword: '감자',
    storageType: StorageType.PANTRY,
    defaultDays: 30,
  },
  {
    category: '채소',
    keyword: '고구마',
    storageType: StorageType.PANTRY,
    defaultDays: 30,
  },
  {
    category: '채소',
    keyword: '브로콜리',
    storageType: StorageType.FRIDGE,
    defaultDays: 7,
  },
  {
    category: '채소',
    keyword: '콜리플라워',
    storageType: StorageType.FRIDGE,
    defaultDays: 7,
  },
  {
    category: '채소',
    keyword: '양배추',
    storageType: StorageType.FRIDGE,
    defaultDays: 14,
  },
  {
    category: '채소',
    keyword: '배추',
    storageType: StorageType.FRIDGE,
    defaultDays: 7,
  },
  {
    category: '채소',
    keyword: '오이',
    storageType: StorageType.FRIDGE,
    defaultDays: 7,
  },
  {
    category: '채소',
    keyword: '애호박',
    storageType: StorageType.FRIDGE,
    defaultDays: 7,
  },
  {
    category: '채소',
    keyword: '가지',
    storageType: StorageType.FRIDGE,
    defaultDays: 7,
  },
  {
    category: '채소',
    keyword: '피망',
    storageType: StorageType.FRIDGE,
    defaultDays: 7,
  },
  {
    category: '채소',
    keyword: '파프리카',
    storageType: StorageType.FRIDGE,
    defaultDays: 10,
  },
  {
    category: '채소',
    keyword: '토마토',
    storageType: StorageType.FRIDGE,
    defaultDays: 7,
  },
  {
    category: '채소',
    keyword: '방울토마토',
    storageType: StorageType.FRIDGE,
    defaultDays: 7,
  },
  {
    category: '채소',
    keyword: '고추',
    storageType: StorageType.FRIDGE,
    defaultDays: 7,
  },
  {
    category: '채소',
    keyword: '콩나물',
    storageType: StorageType.FRIDGE,
    defaultDays: 3,
  },
  {
    category: '채소',
    keyword: '숙주',
    storageType: StorageType.FRIDGE,
    defaultDays: 3,
  },
  {
    category: '채소',
    keyword: '버섯',
    storageType: StorageType.FRIDGE,
    defaultDays: 5,
  },
  {
    category: '채소',
    keyword: '팽이버섯',
    storageType: StorageType.FRIDGE,
    defaultDays: 7,
  },
  {
    category: '채소',
    keyword: '새송이버섯',
    storageType: StorageType.FRIDGE,
    defaultDays: 7,
  },
  {
    category: '채소',
    keyword: '느타리버섯',
    storageType: StorageType.FRIDGE,
    defaultDays: 5,
  },
  // 냉동 채소
  {
    category: '채소',
    keyword: '시금치',
    storageType: StorageType.FREEZER,
    defaultDays: 180,
  },
  {
    category: '채소',
    keyword: '브로콜리',
    storageType: StorageType.FREEZER,
    defaultDays: 180,
  },
  {
    category: '채소',
    keyword: '콩',
    storageType: StorageType.FREEZER,
    defaultDays: 180,
  },
  {
    category: '채소',
    keyword: '대파',
    storageType: StorageType.FREEZER,
    defaultDays: 90,
  },
  {
    category: '채소',
    keyword: '마늘',
    storageType: StorageType.FREEZER,
    defaultDays: 90,
  },
  {
    category: '채소',
    keyword: '고추',
    storageType: StorageType.FREEZER,
    defaultDays: 90,
  },

  // ── 육류 ──────────────────────────────
  {
    category: '육류',
    keyword: '소고기',
    storageType: StorageType.FRIDGE,
    defaultDays: 3,
  },
  {
    category: '육류',
    keyword: '돼지고기',
    storageType: StorageType.FRIDGE,
    defaultDays: 3,
  },
  {
    category: '육류',
    keyword: '닭고기',
    storageType: StorageType.FRIDGE,
    defaultDays: 2,
  },
  {
    category: '육류',
    keyword: '닭가슴살',
    storageType: StorageType.FRIDGE,
    defaultDays: 2,
  },
  {
    category: '육류',
    keyword: '삼겹살',
    storageType: StorageType.FRIDGE,
    defaultDays: 3,
  },
  {
    category: '육류',
    keyword: '목살',
    storageType: StorageType.FRIDGE,
    defaultDays: 3,
  },
  {
    category: '육류',
    keyword: '등심',
    storageType: StorageType.FRIDGE,
    defaultDays: 3,
  },
  {
    category: '육류',
    keyword: '안심',
    storageType: StorageType.FRIDGE,
    defaultDays: 3,
  },
  {
    category: '육류',
    keyword: '갈비',
    storageType: StorageType.FRIDGE,
    defaultDays: 3,
  },
  {
    category: '육류',
    keyword: '불고기',
    storageType: StorageType.FRIDGE,
    defaultDays: 2,
  },
  {
    category: '육류',
    keyword: '다진고기',
    storageType: StorageType.FRIDGE,
    defaultDays: 2,
  },
  {
    category: '육류',
    keyword: '햄',
    storageType: StorageType.FRIDGE,
    defaultDays: 14,
  },
  {
    category: '육류',
    keyword: '소시지',
    storageType: StorageType.FRIDGE,
    defaultDays: 14,
  },
  {
    category: '육류',
    keyword: '베이컨',
    storageType: StorageType.FRIDGE,
    defaultDays: 7,
  },
  // 냉동 육류
  {
    category: '육류',
    keyword: '소고기',
    storageType: StorageType.FREEZER,
    defaultDays: 90,
  },
  {
    category: '육류',
    keyword: '돼지고기',
    storageType: StorageType.FREEZER,
    defaultDays: 90,
  },
  {
    category: '육류',
    keyword: '닭고기',
    storageType: StorageType.FREEZER,
    defaultDays: 90,
  },
  {
    category: '육류',
    keyword: '닭가슴살',
    storageType: StorageType.FREEZER,
    defaultDays: 90,
  },

  // ── 해산물 ─────────────────────────────
  {
    category: '해산물',
    keyword: '생선',
    storageType: StorageType.FRIDGE,
    defaultDays: 2,
  },
  {
    category: '해산물',
    keyword: '고등어',
    storageType: StorageType.FRIDGE,
    defaultDays: 2,
  },
  {
    category: '해산물',
    keyword: '갈치',
    storageType: StorageType.FRIDGE,
    defaultDays: 2,
  },
  {
    category: '해산물',
    keyword: '삼치',
    storageType: StorageType.FRIDGE,
    defaultDays: 2,
  },
  {
    category: '해산물',
    keyword: '연어',
    storageType: StorageType.FRIDGE,
    defaultDays: 2,
  },
  {
    category: '해산물',
    keyword: '참치',
    storageType: StorageType.FRIDGE,
    defaultDays: 2,
  },
  {
    category: '해산물',
    keyword: '새우',
    storageType: StorageType.FRIDGE,
    defaultDays: 2,
  },
  {
    category: '해산물',
    keyword: '오징어',
    storageType: StorageType.FRIDGE,
    defaultDays: 2,
  },
  {
    category: '해산물',
    keyword: '꽃게',
    storageType: StorageType.FRIDGE,
    defaultDays: 2,
  },
  {
    category: '해산물',
    keyword: '바지락',
    storageType: StorageType.FRIDGE,
    defaultDays: 3,
  },
  {
    category: '해산물',
    keyword: '조개',
    storageType: StorageType.FRIDGE,
    defaultDays: 3,
  },
  // 냉동 해산물
  {
    category: '해산물',
    keyword: '새우',
    storageType: StorageType.FREEZER,
    defaultDays: 180,
  },
  {
    category: '해산물',
    keyword: '오징어',
    storageType: StorageType.FREEZER,
    defaultDays: 180,
  },
  {
    category: '해산물',
    keyword: '생선',
    storageType: StorageType.FREEZER,
    defaultDays: 90,
  },

  // ── 유제품/계란 ────────────────────────
  {
    category: '유제품',
    keyword: '우유',
    storageType: StorageType.FRIDGE,
    defaultDays: 10,
  },
  {
    category: '유제품',
    keyword: '두유',
    storageType: StorageType.FRIDGE,
    defaultDays: 7,
  },
  {
    category: '유제품',
    keyword: '요거트',
    storageType: StorageType.FRIDGE,
    defaultDays: 14,
  },
  {
    category: '유제품',
    keyword: '요구르트',
    storageType: StorageType.FRIDGE,
    defaultDays: 14,
  },
  {
    category: '유제품',
    keyword: '치즈',
    storageType: StorageType.FRIDGE,
    defaultDays: 30,
  },
  {
    category: '유제품',
    keyword: '버터',
    storageType: StorageType.FRIDGE,
    defaultDays: 30,
  },
  {
    category: '유제품',
    keyword: '버터',
    storageType: StorageType.FREEZER,
    defaultDays: 180,
  },
  {
    category: '유제품',
    keyword: '생크림',
    storageType: StorageType.FRIDGE,
    defaultDays: 5,
  },
  {
    category: '유제품',
    keyword: '계란',
    storageType: StorageType.FRIDGE,
    defaultDays: 30,
  },

  // ── 조리식품/반찬 ──────────────────────
  {
    category: '조리식품',
    keyword: '김치',
    storageType: StorageType.FRIDGE,
    defaultDays: 90,
  },
  {
    category: '조리식품',
    keyword: '깍두기',
    storageType: StorageType.FRIDGE,
    defaultDays: 90,
  },
  {
    category: '조리식품',
    keyword: '나물',
    storageType: StorageType.FRIDGE,
    defaultDays: 3,
  },
  {
    category: '조리식품',
    keyword: '볶음',
    storageType: StorageType.FRIDGE,
    defaultDays: 3,
  },
  {
    category: '조리식품',
    keyword: '조림',
    storageType: StorageType.FRIDGE,
    defaultDays: 5,
  },
  {
    category: '조리식품',
    keyword: '구이',
    storageType: StorageType.FRIDGE,
    defaultDays: 3,
  },
  {
    category: '조리식품',
    keyword: '찌개',
    storageType: StorageType.FRIDGE,
    defaultDays: 2,
  },
  {
    category: '조리식품',
    keyword: '국',
    storageType: StorageType.FRIDGE,
    defaultDays: 2,
  },
  {
    category: '조리식품',
    keyword: '탕',
    storageType: StorageType.FRIDGE,
    defaultDays: 2,
  },
  {
    category: '조리식품',
    keyword: '밥',
    storageType: StorageType.FRIDGE,
    defaultDays: 3,
  },
  {
    category: '조리식품',
    keyword: '도시락',
    storageType: StorageType.FRIDGE,
    defaultDays: 1,
  },
  {
    category: '조리식품',
    keyword: '반찬',
    storageType: StorageType.FRIDGE,
    defaultDays: 3,
  },
  {
    category: '조리식품',
    keyword: '만두',
    storageType: StorageType.FRIDGE,
    defaultDays: 3,
  },
  {
    category: '조리식품',
    keyword: '만두',
    storageType: StorageType.FREEZER,
    defaultDays: 90,
  },
  {
    category: '조리식품',
    keyword: '밥',
    storageType: StorageType.FREEZER,
    defaultDays: 30,
  },
  {
    category: '조리식품',
    keyword: '국',
    storageType: StorageType.FREEZER,
    defaultDays: 30,
  },
  {
    category: '조리식품',
    keyword: '찌개',
    storageType: StorageType.FREEZER,
    defaultDays: 30,
  },
  {
    category: '조리식품',
    keyword: '떡',
    storageType: StorageType.FRIDGE,
    defaultDays: 3,
  },
  {
    category: '조리식품',
    keyword: '떡',
    storageType: StorageType.FREEZER,
    defaultDays: 90,
  },

  // ── 과일 ──────────────────────────────
  {
    category: '과일',
    keyword: '사과',
    storageType: StorageType.FRIDGE,
    defaultDays: 30,
  },
  {
    category: '과일',
    keyword: '배',
    storageType: StorageType.FRIDGE,
    defaultDays: 14,
  },
  {
    category: '과일',
    keyword: '포도',
    storageType: StorageType.FRIDGE,
    defaultDays: 7,
  },
  {
    category: '과일',
    keyword: '딸기',
    storageType: StorageType.FRIDGE,
    defaultDays: 5,
  },
  {
    category: '과일',
    keyword: '블루베리',
    storageType: StorageType.FRIDGE,
    defaultDays: 7,
  },
  {
    category: '과일',
    keyword: '복숭아',
    storageType: StorageType.FRIDGE,
    defaultDays: 5,
  },
  {
    category: '과일',
    keyword: '수박',
    storageType: StorageType.FRIDGE,
    defaultDays: 5,
  },
  {
    category: '과일',
    keyword: '참외',
    storageType: StorageType.FRIDGE,
    defaultDays: 7,
  },
  {
    category: '과일',
    keyword: '키위',
    storageType: StorageType.FRIDGE,
    defaultDays: 7,
  },
  {
    category: '과일',
    keyword: '바나나',
    storageType: StorageType.PANTRY,
    defaultDays: 5,
  },
  {
    category: '과일',
    keyword: '귤',
    storageType: StorageType.FRIDGE,
    defaultDays: 14,
  },
  {
    category: '과일',
    keyword: '오렌지',
    storageType: StorageType.FRIDGE,
    defaultDays: 14,
  },
  {
    category: '과일',
    keyword: '레몬',
    storageType: StorageType.FRIDGE,
    defaultDays: 14,
  },
  {
    category: '과일',
    keyword: '망고',
    storageType: StorageType.FRIDGE,
    defaultDays: 5,
  },

  // ── 가공식품 ───────────────────────────
  {
    category: '가공식품',
    keyword: '두부',
    storageType: StorageType.FRIDGE,
    defaultDays: 3,
  },
  {
    category: '가공식품',
    keyword: '어묵',
    storageType: StorageType.FRIDGE,
    defaultDays: 7,
  },
  {
    category: '가공식품',
    keyword: '어묵',
    storageType: StorageType.FREEZER,
    defaultDays: 90,
  },
  {
    category: '가공식품',
    keyword: '순두부',
    storageType: StorageType.FRIDGE,
    defaultDays: 3,
  },
  {
    category: '가공식품',
    keyword: '피자',
    storageType: StorageType.FRIDGE,
    defaultDays: 2,
  },
  {
    category: '가공식품',
    keyword: '피자',
    storageType: StorageType.FREEZER,
    defaultDays: 30,
  },
  {
    category: '가공식품',
    keyword: '치킨',
    storageType: StorageType.FRIDGE,
    defaultDays: 2,
  },
];

async function seedExpiryPresets() {
  for (const preset of EXPIRY_PRESETS) {
    await prisma.globalExpiryPreset.upsert({
      where: {
        keyword_storageType: {
          keyword: preset.keyword,
          storageType: preset.storageType,
        },
      },
      update: { defaultDays: preset.defaultDays, category: preset.category },
      create: preset,
    });
  }
  console.log(`✓ GlobalExpiryPreset ${EXPIRY_PRESETS.length}개 upsert 완료`);
}

async function main() {
  await seedExpiryPresets();

  await prisma.permission.upsert({
    where: { code: PermissionCode.MANAGE_CHILDCARE },
    update: {},
    create: {
      code: PermissionCode.MANAGE_CHILDCARE,
      name: '자녀 관리',
      description: '육아 포인트 계정 및 자녀 프로필을 관리합니다',
      category: PermissionCategory.CHILDCARE,
      sortOrder: 20,
    },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
