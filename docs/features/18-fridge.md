# 18. 냉장고 & 스마트 장보기 (Fridge & Smart Shopping)

> **상태**: ✅ 완료
> **Phase**: Phase 5

---

## 개요

냉장고/팬트리 재고를 그룹 단위로 관리하고, 장보기 리스트와 연동하여 식재료 라이프사이클을 추적하는 시스템입니다.
소진 시 자동 장바구니 등록, 구매 완료 시 냉장고 자동 이관, D-Day 알림 등 스마트 자동화를 제공합니다.

---

## 핵심 기능 요약

| 기능 | 설명 |
|------|------|
| **다중 보관소** | 냉장(FRIDGE), 냉동(FREEZER), 실온(PANTRY) |
| **라이프사이클** | 등록일 + 유통/소비기한 입력 → D-Day 자동 계산 |
| **사전 알림** | 유통기한 D-N일 전 FCM 푸시 (배치 스케줄러) |
| **단일 활성 장바구니** | 그룹당 1개 Active Cart만 유지 |
| **원터치 완료** | 장보기 완료 → ShoppingHistory 아카이빙 + 냉장고 자동 이관 |
| **자주 사는 항목** | FrequentItem 마스터 + '자동 추가' 토글 |
| **소진 트리거** | 재고 0 변경 시 자동 추가 항목 → Active Cart 즉시 등재 |
| **가계부 연동** | 장보기 완료 시 총액 자동으로 가계부(Expense) 생성, 양방향 딥링크 |

---

## 데이터베이스 설계

### 구현된 모델

```prisma
// 보관소 (냉장/냉동/팬트리)
model StorageLocation {
  id        String       @id @default(uuid())
  groupId   String
  name      String       @db.VarChar(50)
  type      StorageType
  sortOrder Int          @default(0)
  createdAt DateTime     @default(now())
  group     Group        @relation(fields: [groupId], references: [id], onDelete: Cascade)
  items     FridgeItem[]

  @@index([groupId])
  @@map("storage_locations")
}

// 냉장고 품목
model FridgeItem {
  id                String          @id @default(uuid())
  groupId           String
  storageLocationId String
  name              String          @db.VarChar(100)
  quantity          Decimal         @db.Decimal(10, 2)
  unit              String?         @db.VarChar(20)
  registeredAt      DateTime        @default(now())
  expiresAt         DateTime?
  alertDaysBefore   Int             @default(3)
  memo              String?         @db.VarChar(200)
  frequentItemId    String?
  createdAt         DateTime        @default(now())
  updatedAt         DateTime        @updatedAt
  group             Group           @relation(fields: [groupId], references: [id], onDelete: Cascade)
  storageLocation   StorageLocation @relation(fields: [storageLocationId], references: [id], onDelete: Cascade)
  frequentItem      FrequentItem?   @relation(fields: [frequentItemId], references: [id])

  @@index([groupId])
  @@index([storageLocationId])
  @@index([expiresAt])
  @@map("fridge_items")
}

// 자주 사는 항목 마스터
model FrequentItem {
  id           String             @id @default(uuid())
  groupId      String
  name         String             @db.VarChar(100)
  defaultUnit  String?            @db.VarChar(20)
  autoAdd      Boolean            @default(false)
  sortOrder    Int                @default(0)
  createdAt    DateTime           @default(now())
  updatedAt    DateTime           @updatedAt
  group        Group              @relation(fields: [groupId], references: [id], onDelete: Cascade)
  fridgeItems  FridgeItem[]
  cartItems    ShoppingCartItem[]

  @@unique([groupId, name])
  @@index([groupId])
  @@map("frequent_items")
}

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
  // 가계부 연동: expenseId가 있으면 가계부 항목과 연결됨
  expenseId   String?               @unique
  group       Group                 @relation(fields: [groupId], references: [id], onDelete: Cascade)
  expense     Expense?              @relation(fields: [expenseId], references: [id])
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

enum StorageType {
  FRIDGE
  FREEZER
  PANTRY
}
```

### Group 모델 추가 relations
```prisma
storageLocations  StorageLocation[]
fridgeItems       FridgeItem[]
frequentItems     FrequentItem[]
shoppingCart      ShoppingCart?
shoppingHistories ShoppingHistory[]
```

---

## 가계부 연동 설계

### 개요

장보기 완료(`POST /groups/:groupId/cart/complete`) 시 총 구매액을 가계부에 자동 등록합니다.
가계부 화면에서 해당 지출 항목을 클릭하면 장보기 이력으로 딥링크 이동 가능합니다.

### DB 연결 방식

- `ShoppingHistory.expenseId` — Expense와 1:1 연결 (`@unique`)
- `Expense.shoppingHistoryId` — 역방향 참조 (조회 편의용, 실제 FK는 ShoppingHistory 쪽)

### 장보기 완료 시 처리 흐름

```
POST /groups/:groupId/cart/complete
  body: { transfers[], expense: { amount, paymentMethod, date? } }

1. ShoppingHistory 생성
2. ShoppingHistoryItem 생성 (품목별)
3. FridgeItem 이관 (transfers[] 기반)
4. expense 필드가 있으면:
   → Expense 생성 (category: FOOD, type: EXPENSE)
   → ShoppingHistory.expenseId = expense.id 업데이트
5. 카트 초기화
```

### Request Body (완료 처리)

```json
{
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
    "description": "마트 장보기"
  }
}
```

> `expense` 필드는 optional — 가계부 등록을 원하지 않으면 생략 가능

### FCM data (가계부 딥링크)

| 화면 | data 키 |
|------|---------|
| 가계부 항목 클릭 → 장보기 이력 | `{ "householdId": "groupId", "shoppingHistoryId": "uuid" }` |
| 장보기 이력에서 가계부로 이동 | Expense.id로 `/household/expenses/:id` 호출 |

---

## API 엔드포인트

### A. 보관소 (Storage Locations)

| Method | Endpoint | 설명 | 권한 |
|--------|----------|------|------|
| `GET` | `/groups/:groupId/storages` | 보관소 목록 | 멤버 |
| `POST` | `/groups/:groupId/storages` | 보관소 생성 | 멤버 |
| `PATCH` | `/groups/:groupId/storages/reorder` | 순서 변경 | 멤버 |
| `PATCH` | `/groups/:groupId/storages/:id` | 보관소 수정 | 멤버 |
| `DELETE` | `/groups/:groupId/storages/:id` | 보관소 삭제 | 멤버 |

### B. 냉장고 품목 (Fridge Items)

| Method | Endpoint | 설명 | 권한 |
|--------|----------|------|------|
| `GET` | `/groups/:groupId/fridge` | 전체 품목 조회 (보관소별 그룹) | 멤버 |
| `POST` | `/groups/:groupId/fridge` | 품목 등록 | 멤버 |
| `PATCH` | `/groups/:groupId/fridge/:id` | 품목 수정 | 멤버 |
| `DELETE` | `/groups/:groupId/fridge/:id` | 품목 삭제 | 멤버 |
| `PATCH` | `/groups/:groupId/fridge/:id/quantity` | 수량만 변경 (소진 트리거 포함) | 멤버 |

### C. 자주 사는 항목 (Frequent Items)

| Method | Endpoint | 설명 | 권한 |
|--------|----------|------|------|
| `GET` | `/groups/:groupId/frequent-items` | 목록 조회 | 멤버 |
| `POST` | `/groups/:groupId/frequent-items` | 항목 생성 | 멤버 |
| `PATCH` | `/groups/:groupId/frequent-items/reorder` | 순서 변경 | 멤버 |
| `PATCH` | `/groups/:groupId/frequent-items/:id` | 수정 (autoAdd 토글 포함) | 멤버 |
| `DELETE` | `/groups/:groupId/frequent-items/:id` | 삭제 | 멤버 |

### D. 장바구니 (Shopping Cart)

| Method | Endpoint | 설명 | 권한 |
|--------|----------|------|------|
| `GET` | `/groups/:groupId/cart` | 활성 장바구니 조회 | 멤버 |
| `POST` | `/groups/:groupId/cart/items` | 품목 추가 | 멤버 |
| `PATCH` | `/groups/:groupId/cart/items/:id` | 품목 수정 | 멤버 |
| `DELETE` | `/groups/:groupId/cart/items/:id` | 품목 삭제 | 멤버 |
| `POST` | `/groups/:groupId/cart/complete` | 장보기 완료 (가계부 연동 포함) | 멤버 |

### E. 구매 이력 (Shopping History)

| Method | Endpoint | 설명 | 권한 |
|--------|----------|------|------|
| `GET` | `/groups/:groupId/shopping-history` | 이력 목록 (페이지네이션) | 멤버 |
| `GET` | `/groups/:groupId/shopping-history/:id` | 이력 상세 | 멤버 |

---

## 알림 연동

### 유통기한 사전 알림 (스케줄러)

- **트리거**: 매일 오전 09:00 KST 배치
- **조건**: `expiresAt - now() <= alertDaysBefore days`
- **수신자**: 그룹 멤버 전체
- **카테고리**: `FRIDGE`
- **발송 방식**: 큐 (즉시, 스케줄러)

| # | 트리거 | 제목 | 본문 예시 |
|---|--------|------|-----------|
| 1 | 유통기한 D-N일 | 유통기한 임박 알림 | `"우유 유통기한이 3일 남았어요"` |
| 2 | 유통기한 당일 (D-0) | 유통기한 만료 | `"계란 유통기한이 오늘까지예요!"` |

**FCM data**: `{ "action": "view_fridge", "groupId": "uuid" }`

---

## 주요 비즈니스 규칙

### 단일 Active Cart
- `ShoppingCart.groupId`에 `@unique` → DB 레벨에서 그룹당 1개 보장
- 첫 조회 시 존재하지 않으면 자동 생성 (upsert)

### 소진 트리거
```
PATCH /fridge/:id/quantity { quantity: 0 }
  → FridgeItem.quantity = 0 저장
  → FridgeItem.frequentItemId 확인
  → FrequentItem.autoAdd === true 이면:
      ShoppingCartItem 존재 여부 확인 (중복 방지)
      → 없으면 Active Cart에 추가 (quantity: 1, unit: FrequentItem.defaultUnit)
```

### 가계부 연동
- `expense` 필드 포함 시: Expense 생성 → ShoppingHistory.expenseId 설정 (단일 트랜잭션)
- `expense` 필드 생략 시: 가계부 등록 없이 이력만 저장
- 가계부 카테고리는 기본 `FOOD`로 설정, 클라이언트가 변경 가능
- `ShoppingHistory.expenseId @unique` — 1:1 연결 보장

---

## 파일 구조

```
src/fridge/
├── fridge.module.ts
├── fridge.controller.ts
├── fridge.service.ts
├── fridge.scheduler.ts
└── dto/
    ├── create-storage.dto.ts
    ├── update-storage.dto.ts
    ├── reorder.dto.ts
    ├── create-fridge-item.dto.ts
    ├── update-fridge-item.dto.ts
    ├── update-quantity.dto.ts
    ├── create-frequent-item.dto.ts
    ├── update-frequent-item.dto.ts
    ├── add-cart-item.dto.ts
    ├── update-cart-item.dto.ts
    ├── complete-shopping.dto.ts    ← expense 필드 포함
    ├── history-query.dto.ts
    └── fridge-response.dto.ts
```

---

## 구현 상태

### ✅ 완료
- [x] Prisma 스키마 추가 (6개 모델 + `StorageType` enum)
- [x] `NotificationCategory` enum에 `FRIDGE` 추가
- [x] StorageLocation CRUD (목록/생성/수정/삭제/순서변경)
- [x] FridgeItem CRUD + 소진 트리거 (`quantity=0` → autoAdd 카트 등재)
- [x] FrequentItem CRUD (autoAdd 토글, 순서변경)
- [x] ShoppingCart API (조회/추가/수정/삭제)
- [x] 장보기 완료 + 냉장고 이관 트랜잭션
- [x] ShoppingHistory 조회 (목록/상세, 페이지네이션)
- [x] FridgeScheduler (매일 09:00 유통기한 임박/만료 알림)
- [x] notification-map.md FRIDGE 섹션 추가

### ⬜ TODO (가계부 연동)
- [ ] `ShoppingHistory`에 `expenseId` 필드 추가 (스키마 + 마이그레이션)
- [ ] `Expense`에 `shoppingHistoryId` 역방향 참조 추가
- [ ] `complete-shopping.dto.ts`에 `expense` 선택 필드 추가
- [ ] `completeShopping()` 서비스에 Expense 생성 + expenseId 연결 로직 추가
- [ ] 가계부 Expense 응답 DTO에 `shoppingHistoryId` 포함 (딥링크용)

---

**Last Updated**: 2026-05-12
