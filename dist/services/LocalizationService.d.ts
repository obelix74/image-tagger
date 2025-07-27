export type SupportedLanguage = 'en' | 'es' | 'fr' | 'de' | 'it' | 'pt' | 'ru' | 'ja' | 'ko' | 'zh' | 'ar' | 'hi' | 'tr' | 'pl' | 'nl' | 'sv';
export interface LanguageInfo {
    code: SupportedLanguage;
    name: string;
    nativeName: string;
    rtl?: boolean;
}
export declare class LocalizationService {
    private static readonly SUPPORTED_LANGUAGES;
    private static currentLanguage;
    /**
     * Get all supported languages
     */
    static getSupportedLanguages(): LanguageInfo[];
    /**
     * Get current language
     */
    static getCurrentLanguage(): SupportedLanguage;
    /**
     * Set current language
     */
    static setCurrentLanguage(language: SupportedLanguage): void;
    /**
     * Check if a language is supported
     */
    static isLanguageSupported(language: string): language is SupportedLanguage;
    /**
     * Get language info by code
     */
    static getLanguageInfo(language: SupportedLanguage): LanguageInfo | undefined;
    /**
     * Detect browser language and return supported language or fallback to English
     */
    static detectBrowserLanguage(): SupportedLanguage;
    /**
     * Get localized AI prompt for image analysis
     */
    static getLocalizedPrompt(language?: SupportedLanguage): string;
    /**
     * Get RTL (right-to-left) status for a language
     */
    static isRTL(language?: SupportedLanguage): boolean;
    /**
     * Format text direction for CSS
     */
    static getTextDirection(language?: SupportedLanguage): 'ltr' | 'rtl';
}
//# sourceMappingURL=LocalizationService.d.ts.map