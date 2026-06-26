import { parseISODate } from 'rates-calculator';
import type { DetailPeriod } from 'rates-calculator/deposits';

const localeMap: Record<string, string> = {
    en: 'en-US',
    ru: 'ru-RU'
};

export function resolveLocale(lng: string): string {
    const base = lng.split('-')[0];
    return localeMap[base] ?? 'en-US';
}

/**
 * Collapse values that round to zero at the given decimal precision to a clean 0, so a tiny
 * negative (e.g. an IRR solver returning -2e-13) does not render as "-0.00".
 */
function snapZero(value: number, digits: number): number {
    return Math.abs(value) < 0.5 * Math.pow(10, -digits) ? 0 : value;
}

export function formatMoney(value: number, lng: string): string {
    return new Intl.NumberFormat(resolveLocale(lng), {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(snapZero(value, 2));
}

export function formatPercent(fraction: number, lng: string): string {
    return new Intl.NumberFormat(resolveLocale(lng), {
        style: 'percent',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    // The percent style shows 2 decimals of value·100, i.e. 4 decimals of the fraction.
    }).format(snapZero(fraction, 4));
}

/** Format a plain number with a fixed number of decimals (default 2). */
export function formatNumber(value: number, lng: string, digits = 2): string {
    return new Intl.NumberFormat(resolveLocale(lng), {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits
    }).format(snapZero(value, digits));
}

/** Format a percent value that is already expressed in percent (e.g. 15.2 → "15.20%"). */
export function formatPercentValue(value: number, lng: string): string {
    return `${formatNumber(value, lng)}%`;
}

/** Format an ISO yyyy-MM month string into a localized "Month YYYY" label. */
export function formatMonth(isoMonth: string, lng: string): string {
    const [y, m] = isoMonth.split('-').map(Number);
    const date = new Date(y, m - 1, 1);
    return new Intl.DateTimeFormat(resolveLocale(lng), {
        month: 'short',
        year: 'numeric'
    }).format(date);
}

/** Format an ISO yyyy-MM-dd date string into a localized date. */
export function formatDate(isoDate: string, lng: string): string {
    return new Intl.DateTimeFormat(resolveLocale(lng), {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }).format(parseISODate(isoDate));
}

/** Format the start day of a period into a localized label appropriate for the granularity. */
export function formatPeriodLabel(periodStart: string, period: DetailPeriod, lng: string): string {
    const [year, month] = periodStart.split('-').map(Number);
    switch (period) {
        case 'changes':
        case 'daily':
            return formatDate(periodStart, lng);
        case 'monthly':
            return formatMonth(`${year}-${String(month).padStart(2, '0')}`, lng);
        case 'quarterly':
            return `Q${Math.floor((month - 1) / 3) + 1} ${year}`;
        case 'annual':
            return String(year);
    }
}
