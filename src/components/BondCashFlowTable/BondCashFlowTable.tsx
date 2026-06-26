import { useTranslation } from 'react-i18next';
import type { BondCashFlow } from 'rates-calculator/bonds';
import { formatNumber, formatDate } from '@/utils/format';
import styles from '@/components/MonthlyTable/MonthlyTable.module.css';

interface Props {
    cashFlows: BondCashFlow[];
    /** When true, show the index-currency equivalent of each row's total. */
    indexed: boolean;
}

export function BondCashFlowTable({ cashFlows, indexed }: Props) {
    const { t, i18n } = useTranslation();
    const lng = i18n.language;
    // Indexed coupons carry 4 decimals (small index-equivalent values); regular bonds use 2.
    const decimals = indexed ? 4 : 2;

    return (
        <div className={styles.wrapper}>
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th>{t('bonds.table.date')}</th>
                        <th className={styles.num}>{t('bonds.table.days')}</th>
                        <th className={styles.num}>{t('bonds.table.coupon')}</th>
                        <th className={styles.num}>{t('bonds.table.principal')}</th>
                        <th className={styles.num}>{t('bonds.table.total')}</th>
                        {indexed && <th className={styles.num}>{t('bonds.table.equivalent')}</th>}
                    </tr>
                </thead>
                <tbody>
                    {cashFlows.map((cf) => (
                        <tr key={cf.date}>
                            <td>{formatDate(cf.date, lng)}</td>
                            <td className={styles.num}>{cf.daysFromSettlement}</td>
                            <td className={styles.num}>{formatNumber(cf.coupon, lng, decimals)}</td>
                            <td className={styles.num}>{formatNumber(cf.principal, lng, decimals)}</td>
                            <td className={styles.num}>{formatNumber(cf.total, lng, decimals)}</td>
                            {indexed && <td className={styles.num}>{formatNumber(cf.totalEquivalent, lng, decimals)}</td>}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
