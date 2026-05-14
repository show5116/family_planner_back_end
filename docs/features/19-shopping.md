# 19. 스마트 장보기 (Smart Shopping)

> **상태**: ✅ 완료
> **Phase**: Phase 5

---

## 개요

그룹 단위 장바구니를 관리하고, 장보기 완료 시 냉장고로 자동 이관하고 이력을 아카이빙하는 시스템입니다.
[냉장고 관리](18-fridge.md)와 연동되어 재고 소진 시 자동 등재, 구매 완료 시 냉장고 이관이 이루어집니다.
장보기 완료 시 가계부(Expense)에 자동 등록할 수 있으며, 양방향 딥링크를 지원합니다.

---

## 핵심 기능

| 기능 | 설명 |
|------|------|
| **단일 활성 장바구니** | 그룹당 1개 Active Cart만 유지 |
| **원터치 완료** | 장보기 완료 → ShoppingHistory 아카이빙 + 냉장고 자동 이관 |
| **가계부 연동** | 완료 시 총액 자동으로 가계부(Expense) 생성 (선택) |
| **양방향 딥링크** | 가계부 ↔ 장보기 이력 상호 이동 |

---

## 데이터베이스 설계

```prisma
// 활성 장바구니 (그룹당 1개)
model ShoppingCart {
  id        String             @id @default(uuid())
  groupId   String             @unique
  createdAt DateTime           @default(now())
  updatedAt DateTime           @updatedAt
  group     Group              @relation(fields: [groupId], references: [id], onDelete: Cascade)
  items     ShoppingCartItem[]

  @@map("shopping_carts")
}

// 장바구니 품목
model ShoppingCartItem {
  id             String        @id @default(uuid())
  cartId         String
  frequentItemId String?
  name           String        @db.VarChar(100)
  quantity       Decimal       @db.Decimal(10, 2)
  unit           String?       @db.VarChar(20)
  isChecked      Boolean       @default(false)
  memo           String?       @db.VarChar(200)
  createdAt      DateTime      @default(now())
  cart           ShoppingCart  @relation(fields: [cartId], references: [id], onDelete: Cascade)
  frequentItem   FrequentItem? @relation(fields: [frequentItemId], references: [id])

  @@index([cartId])
  @@map("shopping_cart_items")
}

// 구매 이력 (완료된 장바구니 아카이브)
model ShoppingHistory {
  id          String                @id @default(uuid())
  groupId     String
  completedAt DateTime              @default(now())
  group       Group                 @relation(fields: [groupId], references: [id], onDelete: Cascade)
  expense     Expense?              @relation(fields: [id], references: [shoppingHistoryId])
  items       ShoppingHistoryItem[]

  @@index([groupId])
  @@index([completedAt])
  @@map("shopping_histories")
}

// 구매 이력 품목
model ShoppingHistoryItem {
  id                  String          @id @default(uuid())
  historyId           String
  name                String          @db.VarChar(100)
  quantity            Decimal         @db.Decimal(10, 2)
  unit                String?         @db.VarChar(20)
  transferredToFridge Boolean         @default(false)
  fridgeItemId        String?
  history             ShoppingHistory @relation(fields: [historyId], references: [id], onDelete: Cascade)

  @@index([historyId])
  @@map("shopping_history_items")
}
```

### Expense 모델 연동 필드 (household)
```prisma
// Expense 모델에 추가된 필드
shoppingHistoryId String?         @unique
shoppingHistory   ShoppingHistory? @relation(fields: [shoppingHistoryId], references: [id])
```

---

## 가계부 연동 설계

### DB 연결 방식

- `Expense.shoppingHistoryId` — ShoppingHistory와 1:1 연결 (`@unique`)
- ShoppingHistory는 Expense를 역방향으로 참조 (조회 편의용)

### 장보기 완료 처리 흐름

```
POST /shopping/cart/complete
  body: { groupId, transfers[], expense?: { amount, paymentMethod, date? } }

1. ShoppingHistory 생성
2. ShoppingHistoryItem 생성 (품목별)
3. FridgeItem 이관 (transfers[] 기반)
4. expense 필드가 있으면:
   → Expense 생성 (category: FOOD, type: EXPENSE, shoppingHistoryId 설정)
5. 카트 초기화 (items 전체 삭제)

→ 전체 단일 트랜잭션
```

### Request Body (완료 처리)

```json
{
  "groupId": "uuid-group",
  "transfers": [
    {
      "cartItemId": "uuid",
      "storageLocationId": "uuid",
      "quantity": 2,
      "unit": "개",
      "expiresAt": "2026-05-20",
      "alertDaysBefore": 3
    }
  ],
  "expense": {
    "amount": 45000,
    "paymentMethod": "CARD",
    "date": "2026-05-12",
    "description": "마트 장보기",
    "category": "FOOD"
  }
}
```

> `expense` 필드는 optional — 생략 시 가계부 등록 없이 이력만 저장

### 딥링크 FCM data

| 방향 | FCM data |
|------|---------|
| 가계부 항목 → 장보기 이력 | `{ "action": "view_shopping_history", "groupId": "uuid", "shoppingHistoryId": "uuid" }` |
| 장보기 이력 → 가계부 항목 | Expense.id로 `/household/expenses/:id` 조회 |

---

## API 엔드포인트

### A. 장바구니 (Shopping Cart)

| Method | Endpoint | 설명 |
|--------|----------|------|
| `GET` | `/shopping/cart?groupId=` | 활성 장바구니 조회 |
| `POST` | `/shopping/cart/items` | 품목 추가 |
| `PATCH` | `/shopping/cart/items/:id?groupId=` | 품목 수정 (수량, 체크 등) |
| `DELETE` | `/shopping/cart/items/:id?groupId=` | 품목 삭제 |
| `POST` | `/shopping/cart/complete` | 장보기 완료 (냉장고 이관 + 가계부 연동) |

### B. 구매 이력 (Shopping History)

| Method | Endpoint | 설명 |
|--------|----------|------|
| `GET` | `/shopping/history?groupId=` | 이력 목록 (페이지네이션) |
| `GET` | `/shopping/history/:id?groupId=` | 이력 상세 |

---

## 주요 비즈니스 규칙

### 단일 Active Cart
- `ShoppingCart.groupId`에 `@unique` → DB 레벨에서 그룹당 1개 보장
- 첫 조회 시 존재하지 않으면 자동 생성 (upsert)

### 가계부 연동
- `expense` 필드 포함 시: Expense 생성 + `shoppingHistoryId` 설정 (단일 트랜잭션)
- `expense` 필드 생략 시: 가계부 등록 없이 이력만 저장
- 카테고리 기본값 `FOOD`, 클라이언트가 변경 가능
- `Expense.shoppingHistoryId @unique` — 1:1 연결 보장

---

## 구현 상태

### ✅ 완료
- [x] Prisma 스키마 추가 (ShoppingCart, ShoppingCartItem, ShoppingHistory, ShoppingHistoryItem)
- [x] `Expense.shoppingHistoryId` 역방향 참조 추가
- [x] ShoppingCart API (조회/추가/수정/삭제)
- [x] 장보기 완료 + 냉장고 이관 트랜잭션
- [x] 가계부 자동 등록 연동 (`expense` 옵션)
- [x] ShoppingHistory 조회 (목록/상세, 페이지네이션, expense 포함)

---

**Last Updated**: 2026-05-15
