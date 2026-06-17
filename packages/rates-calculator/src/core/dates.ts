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
