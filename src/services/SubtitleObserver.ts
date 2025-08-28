// Subtitle observer service for Movie Assistant
export interface SubtitleEntry {
  text: string;
  language: string;
  timestamp: string;
  mode: string;
}

export class SubtitleObserver {
  private lastSubtitle: string = '';
  private observer: MutationObserver | null = null;
  private capturedSubtitles: string[];
  private settings: {
    subtitleMode: string;
    selectedLanguage: string;
  };

  constructor(capturedSubtitles: string[], settings: { subtitleMode: string; selectedLanguage: string }) {
    this.capturedSubtitles = capturedSubtitles;
    this.settings = settings;
  }

  public start(): void {
    this.observeSubtitles();
  }

  public stop(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }

  public updateSettings(newSettings: Partial<{ subtitleMode: string; selectedLanguage: string }>): void {
    this.settings = { ...this.settings, ...newSettings };
  }

  private getSubtitleContainer(): HTMLElement | null {
    const videoPlayer = document.querySelector('.video-player-container');
    if (!videoPlayer) return null;

    const containers = videoPlayer.querySelectorAll('*');
    for (const el of containers) {
      if ((el as HTMLElement).shadowRoot) {
        const subtitle = (el as HTMLElement).shadowRoot!.querySelector('.player-timedtext') as HTMLElement;
        if (subtitle) return subtitle;
      }
    }
    return null;
  }

  private observeSubtitles(): void {
    const container = this.getSubtitleContainer();
    if (!container) {
      setTimeout(() => this.observeSubtitles(), 1000);
      return;
    }

    this.observer = new MutationObserver(() => {
      this.processSubtitleChanges(container);
    });

    this.observer.observe(container, { childList: true, subtree: true });
  }

  private processSubtitleChanges(container: HTMLElement): void {
    // Only process subtitles if mode is not 'Off'
    if (this.settings.subtitleMode === 'Off') return;

    const textElements = container.querySelectorAll('.player-timedtext-text-container span');
    const currentText = Array.from(textElements).map(el => el.textContent?.trim()).join(' ').trim();

    if (currentText && currentText !== this.lastSubtitle) {
      this.lastSubtitle = currentText;
      this.handleNewSubtitle(currentText);
    }
  }

  private handleNewSubtitle(text: string): void {
    // Add to captured subtitles for AI context
    this.capturedSubtitles.push(text);
    
    // Keep only the last 50 subtitles to manage memory
    if (this.capturedSubtitles.length > 50) {
      this.capturedSubtitles.splice(0, this.capturedSubtitles.length - 50);
    }
    
    // Only log to console if not in 'On (hidden)' mode
    if (this.settings.subtitleMode === 'On') {
      console.log('[Movie Assistant Subtitle]', text);
    }

    // Save to local storage with language info
    const subtitleEntry: SubtitleEntry = {
      text: text,
      language: this.settings.selectedLanguage,
      timestamp: new Date().toISOString(),
      mode: this.settings.subtitleMode
    };

    chrome.storage.local.get({ netflixSubs: [] }, (res) => {
      const updated = [...res.netflixSubs, subtitleEntry];
      chrome.storage.local.set({ netflixSubs: updated });
    });

    // Dispatch event for subtitle count update
    const event = new CustomEvent('crx-subtitle-captured', {
      detail: { 
        text,
        count: this.capturedSubtitles.length,
        entry: subtitleEntry
      }
    });
    document.dispatchEvent(event);
  }

  public getCapturedSubtitles(): string[] {
    return [...this.capturedSubtitles];
  }

  public getSubtitleCount(): number {
    return this.capturedSubtitles.length;
  }

  public clearSubtitles(): void {
    this.capturedSubtitles.length = 0;
    this.lastSubtitle = '';
  }
}
