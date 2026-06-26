import { addDays, addMonths, addYears } from 'date-fns';
import type { Term } from './types';

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

export function isLastDayOfMonth(date: Date): boolean {
    const next = addDays(date, 1);
    return next.getMonth() !== date.getMonth();
}

/** Whole number of calendar days between two local dates (to - from). */
export function daysBetween(from: Date, to: Date): number {
    return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

/**
 * Actual/actual year fraction over the half-open interval [from, to).
 * Days are split by the calendar year they fall in and divided by that year's length
 * (365 or 366), i.e. exactly the `t365/365 + t366/366` convention used by the Belarusian
 * bond/coupon formulas. Returns 0 when to <= from.
 */
export function yearFractionActualActual(from: Date, to: Date): number {
    if (to.getTime() <= from.getTime()) return 0;
    let fraction = 0;
    let cursor = from;
    while (cursor.getTime() < to.getTime()) {
        // First day of the next calendar year after `cursor`.
        const nextYearStart = new Date(cursor.getFullYear() + 1, 0, 1);
        const segmentEnd = nextYearStart.getTime() < to.getTime() ? nextYearStart : to;
        fraction += daysBetween(cursor, segmentEnd) / (isLeapYear(cursor.getFullYear()) ? 366 : 365);
        cursor = segmentEnd;
    }
    return fraction;
}
