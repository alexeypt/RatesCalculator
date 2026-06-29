import { describe, expect, it } from 'vitest';
import { calculateBond, computeCouponAmounts, computePriceFromYtm, generateCouponDates } from './calculator';
import { BondValidationError, type BondInput } from './types';
import { daysBetween, parseISODate, roundTo, yearFractionActualActual } from '../core';

function baseBond(overrides: Partial<BondInput> = {}): BondInput {
    return {
        bondType: 'regular',
        nominal: 100,
        priceMode: 'price',
        purchasePrice: 100,
        targetYtmPercent: 0,
        startDate: '2025-12-01',
        settlementDate: '2026-01-01',
        maturityDate: '2027-01-01',
        couponRatePercent: 10,
        couponTaxPercent: 0,
        quantity: 1,
        purchaseCosts: 0,
        couponDates: [],
        baseIndex: 1,
        currentIndex: 1,
        ...overrides
    };
}

describe('yearFractionActualActual', () => {
    it('is 1 over a full non-leap year', () => {
        expect(yearFractionActualActual(parseISODate('2025-01-01'), parseISODate('2026-01-01'))).toBeCloseTo(1, 10);
    });

    it('is 1 over a full leap year', () => {
        expect(yearFractionActualActual(parseISODate('2024-01-01'), parseISODate('2025-01-01'))).toBeCloseTo(1, 10);
    });

    it('splits days across the year boundary by each year length', () => {
        // 1 day in leap 2024 (/366) + 1 day in 2025 (/365).
        const expected = 1 / 366 + 1 / 365;
        expect(yearFractionActualActual(parseISODate('2024-12-31'), parseISODate('2025-01-02'))).toBeCloseTo(expected, 12);
    });

    it('returns 0 for empty or reversed ranges', () => {
        expect(yearFractionActualActual(parseISODate('2025-05-01'), parseISODate('2025-05-01'))).toBe(0);
        expect(yearFractionActualActual(parseISODate('2025-05-02'), parseISODate('2025-05-01'))).toBe(0);
    });
});

describe('daysBetween', () => {
    it('counts whole days', () => {
        expect(daysBetween(parseISODate('2025-01-01'), parseISODate('2025-01-31'))).toBe(30);
    });
});

describe('generateCouponDates', () => {
    it('generates quarterly dates ending on maturity', () => {
        expect(
            generateCouponDates({
                firstCouponDate: '2026-04-01',
                frequency: 'quarterly',
                maturityDate: '2027-04-01'
            })
        ).toEqual(['2026-04-01', '2026-07-01', '2026-10-01', '2027-01-01', '2027-04-01']);
    });
});

describe('computeCouponAmounts', () => {
    it('uses the start date for the first (stub) period', () => {
        // 113-day first period at 7% on 300: 300·0.07·113/365 ≈ 6.50 — much larger than a
        // regular ~92-day quarter (~5.29), proving the stub is anchored to the start date.
        const [first] = computeCouponAmounts({
            nominal: 300,
            couponRatePercent: 7,
            startDate: '2026-04-25',
            couponDates: ['2026-08-16', '2026-11-16']
        });
        expect(first.date).toBe('2026-08-16');
        // 300·0.07·113/365 = 6.50137, kept to 4 decimals (not the 2-decimal 6.50).
        expect(first.amount).toBeCloseTo(6.5014, 4);
    });

    it('honors the decimals parameter', () => {
        const params = {
            nominal: 300,
            couponRatePercent: 7,
            startDate: '2026-04-25',
            couponDates: ['2026-08-16']
        };
        expect(computeCouponAmounts({ ...params, decimals: 2 })[0].amount).toBe(6.5);
        expect(computeCouponAmounts({ ...params, decimals: 4 })[0].amount).toBe(6.5014);
    });
});

// --- Doc worked examples (Основы финансовой математики для частного инвестора) ---

/**
 * Aigenis Оп10, doc Пример 6 / 12: bought 25.02.2026 at 212, nominal 200, 18% coupon, quarterly
 * coupons on the 20th, matures 30.07.2027. With these dates the derived coupons reproduce the
 * doc's published amounts (8.88 / 9.07 / 9.07 / 8.98 / 8.88 / 9.07 / 3.95) to the cent.
 */
function aigenisOp10(overrides: Partial<BondInput> = {}): BondInput {
    return baseBond({
        nominal: 200,
        purchasePrice: 212,
        startDate: '2025-12-20',
        settlementDate: '2026-02-25',
        maturityDate: '2027-07-30',
        couponRatePercent: 18,
        couponDates: [
            '2026-03-20',
            '2026-06-20',
            '2026-09-20',
            '2026-12-20',
            '2027-03-20',
            '2027-06-20',
            '2027-07-30'
        ],
        ...overrides
    });
}

describe('calculateBond — regular (doc Пример 6 / 12)', () => {
    const result = calculateBond(aigenisOp10());

    it('derives coupons that sum to the doc total (~57.90)', () => {
        expect(result.couponSum).toBeCloseTo(57.9, 1);
    });

    it('matches the doc simple yield to maturity (~15.2%)', () => {
        expect(result.simpleYtmPercent).toBeCloseTo(15.2, 1);
    });

    it('matches the doc effective yield (~16.82%)', () => {
        expect(result.effectiveYtmPercent).toBeCloseTo(16.82, 1);
    });

    it('reports a Macaulay duration shorter than time to maturity', () => {
        expect(result.macaulayDurationYears).toBeGreaterThan(0);
        expect(result.macaulayDurationYears).toBeLessThan(result.yearsToMaturity);
    });

    it('ends the cash-flow schedule with the redemption of nominal', () => {
        const last = result.cashFlows[result.cashFlows.length - 1];
        expect(last.date).toBe('2027-07-30');
        expect(last.principal).toBeCloseTo(200, 2);
    });

    it('reports equal quote and equivalent amounts for a regular bond', () => {
        for (const cf of result.cashFlows) {
            expect(cf.totalEquivalent).toBeCloseTo(cf.total, 6);
        }
        expect(result.indexed).toBe(false);
    });

    it('rounds regular-bond coupons to 2 decimals', () => {
        for (const cf of result.cashFlows) {
            expect(cf.coupon).toBe(roundTo(cf.coupon, 2));
        }
    });
});

describe('calculateBond — indexed currency-equivalent method', () => {
    const base = 2.989; // ER0
    const current = 2.8487; // ER_current
    const couponDates = ['2026-05-07', '2026-08-07', '2026-11-07', '2027-02-07', '2027-05-07', '2027-08-07'];

    const indexedBond = calculateBond(baseBond({
        bondType: 'indexed',
        nominal: 500,
        purchasePrice: 504.2,
        startDate: '2026-02-07',
        settlementDate: '2026-02-25',
        maturityDate: '2027-08-07',
        couponRatePercent: 7,
        baseIndex: base,
        currentIndex: current,
        couponDates
    }));

    // Same dates/rate, but nominal pre-divided by ER0 and price by ER_current ⇒ identical yields.
    const regularEquivalent = calculateBond(baseBond({
        bondType: 'regular',
        nominal: 500 / base,
        purchasePrice: 504.2 / current,
        startDate: '2026-02-07',
        settlementDate: '2026-02-25',
        maturityDate: '2027-08-07',
        couponRatePercent: 7,
        couponDates
    }));

    it('converts nominal by ER0 and price by ER_current', () => {
        expect(indexedBond.effectiveNominal).toBeCloseTo(500 / base, 2);
        expect(indexedBond.effectivePrice).toBeCloseTo(504.2 / current, 2);
        expect(indexedBond.indexed).toBe(true);
    });

    it('produces the same yields as the equivalent regular bond', () => {
        // Within rounding: the indexed path rounds BYN coupons to cents then divides by ER0,
        // while the equivalent rounds the already-divided amounts — a sub-0.01% divergence.
        expect(indexedBond.simpleYtmPercent).toBeCloseTo(regularEquivalent.simpleYtmPercent, 1);
        expect(indexedBond.effectiveYtmPercent).toBeCloseTo(regularEquivalent.effectiveYtmPercent, 1);
    });

    it('reports an index-currency equivalent below the quote coupon (divided by ER0)', () => {
        const coupon = indexedBond.cashFlows[0];
        expect(coupon.couponEquivalent).toBeCloseTo(coupon.coupon / base, 2);
    });
});

describe('calculateBond — coupon tax and purchase costs', () => {
    it('lowers yields when a coupon tax applies', () => {
        const taxed = calculateBond(aigenisOp10({ couponTaxPercent: 13 }));
        const untaxed = calculateBond(aigenisOp10());
        expect(taxed.simpleYtmPercent).toBeLessThan(untaxed.simpleYtmPercent);
        expect(taxed.effectiveYtmPercent).toBeLessThan(untaxed.effectiveYtmPercent);
        expect(taxed.currentYieldPercent).toBeLessThan(untaxed.currentYieldPercent);
    });

    it('lowers yields and net income when purchase costs apply', () => {
        const withCosts = calculateBond(aigenisOp10({ purchaseCosts: 5 }));
        const without = calculateBond(aigenisOp10());
        expect(withCosts.simpleYtmPercent).toBeLessThan(without.simpleYtmPercent);
        expect(withCosts.effectiveYtmPercent).toBeLessThan(without.effectiveYtmPercent);
        // Net income drops by exactly the entry cost (no tax here).
        expect(withCosts.totalIncome).toBeCloseTo(without.totalIncome - 5, 2);
    });

    it('spreads lot purchase costs across the quantity', () => {
        // 50 of costs over 10 bonds == 5 per bond.
        const lot = calculateBond(aigenisOp10({ purchaseCosts: 50, quantity: 10 }));
        const perBond = calculateBond(aigenisOp10({ purchaseCosts: 5, quantity: 1 }));
        expect(lot.simpleYtmPercent).toBeCloseTo(perBond.simpleYtmPercent, 10);
        expect(lot.totalIncome).toBeCloseTo(perBond.totalIncome, 10);
    });

    it('matches the no-tax / no-cost result when both are zero', () => {
        const a = calculateBond(aigenisOp10({ couponTaxPercent: 0, purchaseCosts: 0 }));
        const b = calculateBond(aigenisOp10());
        expect(a.effectiveYtmPercent).toBeCloseTo(b.effectiveYtmPercent, 10);
    });
});

describe('price from target YTM (doc formula 9)', () => {
    // Aigenis Оп10 sold mid-life, doc Пример 9: at YTM 14% the price is ~212.85.
    const sale = (overrides = {}) => aigenisOp10({ settlementDate: '2026-09-01', ...overrides });

    it('inverts the simple YTM — pricing then yielding round-trips', () => {
        const target = 14;
        const price = computePriceFromYtm(sale(), target);
        const result = calculateBond(sale({ purchasePrice: price }));
        expect(result.simpleYtmPercent).toBeCloseTo(target, 1);
    });

    it('reproduces the doc figure (~212.85)', () => {
        expect(computePriceFromYtm(sale(), 14)).toBeCloseTo(212.85, 0);
    });

    it('ytm price mode sets the price so the simple YTM matches the target', () => {
        const result = calculateBond(sale({ priceMode: 'ytm', targetYtmPercent: 14 }));
        expect(result.simpleYtmPercent).toBeCloseTo(14, 1);
        expect(result.priceQuote).toBeCloseTo(computePriceFromYtm(sale(), 14), 2);
    });
});

describe('calculateBond — validation', () => {
    it('rejects a non-positive nominal', () => {
        expect(() => calculateBond(baseBond({ nominal: 0 }))).toThrow(BondValidationError);
    });

    it('rejects a maturity not after settlement', () => {
        expect(() => calculateBond(baseBond({ maturityDate: '2026-01-01' }))).toThrow(BondValidationError);
    });

    it('rejects an indexed bond with a non-positive index', () => {
        expect(() => calculateBond(baseBond({ bondType: 'indexed', baseIndex: 0 }))).toThrow(BondValidationError);
    });

    it('rejects coupons dated after maturity', () => {
        expect(() =>
            calculateBond(baseBond({ couponDates: ['2027-06-01'] }))
        ).toThrow(BondValidationError);
    });

    it('rejects coupons dated on or before the start date', () => {
        expect(() =>
            calculateBond(baseBond({ startDate: '2026-03-01', couponDates: ['2026-03-01'] }))
        ).toThrow(BondValidationError);
    });
});
