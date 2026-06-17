import type { DetailPeriod, PeriodDetail } from 'rates-calculator/deposits';

/** Build a CSV string of the period-by-period details and trigger a download. */
export function exportResultToCsv(
    details: PeriodDetail[],
    period: DetailPeriod,
    headers: {
        period: string;
        openingBalance: string;
        added: string;
        withdrawn: string;
        interestAccrued: string;
        taxPaid: string;
        capitalized: string;
        closingBalance: string;
    },
    filename = 'deposit-details.csv'
): void {
    const periodCell = (d: PeriodDetail): string => {
        switch (period) {
            case 'changes':
            case 'daily':
                return d.periodStart;
            case 'monthly':
                return d.periodStart.slice(0, 7);
            case 'quarterly': {
                const [year, month] = d.periodStart.split('-').map(Number);
                return `${year}-Q${Math.floor((month - 1) / 3) + 1}`;
            }
            case 'annual':
                return d.periodStart.slice(0, 4);
        }
    };

    const rows = [
        [
            headers.period,
            headers.openingBalance,
            headers.added,
            headers.withdrawn,
            headers.interestAccrued,
            headers.taxPaid,
            headers.capitalized,
            headers.closingBalance
        ],
        ...details.map((d) => [
            periodCell(d),
            d.openingBalance.toFixed(2),
            d.added.toFixed(2),
            d.withdrawn.toFixed(2),
            d.interestAccrued.toFixed(2),
            d.taxPaid.toFixed(2),
            d.capitalized.toFixed(2),
            d.closingBalance.toFixed(2)
        ])
    ];

    const csv = rows.map((r) => r.map(escapeCsvCell).join(',')).join('\r\n');
    // Prepend BOM so Excel reads UTF-8 correctly.
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function escapeCsvCell(value: string): string {
    if (/[",\r\n]/.test(value)) {
        return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
}
