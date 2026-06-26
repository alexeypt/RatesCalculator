/**
 * Bond kinds the calculator supports.
 * - regular: coupons and nominal are settled in the quote currency (e.g. BYN) as-is.
 * - indexed: coupons and nominal are indexed to an external value (e.g. USD/BYN rate);
 *   yields are computed in the index currency using the currency-equivalent method.
 */
export type BondType = 'regular' | 'indexed';

/** Frequency presets for generating a coupon date schedule. */
export type CouponFrequency = 'monthly' | 'quarterly' | 'semiAnnual' | 'annual';

/** A computed coupon: a payment date and its amount in the quote currency (base index = 1). */
export interface CouponPeriod {
    /** Payment date, ISO yyyy-MM-dd. */
    date: string;
    /** Coupon amount per bond in the quote currency at base index, i.e. `N·i/100·(t365/365 + t366/366)`. */
    amount: number;
}

export interface BondInput {
    bondType: BondType;
    /** Nominal (face) value per bond, in the quote currency. */
    nominal: number;
    /** Price paid per bond today, in the quote currency. */
    purchasePrice: number;
    /**
   * Bond interest-accrual start date (placement start), ISO yyyy-MM-dd. Anchors the first
   * coupon period, so a long/short first (stub) coupon is computed correctly.
   */
    startDate: string;
    /** Purchase / settlement date (= calculation date), ISO yyyy-MM-dd. Day-count anchor for yields. */
    settlementDate: string;
    /** Redemption (maturity) date, ISO yyyy-MM-dd. */
    maturityDate: string;
    /** Annual coupon rate in percent, e.g. 7 for 7%. */
    couponRatePercent: number;
    /**
   * Coupon payment dates, ISO yyyy-MM-dd. Each coupon amount is derived from the rate, nominal,
   * and the actual/actual day count of its period (previous coupon date, or startDate for the first).
   */
    couponDates: string[];
    /** Index value at bond start (ER_0), e.g. USD/BYN. Used only when bondType === 'indexed'. */
    baseIndex: number;
    /** Index value now (ER_current), e.g. USD/BYN. Used only when bondType === 'indexed'. */
    currentIndex: number;
}

/**
 * One row of the bond's remaining cash-flow schedule. Quote-currency amounts are the base
 * (index = 1) values; equivalent amounts are in the calculation (index) currency and equal the
 * quote amounts for regular bonds.
 */
export interface BondCashFlow {
    /** Cash-flow date, ISO yyyy-MM-dd. */
    date: string;
    /** Coupon paid on this date, quote currency. */
    coupon: number;
    /** Principal returned on this date, quote currency (nominal at maturity, otherwise 0). */
    principal: number;
    /** coupon + principal, quote currency. */
    total: number;
    /** Coupon in the calculation (index) currency. */
    couponEquivalent: number;
    /** Principal in the calculation (index) currency. */
    principalEquivalent: number;
    /** total in the calculation (index) currency. */
    totalEquivalent: number;
    /** Whole days from the settlement date to this cash flow. */
    daysFromSettlement: number;
}

export interface BondResult {
    /** Whether the bond is currency-indexed (drives the equivalent column in the UI). */
    indexed: boolean;
    settlementDate: string;
    maturityDate: string;
    /** Whole days from settlement to maturity. */
    daysToMaturity: number;
    /** Actual/actual years from settlement to maturity. */
    yearsToMaturity: number;
    /** Sum of remaining coupons (calculation currency). */
    couponSum: number;
    /** Nominal minus price (calculation currency); negative when bought above par. */
    priceGain: number;
    /** couponSum + priceGain (calculation currency). */
    totalIncome: number;
    /** Sum of remaining coupons in the quote currency (equals couponSum for regular bonds). */
    couponSumQuote: number;
    /** Nominal minus price in the quote currency (equals priceGain for regular bonds). */
    priceGainQuote: number;
    /** couponSumQuote + priceGainQuote (equals totalIncome for regular bonds). */
    totalIncomeQuote: number;
    /** Nominal in the quote currency (the face value as entered). */
    nominalQuote: number;
    /** Purchase price in the quote currency (as entered). */
    priceQuote: number;
    /** Simple yield to maturity, percent per annum (doc formula 8). */
    simpleYtmPercent: number;
    /** Effective yield (IRR of the cash flows), percent per annum (doc formula 10). */
    effectiveYtmPercent: number;
    /** Current yield: annual coupon / price, percent per annum. */
    currentYieldPercent: number;
    /** Macaulay duration in years (doc formula 11). */
    macaulayDurationYears: number;
    /** Price in the calculation currency (price / current index for indexed bonds). */
    effectivePrice: number;
    /** Nominal in the calculation currency (nominal / base index for indexed bonds). */
    effectiveNominal: number;
    /** Remaining cash flows (coupons after settlement plus the redemption), calculation currency. */
    cashFlows: BondCashFlow[];
}

export class BondValidationError extends Error {
    constructor(
    /** Stable, translatable error code. */
        public readonly code: string,
        /** Optional interpolation values for the message. */
        public readonly params?: Record<string, string | number>
    ) {
        super(code);
        this.name = 'BondValidationError';
    }
}
