import { useTranslation } from 'react-i18next';
import type { BondResult } from 'rates-calculator/bonds';
import { formatMoney, formatNumber, formatPercentValue, formatDate } from '@/utils/format';
import styles from '@/components/ResultsSummary/ResultsSummary.module.css';

interface Props {
    result: BondResult;
}

export function BondResultsSummary({ result }: Props) {
    const { t, i18n } = useTranslation();
    const lng = i18n.language;

    // For indexed bonds show both the quote-currency value and the index-currency equivalent;
    // for regular bonds the two are identical, so show a single number.
    const money = (quote: number, equivalent: number): string =>
        result.indexed
            ? `${formatMoney(quote, lng)} / ${formatMoney(equivalent, lng)}`
            : formatMoney(equivalent, lng);

    // Mark dual (nominal / equivalent) labels so the format is clear for indexed bonds.
    const dualLabel = (key: string): string =>
        result.indexed ? `${t(key)} ${t('bonds.results.dualSuffix')}` : t(key);

    const maturity = `${formatDate(result.maturityDate, lng)} (${formatNumber(result.yearsToMaturity, lng)} ${t('bonds.results.years')})`;

    const cards = [
        { label: t('bonds.results.effectiveYtm'), value: formatPercentValue(result.effectiveYtmPercent, lng), accent: true },
        { label: t('bonds.results.simpleYtm'), value: formatPercentValue(result.simpleYtmPercent, lng) },
        { label: t('bonds.results.currentYield'), value: formatPercentValue(result.currentYieldPercent, lng) },
        { label: t('bonds.results.duration'), value: formatNumber(result.macaulayDurationYears, lng) },
        { label: dualLabel('bonds.results.couponSum'), value: money(result.couponSumQuote, result.couponSum) },
        { label: dualLabel('bonds.results.priceGain'), value: money(result.priceGainQuote, result.priceGain) },
        { label: dualLabel('bonds.results.totalIncome'), value: money(result.totalIncomeQuote, result.totalIncome) },
        {
            label: dualLabel('bonds.results.cashFlowTotal'),
            value: money(
                result.couponSumQuote + result.nominalQuote,
                result.couponSum + result.effectiveNominal
            )
        },
        { label: dualLabel('bonds.results.effectivePrice'), value: money(result.priceQuote, result.effectivePrice) },
        { label: dualLabel('bonds.results.effectiveNominal'), value: money(result.nominalQuote, result.effectiveNominal) },
        { label: t('bonds.results.maturityDate'), value: maturity }
    ];

    return (
        <div className={styles.grid}>
            {cards.map((c) => (
                <div className={`${styles.card}${c.accent ? ` ${styles.accent}` : ''}`} key={c.label}>
                    <span className={styles.label}>{c.label}</span>
                    <span className={styles.value}>{c.value}</span>
                </div>
            ))}
        </div>
    );
}
