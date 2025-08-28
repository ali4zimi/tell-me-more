// Base subtitle observer interface
import type { SubtitleEntry } from './SubtitleObserver';

export interface ISubtitleObserver {
  start(): void;
  stop(): void;
  updateSettings(settings: { subtitleMode: string; selectedLanguage: string }): void;
  getCapturedSubtitles(): string[];
  getSubtitleCount(): number;
  clearSubtitles(): void;
  setStorageCallback?(callback: (subtitle: string) => void): void;
}

export abstract class BaseSubtitleObserver implements ISubtitleObserver {
  protected lastSubtitle: string = '';
  protected observer: MutationObserver | null = null;
  protected capturedSubtitles: string[];
  protected settings: {
    subtitleMode: string;
    selectedLanguage: string;
  };
  protected retryInterval: number;
  protected storageCallback?: (subtitle: string) => void;
  private lastProcessTime: number = 0;
  private readonly MIN_PROCESS_INTERVAL = 200; // Reduced to 200ms for faster subtitle detection
  private processingTimeout: number | null = null;
  private pollingInterval: number | null = null;
  private lastContainer: HTMLElement | null = null;

  constructor(
    capturedSubtitles: string[], 
    settings: { subtitleMode: string; selectedLanguage: string },
    retryInterval: number = 1000
  ) {
    this.capturedSubtitles = capturedSubtitles;
    this.settings = settings;
    this.retryInterval = retryInterval;
  }

  public setStorageCallback(callback: (subtitle: string) => void): void {
    this.storageCallback = callback;
  }

  public start(): void {
    this.observeSubtitles();
  }

  public stop(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    
    if (this.processingTimeout) {
      clearTimeout(this.processingTimeout);
      this.processingTimeout = null;
    }
    
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    
    this.lastContainer = null;
  }

  public updateSettings(newSettings: Partial<{ subtitleMode: string; selectedLanguage: string }>): void {
    this.settings = { ...this.settings, ...newSettings };
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

  protected abstract getSubtitleContainer(): HTMLElement | null;
  protected abstract extractSubtitleText(container: HTMLElement): string;

  protected observeSubtitles(): void {
    const container = this.getSubtitleContainer();
    if (!container) {
      console.log(`[Subtitle Observer] Container not found, retrying in ${this.retryInterval}ms...`);
      setTimeout(() => this.observeSubtitles(), this.retryInterval);
      return;
    }

    console.log(`[Subtitle Observer] Found subtitle container:`, container);

    this.observer = new MutationObserver((mutations) => {
      // Debounce the processing to avoid rapid-fire calls
      if (this.processingTimeout) {
        clearTimeout(this.processingTimeout);
      }
      
      // Check if any mutations are relevant to subtitle text changes
      const hasRelevantChanges = mutations.some(mutation => {
        // Text content changes
        if (mutation.type === 'characterData') return true;
        
        // Child nodes added/removed (new subtitle spans)
        if (mutation.type === 'childList' && (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0)) {
          return true;
        }
        
        // Attribute changes that might affect visibility or content
        if (mutation.type === 'attributes' && 
            (mutation.attributeName === 'class' || 
             mutation.attributeName === 'style' || 
             mutation.attributeName === 'data-uia')) {
          return true;
        }
        
        return false;
      });
      
      if (hasRelevantChanges) {
        this.processingTimeout = window.setTimeout(() => {
          this.processSubtitleChanges(container);
          this.processingTimeout = null;
        }, 50); // Reduced to 50ms for faster response to subtitle changes
      }
    });

    // Observe the container with comprehensive options for subtitle text changes
    this.observer.observe(container, { 
      childList: true,           // Child elements added/removed
      subtree: true,             // Watch all descendants
      characterData: true,       // Text content changes
      characterDataOldValue: true, // Track old text values
      attributes: true,          // Attribute changes
      attributeOldValue: true,   // Track old attribute values
      attributeFilter: ['class', 'style', 'data-uia', 'aria-live'] // Netflix-specific attributes
    });

    // Also perform an initial check in case subtitle is already present
    setTimeout(() => {
      this.processSubtitleChanges(container);
    }, 100);

    // Store reference to current container
    this.lastContainer = container;
    
    // Set up polling as backup to catch any missed changes
    this.startPolling();
  }

  private startPolling(): void {
    // Poll every 500ms as backup to catch subtitle changes that MutationObserver might miss
    this.pollingInterval = window.setInterval(() => {
      if (this.lastContainer) {
        this.processSubtitleChanges(this.lastContainer);
      }
    }, 500);
  }

  protected processSubtitleChanges(container: HTMLElement): void {
    // Only process subtitles if mode is not 'Off'
    if (this.settings.subtitleMode === 'Off') return;

    const currentText = this.extractSubtitleText(container);
    const now = Date.now();

    // Skip empty or whitespace-only text
    if (!currentText || !currentText.trim()) {
      return;
    }

    // Normalize text for comparison (remove extra whitespace, trim)
    const normalizedCurrent = currentText.trim().replace(/\s+/g, ' ');
    const normalizedLast = this.lastSubtitle.trim().replace(/\s+/g, ' ');

    // Check if this is actually a new subtitle
    if (normalizedCurrent === normalizedLast) {
      // Same subtitle, skip processing
      return;
    }

    // Additional time-based throttling for safety
    if (now - this.lastProcessTime < this.MIN_PROCESS_INTERVAL) {
      console.log('[Subtitle Observer] Throttling: Too soon since last subtitle processing');
      return;
    }

    // This is a new subtitle, process it
    this.lastSubtitle = currentText;
    this.lastProcessTime = now;
    this.handleNewSubtitle(currentText);
  }

  protected handleNewSubtitle(text: string): void {
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

    // Call storage callback if provided (new storage system)
    if (this.storageCallback) {
      this.storageCallback(text);
    } else {
      // Fallback to old storage system for backward compatibility
      this.saveLegacySubtitle(text);
    }

    // Dispatch event for subtitle count update
    const event = new CustomEvent('crx-subtitle-captured', {
      detail: { 
        text,
        count: this.capturedSubtitles.length,
        entry: { text, language: this.settings.selectedLanguage, timestamp: new Date().toISOString() }
      }
    });
    document.dispatchEvent(event);
  }

  private saveLegacySubtitle(text: string): void {
    // Legacy storage method for backward compatibility
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
  }
}
