import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from '@/i18n/en.json';
import ru from '@/i18n/ru.json';

export const supportedLanguages = ['en', 'ru'] as const;
export type Language = (typeof supportedLanguages)[number];

void i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            en: { translation: en },
            ru: { translation: ru }
        },
        fallbackLng: 'en',
        supportedLngs: supportedLanguages,
        interpolation: {
            escapeValue: false
        },
        detection: {
            order: ['localStorage', 'navigator'],
            caches: ['localStorage']
        }
    });

export default i18n;
