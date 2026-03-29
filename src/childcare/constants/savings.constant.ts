import { SavingsInterestType } from '@prisma/client';

export function calculateSavingsInterest(params: {
  monthlyAmount: number;
  interestRate: number;
  interestType: SavingsInterestType;
  startDate: Date | string;
  endDate: Date | string;
}): { months: number; totalDeposit: number; expectedInterest: number } {
  const startDate = new Date(params.startDate);
  const endDate = new Date(params.endDate);
  const months =
    (endDate.getFullYear() - startDate.getFullYear()) * 12 +
    (endDate.getMonth() - startDate.getMonth());
  const totalDeposit = params.monthlyAmount * months;
  const rate = params.interestRate / 100;

  let expectedInterest: number;

  if (params.interestType === SavingsInterestType.SIMPLE) {
    // 적금 단리: 각 회차 납입금이 (n-k)개월 운용됨
    // 이자 합계 = 월납입액 × 이율/12 × n(n+1)/2
    expectedInterest = Math.floor(
      (params.monthlyAmount * rate * (months * (months + 1))) / 24,
    );
  } else {
    // 적금 복리: FV = PMT × ((1+r/12)^n - 1) / (r/12) × (1+r/12)
    const monthlyRate = rate / 12;
    const fv =
      monthlyRate === 0
        ? totalDeposit
        : params.monthlyAmount *
          ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) *
          (1 + monthlyRate);
    expectedInterest = Math.floor(fv - totalDeposit);
  }

  return { months, totalDeposit, expectedInterest };
}
