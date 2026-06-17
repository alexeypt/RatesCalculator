import { useTranslation } from 'react-i18next';
import type {
    OneTimeWithdrawal,
    RecurringWithdrawal,
    RecurringWithdrawalFrequency,
    WithdrawalType
} from 'rates-calculator/deposits';
import styles from '@/components/Editors.module.css';

interface Props {
    withdrawalType: WithdrawalType;
    recurring: RecurringWithdrawal;
    oneTime: OneTimeWithdrawal[];
    onTypeChange: (type: WithdrawalType) => void;
    onRecurringChange: (value: RecurringWithdrawal) => void;
    onOneTimeChange: (value: OneTimeWithdrawal[]) => void;
}

const RECURRING_FREQUENCIES: RecurringWithdrawalFrequency[] = ['monthly', 'quarterly', 'annual'];

export function WithdrawalsEditor({
    withdrawalType,
    recurring,
    oneTime,
    onTypeChange,
    onRecurringChange,
    onOneTimeChange
}: Props) {
    const { t } = useTranslation();

    const updateItem = (index: number, patch: Partial<OneTimeWithdrawal>) => {
        onOneTimeChange(oneTime.map((item, i) => (i === index ? { ...item, ...patch } : item)));
    };

    const addItem = () => {
        onOneTimeChange([...oneTime, { date: '', amount: 0 }]);
    };

    const removeItem = (index: number) => {
        onOneTimeChange(oneTime.filter((_, i) => i !== index));
    };

    return (
        <fieldset className={styles.editor}>
            <legend>{t('withdrawals.title')}</legend>
            <label>
                <span>{t('withdrawals.type')}</span>
                <select
                    value={withdrawalType}
                    onChange={(e) => onTypeChange(e.target.value as WithdrawalType)}
                >
                    <option value="none">{t('withdrawals.none')}</option>
                    <option value="recurring">{t('withdrawals.recurring')}</option>
                    <option value="oneTime">{t('withdrawals.oneTime')}</option>
                </select>
            </label>

            {withdrawalType === 'recurring' && (
                <div className="field-grid">
                    <label>
                        <span>{t('withdrawals.amount')}</span>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={recurring.amount}
                            onFocus={(e) => e.currentTarget.select()}
                            onChange={(e) =>
                                onRecurringChange({ ...recurring, amount: Number(e.target.value) })}
                        />
                    </label>
                    <label>
                        <span>{t('withdrawals.frequency')}</span>
                        <select
                            value={recurring.frequency}
                            onChange={(e) =>
                                onRecurringChange({
                                    ...recurring,
                                    frequency: e.target.value as RecurringWithdrawalFrequency
                                })}
                        >
                            {RECURRING_FREQUENCIES.map((f) => (
                                <option key={f} value={f}>
                                    {t(`withdrawals.recurringFrequency.${f}`)}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>
            )}

            {withdrawalType === 'oneTime' && (
                <div className={styles.list}>
                    {oneTime.map((item, i) => (
                        <div className={styles.row} key={i}>
                            <label>
                                <span>{t('withdrawals.date')}</span>
                                <input
                                    type="date"
                                    value={item.date}
                                    onChange={(e) => updateItem(i, { date: e.target.value })}
                                />
                            </label>
                            <label>
                                <span>{t('withdrawals.amount')}</span>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={item.amount}
                                    onFocus={(e) => e.currentTarget.select()}
                                    onChange={(e) => updateItem(i, { amount: Number(e.target.value) })}
                                />
                            </label>
                            <button type="button" className="remove-btn" onClick={() => removeItem(i)}>
                                {t('withdrawals.remove')}
                            </button>
                        </div>
                    ))}
                    <button type="button" className="add-btn" onClick={addItem}>
                        +
                        {' '}
                        {t('withdrawals.addItem')}
                    </button>
                </div>
            )}
        </fieldset>
    );
}
