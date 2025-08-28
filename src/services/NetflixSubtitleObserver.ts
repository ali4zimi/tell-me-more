// Netflix-specific subtitle observer
import { BaseSubtitleObserver } from './BaseSubtitleObserver';

export class NetflixSubtitleObserver extends BaseSubtitleObserver {
  private checkInterval: number | null = null;

  public start(): void {
    // Start the base observer
    super.start();
    
    // Also start a periodic check for subtitle containers since they appear dynamically
    this.startPeriodicCheck();
  }

  public stop(): void {
    super.stop();
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  private startPeriodicCheck(): void {
    // Check every 2 seconds for subtitle containers
    this.checkInterval = window.setInterval(() => {
      const container = this.getSubtitleContainer();
      
      if (!container) {
        // Container disappeared, stop observer but keep state
        if (this.observer) {
          console.log('[Netflix Observer] Subtitle container disappeared, stopping observer...');
          this.observer.disconnect();
          this.observer = null;
        }
      } else if (!this.observer) {
        // Container exists but we don't have an observer, start observing
        console.log('[Netflix Observer] Starting observation on found container...');
        this.observeSubtitles();
      }
      // If both container exists AND observer exists, do nothing (let it continue normally)
    }, 2000);
  }

  protected getSubtitleContainer(): HTMLElement | null {
    // Target the stable parent container that never disappears
    const parentContainer = document.querySelector('.player-timedtext') as HTMLElement;
    if (parentContainer) {
      console.log('[Netflix Observer] Found stable parent container .player-timedtext');
      return parentContainer;
    }

    console.log('[Netflix Observer] Parent container .player-timedtext not found, trying fallbacks...');

    // Fallback: Check video player container
    const videoPlayer = document.querySelector('.video-player-container');
    if (!videoPlayer) {
      console.log('[Netflix Observer] No video player container found');
      return null;
    }

    // Fallback: Netflix might use Shadow DOM for subtitles in some cases
    const containers = videoPlayer.querySelectorAll('*');
    for (const el of containers) {
      if ((el as HTMLElement).shadowRoot) {
        const subtitle = (el as HTMLElement).shadowRoot!.querySelector('.player-timedtext') as HTMLElement;
        if (subtitle) {
          console.log('[Netflix Observer] Found parent container in shadow DOM');
          return subtitle;
        }
      }
    }
    
    console.log('[Netflix Observer] No subtitle container found anywhere');
    return null;
  }

  protected extractSubtitleText(container: HTMLElement): string {
    // Look for the actual text container within the parent container
    const textContainer = container.querySelector('.player-timedtext-text-container') as HTMLElement;
    
    if (textContainer) {
      // Get text from the text container
      const subtitleText = textContainer.innerText || textContainer.textContent || '';
      const cleanText = subtitleText.trim();
      
      if (cleanText) {
        console.log(`[Netflix Observer] Extracted text from text container: "${cleanText}"`);
      }
      
      return cleanText;
    }
    
    // Fallback: try to get text directly from any child elements
    const subtitleText = container.innerText || container.textContent || '';
    const cleanText = subtitleText.trim();
    
    if (cleanText) {
      console.log(`[Netflix Observer] Extracted text from parent container: "${cleanText}"`);
    }
    
    return cleanText;
  }
}
