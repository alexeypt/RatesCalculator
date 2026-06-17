import { useTranslation } from 'react-i18next';
import type { Theme } from '@/utils/theme';
import styles from '@/components/ThemeSwitcher/ThemeSwitcher.module.css';

interface Props {
    theme: Theme;
    onToggle: () => void;
}

export function ThemeSwitcher({ theme, onToggle }: Props) {
    const { t } = useTranslation();
    const next = theme === 'dark' ? 'light' : 'dark';

    return (
        <button
            type="button"
            className={styles.switcher}
            onClick={onToggle}
            aria-label={t(`theme.switchTo.${next}`)}
            title={t(`theme.switchTo.${next}`)}
        >
            {theme === 'dark' ? '☀️' : '🌙'}
        </button>
    );
}
