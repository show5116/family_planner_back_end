#!/bin/bash

# TypeScript 및 ESLint 에러 체크 스킬
# 코드 수정 후 자동으로 에러를 확인합니다.

set +e  # 에러가 발생해도 스크립트 계속 실행

echo "🔍 코드 검사를 시작합니다..."
echo ""

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 에러 카운터
TS_ERRORS=0
ESLINT_ERRORS=0
ESLINT_WARNINGS=0

# 1. TypeScript 컴파일 체크
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📘 TypeScript 컴파일 체크"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

TS_OUTPUT=$(npx tsc --noEmit 2>&1)
TS_EXIT_CODE=$?

if [ $TS_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ TypeScript: 에러 없음${NC}"
else
    TS_ERRORS=$(echo "$TS_OUTPUT" | grep "error TS" | wc -l)
    echo -e "${RED}❌ TypeScript: ${TS_ERRORS}개 에러${NC}"
    echo ""
    echo "주요 에러:"
    echo "$TS_OUTPUT" | grep "error TS" | head -10
fi

echo ""

# 2. ESLint 체크
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 ESLint 체크"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

ESLINT_OUTPUT=$(npm run lint 2>&1)
ESLINT_EXIT_CODE=$?

if [ $ESLINT_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ ESLint: 에러 없음${NC}"
else
    # 에러와 경고 개수 추출
    SUMMARY=$(echo "$ESLINT_OUTPUT" | grep "✖" | tail -1)
    ESLINT_ERRORS=$(echo "$SUMMARY" | grep -oP '\d+(?= error)' || echo "0")
    ESLINT_WARNINGS=$(echo "$SUMMARY" | grep -oP '\d+(?= warning)' || echo "0")

    echo -e "${RED}❌ ESLint: ${ESLINT_ERRORS}개 에러${NC}, ${YELLOW}${ESLINT_WARNINGS}개 경고${NC}"
    echo ""
    echo "주요 에러:"
    echo "$ESLINT_OUTPUT" | grep "error" | head -10
fi

echo ""

# 3. 최종 요약
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 검사 결과 요약"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

TOTAL_ERRORS=$((TS_ERRORS + ESLINT_ERRORS))

if [ $TOTAL_ERRORS -eq 0 ]; then
    echo -e "${GREEN}🎉 모든 검사를 통과했습니다!${NC}"
    echo ""
    echo "✅ TypeScript 컴파일: 통과"
    echo "✅ ESLint: 통과"
    exit 0
else
    echo -e "${RED}⚠️  수정이 필요한 항목이 있습니다${NC}"
    echo ""
    echo "TypeScript 에러: $TS_ERRORS개"
    echo "ESLint 에러: $ESLINT_ERRORS개"
    echo "ESLint 경고: $ESLINT_WARNINGS개"
    echo ""
    echo "💡 자세한 내용은 위의 출력을 참고하세요."
    exit 1
fi
