import { addDays, addMonths, addYears } from 'date-fns';
import type { CapitalizationFrequency, Term } from '@/types/deposit';

/** Parse an ISO yyyy-MM-dd date string into a local Date at midnight. */
export function parseISODate(iso: string): Date {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
}

/** Format a Date into an ISO yyyy-MM-dd string (local). */
export function toISODate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/** Format a Date into an ISO yyyy-MM month string (local). */
export function toISOMonth(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
}

export function isLeapYear(year: number): boolean {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** Number of days in the calendar year of the given date (365 or 366). */
export function daysInYear(date: Date): number {
    return isLeapYear(date.getFullYear()) ? 366 : 365;
}

/** Compute the end date (exclusive of accrual beyond it) given a start date and term. */
export function addTerm(start: Date, term: Term): Date {
    switch (term.unit) {
        case 'days':
            return addDays(start, term.value);
        case 'months':
            return addMonths(start, term.value);
        case 'years':
            return addYears(start, term.value);
    }
}

/**
 * Round a monetary value to 2 decimals using standard half-up rounding
 * (3rd decimal 0-4 keeps the cent, 5-9 rounds up).
 */
export function roundMoney(value: number): number {
    // Add a tiny epsilon to counter binary floating-point representation errors
    // (e.g. 1.005 stored as 1.00499999...) so half-up behaves as expected.
    const sign = value < 0 ? -1 : 1;
    const scaled = Math.abs(value) * 100;
    return (sign * Math.round(scaled + 1e-9)) / 100;
}

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

export function isLastDayOfMonth(date: Date): boolean {
    const next = addDays(date, 1);
    return next.getMonth() !== date.getMonth();
}
