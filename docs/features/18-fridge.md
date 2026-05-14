# 18. 냉장고 관리 (Fridge Management)

> **상태**: ✅ 완료
> **Phase**: Phase 5

---

## 개요

냉장고/팬트리 재고를 그룹 단위로 관리하는 시스템입니다.
보관소(냉장/냉동/실온)별로 품목을 등록하고, 유통기한 추적 및 D-Day 알림을 제공합니다.
재고 소진 시 자주 사는 항목 설정에 따라 장바구니에 자동 등재되어 [스마트 장보기](19-shopping.md)와 연동됩니다.

---

## 핵심 기능

| 기능 | 설명 |
|------|------|
| **다중 보관소** | 냉장(FRIDGE), 냉동(FREEZER), 실온(PANTRY) |
| **라이프사이클** | 등록일 + 유통/소비기한 입력 → D-Day 자동 계산 |
| **사전 알림** | 유통기한 D-N일 전 FCM 푸시 (배치 스케줄러) |
| **자주 사는 항목** | FrequentItem 마스터 + 자동 추가 토글 |
| **소진 트리거** | 재고 0 변경 시 autoAdd 항목 → 장바구니 즉시 등재 |

---

## 데이터베이스 설계

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

enum StorageType {
  FRIDGE
  FREEZER
  PANTRY
}
```

---

## API 엔드포인트

### A. 보관소 (Storage Locations)

| Method | Endpoint | 설명 |
|--------|----------|------|
| `GET` | `/fridge/storages?groupId=` | 보관소 목록 |
| `POST` | `/fridge/storages` | 보관소 생성 |
| `PATCH` | `/fridge/storages/reorder` | 순서 변경 |
| `PATCH` | `/fridge/storages/:id?groupId=` | 보관소 수정 |
| `DELETE` | `/fridge/storages/:id?groupId=` | 보관소 삭제 |

### B. 냉장고 품목 (Fridge Items)

| Method | Endpoint | 설명 |
|--------|----------|------|
| `GET` | `/fridge/items?groupId=` | 전체 품목 조회 (보관소별 그룹) |
| `POST` | `/fridge/items` | 품목 등록 |
| `PATCH` | `/fridge/items/:id?groupId=` | 품목 수정 |
| `DELETE` | `/fridge/items/:id?groupId=` | 품목 삭제 |
| `PATCH` | `/fridge/items/:id/quantity?groupId=` | 수량 변경 (소진 트리거 포함) |

### C. 자주 사는 항목 (Frequent Items)

| Method | Endpoint | 설명 |
|--------|----------|------|
| `GET` | `/fridge/frequent-items?groupId=` | 목록 조회 |
| `POST` | `/fridge/frequent-items` | 항목 생성 |
| `PATCH` | `/fridge/frequent-items/reorder` | 순서 변경 |
| `PATCH` | `/fridge/frequent-items/:id?groupId=` | 수정 (autoAdd 토글 포함) |
| `DELETE` | `/fridge/frequent-items/:id?groupId=` | 삭제 |

---

## 알림 (유통기한 사전 알림)

- **트리거**: 매일 오전 09:00 KST 배치 (`FridgeScheduler`)
- **조건**: `expiresAt - now() <= alertDaysBefore days`
- **카테고리**: `FRIDGE`
- **FCM data**: `{ "action": "view_fridge", "groupId": "uuid" }`

| # | 트리거 | 제목 | 본문 예시 |
|---|--------|------|-----------|
| 1 | 유통기한 D-N일 | 유통기한 임박 알림 | `"우유 유통기한이 3일 남았어요"` |
| 2 | 유통기한 당일 (D-0) | 유통기한 만료 | `"계란 유통기한이 오늘까지예요!"` |

---

## 주요 비즈니스 규칙

### 소진 트리거
```
PATCH /fridge/items/:id/quantity { quantity: 0 }
  → FridgeItem.quantity = 0 저장
  → FridgeItem.frequentItemId 확인
  → FrequentItem.autoAdd === true 이면:
      ShoppingCartItem 존재 여부 확인 (중복 방지)
      → 없으면 Active Cart에 추가 (quantity: 1, unit: FrequentItem.defaultUnit)
```

---

## 파일 구조

```
src/fridge/
├── fridge.module.ts
├── fridge.controller.ts       ← 냉장고 관리 (보관소/품목/자주사는항목)
├── fridge.service.ts          ← 냉장고 + 장보기 통합 서비스
├── fridge.scheduler.ts        ← 유통기한 알림 배치
├── shopping.controller.ts     ← 스마트 장보기 (장바구니/이력)
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
    ├── complete-shopping.dto.ts
    ├── history-query.dto.ts
    └── fridge-response.dto.ts
```

---

## 구현 상태

### ✅ 완료
- [x] Prisma 스키마 추가 (StorageLocation, FridgeItem, FrequentItem + `StorageType` enum)
- [x] `NotificationCategory` enum에 `FRIDGE` 추가
- [x] StorageLocation CRUD (목록/생성/수정/삭제/순서변경)
- [x] FridgeItem CRUD + 소진 트리거 (`quantity=0` → autoAdd 카트 등재)
- [x] FrequentItem CRUD (autoAdd 토글, 순서변경)
- [x] FridgeScheduler (매일 09:00 유통기한 임박/만료 알림)

---

**Last Updated**: 2026-05-15
