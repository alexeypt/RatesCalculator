import { useTranslation } from 'react-i18next';
import type { DepositResult } from '@/types/deposit';
import { formatMoney, formatPercent, formatDate } from '@/utils/format';
import styles from '@/components/ResultsSummary/ResultsSummary.module.css';

interface Props {
    result: DepositResult;
}

export function ResultsSummary({ result }: Props) {
    const { t, i18n } = useTranslation();
    const lng = i18n.language;

    const cards = [
        { label: t('results.finalBalance'), value: formatMoney(result.finalBalance, lng), accent: true },
        { label: t('results.totalIncome'), value: formatMoney(result.totalIncome, lng) },
        { label: t('results.totalContributions'), value: formatMoney(result.totalContributions, lng) },
        ...(result.totalWithdrawals > 0
            ? [{ label: t('results.totalWithdrawals'), value: formatMoney(result.totalWithdrawals, lng) }]
            : []),
        { label: t('results.totalGrossInterest'), value: formatMoney(result.totalGrossInterest, lng) },
        { label: t('results.totalTax'), value: formatMoney(result.totalTax, lng) },
        { label: t('results.effectiveRate'), value: formatPercent(result.effectiveAnnualRate, lng) },
        { label: t('results.totalRate'), value: formatPercent(result.totalRate, lng) },
        { label: t('results.totalAnnualRate'), value: formatPercent(result.totalAnnualRate, lng) },
        { label: t('results.endDate'), value: formatDate(result.endDate, lng) }
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
