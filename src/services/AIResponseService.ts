// AI response service for Movie Assistant
import { getRandomElement } from '../utils/helpers';

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

  public generateResponse(query: string, subtitles: string[]): string {
    const responses = [
      "That's an interesting question! Based on what I've been watching, I think...",
      "From the context of the show, it seems like...",
      "Great observation! The subtitles suggest that...",
      "I noticed that too! It appears that...",
      "Based on the dialogue, my analysis is...",
      "That's a thoughtful question. From what I can tell...",
      "Interesting point! The context indicates...",
      "I've been following along, and it looks like...",
      "Good question! Based on the recent dialogue...",
      "From my understanding of the content..."
    ];
    
    const contextResponses = [
      "Looking at the recent subtitles, there seems to be a focus on character development.",
      "The dialogue suggests this is a pivotal moment in the story.",
      "Based on the conversation patterns, this appears to be building tension.",
      "The subtitles indicate strong emotional undertones in this scene.",
      "From the context, this seems to be revealing important plot information.",
      "The recent dialogue suggests character motivations are being explored.",
      "Based on the subtitle patterns, this appears to be a climactic moment.",
      "The conversation flow indicates relationship dynamics are changing.",
      "From the context clues, this scene seems to be setting up future events.",
      "The dialogue suggests underlying themes are being explored."
    ];

    const questionResponses = [
      "That's exactly what I was thinking! The characters seem to be...",
      "You raise a good point. From what I've observed...",
      "I agree! The subtitles have been hinting at...",
      "Fascinating question! Based on the dialogue patterns...",
      "You're picking up on something important. The context suggests...",
      "Great insight! I've noticed similar patterns in...",
      "That's a perceptive observation. The recent exchanges show...",
      "You're right to question that. The subtitle context indicates...",
      "Excellent point! The character interactions suggest...",
      "I've been analyzing the same thing. It appears that..."
    ];

    // Simple keyword-based response selection
    const queryLower = query.toLowerCase();
    
    if (queryLower.includes('what') || queryLower.includes('who') || queryLower.includes('why') || queryLower.includes('how')) {
      return getRandomElement(questionResponses);
    } else if (subtitles.length > 0) {
      return getRandomElement(contextResponses);
    } else {
      return getRandomElement(responses);
    }
  }

  public async getAIResponse(query: string, subtitles: string[], _provider?: string): Promise<string> {
    try {
      const settings = await this.getSettings();
      
      // Check if backend endpoint is configured
      if (!settings.backendEndpoint) {
        console.warn('[AIResponseService] No backend endpoint configured, using fallback response');
        return this.generateResponse(query, subtitles);
      }

      // Check if API key is provided (unless using Ollama which might not need it)
      if (!settings.apiKey && settings.aiPlatform !== 'ollama') {
        console.warn('[AIResponseService] No API key configured, using fallback response');
        return this.generateResponse(query, subtitles);
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
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Backend responded with status: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      // Assume the backend returns { response: string } or { answer: string }
      const aiResponse = data.response || data.answer || data.result;
      
      if (!aiResponse) {
        throw new Error('Invalid response format from backend');
      }

      console.log('[AIResponseService] Received response from backend');
      return aiResponse;

    } catch (error) {
      console.error('[AIResponseService] Error calling backend:', error);
      
      // Fallback to mock response if backend fails
      console.log('[AIResponseService] Using fallback response due to error');
      return this.generateResponse(query, subtitles);
    }
  }
}
