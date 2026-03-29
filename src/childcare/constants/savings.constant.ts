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
    expectedInterest = Math.floor(totalDeposit * rate * (months / 12));
  } else {
    const monthlyRate = rate / 12;
    const fv =
      monthlyRate === 0
        ? totalDeposit
        : params.monthlyAmount *
          ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
    expectedInterest = Math.floor(fv - totalDeposit);
  }

  return { months, totalDeposit, expectedInterest };
}
