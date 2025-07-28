import { AIProvider } from './AIProvider';
import { GeminiProvider } from './GeminiService';
import { OllamaProvider } from './OllamaProvider';

export type SupportedProvider = 'gemini' | 'ollama';

export class AIProviderFactory {
  private static providerInstance: AIProvider | null = null;
  private static currentProviderType: SupportedProvider | null = null;

  /**
   * Create or return existing AI provider instance based on environment configuration
   */
  static getProvider(): AIProvider {
    const providerType = this.getProviderType();

    // Return existing instance if it matches current configuration
    if (this.providerInstance && this.currentProviderType === providerType) {
      return this.providerInstance;
    }

    // Create new provider instance
    console.log(`Creating AI provider: ${providerType}`);
    
    switch (providerType) {
      case 'ollama':
        this.providerInstance = new OllamaProvider();
        break;
      case 'gemini':
      default:
        this.providerInstance = new GeminiProvider();
        break;
    }

    this.currentProviderType = providerType;
    
    // Initialize the provider
    this.providerInstance.initialize();

    return this.providerInstance;
  }

  /**
   * Create a specific provider instance (useful for testing or explicit provider selection)
   */
  static createProvider(providerType: SupportedProvider): AIProvider {
    let provider: AIProvider;

    switch (providerType) {
      case 'ollama':
        provider = new OllamaProvider();
        break;
      case 'gemini':
        provider = new GeminiProvider();
        break;
      default:
        throw new Error(`Unsupported AI provider: ${providerType}`);
    }

    provider.initialize();
    return provider;
  }

  /**
   * Get the currently configured provider type from environment
   */
  static getProviderType(): SupportedProvider {
    const provider = process.env.AI_PROVIDER?.toLowerCase().trim();
    
    switch (provider) {
      case 'ollama':
        return 'ollama';
      case 'gemini':
      default:
        return 'gemini';
    }
  }

  /**
   * Check if the current provider configuration is valid
   */
  static async validateCurrentProvider(): Promise<{ valid: boolean; provider: SupportedProvider; error?: string }> {
    const providerType = this.getProviderType();
    
    try {
      const provider = this.getProvider();
      const isConnected = await provider.testConnection();
      
      return {
        valid: isConnected,
        provider: providerType,
        error: isConnected ? undefined : `${providerType} provider connection test failed`
      };
    } catch (error) {
      return {
        valid: false,
        provider: providerType,
        error: error instanceof Error ? error.message : 'Unknown validation error'
      };
    }
  }

  /**
   * Get provider configuration info
   */
  static getProviderInfo(): { 
    provider: SupportedProvider; 
    config: Record<string, string | undefined> 
  } {
    const providerType = this.getProviderType();
    
    switch (providerType) {
      case 'ollama':
        return {
          provider: 'ollama',
          config: {
            baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
            model: process.env.OLLAMA_MODEL || 'llava:latest',
            timeout: process.env.OLLAMA_TIMEOUT || '300000'
          }
        };
      case 'gemini':
      default:
        return {
          provider: 'gemini',
          config: {
            apiKey: process.env.GEMINI_API_KEY ? '[CONFIGURED]' : '[NOT SET]',
            model: 'gemini-1.5-flash'
          }
        };
    }
  }

  /**
   * Reset the provider instance (useful for configuration changes)
   */
  static resetProvider(): void {
    this.providerInstance = null;
    this.currentProviderType = null;
    console.log('AI provider instance reset');
  }

  /**
   * Get available providers and their status
   */
  static async getAvailableProviders(): Promise<Array<{
    name: SupportedProvider;
    available: boolean;
    error?: string;
  }>> {
    const providers: SupportedProvider[] = ['gemini', 'ollama'];
    const results = [];

    for (const providerName of providers) {
      try {
        const provider = this.createProvider(providerName);
        const isAvailable = await provider.testConnection();
        
        results.push({
          name: providerName,
          available: isAvailable,
          error: isAvailable ? undefined : `Connection test failed`
        });
      } catch (error) {
        results.push({
          name: providerName,
          available: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }
}