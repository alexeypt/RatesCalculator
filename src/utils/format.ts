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

export function formatMoney(value: number, lng: string): string {
    return new Intl.NumberFormat(resolveLocale(lng), {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
}

export function formatPercent(fraction: number, lng: string): string {
    return new Intl.NumberFormat(resolveLocale(lng), {
        style: 'percent',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(fraction);
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
