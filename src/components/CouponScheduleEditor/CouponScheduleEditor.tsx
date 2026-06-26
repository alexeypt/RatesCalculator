import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { generateCouponDates, BondValidationError, type CouponFrequency } from 'rates-calculator/bonds';
import editors from '@/components/Editors.module.css';
import styles from '@/components/CouponScheduleEditor/CouponScheduleEditor.module.css';

interface Props {
    couponDates: string[];
    /** Maturity date, used by the "generate from frequency" mode. */
    maturityDate: string;
    /** Changing value collapses the coupon list (e.g. after loading a saved bond). */
    collapseSignal?: number;
    onChange: (couponDates: string[]) => void;
}

const FREQUENCIES: CouponFrequency[] = ['monthly', 'quarterly', 'semiAnnual', 'annual'];

/** Parse pasted JSON of the form ["2026-06-17", "2026-09-17", ...]. */
function parseCouponDates(text: string): string[] {
    const data = JSON.parse(text);
    if (!Array.isArray(data)) throw new Error('not-array');
    return data.map((item) => {
        if (typeof item !== 'string' || !item.trim()) throw new Error('bad-item');
        return item;
    });
}

export function CouponScheduleEditor({ couponDates, maturityDate, collapseSignal, onChange }: Props) {
    const { t } = useTranslation();
    const [firstCouponDate, setFirstCouponDate] = useState('');
    const [frequency, setFrequency] = useState<CouponFrequency>('quarterly');
    const [jsonText, setJsonText] = useState('');
    const [jsonError, setJsonError] = useState<string | null>(null);
    const [genError, setGenError] = useState<string | null>(null);
    const [listOpen, setListOpen] = useState(true);

    // Collapse the list when a saved bond is loaded (skip the initial mount).
    const firstSignal = useRef(true);
    useEffect(() => {
        if (firstSignal.current) {
            firstSignal.current = false;
            return;
        }
        setListOpen(false);
    }, [collapseSignal]);

    const update = (index: number, date: string) => {
        onChange(couponDates.map((d, i) => (i === index ? date : d)));
    };

    const addRow = () => {
        onChange([...couponDates, couponDates[couponDates.length - 1] ?? '']);
    };

    const remove = (index: number) => {
        onChange(couponDates.filter((_, i) => i !== index));
    };

    const handleGenerate = () => {
        setGenError(null);
        if (!firstCouponDate || !maturityDate) {
            setGenError(t('bonds.coupons.genMissingDates'));
            return;
        }
        try {
            onChange(generateCouponDates({ firstCouponDate, frequency, maturityDate }));
        } catch (err) {
            setGenError(err instanceof BondValidationError ? t(err.code, err.params) : t('bonds.coupons.genFailed'));
        }
    };

    const handleImport = () => {
        setJsonError(null);
        try {
            onChange(parseCouponDates(jsonText));
        } catch {
            setJsonError(t('bonds.coupons.jsonInvalid'));
        }
    };

    return (
        <fieldset className={editors.editor}>
            <legend>{t('bonds.coupons.title')}</legend>

            <div className={styles.tools}>
                <div className={styles.tool}>
                    <span className={styles.toolTitle}>{t('bonds.coupons.generateTitle')}</span>
                    <div className={styles.toolRow}>
                        <label>
                            <span>{t('bonds.coupons.firstDate')}</span>
                            <input
                                type="date"
                                value={firstCouponDate}
                                onChange={(e) => setFirstCouponDate(e.target.value)}
                            />
                        </label>
                        <label>
                            <span>{t('bonds.coupons.frequency')}</span>
                            <select
                                value={frequency}
                                onChange={(e) => setFrequency(e.target.value as CouponFrequency)}
                            >
                                {FREQUENCIES.map((f) => (
                                    <option key={f} value={f}>
                                        {t(`bonds.coupons.frequencyOptions.${f}`)}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <button type="button" className="secondary-btn" onClick={handleGenerate}>
                            {t('bonds.coupons.generate')}
                        </button>
                    </div>
                    <p className={styles.hint}>{t('bonds.coupons.generateHint')}</p>
                    {genError && <p className={styles.error}>{genError}</p>}
                </div>

                <div className={styles.tool}>
                    <span className={styles.toolTitle}>{t('bonds.coupons.importTitle')}</span>
                    <textarea
                        className={styles.json}
                        rows={4}
                        value={jsonText}
                        placeholder={'["2026-06-17", "2026-09-17"]'}
                        onChange={(e) => setJsonText(e.target.value)}
                    />
                    <div className={styles.toolRow}>
                        <button type="button" className="secondary-btn" onClick={handleImport}>
                            {t('bonds.coupons.import')}
                        </button>
                    </div>
                    {jsonError && <p className={styles.error}>{jsonError}</p>}
                </div>
            </div>

            <details
                className={styles.collapsible}
                open={listOpen}
                onToggle={(e) => setListOpen(e.currentTarget.open)}
            >
                <summary className={styles.summary}>
                    {t('bonds.coupons.listTitle', { count: couponDates.length })}
                </summary>
                <div className={editors.list}>
                    {couponDates.length === 0 && <p className={styles.hint}>{t('bonds.coupons.empty')}</p>}
                    {couponDates.map((d, i) => (
                        <div className={styles.dateRow} key={i}>
                            <label>
                                <span>{t('bonds.coupons.date')}</span>
                                <input type="date" value={d} onChange={(e) => update(i, e.target.value)} />
                            </label>
                            <button type="button" className="remove-btn" onClick={() => remove(i)}>
                                {t('bonds.coupons.remove')}
                            </button>
                        </div>
                    ))}
                    <button type="button" className="add-btn" onClick={addRow}>
                        +
                        {' '}
                        {t('bonds.coupons.addRow')}
                    </button>
                </div>
            </details>
        </fieldset>
    );
}
