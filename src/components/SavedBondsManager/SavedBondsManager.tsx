import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { BondInput } from 'rates-calculator/bonds';
import {
    deleteBond,
    exportBonds,
    importBonds,
    listBonds,
    saveBond,
    type SavedBond
} from '@/utils/bondStorage';
import styles from '@/components/SavedBondsManager/SavedBondsManager.module.css';

interface Props {
    /** The bond config currently in the form, used when saving. */
    current: BondInput;
    /** Load a saved config into the form. */
    onLoad: (input: BondInput) => void;
}

export function SavedBondsManager({ current, onLoad }: Props) {
    const { t } = useTranslation();
    const [bonds, setBonds] = useState<SavedBond[]>(() => listBonds());
    const [selected, setSelected] = useState('');
    const [name, setName] = useState('');
    const [importError, setImportError] = useState<string | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const handleSelect = (value: string) => {
        setSelected(value);
        // Prefill the name so saving overwrites (updates) the selected configuration.
        setName(value);
        const bond = bonds.find((b) => b.name === value);
        if (bond) onLoad(bond.input);
    };

    const handleSave = () => {
        const trimmed = name.trim();
        if (!trimmed) return;
        setBonds(saveBond(trimmed, current));
        setSelected(trimmed);
    };

    const handleDelete = () => {
        if (!selected) return;
        setBonds(deleteBond(selected));
        setSelected('');
        setName('');
    };

    // Saving over an existing name updates it rather than creating a new entry.
    const isUpdate = bonds.some((b) => b.name === name.trim());

    const handleImport = async (file: File) => {
        setImportError(null);
        try {
            const text = await file.text();
            setBonds(importBonds(text));
        } catch {
            setImportError(t('bonds.saved.importError'));
        } finally {
            if (fileRef.current) fileRef.current.value = '';
        }
    };

    return (
        <div className={styles.manager}>
            <div className={styles.row}>
                <label className={styles.grow}>
                    <span>{t('bonds.saved.load')}</span>
                    <select value={selected} onChange={(e) => handleSelect(e.target.value)}>
                        <option value="">{t('bonds.saved.selectPlaceholder')}</option>
                        {bonds.map((b) => (
                            <option key={b.name} value={b.name}>
                                {b.name}
                            </option>
                        ))}
                    </select>
                </label>
                <button
                    type="button"
                    className="remove-btn"
                    onClick={handleDelete}
                    disabled={!selected}
                >
                    {t('bonds.saved.delete')}
                </button>
            </div>

            <div className={styles.row}>
                <label className={styles.grow}>
                    <span>{t('bonds.saved.name')}</span>
                    <input
                        type="text"
                        value={name}
                        placeholder={t('bonds.saved.namePlaceholder')}
                        onChange={(e) => setName(e.target.value)}
                    />
                </label>
                <button
                    type="button"
                    className="secondary-btn"
                    onClick={handleSave}
                    disabled={!name.trim()}
                >
                    {isUpdate ? t('bonds.saved.update') : t('bonds.saved.save')}
                </button>
            </div>

            <div className={styles.row}>
                <button type="button" className="secondary-btn" onClick={exportBonds}>
                    {t('bonds.saved.export')}
                </button>
                <button type="button" className="secondary-btn" onClick={() => fileRef.current?.click()}>
                    {t('bonds.saved.import')}
                </button>
                <input
                    ref={fileRef}
                    type="file"
                    accept="application/json"
                    className={styles.fileInput}
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleImport(file);
                    }}
                />
            </div>

            {importError && <p className={styles.error}>{importError}</p>}
        </div>
    );
}
