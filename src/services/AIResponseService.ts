// AI response service for Movie Assistant
import { getRandomElement } from '../utils/helpers';

export class AIResponseService {
  private static instance: AIResponseService;

  public static getInstance(): AIResponseService {
    if (!AIResponseService.instance) {
      AIResponseService.instance = new AIResponseService();
    }
    return AIResponseService.instance;
  }

  private constructor() {}

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
    // For now, return mock response. In the future, integrate with actual AI APIs
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(this.generateResponse(query, subtitles));
      }, 1000 + Math.random() * 1000); // Simulate network delay
    });
  }
}
