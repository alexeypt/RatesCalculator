import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DepositCalculator } from '@/features/deposits/DepositCalculator';
import { InstrumentCalculator } from '@/features/instruments/InstrumentCalculator';
import { LanguageSwitcher } from '@/components/LanguageSwitcher/LanguageSwitcher';
import { ThemeSwitcher } from '@/components/ThemeSwitcher/ThemeSwitcher';
import { applyTheme, getInitialTheme, type Theme } from '@/utils/theme';
import styles from '@/App.module.css';

type CalculatorMode = 'deposits' | 'bonds' | 'tokens';

const MODES: CalculatorMode[] = ['deposits', 'bonds', 'tokens'];
const MODE_STORAGE_KEY = 'rc.mode';

function getInitialMode(): CalculatorMode {
    const stored = localStorage.getItem(MODE_STORAGE_KEY);
    return (MODES as string[]).includes(stored ?? '') ? (stored as CalculatorMode) : 'deposits';
}

export default function App() {
    const { t } = useTranslation();
    const [mode, setMode] = useState<CalculatorMode>(getInitialMode);
    const [theme, setTheme] = useState<Theme>(getInitialTheme);

    useEffect(() => {
        applyTheme(theme);
    }, [theme]);

    useEffect(() => {
        localStorage.setItem(MODE_STORAGE_KEY, mode);
    }, [mode]);

    return (
        <div className={styles.app}>
            <header className={styles.header}>
                <div>
                    <h1>{t('app.title')}</h1>
                    <p className={styles.subtitle}>{t(`${mode}.subtitle`)}</p>
                </div>
                <div className={styles.headerControls}>
                    <ThemeSwitcher theme={theme} onToggle={() => setTheme((p) => (p === 'dark' ? 'light' : 'dark'))} />
                    <LanguageSwitcher />
                </div>
            </header>

            <div className={styles.modeTabs} role="tablist">
                {MODES.map((m) => (
                    <button
                        key={m}
                        type="button"
                        role="tab"
                        aria-selected={mode === m}
                        className={`${styles.modeTab}${mode === m ? ` ${styles.modeTabActive}` : ''}`}
                        onClick={() => setMode(m)}
                    >
                        {t(`modes.${m}`)}
                    </button>
                ))}
            </div>

            <main className={styles.main}>
                {mode === 'deposits' && <DepositCalculator />}
                {mode === 'bonds' && <InstrumentCalculator instrument="bond" />}
                {mode === 'tokens' && <InstrumentCalculator instrument="token" />}
            </main>
        </div>
    );
}
