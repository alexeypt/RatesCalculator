import { useTranslation } from 'react-i18next';
import type { FloatRateSegment } from '@/types/deposit';
import styles from '@/components/FloatScheduleEditor/FloatScheduleEditor.module.css';

interface Props {
    schedule: FloatRateSegment[];
    onChange: (schedule: FloatRateSegment[]) => void;
}

export function FloatScheduleEditor({ schedule, onChange }: Props) {
    const { t } = useTranslation();

    const update = (index: number, patch: Partial<FloatRateSegment>) => {
        onChange(schedule.map((seg, i) => (i === index ? { ...seg, ...patch } : seg)));
    };

    const add = () => {
        const last = schedule[schedule.length - 1];
        const from = last ? nextDay(last.to) : '';
        onChange([...schedule, { from, to: '', rate: 0 }]);
    };

    const remove = (index: number) => {
        onChange(schedule.filter((_, i) => i !== index));
    };

    return (
        <fieldset>
            <legend>{t('float.title')}</legend>
            <p className={styles.hint}>{t('float.hint')}</p>
            <div className={styles.rows}>
                {schedule.map((seg, i) => (
                    <div className={styles.row} key={i}>
                        <label>
                            <span>{t('float.from')}</span>
                            <input
                                type="date"
                                value={seg.from}
                                onChange={(e) => update(i, { from: e.target.value })}
                            />
                        </label>
                        <label>
                            <span>{t('float.to')}</span>
                            <input
                                type="date"
                                value={seg.to}
                                onChange={(e) => update(i, { to: e.target.value })}
                            />
                        </label>
                        <label>
                            <span>{t('float.rate')}</span>
                            <input
                                type="number"
                                step="0.01"
                                value={seg.rate}
                                onFocus={(e) => e.currentTarget.select()}
                                onChange={(e) => update(i, { rate: Number(e.target.value) })}
                            />
                        </label>
                        <button type="button" className="remove-btn" onClick={() => remove(i)}>
                            {t('float.remove')}
                        </button>
                    </div>
                ))}
            </div>
            <button type="button" className="add-btn" onClick={add}>
                +
                {' '}
                {t('float.addSegment')}
            </button>
        </fieldset>
    );
}

function nextDay(iso: string): string {
    if (!iso) return '';
    const [y, m, d] = iso.split('-').map(Number);
    const date = new Date(y, m - 1, d + 1);
    const yy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
}
