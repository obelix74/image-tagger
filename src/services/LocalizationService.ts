export type SupportedLanguage = 
  | 'en' | 'es' | 'fr' | 'de' | 'it' | 'pt' | 'ru' | 'ja' 
  | 'ko' | 'zh' | 'ar' | 'hi' | 'tr' | 'pl' | 'nl' | 'sv';

export interface LanguageInfo {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  rtl?: boolean;
}

export class LocalizationService {
  private static readonly SUPPORTED_LANGUAGES: LanguageInfo[] = [
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

  private static currentLanguage: SupportedLanguage = 'en';

  /**
   * Get all supported languages
   */
  static getSupportedLanguages(): LanguageInfo[] {
    return this.SUPPORTED_LANGUAGES;
  }

  /**
   * Get current language
   */
  static getCurrentLanguage(): SupportedLanguage {
    return this.currentLanguage;
  }

  /**
   * Set current language
   */
  static setCurrentLanguage(language: SupportedLanguage): void {
    if (this.isLanguageSupported(language)) {
      this.currentLanguage = language;
    } else {
      console.warn(`Language ${language} is not supported, falling back to English`);
      this.currentLanguage = 'en';
    }
  }

  /**
   * Check if a language is supported
   */
  static isLanguageSupported(language: string): language is SupportedLanguage {
    return this.SUPPORTED_LANGUAGES.some(lang => lang.code === language);
  }

  /**
   * Get language info by code
   */
  static getLanguageInfo(language: SupportedLanguage): LanguageInfo | undefined {
    return this.SUPPORTED_LANGUAGES.find(lang => lang.code === language);
  }

  /**
   * Detect browser language and return supported language or fallback to English
   */
  static detectBrowserLanguage(): SupportedLanguage {
    if (typeof window !== 'undefined' && typeof window.navigator !== 'undefined') {
      const browserLang = (window.navigator as any).language?.split('-')[0];
      if (browserLang && this.isLanguageSupported(browserLang)) {
        return browserLang;
      }
    }
    return 'en';
  }

  /**
   * Get localized AI prompt for image analysis
   */
  static getLocalizedPrompt(language: SupportedLanguage = this.currentLanguage): string {
    const prompts: Record<SupportedLanguage, string> = {
      en: `Analyze this image and provide the following information in JSON format:
{
  "title": "A short, descriptive title (2-5 words)",
  "caption": "A concise, engaging caption suitable for social media (1-2 sentences)",
  "headline": "A detailed description of the image (2-3 sentences)",
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "instructions": "Special instructions for photo editing or usage",
  "location": "Location information if identifiable",
  "confidence": 0.95
}`,
      
      es: `Analiza esta imagen y proporciona la siguiente información en formato JSON:
{
  "title": "Un título corto y descriptivo (2-5 palabras)",
  "caption": "Un pie de foto conciso y atractivo adecuado para redes sociales (1-2 oraciones)",
  "headline": "Una descripción detallada de la imagen (2-3 oraciones)",
  "keywords": ["palabra_clave1", "palabra_clave2", "palabra_clave3", "palabra_clave4", "palabra_clave5"],
  "instructions": "Instrucciones especiales para edición o uso de la foto",
  "location": "Información de ubicación si es identificable",
  "confidence": 0.95
}`,
      
      fr: `Analysez cette image et fournissez les informations suivantes au format JSON :
{
  "title": "Un titre court et descriptif (2-5 mots)",
  "caption": "Une légende concise et engageante adaptée aux réseaux sociaux (1-2 phrases)",
  "headline": "Une description détaillée de l'image (2-3 phrases)",
  "keywords": ["mot_clé1", "mot_clé2", "mot_clé3", "mot_clé4", "mot_clé5"],
  "instructions": "Instructions spéciales pour l'édition ou l'utilisation de la photo",
  "location": "Informations de localisation si identifiables",
  "confidence": 0.95
}`,
      
      de: `Analysieren Sie dieses Bild und geben Sie die folgenden Informationen im JSON-Format an:
{
  "title": "Ein kurzer, beschreibender Titel (2-5 Wörter)",
  "caption": "Eine prägnante, ansprechende Bildunterschrift für soziale Medien (1-2 Sätze)",
  "headline": "Eine detaillierte Beschreibung des Bildes (2-3 Sätze)",
  "keywords": ["stichwort1", "stichwort2", "stichwort3", "stichwort4", "stichwort5"],
  "instructions": "Spezielle Anweisungen für Fotobearbeitung oder Verwendung",
  "location": "Standortinformationen falls identifizierbar",
  "confidence": 0.95
}`,
      
      it: `Analizza questa immagine e fornisci le seguenti informazioni in formato JSON:
{
  "title": "Un titolo breve e descrittivo (2-5 parole)",
  "caption": "Una didascalia concisa e coinvolgente adatta ai social media (1-2 frasi)",
  "headline": "Una descrizione dettagliata dell'immagine (2-3 frasi)",
  "keywords": ["parola_chiave1", "parola_chiave2", "parola_chiave3", "parola_chiave4", "parola_chiave5"],
  "instructions": "Istruzioni speciali per l'editing o l'uso della foto",
  "location": "Informazioni sulla posizione se identificabili",
  "confidence": 0.95
}`,
      
      pt: `Analise esta imagem e forneça as seguintes informações em formato JSON:
{
  "title": "Um título curto e descritivo (2-5 palavras)",
  "caption": "Uma legenda concisa e envolvente adequada para redes sociais (1-2 frases)",
  "headline": "Uma descrição detalhada da imagem (2-3 frases)",
  "keywords": ["palavra_chave1", "palavra_chave2", "palavra_chave3", "palavra_chave4", "palavra_chave5"],
  "instructions": "Instruções especiais para edição ou uso da foto",
  "location": "Informações de localização se identificáveis",
  "confidence": 0.95
}`,
      
      ru: `Проанализируйте это изображение и предоставьте следующую информацию в формате JSON:
{
  "title": "Краткий описательный заголовок (2-5 слов)",
  "caption": "Краткая привлекательная подпись для социальных сетей (1-2 предложения)",
  "headline": "Подробное описание изображения (2-3 предложения)",
  "keywords": ["ключевое_слово1", "ключевое_слово2", "ключевое_слово3", "ключевое_слово4", "ключевое_слово5"],
  "instructions": "Специальные инструкции для редактирования или использования фото",
  "location": "Информация о местоположении, если определима",
  "confidence": 0.95
}`,
      
      ja: `この画像を分析し、以下の情報をJSON形式で提供してください：
{
  "title": "短い説明的なタイトル（2-5語）",
  "caption": "ソーシャルメディアに適した簡潔で魅力的なキャプション（1-2文）",
  "headline": "画像の詳細な説明（2-3文）",
  "keywords": ["キーワード1", "キーワード2", "キーワード3", "キーワード4", "キーワード5"],
  "instructions": "写真編集や使用に関する特別な指示",
  "location": "識別可能な場合の位置情報",
  "confidence": 0.95
}`,
      
      ko: `이 이미지를 분석하고 다음 정보를 JSON 형식으로 제공하세요:
{
  "title": "짧고 설명적인 제목 (2-5단어)",
  "caption": "소셜 미디어에 적합한 간결하고 매력적인 캡션 (1-2문장)",
  "headline": "이미지의 상세한 설명 (2-3문장)",
  "keywords": ["키워드1", "키워드2", "키워드3", "키워드4", "키워드5"],
  "instructions": "사진 편집이나 사용에 대한 특별 지시사항",
  "location": "식별 가능한 경우 위치 정보",
  "confidence": 0.95
}`,
      
      zh: `分析这张图片并以JSON格式提供以下信息：
{
  "title": "简短的描述性标题（2-5个词）",
  "caption": "适合社交媒体的简洁有吸引力的说明（1-2句话）",
  "headline": "图片的详细描述（2-3句话）",
  "keywords": ["关键词1", "关键词2", "关键词3", "关键词4", "关键词5"],
  "instructions": "照片编辑或使用的特殊说明",
  "location": "如果可识别的位置信息",
  "confidence": 0.95
}`,
      
      ar: `حلل هذه الصورة وقدم المعلومات التالية بتنسيق JSON:
{
  "title": "عنوان قصير ووصفي (2-5 كلمات)",
  "caption": "تعليق مختصر وجذاب مناسب لوسائل التواصل الاجتماعي (1-2 جملة)",
  "headline": "وصف مفصل للصورة (2-3 جمل)",
  "keywords": ["كلمة_مفتاحية1", "كلمة_مفتاحية2", "كلمة_مفتاحية3", "كلمة_مفتاحية4", "كلمة_مفتاحية5"],
  "instructions": "تعليمات خاصة لتحرير أو استخدام الصورة",
  "location": "معلومات الموقع إذا كانت قابلة للتحديد",
  "confidence": 0.95
}`,
      
      hi: `इस छवि का विश्लेषण करें और निम्नलिखित जानकारी JSON प्रारूप में प्रदान करें:
{
  "title": "एक छोटा, वर्णनात्मक शीर्षक (2-5 शब्द)",
  "caption": "सोशल मीडिया के लिए उपयुक्त संक्षिप्त, आकर्षक कैप्शन (1-2 वाक्य)",
  "headline": "छवि का विस्तृत विवरण (2-3 वाक्य)",
  "keywords": ["मुख्यशब्द1", "मुख्यशब्द2", "मुख्यशब्द3", "मुख्यशब्द4", "मुख्यशब्द5"],
  "instructions": "फ़ोटो संपादन या उपयोग के लिए विशेष निर्देश",
  "location": "पहचान योग्य होने पर स्थान की जानकारी",
  "confidence": 0.95
}`,
      
      tr: `Bu görüntüyü analiz edin ve aşağıdaki bilgileri JSON formatında sağlayın:
{
  "title": "Kısa, açıklayıcı bir başlık (2-5 kelime)",
  "caption": "Sosyal medya için uygun özlü, çekici bir açıklama (1-2 cümle)",
  "headline": "Görüntünün ayrıntılı açıklaması (2-3 cümle)",
  "keywords": ["anahtar_kelime1", "anahtar_kelime2", "anahtar_kelime3", "anahtar_kelime4", "anahtar_kelime5"],
  "instructions": "Fotoğraf düzenleme veya kullanım için özel talimatlar",
  "location": "Tanımlanabilirse konum bilgisi",
  "confidence": 0.95
}`,
      
      pl: `Przeanalizuj ten obraz i podaj następujące informacje w formacie JSON:
{
  "title": "Krótki, opisowy tytuł (2-5 słów)",
  "caption": "Zwięzły, angażujący podpis odpowiedni dla mediów społecznościowych (1-2 zdania)",
  "headline": "Szczegółowy opis obrazu (2-3 zdania)",
  "keywords": ["słowo_kluczowe1", "słowo_kluczowe2", "słowo_kluczowe3", "słowo_kluczowe4", "słowo_kluczowe5"],
  "instructions": "Specjalne instrukcje dotyczące edycji lub użycia zdjęcia",
  "location": "Informacje o lokalizacji, jeśli można je zidentyfikować",
  "confidence": 0.95
}`,
      
      nl: `Analyseer deze afbeelding en geef de volgende informatie in JSON-formaat:
{
  "title": "Een korte, beschrijvende titel (2-5 woorden)",
  "caption": "Een beknopte, boeiende ondertitel geschikt voor sociale media (1-2 zinnen)",
  "headline": "Een gedetailleerde beschrijving van de afbeelding (2-3 zinnen)",
  "keywords": ["trefwoord1", "trefwoord2", "trefwoord3", "trefwoord4", "trefwoord5"],
  "instructions": "Speciale instructies voor fotobewerking of gebruik",
  "location": "Locatie-informatie indien identificeerbaar",
  "confidence": 0.95
}`,
      
      sv: `Analysera denna bild och tillhandahåll följande information i JSON-format:
{
  "title": "En kort, beskrivande titel (2-5 ord)",
  "caption": "En koncis, engagerande bildtext lämplig för sociala medier (1-2 meningar)",
  "headline": "En detaljerad beskrivning av bilden (2-3 meningar)",
  "keywords": ["nyckelord1", "nyckelord2", "nyckelord3", "nyckelord4", "nyckelord5"],
  "instructions": "Särskilda instruktioner för fotoredigering eller användning",
  "location": "Platsinformation om identifierbar",
  "confidence": 0.95
}`
    };

    return prompts[language] || prompts.en;
  }

  /**
   * Get RTL (right-to-left) status for a language
   */
  static isRTL(language: SupportedLanguage = this.currentLanguage): boolean {
    const langInfo = this.getLanguageInfo(language);
    return langInfo?.rtl || false;
  }

  /**
   * Format text direction for CSS
   */
  static getTextDirection(language: SupportedLanguage = this.currentLanguage): 'ltr' | 'rtl' {
    return this.isRTL(language) ? 'rtl' : 'ltr';
  }
}