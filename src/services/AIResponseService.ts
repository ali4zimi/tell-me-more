// AI response service for Movie Assistant

interface AppSettings {
  aiPlatform: string;
  apiKey: string;
  backendEndpoint: string;
}

export class AIResponseService {
  private static instance: AIResponseService;

  public static getInstance(): AIResponseService {
    if (!AIResponseService.instance) {
      AIResponseService.instance = new AIResponseService();
    }
    return AIResponseService.instance;
  }

  private constructor() {}

  private async getSettings(): Promise<AppSettings> {
    return new Promise((resolve) => {
      chrome.storage.local.get({
        aiPlatform: 'openai',
        apiKey: '',
        backendEndpoint: ''
      }, (result) => {
        resolve(result as AppSettings);
      });
    });
  }

  /**
   * @deprecated This method generates random responses and should not be used.
   * It was previously used as a fallback but now proper errors are thrown instead.
   */
  public generateResponse(_query: string, _subtitles: string[]): string {
    console.warn('[AIResponseService] generateResponse is deprecated and should not be used');
    return '❌ AI service not properly configured. Please check your settings.';
  }

  public async getAIResponse(query: string, subtitles: string[], _provider?: string): Promise<string> {
    try {
      const settings = await this.getSettings();
      
      // Check if backend endpoint is configured
      if (!settings.backendEndpoint) {
        throw new Error('❌ Backend endpoint not configured. Please set up your backend URL in extension settings.');
      }

      // Check if API key is provided (unless using Ollama which might not need it)
      if (!settings.apiKey && settings.aiPlatform !== 'ollama') {
        throw new Error(`❌ API key not configured for ${settings.aiPlatform}. Please add your API key in extension settings.`);
      }

      // Prepare the request payload
      const payload = {
        question: query,
        subtitles: subtitles,
        platform: settings.aiPlatform,
        apiKey: settings.apiKey
      };

      console.log('[AIResponseService] Sending request to backend:', {
        endpoint: settings.backendEndpoint,
        platform: settings.aiPlatform,
        questionLength: query.length,
        subtitlesCount: subtitles.length
      });

      // Make the API call to the backend
      const response = await fetch(`${settings.backendEndpoint}/ask-about-movie`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        
        if (response.status === 404) {
          throw new Error('❌ Backend service not found. Please check your backend endpoint URL.');
        } else if (response.status === 401 || response.status === 403) {
          throw new Error('❌ Invalid API key. Please check your API key in extension settings.');
        } else if (response.status >= 500) {
          throw new Error('❌ Backend server error. Please try again later or contact support.');
        } else {
          throw new Error(`❌ Backend error (${response.status}): ${errorText}`);
        }
      }

      const data = await response.json();
      
      // Assume the backend returns { response: string } or { answer: string }
      const aiResponse = data.response || data.answer || data.result;
      
      if (!aiResponse) {
        throw new Error('❌ Invalid response format from backend. Please check your backend implementation.');
      }

      console.log('[AIResponseService] Received response from backend');
      return aiResponse;

    } catch (error) {
      console.error('[AIResponseService] Error calling backend:', error);
      
      // Check if it's a network error
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('❌ Cannot connect to backend service. Please check your network connection and backend URL.');
      }
      
      // Check if it's a timeout error
      if (error instanceof DOMException && error.name === 'TimeoutError') {
        throw new Error('❌ Backend request timed out. Please try again or check if your backend is running.');
      }
      
      // If it's already a formatted error, re-throw it
      if (error instanceof Error && error.message.startsWith('❌')) {
        throw error;
      }
      
      // For any other error, throw a generic error
      throw new Error(`❌ AI service error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
    }
  }
}
