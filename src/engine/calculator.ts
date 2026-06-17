import { addDays, addMonths, addYears } from 'date-fns';
import {
    DepositValidationError,
    type DepositInput,
    type DepositResult,
    type DetailPeriod,
    type PeriodDetail
} from '@/types/deposit';
import {
    addTerm,
    daysInYear,
    isCapitalizationBoundary,
    parseISODate,
    roundMoney,
    toISODate
} from '@/engine/dateUtils';

/**
 * Validate that a float rate schedule fully covers every accrual day in
 * [start, lastDay] with no gaps and no overlaps. Throws DepositValidationError otherwise.
 */
export function validateFloatSchedule(
    schedule: DepositInput['floatSchedule'],
    start: Date,
    lastDay: Date
): void {
    if (schedule.length === 0) {
        throw new DepositValidationError('error.floatEmpty');
    }

    const segments = schedule
        .map((s) => ({ from: parseISODate(s.from), to: parseISODate(s.to), rate: s.rate }))
        .sort((a, b) => a.from.getTime() - b.from.getTime());

    for (const seg of segments) {
        if (seg.from.getTime() > seg.to.getTime()) {
            throw new DepositValidationError('error.floatRange', {
                from: toISODate(seg.from),
                to: toISODate(seg.to)
            });
        }
    }

    // Overlap check.
    for (let i = 1; i < segments.length; i++) {
        if (segments[i].from.getTime() <= segments[i - 1].to.getTime()) {
            throw new DepositValidationError('error.floatOverlap', {
                date: toISODate(segments[i].from)
            });
        }
    }

    // Coverage check.
    if (segments[0].from.getTime() > start.getTime()) {
        throw new DepositValidationError('error.floatGap', { date: toISODate(start) });
    }
    let cursor = segments[0].to;
    for (let i = 1; i < segments.length; i++) {
        const expected = addDays(cursor, 1);
        if (segments[i].from.getTime() > expected.getTime()) {
            throw new DepositValidationError('error.floatGap', { date: toISODate(expected) });
        }
        cursor = segments[i].to;
    }
    if (cursor.getTime() < lastDay.getTime()) {
        throw new DepositValidationError('error.floatGap', {
            date: toISODate(addDays(cursor, 1))
        });
    }
}

/** A single contribution scheduled on a given day, tagged with the tax rate that applies to its income. */
interface ScheduledContribution {
    amount: number;
    /** Income tax rate as a fraction (e.g. 0.13) applied to this contribution's interest. */
    taxRate: number;
}

/**
 * Build a map from ISO date string to the contributions applied on that day.
 * Recurring additions start one interval after the start date and repeat while strictly
 * before the end date, taxed at the deposit's main rate. One-time additions are applied on
 * their own date when it falls within the accrual window [start, end); each may carry its own
 * tax rate, otherwise the main rate is used.
 */
export function buildAdditionSchedule(
    input: DepositInput,
    start: Date,
    end: Date,
    mainTaxRate: number
): Map<string, ScheduledContribution[]> {
    const map = new Map<string, ScheduledContribution[]>();
    const add = (iso: string, amount: number, taxRate: number) => {
        if (amount <= 0) return;
        const rounded = roundMoney(amount);
        const list = map.get(iso) ?? [];
        list.push({ amount: rounded, taxRate });
        map.set(iso, list);
    };

    if (input.additionType === 'recurring') {
        const { amount, frequency } = input.recurringAddition;
        if (amount > 0) {
            const step = (i: number): Date => {
                switch (frequency) {
                    case 'monthly':
                        return addMonths(start, i);
                    case 'quarterly':
                        return addMonths(start, i * 3);
                    case 'annual':
                        return addYears(start, i);
                }
            };
            for (let i = 1; ; i++) {
                const d = step(i);
                if (d.getTime() >= end.getTime()) break;
                add(toISODate(d), amount, mainTaxRate);
            }
        }
    } else if (input.additionType === 'oneTime') {
        for (const item of input.oneTimeAdditions) {
            if (!item.date || !(item.amount > 0)) continue;
            const d = parseISODate(item.date);
            if (d.getTime() < start.getTime() || d.getTime() >= end.getTime()) continue;
            const taxRate
                = typeof item.taxPercent === 'number' ? item.taxPercent / 100 : mainTaxRate;
            add(item.date, item.amount, taxRate);
        }
    }

    return map;
}

/**
 * Build a map from ISO date string to the total amount withdrawn on that day.
 * Recurring withdrawals start one interval after the start date and repeat while strictly
 * before the end date. One-time withdrawals apply on their own date within [start, end).
 */
export function buildWithdrawalSchedule(
    input: DepositInput,
    start: Date,
    end: Date
): Map<string, number> {
    const map = new Map<string, number>();
    const add = (iso: string, amount: number) => {
        if (amount <= 0) return;
        map.set(iso, roundMoney((map.get(iso) ?? 0) + amount));
    };

    if (input.withdrawalType === 'recurring') {
        const { amount, frequency } = input.recurringWithdrawal;
        if (amount > 0) {
            const step = (i: number): Date => {
                switch (frequency) {
                    case 'monthly':
                        return addMonths(start, i);
                    case 'quarterly':
                        return addMonths(start, i * 3);
                    case 'annual':
                        return addYears(start, i);
                }
            };
            for (let i = 1; ; i++) {
                const d = step(i);
                if (d.getTime() >= end.getTime()) break;
                add(toISODate(d), amount);
            }
        }
    } else if (input.withdrawalType === 'oneTime') {
        for (const item of input.oneTimeWithdrawals) {
            if (!item.date || !(item.amount > 0)) continue;
            const d = parseISODate(item.date);
            if (d.getTime() < start.getTime() || d.getTime() >= end.getTime()) continue;
            add(item.date, item.amount);
        }
    }

    return map;
}

function buildRateLookup(input: DepositInput, start: Date, lastDay: Date): (day: Date) => number {
    if (input.rateType === 'fixed') {
        const rate = input.fixedRate;
        return () => rate;
    }

    validateFloatSchedule(input.floatSchedule, start, lastDay);
    const segments = input.floatSchedule
        .map((s) => ({ from: parseISODate(s.from), to: parseISODate(s.to), rate: s.rate }))
        .sort((a, b) => a.from.getTime() - b.from.getTime());

    return (day: Date) => {
        const t = day.getTime();
        const seg = segments.find((s) => s.from.getTime() <= t && t <= s.to.getTime());
        if (!seg) {
            throw new DepositValidationError('error.floatGap', { date: toISODate(day) });
        }
        return seg.rate;
    };
}

/** A pool of principal sharing a single income-tax rate, accruing and compounding independently. */
interface TaxLot {
    balance: number;
    /** Running, unrounded gross interest since the last settlement. */
    accruedGross: number;
    /** Income tax rate as a fraction. */
    taxRate: number;
}

/**
 * Calculate deposit growth using a day-by-day simulation.
 * Interest uses the actual/actual day-count convention (annual rate divided by
 * the number of days in the calendar year, 365 or 366). Money is rounded to the
 * nearest cent (half-up) at every capitalization/payout event.
 *
 * Contributions that carry their own tax rate accrue in separate "tax lots" so their
 * income is taxed independently of the main deposit.
 */
export function calculateDeposit(input: DepositInput): DepositResult {
    validateBasics(input);

    const start = parseISODate(input.startDate);
    const end = addTerm(start, input.term);
    if (end.getTime() <= start.getTime()) {
        throw new DepositValidationError('error.termTooShort');
    }
    const lastDay = addDays(end, -1);

    const rateAt = buildRateLookup(input, start, lastDay);
    const mainTaxRate = input.incomeTaxPercent / 100;
    const additions = buildAdditionSchedule(input, start, end, mainTaxRate);
    const withdrawals = buildWithdrawalSchedule(input, start, end);
    const effectiveFrequency = input.capitalization ? input.capFrequency : 'none';

    // Tax lots keyed by tax rate; the main deposit principal is the first lot.
    const lots = new Map<number, TaxLot>();
    const getLot = (taxRate: number): TaxLot => {
        let lot = lots.get(taxRate);
        if (!lot) {
            lot = { balance: 0, accruedGross: 0, taxRate };
            lots.set(taxRate, lot);
        }
        return lot;
    };

    const sumBalances = (): number => {
        let total = 0;
        for (const lot of lots.values()) total += lot.balance;
        return roundMoney(total);
    };

    // Withdraw up to the requested amount, drawing from lots in order (principal first).
    const withdraw = (requested: number): number => {
        let remaining = roundMoney(requested);
        let actual = 0;
        for (const lot of lots.values()) {
            if (remaining <= 0) break;
            const take = Math.min(lot.balance, remaining);
            if (take > 0) {
                lot.balance = roundMoney(lot.balance - take);
                remaining = roundMoney(remaining - take);
                actual = roundMoney(actual + take);
            }
        }
        return actual;
    };

    let totalGrossInterest = 0;
    let totalTax = 0;
    let totalContributions = roundMoney(input.amount);
    let totalWithdrawals = 0;
    let totalDays = 0;

    const dailyDetails: PeriodDetail[] = [];

    const settle = (gross: number, taxRate: number): { net: number; tax: number; grossRounded: number } => {
        const grossRounded = roundMoney(gross);
        const tax = roundMoney(grossRounded * taxRate);
        const net = roundMoney(grossRounded - tax);
        return { net, tax, grossRounded };
    };

    for (let day = new Date(start); day.getTime() < end.getTime(); day = addDays(day, 1)) {
        const iso = toISODate(day);
        const dayOpening = sumBalances();

        let dayTax = 0;
        let dayCapitalized = 0;

        // Capitalize the previous period's accrued interest at the START of a boundary day,
        // so the boundary day itself opens a fresh accrual period. A deposit opened on May 07
        // with monthly capitalization thus credits interest for May 07–June 06 (31 days) on
        // June 07, rather than including June 07 in the first period.
        if (isCapitalizationBoundary(day, start, effectiveFrequency)) {
            for (const lot of lots.values()) {
                if (lot.accruedGross === 0) continue;
                const { net, tax, grossRounded } = settle(lot.accruedGross, lot.taxRate);
                lot.balance = roundMoney(lot.balance + net);
                totalGrossInterest += grossRounded;
                totalTax += tax;
                dayTax = roundMoney(dayTax + tax);
                dayCapitalized = roundMoney(dayCapitalized + net);
                lot.accruedGross = 0;
            }
        }

        // Apply any contributions at the start of the day so they earn interest from today.
        let dayAdded = 0;
        // Fund the initial principal on the opening day, so the first row opens at a zero
        // balance with the deposit shown as the first inflow in the "Added" column.
        if (day.getTime() === start.getTime()) {
            const lot = getLot(mainTaxRate);
            lot.balance = roundMoney(lot.balance + roundMoney(input.amount));
            dayAdded = roundMoney(dayAdded + roundMoney(input.amount));
        }
        const contributions = additions.get(iso);
        if (contributions) {
            for (const c of contributions) {
                const lot = getLot(c.taxRate);
                lot.balance = roundMoney(lot.balance + c.amount);
                totalContributions = roundMoney(totalContributions + c.amount);
                dayAdded = roundMoney(dayAdded + c.amount);
            }
        }

        // Apply any withdrawals at the start of the day; withdrawn funds stop earning interest.
        let dayWithdrawn = 0;
        const wRequested = withdrawals.get(iso);
        if (wRequested) {
            const actual = withdraw(wRequested);
            totalWithdrawals = roundMoney(totalWithdrawals + actual);
            dayWithdrawn = actual;
        }

        const annualRate = rateAt(day) / 100;
        const inYear = daysInYear(day);
        let dayGross = 0;
        for (const lot of lots.values()) {
            const interest = (lot.balance * annualRate) / inYear;
            lot.accruedGross += interest;
            dayGross += interest;
        }
        totalDays++;

        // Settle any remaining accrued interest on the final day of the term.
        const isLastDay = addDays(day, 1).getTime() >= end.getTime();
        if (isLastDay) {
            for (const lot of lots.values()) {
                if (lot.accruedGross === 0) continue;
                const { net, tax, grossRounded } = settle(lot.accruedGross, lot.taxRate);
                lot.balance = roundMoney(lot.balance + net);
                totalGrossInterest += grossRounded;
                totalTax += tax;
                dayTax = roundMoney(dayTax + tax);
                dayCapitalized = roundMoney(dayCapitalized + net);
                lot.accruedGross = 0;
            }
        }

        dailyDetails.push({
            periodStart: iso,
            periodEnd: iso,
            openingBalance: dayOpening,
            added: dayAdded,
            withdrawn: dayWithdrawn,
            // Raw (unrounded) so coarser aggregation rounds once; aggregateDetails handles display.
            interestAccrued: dayGross,
            taxPaid: dayTax,
            capitalized: dayCapitalized,
            closingBalance: sumBalances()
        });
    }

    const finalBalance = sumBalances();
    const contributionsTotal = roundMoney(totalContributions);
    const withdrawalsTotal = roundMoney(totalWithdrawals);
    // Money the saver ends up with = final balance plus everything already withdrawn.
    const totalReturned = roundMoney(finalBalance + withdrawalsTotal);
    const totalIncome = roundMoney(totalReturned - contributionsTotal);
    const termYears = totalDays / 365;
    const growthFactor = contributionsTotal > 0 ? totalReturned / contributionsTotal : 1;
    const effectiveAnnualRate
        = contributionsTotal > 0 && totalDays > 0 ? Math.pow(growthFactor, 1 / termYears) - 1 : 0;
    const totalRate = growthFactor - 1;
    const totalAnnualRate = termYears > 0 ? totalRate / termYears : 0;

    return {
        finalBalance,
        totalIncome,
        totalTax: roundMoney(totalTax),
        totalGrossInterest: roundMoney(totalGrossInterest),
        totalContributions: contributionsTotal,
        totalWithdrawals: withdrawalsTotal,
        effectiveAnnualRate,
        totalRate,
        totalAnnualRate,
        termYears,
        totalDays,
        endDate: toISODate(end),
        dailyDetails
    };
}

/** Group key for aggregating daily details into coarser periods. */
function periodKey(iso: string, period: DetailPeriod): string {
    const [year, month] = iso.split('-').map(Number);
    switch (period) {
        case 'changes':
        case 'daily':
            return iso;
        case 'monthly':
            return `${year}-${month}`;
        case 'quarterly':
            return `${year}-Q${Math.floor((month - 1) / 3) + 1}`;
        case 'annual':
            return `${year}`;
    }
}

/** Whether a day's balance changed because of a contribution, withdrawal, or capitalization. */
function hasBalanceChange(d: PeriodDetail): boolean {
    return d.added !== 0 || d.withdrawn !== 0 || d.capitalized !== 0;
}

/**
 * Collapse daily details into one row per day on which the balance actually changed
 * (a contribution, withdrawal, or capitalization). Each row spans from just after the
 * previous change up to and including the change day, summing the interest accrued and
 * flows over that span. The opening day (when the initial deposit is funded) and the
 * final day are always emitted so the start and closing balances are shown.
 */
function aggregateChanges(daily: PeriodDetail[]): PeriodDetail[] {
    const groups: PeriodDetail[] = [];
    let current: PeriodDetail | null = null;
    let rawInterest = 0;

    for (let i = 0; i < daily.length; i++) {
        const d = daily[i];
        if (!current) {
            rawInterest = 0;
            current = {
                periodStart: d.periodStart,
                periodEnd: d.periodEnd,
                openingBalance: d.openingBalance,
                added: 0,
                withdrawn: 0,
                interestAccrued: 0,
                taxPaid: 0,
                capitalized: 0,
                closingBalance: d.closingBalance
            };
        }
        current.added = roundMoney(current.added + d.added);
        current.withdrawn = roundMoney(current.withdrawn + d.withdrawn);
        rawInterest += d.interestAccrued;
        current.taxPaid = roundMoney(current.taxPaid + d.taxPaid);
        current.capitalized = roundMoney(current.capitalized + d.capitalized);
        current.closingBalance = d.closingBalance;
        current.periodEnd = d.periodEnd;

        const isFirst = i === 0;
        const isLast = i === daily.length - 1;
        if (hasBalanceChange(d) || isFirst || isLast) {
            // Label the row with the change day itself.
            current.periodStart = d.periodStart;
            current.interestAccrued = roundMoney(rawInterest);
            groups.push(current);
            current = null;
        }
    }

    return groups;
}

/**
 * Aggregate day-by-day details into the requested period granularity.
 * Balances are taken from the period endpoints; flows are summed. Gross interest is
 * summed from the raw daily values and rounded once per output row.
 */
export function aggregateDetails(daily: PeriodDetail[], period: DetailPeriod): PeriodDetail[] {
    if (period === 'changes') {
        return aggregateChanges(daily);
    }

    const groups: PeriodDetail[] = [];
    let current: PeriodDetail | null = null;
    let currentKey = '';
    let rawInterest = 0;

    for (const d of daily) {
        const key = periodKey(d.periodStart, period);
        if (!current || key !== currentKey) {
            if (current) {
                current.interestAccrued = roundMoney(rawInterest);
                groups.push(current);
            }
            currentKey = key;
            rawInterest = 0;
            current = {
                periodStart: d.periodStart,
                periodEnd: d.periodEnd,
                openingBalance: d.openingBalance,
                added: 0,
                withdrawn: 0,
                interestAccrued: 0,
                taxPaid: 0,
                capitalized: 0,
                closingBalance: d.closingBalance
            };
        }
        current.added = roundMoney(current.added + d.added);
        current.withdrawn = roundMoney(current.withdrawn + d.withdrawn);
        rawInterest += d.interestAccrued;
        current.taxPaid = roundMoney(current.taxPaid + d.taxPaid);
        current.capitalized = roundMoney(current.capitalized + d.capitalized);
        current.closingBalance = d.closingBalance;
        current.periodEnd = d.periodEnd;
    }

    if (current) {
        current.interestAccrued = roundMoney(rawInterest);
        groups.push(current);
    }

    return groups;
}

function validateBasics(input: DepositInput): void {
    if (!(input.amount > 0)) {
        throw new DepositValidationError('error.amountPositive');
    }
    if (!(input.term.value > 0)) {
        throw new DepositValidationError('error.termPositive');
    }
    if (input.incomeTaxPercent < 0 || input.incomeTaxPercent > 100) {
        throw new DepositValidationError('error.taxRange');
    }
    if (input.rateType === 'fixed' && input.fixedRate < 0) {
        throw new DepositValidationError('error.ratePositive');
    }
    if (input.additionType === 'oneTime') {
        for (const item of input.oneTimeAdditions) {
            if (
                typeof item.taxPercent === 'number'
                && (item.taxPercent < 0 || item.taxPercent > 100)
            ) {
                throw new DepositValidationError('error.taxRange');
            }
        }
    }
}
