import React, { useState, useRef, useEffect } from 'react';
import { useLanguage, type SupportedLanguage } from '../contexts/LanguageContext';
import './LanguageSelector.css';

const LanguageSelector: React.FC = () => {
  const { currentLanguage, setLanguage, supportedLanguages, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLangInfo = supportedLanguages.find(lang => lang.code === currentLanguage);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLanguageChange = async (language: SupportedLanguage) => {
    await setLanguage(language);
    setIsOpen(false);
  };

  return (
    <div className="language-selector" ref={dropdownRef}>
      <button
        className="language-selector-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={t('language.select')}
        type="button"
      >
        <span className="language-flag">🌐</span>
        <span className="language-name">{currentLangInfo?.nativeName || 'English'}</span>
        <svg 
          className={`language-dropdown-arrow ${isOpen ? 'open' : ''}`} 
          viewBox="0 0 20 20" 
          fill="currentColor"
        >
          <path 
            fillRule="evenodd" 
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" 
            clipRule="evenodd" 
          />
        </svg>
      </button>

      {isOpen && (
        <div className="language-dropdown">
          <div className="language-dropdown-header">
            <span>{t('language.select')}</span>
          </div>
          
          <div className="language-options">
            {supportedLanguages.map((language) => (
              <button
                key={language.code}
                className={`language-option ${language.code === currentLanguage ? 'active' : ''}`}
                onClick={() => handleLanguageChange(language.code)}
                type="button"
              >
                <div className="language-option-content">
                  <span className="language-native-name">{language.nativeName}</span>
                  <span className="language-english-name">{language.name}</span>
                </div>
                {language.code === currentLanguage && (
                  <span className="language-check">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;