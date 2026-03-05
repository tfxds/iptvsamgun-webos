import { useState, useEffect, useCallback } from 'react';
import { translations, type Language, type TranslationKey } from '../i18n';
import { storage } from '../services/storage';

export function useTranslation() {
    const [currentLang, setCurrentLang] = useState<Language>('pt');

    useEffect(() => {
        // When the hook mounts, load from storage
        const fetchLanguage = () => {
            const settings = storage.getSettings();
            // Ensure the language is either 'pt' or 'en', fallback to pt
            const safeLang = settings.language === 'en' ? 'en' : 'pt';
            setCurrentLang(safeLang);
        };

        fetchLanguage();

        // Setup an interval or listener if needed to react to storage changes,
        // but typically a page reload happens or we pass the lang change event down.
        const handleStorageChange = () => {
            fetchLanguage();
        };

        window.addEventListener('storage', handleStorageChange);
        // Custom event for internal app changes
        window.addEventListener('neostream-lang-change', handleStorageChange);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('neostream-lang-change', handleStorageChange);
        };
    }, []);

    const t = useCallback((key: TranslationKey): string => {
        // Fallback to Portuguese key if missing in the selected language somehow
        return translations[currentLang][key] || translations['pt'][key] || key;
    }, [currentLang]);

    return { t, currentLang };
}
