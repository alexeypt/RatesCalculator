import { useTranslation } from 'react-i18next';
import type { DetailPeriod, PeriodDetail } from 'rates-calculator/deposits';
import { formatMoney, formatPeriodLabel } from '@/utils/format';
import styles from '@/components/MonthlyTable/MonthlyTable.module.css';

interface Props {
    details: PeriodDetail[];
    period: DetailPeriod;
}

export function MonthlyTable({ details, period }: Props) {
    const { t, i18n } = useTranslation();
    const lng = i18n.language;

    return (
        <div className={styles.wrapper}>
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th>{t('results.table.period')}</th>
                        <th>{t('results.table.openingBalance')}</th>
                        <th>{t('results.table.added')}</th>
                        <th>{t('results.table.withdrawn')}</th>
                        <th>{t('results.table.interestAccrued')}</th>
                        <th>{t('results.table.taxPaid')}</th>
                        <th>{t('results.table.capitalized')}</th>
                        <th>{t('results.table.closingBalance')}</th>
                    </tr>
                </thead>
                <tbody>
                    {details.map((d) => (
                        <tr key={d.periodStart}>
                            <td>{formatPeriodLabel(d.periodStart, period, lng)}</td>
                            <td className={styles.num}>{formatMoney(d.openingBalance, lng)}</td>
                            <td className={styles.num}>{formatMoney(d.added, lng)}</td>
                            <td className={styles.num}>{formatMoney(d.withdrawn, lng)}</td>
                            <td className={styles.num}>{formatMoney(d.interestAccrued, lng)}</td>
                            <td className={styles.num}>{formatMoney(d.taxPaid, lng)}</td>
                            <td className={styles.num}>{formatMoney(d.capitalized, lng)}</td>
                            <td className={styles.num}>{formatMoney(d.closingBalance, lng)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
