import { useTranslation } from 'react-i18next';
import type {
    AdditionType,
    OneTimeAddition,
    RecurringAddition,
    RecurringAdditionFrequency
} from '@/types/deposit';
import styles from '@/components/Editors.module.css';

interface Props {
    additionType: AdditionType;
    recurring: RecurringAddition;
    oneTime: OneTimeAddition[];
    defaultTaxPercent: number;
    onTypeChange: (type: AdditionType) => void;
    onRecurringChange: (value: RecurringAddition) => void;
    onOneTimeChange: (value: OneTimeAddition[]) => void;
}

const RECURRING_FREQUENCIES: RecurringAdditionFrequency[] = ['monthly', 'quarterly', 'annual'];

export function AdditionsEditor({
    additionType,
    recurring,
    oneTime,
    defaultTaxPercent,
    onTypeChange,
    onRecurringChange,
    onOneTimeChange
}: Props) {
    const { t } = useTranslation();

    const updateItem = (index: number, patch: Partial<OneTimeAddition>) => {
        onOneTimeChange(oneTime.map((item, i) => (i === index ? { ...item, ...patch } : item)));
    };

    const addItem = () => {
        onOneTimeChange([...oneTime, { date: '', amount: 0, taxPercent: defaultTaxPercent }]);
    };

    const removeItem = (index: number) => {
        onOneTimeChange(oneTime.filter((_, i) => i !== index));
    };

    return (
        <fieldset className={styles.editor}>
            <legend>{t('additions.title')}</legend>
            <label>
                <span>{t('additions.type')}</span>
                <select
                    value={additionType}
                    onChange={(e) => onTypeChange(e.target.value as AdditionType)}
                >
                    <option value="none">{t('additions.none')}</option>
                    <option value="recurring">{t('additions.recurring')}</option>
                    <option value="oneTime">{t('additions.oneTime')}</option>
                </select>
            </label>

            {additionType === 'recurring' && (
                <div className="field-grid">
                    <label>
                        <span>{t('additions.amount')}</span>
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
                        <span>{t('additions.frequency')}</span>
                        <select
                            value={recurring.frequency}
                            onChange={(e) =>
                                onRecurringChange({
                                    ...recurring,
                                    frequency: e.target.value as RecurringAdditionFrequency
                                })}
                        >
                            {RECURRING_FREQUENCIES.map((f) => (
                                <option key={f} value={f}>
                                    {t(`additions.recurringFrequency.${f}`)}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>
            )}

            {additionType === 'oneTime' && (
                <div className={styles.list}>
                    {oneTime.map((item, i) => (
                        <div className={styles.row} key={i}>
                            <label>
                                <span>{t('additions.date')}</span>
                                <input
                                    type="date"
                                    value={item.date}
                                    onChange={(e) => updateItem(i, { date: e.target.value })}
                                />
                            </label>
                            <label>
                                <span>{t('additions.amount')}</span>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={item.amount}
                                    onFocus={(e) => e.currentTarget.select()}
                                    onChange={(e) => updateItem(i, { amount: Number(e.target.value) })}
                                />
                            </label>
                            <label>
                                <span>{t('additions.tax')}</span>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.01"
                                    placeholder={t('additions.taxPlaceholder')}
                                    value={item.taxPercent ?? defaultTaxPercent}
                                    onFocus={(e) => e.currentTarget.select()}
                                    onChange={(e) =>
                                        updateItem(i, {
                                            taxPercent: e.target.value === '' ? undefined : Number(e.target.value)
                                        })}
                                />
                            </label>
                            <button type="button" className="remove-btn" onClick={() => removeItem(i)}>
                                {t('additions.remove')}
                            </button>
                        </div>
                    ))}
                    <button type="button" className="add-btn" onClick={addItem}>
                        +
                        {' '}
                        {t('additions.addItem')}
                    </button>
                </div>
            )}
        </fieldset>
    );
}
