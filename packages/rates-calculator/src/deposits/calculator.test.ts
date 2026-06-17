import { describe, expect, it } from 'vitest';
import { aggregateDetails, calculateDeposit, validateFloatSchedule } from './calculator';
import { isCapitalizationBoundary } from './capitalization';
import { isLeapYear, daysInYear, roundMoney, parseISODate } from '../core';
import { DepositValidationError, type DepositInput } from './types';

function baseInput(overrides: Partial<DepositInput> = {}): DepositInput {
    return {
        amount: 10000,
        startDate: '2025-01-01',
        term: { value: 1, unit: 'years' },
        rateType: 'fixed',
        fixedRate: 10,
        floatSchedule: [],
        capitalization: false,
        capFrequency: 'none',
        incomeTaxPercent: 0,
        additionType: 'none',
        recurringAddition: { amount: 0, frequency: 'monthly' },
        oneTimeAdditions: [],
        withdrawalType: 'none',
        recurringWithdrawal: { amount: 0, frequency: 'monthly' },
        oneTimeWithdrawals: [],
        ...overrides
    };
}

describe('roundMoney', () => {
    it('rounds half up to two decimals', () => {
        expect(roundMoney(1.005)).toBe(1.01);
        expect(roundMoney(1.004)).toBe(1.0);
        expect(roundMoney(2.675)).toBe(2.68);
        expect(roundMoney(0.125)).toBe(0.13);
    });

    it('keeps the cent when third decimal is 0-4', () => {
        expect(roundMoney(100.234)).toBe(100.23);
        expect(roundMoney(100.231)).toBe(100.23);
    });

    it('handles negative values symmetrically', () => {
        expect(roundMoney(-1.005)).toBe(-1.01);
        expect(roundMoney(-1.004)).toBe(-1.0);
    });
});

describe('date utils', () => {
    it('detects leap years', () => {
        expect(isLeapYear(2024)).toBe(true);
        expect(isLeapYear(2025)).toBe(false);
        expect(isLeapYear(2000)).toBe(true);
        expect(isLeapYear(1900)).toBe(false);
    });

    it('returns 365 or 366 days', () => {
        expect(daysInYear(new Date(2024, 5, 1))).toBe(366);
        expect(daysInYear(new Date(2025, 5, 1))).toBe(365);
    });

    it('identifies monthly boundaries anchored to the start day', () => {
        const start = new Date(2025, 3, 10); // 10 April 2025
        expect(isCapitalizationBoundary(new Date(2025, 4, 10), start, 'monthly')).toBe(true); // 10 May
        expect(isCapitalizationBoundary(new Date(2025, 5, 10), start, 'monthly')).toBe(true); // 10 June
        expect(isCapitalizationBoundary(new Date(2025, 4, 11), start, 'monthly')).toBe(false); // 11 May
        expect(isCapitalizationBoundary(start, start, 'monthly')).toBe(false); // start day itself
    });

    it('clamps the start-anchored boundary on shorter months', () => {
        const start = new Date(2025, 0, 31); // 31 Jan 2025
        // February has no 31st, so the boundary falls on the last day (28th).
        expect(isCapitalizationBoundary(new Date(2025, 1, 28), start, 'monthly')).toBe(true);
        // March recovers the 31st anchor.
        expect(isCapitalizationBoundary(new Date(2025, 2, 31), start, 'monthly')).toBe(true);
    });
});

describe('calculateDeposit - simple interest (no capitalization)', () => {
    it('computes simple interest for a non-leap year', () => {
        const r = calculateDeposit(baseInput());
        // 10000 at 10% for 365 days in a 365-day year = exactly 1000 gross.
        expect(r.totalGrossInterest).toBe(1000);
        expect(r.totalTax).toBe(0);
        expect(r.finalBalance).toBe(11000);
        expect(r.totalIncome).toBe(1000);
        expect(r.totalDays).toBe(365);
    });

    it('applies income tax once at the end of term', () => {
        const r = calculateDeposit(baseInput({ incomeTaxPercent: 13 }));
        // 1000 gross, 13% tax = 130, net 870.
        expect(r.totalGrossInterest).toBe(1000);
        expect(r.totalTax).toBe(130);
        expect(r.finalBalance).toBe(10870);
        expect(r.totalIncome).toBe(870);
    });

    it('accounts for leap-year day count', () => {
        const r = calculateDeposit(baseInput({ startDate: '2024-01-01' }));
        // 2024 is a leap year (366 days); 366 days at rate/366 per day = exactly 1000 gross.
        expect(r.totalDays).toBe(366);
        expect(r.totalGrossInterest).toBe(1000);
    });
});

describe('calculateDeposit - capitalization', () => {
    it('compounds monthly and yields more than simple interest', () => {
        const simple = calculateDeposit(baseInput());
        const compounded = calculateDeposit(
            baseInput({ capitalization: true, capFrequency: 'monthly' })
        );
        expect(compounded.finalBalance).toBeGreaterThan(simple.finalBalance);
    });

    it('produces 12 monthly detail rows for a one-year term', () => {
        const r = calculateDeposit(baseInput({ capitalization: true, capFrequency: 'monthly' }));
        const monthly = aggregateDetails(r.dailyDetails, 'monthly');
        expect(monthly).toHaveLength(12);
        // The deposit is funded on the opening day, so the first row opens at zero
        // and shows the principal as an inflow.
        expect(monthly[0].openingBalance).toBe(0);
        expect(monthly[0].added).toBe(10000);
    });

    it('supports each capitalization frequency without error', () => {
        const freqs = [
            'daily',
            'weekly',
            'twiceMonthly',
            'monthly',
            'quarterly',
            'semiAnnual',
            'annual'
        ] as const;
        for (const f of freqs) {
            const r = calculateDeposit(baseInput({ capitalization: true, capFrequency: f }));
            expect(r.finalBalance).toBeGreaterThan(10000);
        }
    });

    it('daily compounding yields the highest balance', () => {
        const daily = calculateDeposit(baseInput({ capitalization: true, capFrequency: 'daily' }));
        const annual = calculateDeposit(baseInput({ capitalization: true, capFrequency: 'annual' }));
        expect(daily.finalBalance).toBeGreaterThan(annual.finalBalance);
    });

    it('credits the first monthly capitalization for the completed period only', () => {
    // 500 opened on 7 May 2025 at 15.29%, monthly capitalization.
    // First credit on 7 June covers 7 May–6 June = 31 days: 500*31*0.1529/365 = 6.49.
        const r = calculateDeposit(
            baseInput({
                amount: 500,
                startDate: '2025-05-07',
                term: { value: 1, unit: 'years' },
                fixedRate: 15.29,
                capitalization: true,
                capFrequency: 'monthly'
            })
        );
        const june7 = r.dailyDetails.find((d) => d.periodStart === '2025-06-07');
        expect(june7?.capitalized).toBe(6.49);
    });
});

describe('calculateDeposit - float rate', () => {
    it('uses different rates across date ranges', () => {
        const r = calculateDeposit(
            baseInput({
                rateType: 'float',
                floatSchedule: [
                    { from: '2025-01-01', to: '2025-06-30', rate: 10 },
                    { from: '2025-07-01', to: '2025-12-31', rate: 20 }
                ]
            })
        );
        expect(r.totalGrossInterest).toBeGreaterThan(0);
        // Average rate ~15%, so gross should be well above the 10% fixed (1000) result.
        expect(r.totalGrossInterest).toBeGreaterThan(1300);
    });
});

describe('calculateDeposit - rate metrics', () => {
    it('total rate equals effective rate for a one-year term', () => {
        const r = calculateDeposit(baseInput({ capitalization: true, capFrequency: 'monthly' }));
        expect(r.termYears).toBeCloseTo(1, 5);
        expect(r.totalRate).toBeCloseTo(r.effectiveAnnualRate, 6);
        expect(r.totalAnnualRate).toBeCloseTo(r.totalRate, 6);
    });

    it('total rate exceeds annual rate for multi-year terms', () => {
        const r = calculateDeposit(
            baseInput({
                term: { value: 3, unit: 'years' },
                capitalization: true,
                capFrequency: 'monthly'
            })
        );
        expect(r.termYears).toBeCloseTo(3, 1);
        expect(r.totalRate).toBeGreaterThan(r.effectiveAnnualRate);
        expect(r.totalAnnualRate).toBeCloseTo(r.totalRate / r.termYears, 6);
    });

    it('matches the compound formula (1 + r/n)^(n*T) - 1 with no tax', () => {
        const r = calculateDeposit(
            baseInput({ fixedRate: 12, capitalization: true, capFrequency: 'monthly' })
        );
        const expected = Math.pow(1 + 0.12 / 12, 12) - 1;
        expect(r.totalRate).toBeCloseTo(expected, 3);
    });
});

describe('calculateDeposit - additions', () => {
    it('adds recurring contributions to total contributions and balance', () => {
        const withAdd = calculateDeposit(
            baseInput({
                additionType: 'recurring',
                recurringAddition: { amount: 1000, frequency: 'monthly' }
            })
        );
        // 11 monthly additions land strictly before the 1-year end date.
        expect(withAdd.totalContributions).toBe(10000 + 11 * 1000);
        expect(withAdd.finalBalance).toBeGreaterThan(withAdd.totalContributions);
    });

    it('applies one-time contributions on their dates', () => {
        const r = calculateDeposit(
            baseInput({
                additionType: 'oneTime',
                oneTimeAdditions: [
                    { date: '2025-03-15', amount: 5000 },
                    { date: '2025-09-01', amount: 2500 }
                ]
            })
        );
        expect(r.totalContributions).toBe(10000 + 5000 + 2500);
        const monthly = aggregateDetails(r.dailyDetails, 'monthly');
        const march = monthly.find((m) => m.periodStart.startsWith('2025-03'));
        expect(march?.added).toBe(5000);
    });

    it('ignores one-time contributions outside the term', () => {
        const r = calculateDeposit(
            baseInput({
                additionType: 'oneTime',
                oneTimeAdditions: [{ date: '2030-01-01', amount: 5000 }]
            })
        );
        expect(r.totalContributions).toBe(10000);
    });

    it('net income excludes contributed principal', () => {
        const r = calculateDeposit(
            baseInput({
                additionType: 'oneTime',
                oneTimeAdditions: [{ date: '2025-07-01', amount: 10000 }]
            })
        );
        expect(r.totalIncome).toBeCloseTo(r.finalBalance - r.totalContributions, 2);
    });
});

describe('calculateDeposit - per-contribution tax', () => {
    it('taxes only the income from a one-time contribution at its own rate', () => {
    // Main deposit tax is 0%; the contribution carries a 100% tax so its income is fully
    // withheld and its balance never grows.
        const r = calculateDeposit(
            baseInput({
                incomeTaxPercent: 0,
                additionType: 'oneTime',
                oneTimeAdditions: [{ date: '2025-07-01', amount: 10000, taxPercent: 100 }]
            })
        );
        // Main 10000 @10% simple = 11000; contribution stays at 10000 (all income taxed away).
        expect(r.finalBalance).toBe(21000);
        expect(r.totalContributions).toBe(20000);
        expect(r.totalIncome).toBe(1000);
    });

    it('applies its own tax even when the main deposit is tax-free', () => {
        const taxed = calculateDeposit(
            baseInput({
                incomeTaxPercent: 0,
                additionType: 'oneTime',
                oneTimeAdditions: [{ date: '2025-07-01', amount: 10000, taxPercent: 13 }]
            })
        );
        const untaxed = calculateDeposit(
            baseInput({
                incomeTaxPercent: 0,
                additionType: 'oneTime',
                oneTimeAdditions: [{ date: '2025-07-01', amount: 10000 }]
            })
        );
        expect(taxed.totalTax).toBeGreaterThan(0);
        expect(untaxed.totalTax).toBe(0);
        expect(taxed.finalBalance).toBeLessThan(untaxed.finalBalance);
    });

    it('rejects a per-contribution tax out of range', () => {
        expect(() =>
            calculateDeposit(
                baseInput({
                    additionType: 'oneTime',
                    oneTimeAdditions: [{ date: '2025-07-01', amount: 1000, taxPercent: 150 }]
                })
            )
        ).toThrowError(DepositValidationError);
    });
});

describe('calculateDeposit - withdrawals', () => {
    it('reduces the balance by recurring withdrawals', () => {
        const withWithdrawal = calculateDeposit(
            baseInput({
                withdrawalType: 'recurring',
                recurringWithdrawal: { amount: 500, frequency: 'monthly' }
            })
        );
        const baseline = calculateDeposit(baseInput());
        // 11 monthly withdrawals land strictly before the 1-year end date.
        expect(withWithdrawal.totalWithdrawals).toBe(11 * 500);
        expect(withWithdrawal.finalBalance).toBeLessThan(baseline.finalBalance);
    });

    it('applies one-time withdrawals on their dates', () => {
        const r = calculateDeposit(
            baseInput({
                withdrawalType: 'oneTime',
                oneTimeWithdrawals: [{ date: '2025-07-01', amount: 3000 }]
            })
        );
        expect(r.totalWithdrawals).toBe(3000);
        const monthly = aggregateDetails(r.dailyDetails, 'monthly');
        const july = monthly.find((m) => m.periodStart.startsWith('2025-07'));
        expect(july?.withdrawn).toBe(3000);
    });

    it('never withdraws more than the available balance', () => {
        const r = calculateDeposit(
            baseInput({
                amount: 1000,
                withdrawalType: 'oneTime',
                oneTimeWithdrawals: [{ date: '2025-07-01', amount: 999999 }]
            })
        );
        expect(r.totalWithdrawals).toBeLessThanOrEqual(r.totalContributions + r.totalGrossInterest);
        expect(r.finalBalance).toBeGreaterThanOrEqual(0);
    });

    it('counts withdrawn funds as part of net income', () => {
        const r = calculateDeposit(
            baseInput({
                fixedRate: 10,
                withdrawalType: 'oneTime',
                oneTimeWithdrawals: [{ date: '2025-07-01', amount: 2000 }]
            })
        );
        expect(r.totalIncome).toBeCloseTo(
            r.finalBalance + r.totalWithdrawals - r.totalContributions,
            2
        );
        expect(r.totalIncome).toBeGreaterThan(0);
    });

    it('ignores one-time withdrawals outside the term', () => {
        const r = calculateDeposit(
            baseInput({
                withdrawalType: 'oneTime',
                oneTimeWithdrawals: [{ date: '2030-01-01', amount: 500 }]
            })
        );
        expect(r.totalWithdrawals).toBe(0);
    });
});

describe('aggregateDetails', () => {
    it('aggregates daily details into the requested period', () => {
        const r = calculateDeposit(
            baseInput({ capitalization: true, capFrequency: 'monthly' })
        );
        expect(aggregateDetails(r.dailyDetails, 'daily')).toHaveLength(365);
        expect(aggregateDetails(r.dailyDetails, 'monthly')).toHaveLength(12);
        expect(aggregateDetails(r.dailyDetails, 'quarterly')).toHaveLength(4);
        expect(aggregateDetails(r.dailyDetails, 'annual')).toHaveLength(1);
    });

    it('preserves endpoint balances and final closing balance across granularities', () => {
        const r = calculateDeposit(
            baseInput({ capitalization: true, capFrequency: 'monthly' })
        );
        for (const period of ['daily', 'monthly', 'quarterly', 'annual'] as const) {
            const agg = aggregateDetails(r.dailyDetails, period);
            // The deposit is funded on the opening day, so the first row opens at zero
            // and shows the principal as an inflow.
            expect(agg[0].openingBalance).toBe(0);
            expect(agg[0].added).toBe(10000);
            expect(agg[agg.length - 1].closingBalance).toBe(r.finalBalance);
        }
    });

    it('changes view emits the start day, one row per balance change, and the final day', () => {
        const r = calculateDeposit(
            baseInput({ capitalization: true, capFrequency: 'monthly' })
        );
        const changes = aggregateDetails(r.dailyDetails, 'changes');
        // Start day + 12 monthly capitalizations (the last coincides with the final day).
        expect(changes).toHaveLength(13);
        // First row is the opening day on which the deposit is funded: it opens at zero
        // and shows the principal in the Added column.
        expect(changes[0].periodStart).toBe('2025-01-01');
        expect(changes[0].openingBalance).toBe(0);
        expect(changes[0].added).toBe(10000);
        expect(changes[0].capitalized).toBe(0);
        // Every later row reflects a capitalization.
        expect(changes.slice(1).every((d) => d.capitalized > 0)).toBe(true);
        expect(changes[changes.length - 1].closingBalance).toBe(r.finalBalance);
    });

    it('changes view includes contribution and withdrawal days', () => {
        const r = calculateDeposit(
            baseInput({
                capitalization: false,
                additionType: 'oneTime',
                oneTimeAdditions: [{ date: '2025-03-15', amount: 500 }],
                withdrawalType: 'oneTime',
                oneTimeWithdrawals: [{ date: '2025-06-20', amount: 200 }]
            })
        );
        const changes = aggregateDetails(r.dailyDetails, 'changes');
        expect(changes.some((d) => d.periodStart === '2025-03-15' && d.added === 500)).toBe(true);
        expect(changes.some((d) => d.periodStart === '2025-06-20' && d.withdrawn === 200)).toBe(true);
        // Last row carries the final closing balance.
        expect(changes[changes.length - 1].closingBalance).toBe(r.finalBalance);
    });
});

describe('float schedule validation', () => {
    const start = parseISODate('2025-01-01');
    const lastDay = parseISODate('2025-12-31');

    it('accepts a fully-covering schedule', () => {
        expect(() =>
            validateFloatSchedule(
                [
                    { from: '2025-01-01', to: '2025-06-30', rate: 10 },
                    { from: '2025-07-01', to: '2025-12-31', rate: 12 }
                ],
                start,
                lastDay
            )
        ).not.toThrow();
    });

    it('rejects a gap in coverage', () => {
        expect(() =>
            validateFloatSchedule(
                [
                    { from: '2025-01-01', to: '2025-06-29', rate: 10 },
                    { from: '2025-07-01', to: '2025-12-31', rate: 12 }
                ],
                start,
                lastDay
            )
        ).toThrowError(DepositValidationError);
    });

    it('rejects an overlap', () => {
        expect(() =>
            validateFloatSchedule(
                [
                    { from: '2025-01-01', to: '2025-07-15', rate: 10 },
                    { from: '2025-07-01', to: '2025-12-31', rate: 12 }
                ],
                start,
                lastDay
            )
        ).toThrowError(DepositValidationError);
    });

    it('rejects an uncovered tail', () => {
        expect(() =>
            validateFloatSchedule(
                [{ from: '2025-01-01', to: '2025-11-30', rate: 10 }],
                start,
                lastDay
            )
        ).toThrowError(DepositValidationError);
    });

    it('rejects an inverted range', () => {
        expect(() =>
            validateFloatSchedule(
                [{ from: '2025-12-31', to: '2025-01-01', rate: 10 }],
                start,
                lastDay
            )
        ).toThrowError(DepositValidationError);
    });
});

describe('input validation', () => {
    it('rejects a non-positive amount', () => {
        expect(() => calculateDeposit(baseInput({ amount: 0 }))).toThrowError(DepositValidationError);
    });

    it('rejects a tax rate out of range', () => {
        expect(() => calculateDeposit(baseInput({ incomeTaxPercent: 150 }))).toThrowError(
            DepositValidationError
        );
    });
});
