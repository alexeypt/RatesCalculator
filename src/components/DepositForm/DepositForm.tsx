import { useTranslation } from 'react-i18next';
import type {
    AdditionType,
    CapitalizationFrequency,
    DepositInput,
    OneTimeAddition,
    OneTimeWithdrawal,
    RateType,
    RecurringAddition,
    RecurringWithdrawal,
    TermUnit,
    WithdrawalType
} from 'rates-calculator/deposits';
import { FloatScheduleEditor } from '@/components/FloatScheduleEditor/FloatScheduleEditor';
import { AdditionsEditor } from '@/components/AdditionsEditor/AdditionsEditor';
import { WithdrawalsEditor } from '@/components/WithdrawalsEditor/WithdrawalsEditor';
import styles from '@/components/DepositForm/DepositForm.module.css';

interface Props {
    value: DepositInput;
    onChange: (value: DepositInput) => void;
    onSubmit: () => void;
}

const TERM_UNITS: TermUnit[] = ['days', 'months', 'years'];
const FREQUENCIES: CapitalizationFrequency[] = [
    'daily',
    'weekly',
    'twiceMonthly',
    'thriceMonthly',
    'monthly',
    'quarterly',
    'semiAnnual',
    'annual'
];

export function DepositForm({ value, onChange, onSubmit }: Props) {
    const { t } = useTranslation();

    const set = <K extends keyof DepositInput>(key: K, v: DepositInput[K]) => {
        onChange({ ...value, [key]: v });
    };

    return (
        <form
            className={styles.form}
            onSubmit={(e) => {
                e.preventDefault();
                onSubmit();
            }}
        >
            <div className="field-grid">
                <label>
                    <span>{t('form.amount')}</span>
                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={value.amount}
                        onFocus={(e) => e.currentTarget.select()}
                        onChange={(e) => set('amount', Number(e.target.value))}
                    />
                </label>

                <label>
                    <span>{t('form.startDate')}</span>
                    <input
                        type="date"
                        value={value.startDate}
                        onChange={(e) => set('startDate', e.target.value)}
                    />
                </label>

                <label>
                    <span>{t('form.term')}</span>
                    <div className={styles.inlineGroup}>
                        <input
                            type="number"
                            min="1"
                            value={value.term.value}
                            onFocus={(e) => e.currentTarget.select()}
                            onChange={(e) =>
                                set('term', { ...value.term, value: Number(e.target.value) })}
                        />
                        <select
                            value={value.term.unit}
                            onChange={(e) => set('term', { ...value.term, unit: e.target.value as TermUnit })}
                        >
                            {TERM_UNITS.map((u) => (
                                <option key={u} value={u}>
                                    {t(`form.termUnit.${u}`)}
                                </option>
                            ))}
                        </select>
                    </div>
                </label>

                <label>
                    <span>{t('form.incomeTax')}</span>
                    <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={value.incomeTaxPercent}
                        onFocus={(e) => e.currentTarget.select()}
                        onChange={(e) => set('incomeTaxPercent', Number(e.target.value))}
                    />
                </label>
            </div>

            <fieldset>
                <legend>{t('form.rateType')}</legend>
                <div className={styles.radioGroup}>
                    <label className={styles.radio}>
                        <input
                            type="radio"
                            name="rateType"
                            checked={value.rateType === 'fixed'}
                            onChange={() => set('rateType', 'fixed' as RateType)}
                        />
                        <span>{t('form.rateTypeFixed')}</span>
                    </label>
                    <label className={styles.radio}>
                        <input
                            type="radio"
                            name="rateType"
                            checked={value.rateType === 'float'}
                            onChange={() => set('rateType', 'float' as RateType)}
                        />
                        <span>{t('form.rateTypeFloat')}</span>
                    </label>
                </div>

                {value.rateType === 'fixed'
                    ? (
                        <label>
                            <span>{t('form.fixedRate')}</span>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={value.fixedRate}
                                onFocus={(e) => e.currentTarget.select()}
                                onChange={(e) => set('fixedRate', Number(e.target.value))}
                            />
                        </label>
                    )
                    : (
                        <FloatScheduleEditor
                            schedule={value.floatSchedule}
                            onChange={(s) => set('floatSchedule', s)}
                        />
                    )}
            </fieldset>

            <fieldset className={styles.capitalization}>
                <legend>{t('form.capitalization')}</legend>
                <label className={styles.checkbox}>
                    <input
                        type="checkbox"
                        checked={value.capitalization}
                        onChange={(e) => set('capitalization', e.target.checked)}
                    />
                    <span>{t('form.capitalization')}</span>
                </label>
                {value.capitalization && (
                    <label>
                        <span>{t('form.capFrequency')}</span>
                        <select
                            value={value.capFrequency === 'none' ? 'monthly' : value.capFrequency}
                            onChange={(e) =>
                                set('capFrequency', e.target.value as CapitalizationFrequency)}
                        >
                            {FREQUENCIES.map((f) => (
                                <option key={f} value={f}>
                                    {t(`form.frequency.${f}`)}
                                </option>
                            ))}
                        </select>
                    </label>
                )}
            </fieldset>

            <AdditionsEditor
                additionType={value.additionType}
                recurring={value.recurringAddition}
                oneTime={value.oneTimeAdditions}
                defaultTaxPercent={value.incomeTaxPercent}
                onTypeChange={(additionType: AdditionType) => set('additionType', additionType)}
                onRecurringChange={(recurringAddition: RecurringAddition) =>
                    set('recurringAddition', recurringAddition)}
                onOneTimeChange={(oneTimeAdditions: OneTimeAddition[]) =>
                    set('oneTimeAdditions', oneTimeAdditions)}
            />

            <WithdrawalsEditor
                withdrawalType={value.withdrawalType}
                recurring={value.recurringWithdrawal}
                oneTime={value.oneTimeWithdrawals}
                onTypeChange={(withdrawalType: WithdrawalType) => set('withdrawalType', withdrawalType)}
                onRecurringChange={(recurringWithdrawal: RecurringWithdrawal) =>
                    set('recurringWithdrawal', recurringWithdrawal)}
                onOneTimeChange={(oneTimeWithdrawals: OneTimeWithdrawal[]) =>
                    set('oneTimeWithdrawals', oneTimeWithdrawals)}
            />

            <button type="submit" className="primary-btn">
                {t('form.calculate')}
            </button>
        </form>
    );
}
