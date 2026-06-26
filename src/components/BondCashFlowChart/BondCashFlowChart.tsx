import { useTranslation } from 'react-i18next';
import {
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts';
import type { BondCashFlow } from 'rates-calculator/bonds';
import { formatMoney, formatDate } from '@/utils/format';
import styles from '@/components/BondCashFlowChart/BondCashFlowChart.module.css';

interface Props {
    cashFlows: BondCashFlow[];
    /** Use the index-currency equivalent of each cash flow when true. */
    indexed: boolean;
}

export function BondCashFlowChart({ cashFlows, indexed }: Props) {
    const { t, i18n } = useTranslation();
    const lng = i18n.language;

    const data = cashFlows.map((cf) => ({
        label: formatDate(cf.date, lng),
        value: indexed ? cf.totalEquivalent : cf.total
    }));

    return (
        <div className={styles.wrapper}>
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#94a3b8' }} minTickGap={16} />
                    <YAxis
                        tick={{ fontSize: 12, fill: '#94a3b8' }}
                        width={80}
                        tickFormatter={(v: number) => formatMoney(v, lng)}
                    />
                    <Tooltip
                        formatter={(v: number) => formatMoney(v, lng)}
                        labelStyle={{ color: '#0f172a' }}
                        cursor={{ fill: 'rgba(56, 189, 248, 0.1)' }}
                    />
                    <Bar
                        dataKey="value"
                        name={t('bonds.table.total')}
                        fill="#38bdf8"
                        radius={[3, 3, 0, 0]}
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
