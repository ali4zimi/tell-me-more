// Amazon Prime Video specific subtitle observer
import { BaseSubtitleObserver } from './BaseSubtitleObserver';

export class AmazonSubtitleObserver extends BaseSubtitleObserver {
  protected getSubtitleContainer(): HTMLElement | null {
    // Try multiple selectors for Amazon Prime Video
    const selectors = [
      '.webPlayerContainer .webPlayerSDKContainer',
      '.subtitles',
      '.atvwebplayersdk-captions-container',
      '.webPlayerSDKContainer [data-testid="subtitles"]',
      '.dv-player-fullscreen .subtitles'
    ];

    for (const selector of selectors) {
      const container = document.querySelector(selector) as HTMLElement;
      if (container) {
        console.log(`[Amazon Observer] Found container with selector: ${selector}`);
        return container;
      }
    }

    // Look for AWS video player elements
    const awsPlayers = document.querySelectorAll('[class*="webPlayer"], [class*="atvwebplayer"]');
    for (const player of awsPlayers) {
      const subtitleContainer = player.querySelector('[class*="subtitle"], [class*="caption"]') as HTMLElement;
      if (subtitleContainer) {
        console.log(`[Amazon Observer] Found subtitle container in AWS player:`, subtitleContainer);
        return subtitleContainer;
      }
    }

    return null;
  }

  protected extractSubtitleText(container: HTMLElement): string {
    // Try multiple text extraction methods for Amazon Prime Video
    const textSelectors = [
      '.f35bt6a', // Common Amazon subtitle class
      '.atvwebplayersdk-captions-text',
      'span',
      'p',
      '.subtitle-text',
      '[data-testid="subtitle-text"]'
    ];

    for (const selector of textSelectors) {
      const elements = container.querySelectorAll(selector);
      if (elements.length > 0) {
        const text = Array.from(elements)
          .map(el => el.textContent?.trim())
          .filter(text => text && text.length > 0)
          .join(' ')
          .trim();
        
        if (text) {
          return text;
        }
      }
    }

    // Special handling for Amazon's dynamic subtitle elements
    const allSpans = container.querySelectorAll('span, p, div');
    const subtitleTexts: string[] = [];
    
    for (const element of allSpans) {
      const text = element.textContent?.trim();
      if (text && 
          text.length > 0 && 
          text.length < 500 && // Reasonable subtitle length
          !text.includes('undefined') &&
          !text.includes('null')) {
        subtitleTexts.push(text);
      }
    }

    return subtitleTexts.join(' ').trim();
  }
}
