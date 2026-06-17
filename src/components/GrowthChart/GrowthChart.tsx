import { useTranslation } from 'react-i18next';
import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts';
import type { DetailPeriod, PeriodDetail } from 'rates-calculator/deposits';
import { formatMoney, formatPeriodLabel } from '@/utils/format';
import styles from '@/components/GrowthChart/GrowthChart.module.css';

interface Props {
    details: PeriodDetail[];
    period: DetailPeriod;
}

export function GrowthChart({ details, period }: Props) {
    const { t, i18n } = useTranslation();
    const lng = i18n.language;

    const data = details.map((d) => ({
        label: formatPeriodLabel(d.periodStart, period, lng),
        balance: d.closingBalance
    }));

    return (
        <div className={styles.wrapper}>
            <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                    <defs>
                        <linearGradient id="balanceFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.7} />
                            <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.05} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#94a3b8' }} minTickGap={24} />
                    <YAxis
                        tick={{ fontSize: 12, fill: '#94a3b8' }}
                        width={80}
                        tickFormatter={(v: number) => formatMoney(v, lng)}
                    />
                    <Tooltip
                        formatter={(v: number) => formatMoney(v, lng)}
                        labelStyle={{ color: '#0f172a' }}
                    />
                    <Area
                        type="monotone"
                        dataKey="balance"
                        name={t('results.table.closingBalance')}
                        stroke="#0ea5e9"
                        strokeWidth={2}
                        fill="url(#balanceFill)"
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
