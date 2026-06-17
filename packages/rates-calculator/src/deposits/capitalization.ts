import { addMonths } from 'date-fns';
import type { CapitalizationFrequency } from './types';

/** Whole number of days from `a` to `b`. */
function diffInDays(a: Date, b: Date): number {
    return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

/** Whole number of calendar months between `start` and `date`. */
function monthsBetween(start: Date, date: Date): number {
    return (date.getFullYear() - start.getFullYear()) * 12 + (date.getMonth() - start.getMonth());
}

/**
 * Whether `date` falls on the start-anchored monthly cadence for the given interval.
 * Anchored to the deposit's start day-of-month: opening on the 10th compounds on the
 * 10th of each subsequent qualifying month. When a month is shorter than the start day
 * (e.g. the 31st in February), the boundary falls on that month's last day.
 */
function isMonthlyAnchor(date: Date, start: Date, intervalMonths: number): boolean {
    const months = monthsBetween(start, date);
    if (months <= 0 || months % intervalMonths !== 0) return false;
    const anchor = addMonths(start, months);
    return date.getDate() === anchor.getDate();
}

/** The most recent start-anchored monthly anchor on or before `date`. */
function monthlyAnchorOnOrBefore(date: Date, start: Date): Date {
    const months = monthsBetween(start, date);
    let anchor = addMonths(start, months);
    if (anchor.getTime() > date.getTime()) {
        anchor = addMonths(start, months - 1);
    }
    return anchor;
}

/**
 * Determine whether a given day is a capitalization boundary for the chosen frequency.
 * The boundary is the day on which accrued interest is compounded. All cadences are
 * anchored to the deposit's start date (e.g. opening on 10 April compounds on 10 May,
 * 10 June, ...), not to fixed calendar dates.
 *
 * @param date The day being evaluated.
 * @param startDate The deposit start date used as the cadence anchor.
 */
export function isCapitalizationBoundary(
    date: Date,
    startDate: Date,
    frequency: CapitalizationFrequency
): boolean {
    switch (frequency) {
        case 'none':
            return false;
        case 'daily':
            return true;
        case 'weekly': {
            const diffDays = diffInDays(startDate, date);
            return diffDays > 0 && diffDays % 7 === 0;
        }
        case 'twiceMonthly': {
            // Compound on the start anchor day and ~15 days after each monthly anchor.
            if (isMonthlyAnchor(date, startDate, 1)) return true;
            return diffInDays(monthlyAnchorOnOrBefore(date, startDate), date) === 15;
        }
        case 'thriceMonthly': {
            // Compound on the start anchor day and ~10 and ~20 days after each monthly anchor.
            if (isMonthlyAnchor(date, startDate, 1)) return true;
            const offset = diffInDays(monthlyAnchorOnOrBefore(date, startDate), date);
            return offset === 10 || offset === 20;
        }
        case 'monthly':
            return isMonthlyAnchor(date, startDate, 1);
        case 'quarterly':
            return isMonthlyAnchor(date, startDate, 3);
        case 'semiAnnual':
            return isMonthlyAnchor(date, startDate, 6);
        case 'annual':
            return isMonthlyAnchor(date, startDate, 12);
    }
}
