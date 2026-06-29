import { addMonths } from 'date-fns';
import {
    BondValidationError,
    type BondCashFlow,
    type BondInput,
    type BondResult,
    type CouponFrequency,
    type CouponPeriod
} from './types';
import {
    daysBetween,
    parseISODate,
    roundMoney,
    roundTo,
    toISODate,
    yearFractionActualActual
} from '../core';

/**
 * Coupon-amount precision: indexed bonds keep 4 decimals (the index-equivalent values are
 * small, e.g. ~4 USD), regular bonds use the usual 2. Headline metrics always round to 2.
 */
const INDEXED_COUPON_DECIMALS = 4;
const REGULAR_COUPON_DECIMALS = 2;

/** Months added per step for each coupon frequency. */
const FREQUENCY_MONTHS: Record<CouponFrequency, number> = {
    monthly: 1,
    quarterly: 3,
    semiAnnual: 6,
    annual: 12
};

export interface GenerateCouponDatesParams {
    /** Date of the first coupon payment, ISO yyyy-MM-dd. */
    firstCouponDate: string;
    /** Coupon payment frequency. */
    frequency: CouponFrequency;
    /** Redemption date; the last coupon is paid on this date, ISO yyyy-MM-dd. */
    maturityDate: string;
}

/**
 * Build a regular list of coupon payment dates: firstCouponDate, then stepping by the frequency
 * up to (but not past) maturity, with the maturity date itself as the final coupon. Amounts are
 * not produced here — they are derived later from the rate, nominal, and the bond start date.
 */
export function generateCouponDates(params: GenerateCouponDatesParams): string[] {
    const { frequency } = params;
    const step = FREQUENCY_MONTHS[frequency];
    const first = parseISODate(params.firstCouponDate);
    const maturity = parseISODate(params.maturityDate);

    if (first.getTime() > maturity.getTime()) {
        throw new BondValidationError('error.bond.couponAfterMaturity', { date: params.firstCouponDate });
    }

    const dates: string[] = [];
    for (let i = 0; ; i++) {
        const d = addMonths(first, i * step);
        if (d.getTime() >= maturity.getTime()) break;
        dates.push(toISODate(d));
    }
    dates.push(toISODate(maturity));
    return dates;
}

export interface ComputeCouponAmountsParams {
    nominal: number;
    couponRatePercent: number;
    /** Bond interest-accrual start date, ISO; the first coupon period opens here. */
    startDate: string;
    /** Coupon payment dates, ISO. */
    couponDates: string[];
    /** Decimal places to round each coupon to (default 4). */
    decimals?: number;
}

/**
 * Compute each coupon's amount in the quote currency (base index = 1) from the rate, nominal,
 * and the actual/actual day count of its period. The first period runs from startDate to the
 * first coupon date; subsequent periods run between consecutive coupon dates. Dates are sorted.
 */
export function computeCouponAmounts(params: ComputeCouponAmountsParams): CouponPeriod[] {
    const { nominal, couponRatePercent, startDate } = params;
    const decimals = params.decimals ?? INDEXED_COUPON_DECIMALS;
    const rateFraction = couponRatePercent / 100;
    const sorted = [...params.couponDates].sort();

    const coupons: CouponPeriod[] = [];
    let periodStart = parseISODate(startDate);
    for (const iso of sorted) {
        const date = parseISODate(iso);
        const amount = roundTo(nominal * rateFraction * yearFractionActualActual(periodStart, date), decimals);
        coupons.push({ date: iso, amount });
        periodStart = date;
    }
    return coupons;
}

/**
 * Coupons paid strictly after settlement, in the quote currency. For tokens the first such
 * coupon is prorated from the purchase date (the buyer earns only from then), whereas for bonds
 * the buyer receives the full current-period coupon.
 */
function remainingCoupons(input: BondInput, settlement: Date, couponDecimals: number): { date: Date; amount: number }[] {
    const all = computeCouponAmounts({
        nominal: input.nominal,
        couponRatePercent: input.couponRatePercent,
        startDate: input.startDate,
        couponDates: input.couponDates,
        decimals: couponDecimals
    });
    const rem = all
        .map((c) => ({ date: parseISODate(c.date), amount: c.amount }))
        .filter((c) => c.date.getTime() > settlement.getTime());

    if (input.instrument === 'token' && rem.length > 0) {
        const first = rem[0];
        first.amount = roundTo(
            input.nominal * (input.couponRatePercent / 100) * yearFractionActualActual(settlement, first.date),
            couponDecimals
        );
    }
    return rem;
}

/**
 * Price (quote currency) for a target simple YTM — the inverse of the simple-YTM formula
 * (doc formula 9): `P = (N + ΣC) / (1 + Y/100 · years)`, evaluated in the calculation currency
 * and converted back at the price divisor. Rounded to a clean money amount.
 */
function priceFromYtm(
    effectiveNominal: number,
    couponSumEquiv: number,
    years: number,
    ytmPercent: number,
    priceDiv: number
): number {
    const denom = 1 + (ytmPercent / 100) * years;
    const effectivePrice = denom !== 0 ? (effectiveNominal + couponSumEquiv) / denom : 0;
    return roundMoney(effectivePrice * priceDiv);
}

/**
 * Compute the purchase price (quote currency) at which the bond yields the given simple YTM
 * to maturity (doc formula 9). Coupons are derived the same way as {@link calculateBond}.
 */
export function computePriceFromYtm(input: BondInput, ytmPercent: number): number {
    const indexed = input.bondType === 'indexed';
    const flowDiv = indexed ? input.baseIndex : 1;
    const priceDiv = indexed ? input.currentIndex : 1;
    const settlement = parseISODate(input.settlementDate);
    const maturity = parseISODate(input.maturityDate);
    const couponDecimals = indexed ? INDEXED_COUPON_DECIMALS : REGULAR_COUPON_DECIMALS;

    let couponSumEquiv = 0;
    for (const c of remainingCoupons(input, settlement, couponDecimals)) couponSumEquiv += c.amount / flowDiv;
    const years = yearFractionActualActual(settlement, maturity);
    return priceFromYtm(input.nominal / flowDiv, couponSumEquiv, years, ytmPercent, priceDiv);
}

/** A discounting cash flow: an amount at a time expressed in years from settlement. */
interface TimedFlow {
    /** Years from settlement (Actual/365). */
    years: number;
    amount: number;
}

export function calculateBond(input: BondInput): BondResult {
    validate(input);

    const settlement = parseISODate(input.settlementDate);
    const maturity = parseISODate(input.maturityDate);

    const indexed = input.bondType === 'indexed';
    // Currency-equivalent conversion: coupons & nominal scale with the base index, the price
    // is paid today at the current index. For regular bonds both divisors are 1.
    const flowDiv = indexed ? input.baseIndex : 1;
    const priceDiv = indexed ? input.currentIndex : 1;

    const effectiveNominal = input.nominal / flowDiv;
    const couponDecimals = indexed ? INDEXED_COUPON_DECIMALS : REGULAR_COUPON_DECIMALS;

    // Coupons paid after settlement (tokens prorate the first one from the purchase date).
    const remaining = remainingCoupons(input, settlement, couponDecimals);

    const yearsToMaturity = yearFractionActualActual(settlement, maturity);
    const daysToMaturity = daysBetween(settlement, maturity);

    // Build the cash-flow schedule (coupons after settlement plus the redemption of nominal).
    const flowMap = new Map<string, { coupon: number; principal: number }>();
    for (const c of remaining) {
        const iso = toISODate(c.date);
        const entry = flowMap.get(iso) ?? { coupon: 0, principal: 0 };
        entry.coupon += c.amount;
        flowMap.set(iso, entry);
    }
    const maturityIso = toISODate(maturity);
    const maturityEntry = flowMap.get(maturityIso) ?? { coupon: 0, principal: 0 };
    maturityEntry.principal += input.nominal;
    flowMap.set(maturityIso, maturityEntry);

    const cashFlows: BondCashFlow[] = [...flowMap.entries()]
        .map(([iso, { coupon, principal }]) => {
            const date = parseISODate(iso);
            const total = coupon + principal;
            return {
                date: iso,
                coupon: roundTo(coupon, couponDecimals),
                principal: roundTo(principal, couponDecimals),
                total: roundTo(total, couponDecimals),
                couponEquivalent: roundTo(coupon / flowDiv, couponDecimals),
                principalEquivalent: roundTo(principal / flowDiv, couponDecimals),
                totalEquivalent: roundTo(total / flowDiv, couponDecimals),
                daysFromSettlement: daysBetween(settlement, date)
            };
        })
        .sort((a, b) => a.daysFromSettlement - b.daysFromSettlement);

    let couponSum = 0;
    let couponSumQuote = 0;
    for (const c of remaining) {
        couponSum += c.amount / flowDiv;
        couponSumQuote += c.amount;
    }

    // The purchase price is either entered directly or derived from a target YTM (doc formula 9:
    // the algebraic inverse of the simple-YTM formula). The derived price is rounded to a clean
    // money amount, and effectivePrice is taken from that so downstream metrics use the real price.
    const purchasePrice
        = input.priceMode === 'ytm'
            ? priceFromYtm(effectiveNominal, couponSum, yearsToMaturity, input.targetYtmPercent, priceDiv)
            : input.purchasePrice;
    const effectivePrice = purchasePrice / priceDiv;

    // Income tax applies to coupons only (not the redemption of principal). Purchase costs are
    // entered for the whole lot, so spread them across the bonds; the per-bond share is paid
    // today in the quote currency and converts at the same divisor as the price, adding to the
    // amount invested (doc formula 2: net income / (investment + entry costs)).
    const netFactor = 1 - input.couponTaxPercent / 100;
    const perBondCosts = input.quantity > 0 ? input.purchaseCosts / input.quantity : 0;
    const effectiveCosts = perBondCosts / priceDiv;
    const invested = effectivePrice + effectiveCosts;
    const couponSumNet = couponSum * netFactor;

    const priceGain = effectiveNominal - effectivePrice;
    // Net income = after-tax coupons + capital gain − entry costs.
    const totalIncome = couponSumNet + priceGain - effectiveCosts;

    // Quote-currency totals (equal to the equivalents for regular bonds). Price gain in the
    // quote currency is the conservative base case (no indexation gain on the principal).
    const priceGainQuote = input.nominal - purchasePrice;
    const totalIncomeQuote = couponSumQuote * netFactor + priceGainQuote - perBondCosts;

    // Simple yield to maturity (doc formula 8 / 2): net income over the amount invested.
    const simpleYtmPercent
        = yearsToMaturity > 0 && invested > 0
            ? ((effectiveNominal + couponSumNet - invested) / invested / yearsToMaturity) * 100
            : 0;

    // Effective yield (IRR of the after-tax cash flows in the calculation currency), Actual/365
    // to match Excel ЧИСТВНДОХ. Coupons are taxed; the principal redemption is not.
    const timedFlows: TimedFlow[] = cashFlows.map((cf) => ({
        years: cf.daysFromSettlement / 365,
        amount: cf.couponEquivalent * netFactor + cf.principalEquivalent
    }));
    const effectiveYtm = computeIRR(invested, timedFlows);
    const effectiveYtmPercent = effectiveYtm * 100;

    // Current yield: one year of after-tax coupon over the amount invested.
    const annualCoupon = effectiveNominal * (input.couponRatePercent / 100) * netFactor;
    const currentYieldPercent = invested > 0 ? (annualCoupon / invested) * 100 : 0;

    // Macaulay duration (years): present-value-weighted average time to each cash flow.
    const macaulayDurationYears = computeMacaulayDuration(effectiveYtm, timedFlows);

    return {
        indexed,
        settlementDate: input.settlementDate,
        maturityDate: input.maturityDate,
        daysToMaturity,
        yearsToMaturity,
        couponSum: roundMoney(couponSum),
        priceGain: roundMoney(priceGain),
        totalIncome: roundMoney(totalIncome),
        couponSumQuote: roundMoney(couponSumQuote),
        priceGainQuote: roundMoney(priceGainQuote),
        totalIncomeQuote: roundMoney(totalIncomeQuote),
        nominalQuote: roundMoney(input.nominal),
        priceQuote: roundMoney(purchasePrice),
        simpleYtmPercent,
        effectiveYtmPercent,
        currentYieldPercent,
        macaulayDurationYears,
        effectivePrice: roundMoney(effectivePrice),
        effectiveNominal: roundMoney(effectiveNominal),
        cashFlows
    };
}

/**
 * Internal rate of return for a bond: the annual rate r at which the discounted cash flows
 * equal the price. NPV is monotonically decreasing in r for a standard bond (one outflow now,
 * inflows later), so bisection is robust.
 */
function computeIRR(price: number, flows: TimedFlow[]): number {
    const npv = (rate: number): number => {
        let sum = -price;
        for (const f of flows) sum += f.amount / Math.pow(1 + rate, f.years);
        return sum;
    };

    let low = -0.9999;
    let high = 1;
    let guard = 0;
    while (npv(high) > 0 && guard < 200) {
        high *= 2;
        guard++;
    }
    if (npv(high) > 0) return high;

    for (let i = 0; i < 200; i++) {
        const mid = (low + high) / 2;
        if (npv(mid) > 0) low = mid;
        else high = mid;
        if (high - low < 1e-12) break;
    }
    return (low + high) / 2;
}

/** Macaulay duration in years: Σ(t·PV) / Σ(PV), discounting each flow at the given annual yield. */
function computeMacaulayDuration(yieldRate: number, flows: TimedFlow[]): number {
    let weightedSum = 0;
    let pvSum = 0;
    for (const f of flows) {
        const pv = f.amount / Math.pow(1 + yieldRate, f.years);
        weightedSum += f.years * pv;
        pvSum += pv;
    }
    return pvSum > 0 ? weightedSum / pvSum : 0;
}

function validate(input: BondInput): void {
    if (!(input.nominal > 0)) {
        throw new BondValidationError('error.bond.nominalPositive');
    }
    if (input.priceMode === 'price' && !(input.purchasePrice > 0)) {
        throw new BondValidationError('error.bond.pricePositive');
    }
    if (input.couponRatePercent < 0) {
        throw new BondValidationError('error.bond.ratePositive');
    }
    if (input.couponTaxPercent < 0 || input.couponTaxPercent > 100) {
        throw new BondValidationError('error.bond.taxRange');
    }
    if (input.purchaseCosts < 0) {
        throw new BondValidationError('error.bond.costsPositive');
    }
    if (!(input.quantity > 0)) {
        throw new BondValidationError('error.bond.quantityPositive');
    }

    const start = parseISODate(input.startDate);
    const settlement = parseISODate(input.settlementDate);
    const maturity = parseISODate(input.maturityDate);

    if (maturity.getTime() <= settlement.getTime()) {
        throw new BondValidationError('error.bond.maturityAfterSettlement');
    }
    if (start.getTime() >= maturity.getTime()) {
        throw new BondValidationError('error.bond.startBeforeMaturity');
    }

    if (input.bondType === 'indexed') {
        if (!(input.baseIndex > 0) || !(input.currentIndex > 0)) {
            throw new BondValidationError('error.bond.indexPositive');
        }
    }

    for (const iso of input.couponDates) {
        const d = parseISODate(iso);
        if (d.getTime() <= start.getTime()) {
            throw new BondValidationError('error.bond.couponBeforeStart', { date: iso });
        }
        if (d.getTime() > maturity.getTime()) {
            throw new BondValidationError('error.bond.couponAfterMaturity', { date: iso });
        }
    }
}
