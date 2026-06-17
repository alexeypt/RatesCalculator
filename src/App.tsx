import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    aggregateDetails,
    calculateDeposit,
    DepositValidationError,
    type DepositInput,
    type DepositResult,
    type DetailPeriod,
    type Term
} from 'rates-calculator/deposits';
import { DepositForm } from '@/components/DepositForm/DepositForm';
import { ResultsSummary } from '@/components/ResultsSummary/ResultsSummary';
import { MonthlyTable } from '@/components/MonthlyTable/MonthlyTable';
import { GrowthChart } from '@/components/GrowthChart/GrowthChart';
import { LanguageSwitcher } from '@/components/LanguageSwitcher/LanguageSwitcher';
import { ThemeSwitcher } from '@/components/ThemeSwitcher/ThemeSwitcher';
import { applyTheme, getInitialTheme, type Theme } from '@/utils/theme';
import { exportResultToCsv } from '@/utils/csv';
import styles from '@/App.module.css';

const DEFAULT_TAX_PERCENT = 13;

const DETAIL_PERIODS: DetailPeriod[] = ['changes', 'daily', 'monthly', 'quarterly', 'annual'];

function todayISO(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function termInYears(term: Term): number {
    switch (term.unit) {
        case 'days':
            return term.value / 365;
        case 'months':
            return term.value / 12;
        case 'years':
            return term.value;
    }
}

const defaultInput: DepositInput = {
    amount: 100000,
    startDate: todayISO(),
    term: { value: 1, unit: 'years' },
    rateType: 'fixed',
    fixedRate: 8,
    floatSchedule: [],
    capitalization: true,
    capFrequency: 'monthly',
    incomeTaxPercent: 0,
    additionType: 'none',
    recurringAddition: { amount: 0, frequency: 'monthly' },
    oneTimeAdditions: [],
    withdrawalType: 'none',
    recurringWithdrawal: { amount: 0, frequency: 'monthly' },
    oneTimeWithdrawals: []
};

export default function App() {
    const { t, i18n } = useTranslation();
    const [input, setInput] = useState<DepositInput>(defaultInput);
    const [result, setResult] = useState<DepositResult | null>(null);
    const [errorCode, setErrorCode] = useState<string | null>(null);
    const [errorParams, setErrorParams] = useState<Record<string, string | number> | undefined>();
    const [detailPeriod, setDetailPeriod] = useState<DetailPeriod>('changes');
    const [theme, setTheme] = useState<Theme>(getInitialTheme);
    // Once the user edits the tax field manually, stop auto-adjusting it.
    const taxTouched = useRef(false);

    useEffect(() => {
        applyTheme(theme);
    }, [theme]);

    const handleInputChange = (next: DepositInput) => {
        const taxChanged = next.incomeTaxPercent !== input.incomeTaxPercent;
        const termChanged
            = next.term.value !== input.term.value || next.term.unit !== input.term.unit;

        if (taxChanged) {
            taxTouched.current = true;
            setInput(next);
            return;
        }

        if (termChanged && !taxTouched.current) {
            // Deposits of a year or longer are typically tax-exempt here; default to 0%.
            const autoTax = termInYears(next.term) >= 1 ? 0 : DEFAULT_TAX_PERCENT;
            setInput({ ...next, incomeTaxPercent: autoTax });
            return;
        }

        setInput(next);
    };

    const handleCalculate = () => {
        try {
            const res = calculateDeposit(input);
            setResult(res);
            setErrorCode(null);
            setErrorParams(undefined);
        } catch (err) {
            setResult(null);
            if (err instanceof DepositValidationError) {
                setErrorCode(err.code);
                setErrorParams(err.params);
            } else {
                setErrorCode('error.termTooShort');
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

    const details = useMemo(
        () => (result ? aggregateDetails(result.dailyDetails, detailPeriod) : []),
        [result, detailPeriod]
    );

    const handleExport = () => {
        if (!result) return;
        exportResultToCsv(details, detailPeriod, {
            period: t('results.table.period'),
            openingBalance: t('results.table.openingBalance'),
            added: t('results.table.added'),
            withdrawn: t('results.table.withdrawn'),
            interestAccrued: t('results.table.interestAccrued'),
            taxPaid: t('results.table.taxPaid'),
            capitalized: t('results.table.capitalized'),
            closingBalance: t('results.table.closingBalance')
        });
    };

    return (
        <div className={styles.app}>
            <header className={styles.header}>
                <div>
                    <h1>{t('app.title')}</h1>
                    <p className={styles.subtitle}>{t('app.subtitle')}</p>
                </div>
                <div className={styles.headerControls}>
                    <ThemeSwitcher theme={theme} onToggle={() => setTheme((p) => (p === 'dark' ? 'light' : 'dark'))} />
                    <LanguageSwitcher />
                </div>
            </header>

            <main className={styles.main}>
                <section className={styles.panel}>
                    <DepositForm value={input} onChange={handleInputChange} onSubmit={handleCalculate} />
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
                                <h2>{t('results.title')}</h2>
                                <button type="button" className="secondary-btn" onClick={handleExport}>
                                    {t('results.exportCsv')}
                                </button>
                            </div>
                            <ResultsSummary result={result} />

                            <div className={styles.detailControls}>
                                <h3>{t('results.monthlyTitle')}</h3>
                                <label className={styles.detailPeriod}>
                                    <span>{t('results.detailPeriod')}</span>
                                    <select
                                        value={detailPeriod}
                                        onChange={(e) => setDetailPeriod(e.target.value as DetailPeriod)}
                                    >
                                        {DETAIL_PERIODS.map((p) => (
                                            <option key={p} value={p}>
                                                {t(`results.detailPeriodOptions.${p}`)}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            </div>

                            <h4 className={styles.chartHeading}>{t('results.chartTitle')}</h4>
                            <GrowthChart details={details} period={detailPeriod} />

                            <MonthlyTable details={details} period={detailPeriod} />
                        </>
                    )}

                    {!result && !errorMessage && (
                        <p className={styles.placeholder}>{t('app.subtitle')}</p>
                    )}
                </section>
            </main>
        </div>
    );
}
