// Disney+ specific subtitle observer
import { BaseSubtitleObserver } from './BaseSubtitleObserver';

export class DisneySubtitleObserver extends BaseSubtitleObserver {
  protected getSubtitleContainer(): HTMLElement | null {
    // Try multiple selectors for Disney+
    const selectors = [
      '.dss-subtitle-renderer',
      '.subtitle-container',
      '.btm-media-player .subtitle-renderer',
      '[data-testid="subtitle-container"]'
    ];

    for (const selector of selectors) {
      const container = document.querySelector(selector) as HTMLElement;
      if (container) {
        console.log(`[Disney Observer] Found container with selector: ${selector}`);
        return container;
      }
    }

    // Fallback: look for any element with subtitle-related classes
    const allElements = document.querySelectorAll('*');
    for (const el of allElements) {
      const className = el.className;
      if (typeof className === 'string' && 
          (className.includes('subtitle') || className.includes('caption'))) {
        console.log(`[Disney Observer] Found fallback container:`, el);
        return el as HTMLElement;
      }
    }

    return null;
  }

  protected extractSubtitleText(container: HTMLElement): string {
    // Try multiple text extraction methods for Disney+
    const textSelectors = [
      '.subtitle-text',
      '.dss-subtitle-text',
      'span',
      'p',
      '.caption-text'
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

    // Fallback: get direct text content
    const directText = container.textContent?.trim();
    return directText || '';
  }
}
