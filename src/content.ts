// TellMeMore Content Script - Modular Version
import { OverlayInterface } from './components/OverlayInterface';
import { AIChatInterface } from './components/AIChatInterface';
import { SubtitleObserverFactory } from './services/SubtitleObserverFactory';
import { PlatformDetectionService } from './services/PlatformDetectionService';
import { AIResponseService } from './services/AIResponseService';
import { SubtitleStorageManager, type SubtitleEntry } from './utils/subtitleStorage';
import { getStorageData, setStorageData } from './utils/storage';
import type { ISubtitleObserver } from './services/BaseSubtitleObserver';

// Application state
class TellMeMoreApp {
  private overlayInterface: OverlayInterface | null = null;
  private aiChatInterface: AIChatInterface | null = null;
  private subtitleObserver: ISubtitleObserver | null = null;
  private subtitleStorage: SubtitleStorageManager;
  private currentSessionId: string | null = null;
  private capturedSubtitles: string[] = [];
  private lastSavedSubtitle: string = '';
  private lastSavedTime: number = 0;
  private readonly MIN_SAVE_INTERVAL = 1000; // Minimum 1 second between saves of same subtitle
  private settings = {
    subtitleMode: 'On',
    selectedLanguage: 'English',
    overlayPosition: 'top-right',
    overlayOpacity: 0.8,
    aiProvider: 'OpenAI',
    aiModel: 'gpt-3.5-turbo',
    apiKey: ''
  };

  constructor() {
    this.subtitleStorage = SubtitleStorageManager.getInstance();
    this.initialize();
  }

  private async initialize(): Promise<void> {
    // Load settings from storage
    await this.loadSettings();
    
    // Initialize components
    this.initializeComponents();
    
    // Set up event listeners
    this.setupEventListeners();
  }

  private async loadSettings(): Promise<void> {
    try {
      const data = await getStorageData({
        subtitleMode: 'On',
        selectedLanguage: 'English',
        overlayPosition: 'top-right',
        overlayOpacity: 0.8,
        aiProvider: 'OpenAI',
        aiModel: 'gpt-3.5-turbo',
        apiKey: ''
      });
      
      this.settings = { ...this.settings, ...data };
    } catch (error) {
      console.warn('[TellMeMore] Failed to load settings:', error);
    }
  }

  private async initializeComponents(): Promise<void> {
    // Check if platform is supported
    const platformService = PlatformDetectionService.getInstance();
    if (!platformService.isSupportedPlatform()) {
      console.warn('[TellMeMore] Unsupported platform detected');
      return;
    }

    const platform = platformService.detectCurrentPlatform();
    console.log(`[TellMeMore] Initializing for platform: ${platform?.name || 'unknown'}`);

    // Start a new subtitle session
    if (platform) {
      try {
        this.currentSessionId = await this.subtitleStorage.startSession(
          platform.name,
          window.location.href,
          this.extractMovieTitle()
        );
        const movieTitle = this.extractMovieTitle();
        console.log(`[TellMeMore] 🎬 New viewing session started on ${platform.name.toUpperCase()}`);
        console.log(`[TellMeMore] 📝 Session ID: ${this.currentSessionId}`);
        if (movieTitle) {
          console.log(`[TellMeMore] 🎭 Content: ${movieTitle}`);
        }
        console.log(`[TellMeMore] 🔍 Subtitle capture is active - subtitles will be saved automatically`);
      } catch (error) {
        console.warn('[TellMeMore] Failed to start session:', error);
      }
    }

    // Initialize overlay interface
    this.overlayInterface = new OverlayInterface(this.settings, this.capturedSubtitles);
    
    // Initialize AI chat interface
    this.aiChatInterface = new AIChatInterface(this.capturedSubtitles);
    
    // Render components to DOM
    this.renderComponents();
    
    // Initialize platform-specific subtitle observer
    const factory = SubtitleObserverFactory.getInstance();
    this.subtitleObserver = factory.createObserver(this.capturedSubtitles, {
      subtitleMode: this.settings.subtitleMode,
      selectedLanguage: this.settings.selectedLanguage
    });
    
    // Set up storage callback for the new storage system
    if (this.subtitleObserver && this.subtitleObserver.setStorageCallback) {
      this.subtitleObserver.setStorageCallback((subtitle: string) => {
        this.saveSubtitleToStorage(subtitle);
      });
    }
    
    // Start subtitle observation
    if (this.subtitleObserver) {
      this.subtitleObserver.start();
    }
  }

  private extractMovieTitle(): string | undefined {
    // Try to extract movie title from page title or other elements
    let title = document.title;
    
    // Clean up common patterns in titles
    title = title.replace(/\s*-\s*(Netflix|Disney\+|Prime Video|Amazon).*$/i, '');
    title = title.replace(/\s*\|\s*(Netflix|Disney\+|Prime Video|Amazon).*$/i, '');
    title = title.replace(/^(Watch\s+)?(.+)(\s+on\s+.+)?$/i, '$2');
    
    return title.trim() || undefined;
  }

  private async saveSubtitleToStorage(subtitle: string): Promise<void> {
    if (!this.currentSessionId || !subtitle.trim()) {
      console.log('[TellMeMore] Skipping subtitle save - no session or empty subtitle');
      return;
    }

    const now = Date.now();
    const normalizedSubtitle = subtitle.trim().replace(/\s+/g, ' ');
    
    // Additional duplicate protection at the app level
    if (normalizedSubtitle === this.lastSavedSubtitle && (now - this.lastSavedTime) < this.MIN_SAVE_INTERVAL) {
      console.log('[TellMeMore] Skipping duplicate subtitle save within minimum interval');
      return;
    }

    try {
      const platformService = PlatformDetectionService.getInstance();
      const platform = platformService.detectCurrentPlatform();
      
      const subtitleEntry: Omit<SubtitleEntry, 'id'> = {
        text: subtitle.trim(),
        platform: (platform?.name as any) || 'other',
        timestamp: now,
        sessionId: this.currentSessionId,
        url: window.location.href,
        movieTitle: this.extractMovieTitle()
      };

      console.log(`[TellMeMore] 💬 Subtitle captured: "${subtitle.substring(0, 50)}${subtitle.length > 50 ? '...' : ''}"`);

      await this.subtitleStorage.saveSubtitle(subtitleEntry);
      
      // Update tracking variables
      this.lastSavedSubtitle = normalizedSubtitle;
      this.lastSavedTime = now;
    } catch (error) {
      console.warn('[TellMeMore] Failed to save subtitle:', error);
    }
  }

  private renderComponents(): void {
    // Render overlay interface
    if (this.overlayInterface) {
      const overlayElement = this.overlayInterface.render();
      document.body.appendChild(overlayElement);
    }
    
    // Render AI chat interface
    if (this.aiChatInterface) {
      const chatElement = this.aiChatInterface.render();
      document.body.appendChild(chatElement);
    }
  }

  private setupEventListeners(): void {
    // Listen for settings changes
    document.addEventListener('crx-settings-changed', (event: any) => {
      this.handleSettingsChange(event.detail);
    });

    // Listen for AI chat toggle
    document.addEventListener('crx-openChat', () => {
      console.log('[TellMeMore] Opening AI chat');
      if (this.aiChatInterface) {
        this.aiChatInterface.open();
        // Update statistics in the chat interface
        this.updateChatStatistics();
      }
    });

    // Listen for AI questions
    document.addEventListener('crx-ai-question', async (event: any) => {
      const { question, context } = event.detail;
      try {
        const aiService = AIResponseService.getInstance();
        const response = await aiService.getAIResponse(question, context);
        this.aiChatInterface?.receiveAIResponse(response);
      } catch (error) {
        console.error('[TellMeMore] AI response error:', error);
        this.aiChatInterface?.receiveAIResponse('Sorry, I encountered an error processing your question.');
      }
    });

    // Listen for subtitle capture events
    document.addEventListener('crx-subtitle-captured', (event: any) => {
      this.handleSubtitleCaptured(event.detail);
    });

    // Listen for storage changes
    chrome.storage.onChanged.addListener((changes) => {
      this.handleStorageChanges(changes);
    });

    // Handle page unload to end session
    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });

    // Note: Removed visibilitychange cleanup as it was too aggressive
    // and stopped subtitle observation when switching tabs
  }

  private async cleanup(): Promise<void> {
    if (this.currentSessionId) {
      try {
        await this.subtitleStorage.endSession(this.currentSessionId);
        console.log(`[TellMeMore] 🎬 Viewing session ended - ID: ${this.currentSessionId}`);
        console.log(`[TellMeMore] 📊 Session data has been saved. View captured subtitles in the extension options.`);
      } catch (error) {
        console.warn('[TellMeMore] Failed to end session:', error);
      }
    }
    
    if (this.subtitleObserver) {
      this.subtitleObserver.stop();
      console.log('[TellMeMore] 🔍 Subtitle observer stopped');
    }
  }

  private updateChatStatistics(): void {
    if (this.aiChatInterface && this.currentSessionId) {
      const platform = PlatformDetectionService.getInstance().detectCurrentPlatform();
      const sessionInfo = `Active session on ${platform?.name || 'unknown'} platform`;
      this.aiChatInterface.updateStatistics(this.capturedSubtitles.length, sessionInfo);
    }
  }

  private async handleSettingsChange(newSettings: any): Promise<void> {
    // Update internal settings
    this.settings = { ...this.settings, ...newSettings };
    
    // Save to storage
    await setStorageData(this.settings);
    
    // Update components - overlay interface no longer has updateSettings
    // Only update subtitle observer
    this.subtitleObserver?.updateSettings({
      subtitleMode: this.settings.subtitleMode,
      selectedLanguage: this.settings.selectedLanguage
    });

    // Update overlay interface position and opacity manually if needed
    if (this.overlayInterface && (newSettings.overlayPosition || newSettings.overlayOpacity)) {
      this.overlayInterface.updateSettings({
        overlayPosition: this.settings.overlayPosition,
        overlayOpacity: this.settings.overlayOpacity,
        subtitleMode: this.settings.subtitleMode,
        selectedLanguage: this.settings.selectedLanguage
      });
    }
  }

  private handleSubtitleCaptured(_detail: any): void {
    // Components are updated automatically through the captured subtitles array
    // which is shared between all components
  }

  private handleStorageChanges(changes: any): void {
    const relevantChanges: any = {};
    
    Object.keys(changes).forEach(key => {
      if (key in this.settings) {
        relevantChanges[key] = changes[key].newValue;
      }
    });
    
    if (Object.keys(relevantChanges).length > 0) {
      this.handleSettingsChange(relevantChanges);
    }
  }

  public destroy(): void {
    this.subtitleObserver?.stop();
    // Components will be cleaned up when the page unloads
  }
}

// Initialize the application
if (!document.getElementById('crx-custom-menu')) {
  const app = new TellMeMoreApp();
  
  // Clean up on page unload
  window.addEventListener('beforeunload', () => {
    app.destroy();
  });
}