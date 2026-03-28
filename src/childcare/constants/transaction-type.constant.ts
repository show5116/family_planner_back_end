import { ChildcareTransactionType } from '@prisma/client';

export const ChildcareTransactionTypeLabel: Record<
  ChildcareTransactionType,
  string
> = {
  [ChildcareTransactionType.ALLOWANCE]: '월 용돈 지급',
  [ChildcareTransactionType.REWARD]: '규칙 보상',
  [ChildcareTransactionType.BONUS]: '보너스 지급',
  [ChildcareTransactionType.PENALTY]: '규칙 위반 차감',
  [ChildcareTransactionType.PURCHASE]: '상점 아이템 구매',
  [ChildcareTransactionType.SAVINGS_DEPOSIT]: '적금 입금',
  [ChildcareTransactionType.SAVINGS_WITHDRAW]: '적금 출금',
  [ChildcareTransactionType.INTEREST]: '이자 지급',
};

export const ChildcareEarningTypes: ChildcareTransactionType[] = [
  ChildcareTransactionType.ALLOWANCE,
  ChildcareTransactionType.REWARD,
  ChildcareTransactionType.BONUS,
  ChildcareTransactionType.INTEREST,
];
