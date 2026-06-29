import { useTranslation } from 'react-i18next';
import type { BondInput, BondPriceMode, BondType } from 'rates-calculator/bonds';
import { CouponScheduleEditor } from '@/components/CouponScheduleEditor/CouponScheduleEditor';
import styles from '@/components/BondForm/BondForm.module.css';

interface Props {
    value: BondInput;
    onChange: (value: BondInput) => void;
    onSubmit: () => void;
    /** Changes whenever a saved bond is loaded, signalling the coupon list to collapse. */
    couponListCollapseSignal?: number;
}

export function BondForm({ value, onChange, onSubmit, couponListCollapseSignal }: Props) {
    const { t } = useTranslation();

    const set = <K extends keyof BondInput>(key: K, v: BondInput[K]) => {
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
            <fieldset>
                <legend>{t('bonds.form.bondType')}</legend>
                <div className={styles.radioGroup}>
                    <label className={styles.radio}>
                        <input
                            type="radio"
                            name="bondType"
                            checked={value.bondType === 'regular'}
                            onChange={() => set('bondType', 'regular' as BondType)}
                        />
                        <span>{t('bonds.form.bondTypeRegular')}</span>
                    </label>
                    <label className={styles.radio}>
                        <input
                            type="radio"
                            name="bondType"
                            checked={value.bondType === 'indexed'}
                            onChange={() => set('bondType', 'indexed' as BondType)}
                        />
                        <span>{t('bonds.form.bondTypeIndexed')}</span>
                    </label>
                </div>
            </fieldset>

            <fieldset>
                <legend>{t('bonds.form.parametersTitle')}</legend>
                <div className="field-grid">
                    <label>
                        <span>{t('bonds.form.nominal')}</span>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={value.nominal}
                            onFocus={(e) => e.currentTarget.select()}
                            onChange={(e) => set('nominal', Number(e.target.value))}
                        />
                    </label>

                    <label>
                        <span>{t('bonds.form.couponRate')}</span>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={value.couponRatePercent}
                            onFocus={(e) => e.currentTarget.select()}
                            onChange={(e) => set('couponRatePercent', Number(e.target.value))}
                        />
                    </label>

                    <label>
                        <span>{t('bonds.form.startDate')}</span>
                        <input
                            type="date"
                            value={value.startDate}
                            onChange={(e) => set('startDate', e.target.value)}
                        />
                    </label>

                    <label>
                        <span>{t('bonds.form.maturityDate')}</span>
                        <input
                            type="date"
                            value={value.maturityDate}
                            onChange={(e) => set('maturityDate', e.target.value)}
                        />
                    </label>
                </div>
            </fieldset>

            <fieldset>
                <legend>{t('bonds.form.purchaseTitle')}</legend>
                <p className={styles.hint}>{t('bonds.form.purchaseHint')}</p>

                <div className={styles.purchaseSection}>
                    <div className={styles.radioGroup}>
                        <label className={styles.radio}>
                            <input
                                type="radio"
                                name="priceMode"
                                checked={value.priceMode === 'price'}
                                onChange={() => set('priceMode', 'price' as BondPriceMode)}
                            />
                            <span>{t('bonds.form.priceModePrice')}</span>
                        </label>
                        <label className={styles.radio}>
                            <input
                                type="radio"
                                name="priceMode"
                                checked={value.priceMode === 'ytm'}
                                onChange={() => set('priceMode', 'ytm' as BondPriceMode)}
                            />
                            <span>{t('bonds.form.priceModeYtm')}</span>
                        </label>
                    </div>

                    <div className="field-grid">
                        {value.priceMode === 'price'
                            ? (
                                <label>
                                    <span>{t('bonds.form.purchasePrice')}</span>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={value.purchasePrice}
                                        onFocus={(e) => e.currentTarget.select()}
                                        onChange={(e) => set('purchasePrice', Number(e.target.value))}
                                    />
                                </label>
                            )
                            : (
                                <label>
                                    <span>{t('bonds.form.targetYtm')}</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={value.targetYtmPercent}
                                        onFocus={(e) => e.currentTarget.select()}
                                        onChange={(e) => set('targetYtmPercent', Number(e.target.value))}
                                    />
                                </label>
                            )}

                        <label>
                            <span>{t('bonds.form.settlementDate')}</span>
                            <input
                                type="date"
                                value={value.settlementDate}
                                onChange={(e) => set('settlementDate', e.target.value)}
                            />
                        </label>

                        <label>
                            <span>{t('bonds.form.quantity')}</span>
                            <input
                                type="number"
                                min="1"
                                step="1"
                                value={value.quantity}
                                onFocus={(e) => e.currentTarget.select()}
                                onChange={(e) => set('quantity', Number(e.target.value))}
                            />
                        </label>

                        <label>
                            <span>{t('bonds.form.purchaseCosts')}</span>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={value.purchaseCosts}
                                onFocus={(e) => e.currentTarget.select()}
                                onChange={(e) => set('purchaseCosts', Number(e.target.value))}
                            />
                        </label>

                        <label>
                            <span>{t('bonds.form.couponTax')}</span>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                value={value.couponTaxPercent}
                                onFocus={(e) => e.currentTarget.select()}
                                onChange={(e) => set('couponTaxPercent', Number(e.target.value))}
                            />
                        </label>
                    </div>
                </div>
            </fieldset>

            {value.bondType === 'indexed' && (
                <fieldset>
                    <legend>{t('bonds.form.indexTitle')}</legend>
                    <p className={styles.hint}>{t('bonds.form.indexHint')}</p>
                    <div className="field-grid">
                        <label>
                            <span>{t('bonds.form.baseIndex')}</span>
                            <input
                                type="number"
                                min="0"
                                step="0.0001"
                                value={value.baseIndex}
                                onFocus={(e) => e.currentTarget.select()}
                                onChange={(e) => set('baseIndex', Number(e.target.value))}
                            />
                        </label>
                        <label>
                            <span>{t('bonds.form.currentIndex')}</span>
                            <input
                                type="number"
                                min="0"
                                step="0.0001"
                                value={value.currentIndex}
                                onFocus={(e) => e.currentTarget.select()}
                                onChange={(e) => set('currentIndex', Number(e.target.value))}
                            />
                        </label>
                    </div>
                </fieldset>
            )}

            <CouponScheduleEditor
                couponDates={value.couponDates}
                maturityDate={value.maturityDate}
                collapseSignal={couponListCollapseSignal}
                onChange={(couponDates: string[]) => set('couponDates', couponDates)}
            />

            <button type="submit" className="primary-btn">
                {t('bonds.form.calculate')}
            </button>
        </form>
    );
}
