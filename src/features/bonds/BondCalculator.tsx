import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    calculateBond,
    BondValidationError,
    type BondInput,
    type BondResult
} from 'rates-calculator/bonds';
import { BondForm } from '@/components/BondForm/BondForm';
import { BondResultsSummary } from '@/components/BondResultsSummary/BondResultsSummary';
import { BondCashFlowChart } from '@/components/BondCashFlowChart/BondCashFlowChart';
import { BondCashFlowTable } from '@/components/BondCashFlowTable/BondCashFlowTable';
import { SavedBondsManager } from '@/components/SavedBondsManager/SavedBondsManager';
import { downloadBlob } from '@/utils/download';
import styles from '@/App.module.css';

function todayISO(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function addYearsISO(iso: string, years: number): string {
    const [y, m, d] = iso.split('-').map(Number);
    const date = new Date(y + years, m - 1, d);
    const yy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
}

const start = todayISO();

const defaultInput: BondInput = {
    bondType: 'regular',
    nominal: 100,
    priceMode: 'price',
    purchasePrice: 100,
    targetYtmPercent: 8,
    startDate: start,
    settlementDate: start,
    maturityDate: addYearsISO(start, 3),
    couponRatePercent: 7,
    couponTaxPercent: 0,
    quantity: 1,
    purchaseCosts: 0,
    couponDates: [],
    baseIndex: 1,
    currentIndex: 1
};

export function BondCalculator() {
    const { t, i18n } = useTranslation();
    const [input, setInput] = useState<BondInput>(defaultInput);
    const [result, setResult] = useState<BondResult | null>(null);
    const [errorCode, setErrorCode] = useState<string | null>(null);
    const [errorParams, setErrorParams] = useState<Record<string, string | number> | undefined>();
    // Bumped whenever a saved bond is loaded, to collapse the coupon list in the form.
    const [loadSignal, setLoadSignal] = useState(0);

    const handleLoad = (loaded: BondInput) => {
        setInput(loaded);
        setLoadSignal((s) => s + 1);
    };

    const handleCalculate = () => {
        try {
            const res = calculateBond(input);
            setResult(res);
            setErrorCode(null);
            setErrorParams(undefined);
        } catch (err) {
            setResult(null);
            if (err instanceof BondValidationError) {
                setErrorCode(err.code);
                setErrorParams(err.params);
            } else {
                setErrorCode('error.bond.maturityAfterSettlement');
                setErrorParams(undefined);
            }
        }
    };

    const errorMessage = useMemo(
        () => (errorCode ? t(errorCode, errorParams) : null),
        // i18n.language is included on purpose so the message re-translates on language change.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [errorCode, errorParams, t, i18n.language]
    );

    const handleExport = () => {
        if (!result) return;
        const header = [
            t('bonds.table.date'),
            t('bonds.table.days'),
            t('bonds.table.coupon'),
            t('bonds.table.principal'),
            t('bonds.table.total'),
            ...(result.indexed ? [t('bonds.table.equivalent')] : [])
        ];
        const decimals = result.indexed ? 4 : 2;
        const rows = result.cashFlows.map((cf) => [
            cf.date,
            String(cf.daysFromSettlement),
            cf.coupon.toFixed(decimals),
            cf.principal.toFixed(decimals),
            cf.total.toFixed(decimals),
            ...(result.indexed ? [cf.totalEquivalent.toFixed(decimals)] : [])
        ]);
        const csv = [header, ...rows].map((r) => r.join(',')).join('\r\n');
        // Prepend BOM so Excel reads UTF-8 correctly.
        const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
        downloadBlob(blob, 'bond-cashflows.csv');
    };

    return (
        <>
            <section className={styles.panel}>
                <SavedBondsManager current={input} onLoad={handleLoad} />
                <BondForm
                    value={input}
                    onChange={setInput}
                    onSubmit={handleCalculate}
                    couponListCollapseSignal={loadSignal}
                />
            </section>

            <section className={styles.panel}>
                {errorMessage && (
                    <div className={styles.errorBox} role="alert">
                        <strong>{t('error.title')}</strong>
                        <p>{errorMessage}</p>
                    </div>
                )}

                {result && !errorMessage && (
                    <>
                        <div className={styles.resultHeader}>
                            <h2>{t('bonds.results.title')}</h2>
                            <button type="button" className="secondary-btn" onClick={handleExport}>
                                {t('bonds.results.exportCsv')}
                            </button>
                        </div>
                        <BondResultsSummary result={result} />

                        <h3 className={styles.chartHeading}>{t('bonds.results.chartTitle')}</h3>
                        <BondCashFlowChart cashFlows={result.cashFlows} indexed={result.indexed} />

                        <h3 className={styles.chartHeading}>{t('bonds.results.cashFlowTitle')}</h3>
                        <BondCashFlowTable cashFlows={result.cashFlows} indexed={result.indexed} />
                    </>
                )}

                {!result && !errorMessage && (
                    <p className={styles.placeholder}>{t('bonds.subtitle')}</p>
                )}
            </section>
        </>
    );
}
