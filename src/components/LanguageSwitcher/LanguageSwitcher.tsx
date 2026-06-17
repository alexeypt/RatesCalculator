import { useTranslation } from 'react-i18next';
import { supportedLanguages } from '@/i18n';

export function LanguageSwitcher() {
    const { i18n, t } = useTranslation();
    const current = i18n.language.split('-')[0];

    return (
        <label>
            <span className="visually-hidden">{t('language.label')}</span>
            <select
                value={supportedLanguages.includes(current as never) ? current : 'en'}
                onChange={(e) => void i18n.changeLanguage(e.target.value)}
                aria-label={t('language.label')}
            >
                {supportedLanguages.map((lng) => (
                    <option key={lng} value={lng}>
                        {t(`language.${lng}`)}
                    </option>
                ))}
            </select>
        </label>
    );
}
