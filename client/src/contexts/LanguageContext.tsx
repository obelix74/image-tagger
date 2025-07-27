import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export type SupportedLanguage = 
  | 'en' | 'es' | 'fr' | 'de' | 'it' | 'pt' | 'ru' | 'ja' 
  | 'ko' | 'zh' | 'ar' | 'hi' | 'tr' | 'pl' | 'nl' | 'sv';

export interface LanguageInfo {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  rtl?: boolean;
}

interface Translation {
  [key: string]: any;
}

interface LanguageContextType {
  currentLanguage: SupportedLanguage;
  setLanguage: (language: SupportedLanguage) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  isRTL: boolean;
  supportedLanguages: LanguageInfo[];
  loading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', rtl: true },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska' }
];

const STORAGE_KEY = 'preferred-language';

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>('en');
  const [translations, setTranslations] = useState<Translation>({});
  const [loading, setLoading] = useState(true);

  // Detect browser language
  const detectBrowserLanguage = (): SupportedLanguage => {
    if (typeof window !== 'undefined' && window.navigator) {
      const browserLang = window.navigator.language.split('-')[0] as SupportedLanguage;
      if (SUPPORTED_LANGUAGES.some(lang => lang.code === browserLang)) {
        return browserLang;
      }
    }
    return 'en';
  };

  // Load translations for a specific language
  const loadTranslations = async (language: SupportedLanguage): Promise<Translation> => {
    try {
      // For languages without translation files, fall back to English
      const availableLanguages = ['en', 'es', 'fr'];
      const langToLoad = availableLanguages.includes(language) ? language : 'en';
      
      const response = await fetch(`/locales/${langToLoad}.json`);
      if (!response.ok) {
        throw new Error(`Failed to load translations for ${langToLoad}`);
      }
      return await response.json();
    } catch (error) {
      console.warn(`Failed to load translations for ${language}, falling back to English`);
      // Fallback to English
      try {
        const response = await fetch('/locales/en.json');
        return await response.json();
      } catch (fallbackError) {
        console.error('Failed to load fallback English translations');
        return {};
      }
    }
  };

  // Initialize language on mount
  useEffect(() => {
    const initializeLanguage = async () => {
      setLoading(true);
      
      // Get saved language or detect browser language
      const savedLanguage = localStorage.getItem(STORAGE_KEY) as SupportedLanguage;
      const initialLanguage = savedLanguage || detectBrowserLanguage();
      
      const initialTranslations = await loadTranslations(initialLanguage);
      
      setCurrentLanguage(initialLanguage);
      setTranslations(initialTranslations);
      setLoading(false);
    };

    initializeLanguage();
  }, []);

  // Set language and update document attributes
  const setLanguage = async (language: SupportedLanguage) => {
    if (language === currentLanguage) return;
    
    setLoading(true);
    
    const newTranslations = await loadTranslations(language);
    const languageInfo = SUPPORTED_LANGUAGES.find(lang => lang.code === language);
    
    setCurrentLanguage(language);
    setTranslations(newTranslations);
    localStorage.setItem(STORAGE_KEY, language);
    
    // Update document attributes for RTL support
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
      document.documentElement.dir = languageInfo?.rtl ? 'rtl' : 'ltr';
    }
    
    setLoading(false);
  };

  // Translation function with support for nested keys and interpolation
  const t = (key: string, params?: Record<string, string | number>): string => {
    const keys = key.split('.');
    let value: any = translations;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        console.warn(`Translation key not found: ${key}`);
        return key; // Return the key if translation not found
      }
    }
    
    if (typeof value !== 'string') {
      console.warn(`Translation value is not a string: ${key}`);
      return key;
    }
    
    // Simple interpolation
    if (params) {
      return value.replace(/\{\{(\w+)\}\}/g, (match, paramKey) => {
        return params[paramKey]?.toString() || match;
      });
    }
    
    return value;
  };

  const isRTL = SUPPORTED_LANGUAGES.find(lang => lang.code === currentLanguage)?.rtl || false;

  const contextValue: LanguageContextType = {
    currentLanguage,
    setLanguage,
    t,
    isRTL,
    supportedLanguages: SUPPORTED_LANGUAGES,
    loading
  };

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export default LanguageContext;