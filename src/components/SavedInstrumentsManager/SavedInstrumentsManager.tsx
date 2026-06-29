import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { BondInput } from 'rates-calculator/bonds';
import type { InstrumentStore, SavedInstrument } from '@/utils/instrumentStorage';
import styles from '@/components/SavedInstrumentsManager/SavedInstrumentsManager.module.css';

interface Props {
    /** Storage backing this manager (bonds and tokens use separate stores). */
    store: InstrumentStore;
    /** The config currently in the form, used when saving. */
    current: BondInput;
    /** Load a saved config into the form. */
    onLoad: (input: BondInput) => void;
    /** Instrument-specific labels; the action buttons reuse the shared bonds.saved.* strings. */
    loadLabel: string;
    selectPlaceholder: string;
    namePlaceholder: string;
}

export function SavedInstrumentsManager({
    store,
    current,
    onLoad,
    loadLabel,
    selectPlaceholder,
    namePlaceholder
}: Props) {
    const { t } = useTranslation();
    const [items, setItems] = useState<SavedInstrument[]>(() => store.list());
    const [selected, setSelected] = useState('');
    const [name, setName] = useState('');
    const [importError, setImportError] = useState<string | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const handleSelect = (value: string) => {
        setSelected(value);
        // Prefill the name so saving overwrites (updates) the selected configuration.
        setName(value);
        const item = items.find((i) => i.name === value);
        if (item) onLoad(item.input);
    };

    const handleSave = () => {
        const trimmed = name.trim();
        if (!trimmed) return;
        setItems(store.save(trimmed, current));
        setSelected(trimmed);
    };

    const handleDelete = () => {
        if (!selected) return;
        setItems(store.remove(selected));
        setSelected('');
        setName('');
    };

    // Saving over an existing name updates it rather than creating a new entry.
    const isUpdate = items.some((i) => i.name === name.trim());

    const handleImport = async (file: File) => {
        setImportError(null);
        try {
            const text = await file.text();
            setItems(store.import(text));
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
                    <span>{loadLabel}</span>
                    <select value={selected} onChange={(e) => handleSelect(e.target.value)}>
                        <option value="">{selectPlaceholder}</option>
                        {items.map((i) => (
                            <option key={i.name} value={i.name}>
                                {i.name}
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
                        placeholder={namePlaceholder}
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
                <button type="button" className="secondary-btn" onClick={store.exportAll}>
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
