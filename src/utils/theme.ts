export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'theme';

/** Read the persisted theme, falling back to dark. */
export function getInitialTheme(): Theme {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === 'light' || stored === 'dark') return stored;
    } catch {
    // localStorage may be unavailable (private mode); ignore.
    }
    return 'dark';
}

/** Apply the theme to the document root and persist the choice. */
export function applyTheme(theme: Theme): void {
    document.documentElement.dataset.theme = theme;
    try {
        localStorage.setItem(STORAGE_KEY, theme);
    } catch {
    // Ignore persistence failures.
    }
}
