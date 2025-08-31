// Options page functionality
import { SubtitleStorageManager, type SubtitleEntry } from './utils/subtitleStorage';

interface AppSettings {
  subtitleMode: string;
  selectedLanguage: string;
  autoDetectMovie: boolean;
  aiResponseStyle: string;
  maxContextLength: string;
  spoilerProtection: boolean;
  aiPlatform: string;
  apiKey: string;
  backendEndpoint: string;
  overlayPosition: string;
  overlayOpacity: number;
  autoHideOverlay: boolean;
}

const defaultSettings: AppSettings = {
  subtitleMode: 'On',
  selectedLanguage: 'English',
  autoDetectMovie: true,
  aiResponseStyle: 'detailed',
  maxContextLength: '1000',
  spoilerProtection: true,
  aiPlatform: 'openai',
  apiKey: '',
  backendEndpoint: '',
  overlayPosition: 'top-right',
  overlayOpacity: 0.8,
  autoHideOverlay: true
};

class SubtitleViewer {
  private storageManager: SubtitleStorageManager;
  private currentPage = 1;
  private pageSize = 50;
  private currentPlatformFilter = 'all';
  private currentContentTypeFilter = 'all';
  private currentSeasonFilter = 0; // 0 means all seasons
  private currentEpisodeFilter = 0; // 0 means all episodes
  private currentSearchTerm = '';

  constructor() {
    this.storageManager = SubtitleStorageManager.getInstance();
    this.initializeEventListeners();
    this.updateFilterVisibility();
    this.populateSeasonFilter();
    this.populateEpisodeFilter();
    this.loadSubtitles();
  }

  private initializeEventListeners(): void {
    // Refresh button
    document.getElementById('refreshSubtitles')?.addEventListener('click', () => {
      this.populateEpisodeFilter();
      this.loadSubtitles();
    });

    // Clear subtitles button
    document.getElementById('clearSubtitles')?.addEventListener('click', () => {
      this.clearSubtitles();
    });

    // Export subtitles button
    document.getElementById('exportSubtitles')?.addEventListener('click', () => {
      this.exportSubtitles();
    });

    // Platform filter
    document.getElementById('platformFilter')?.addEventListener('change', (e) => {
      this.currentPlatformFilter = (e.target as HTMLSelectElement).value;
      this.currentPage = 1;
      this.loadSubtitles();
    });

    // Content type filter
    document.getElementById('contentTypeFilter')?.addEventListener('change', (e) => {
      this.currentContentTypeFilter = (e.target as HTMLSelectElement).value;
      this.currentPage = 1;
      this.updateFilterVisibility();
      this.populateSeasonFilter();
      this.populateEpisodeFilter();
      this.loadSubtitles();
    });

    // Season filter
    document.getElementById('seasonFilter')?.addEventListener('change', (e) => {
      this.currentSeasonFilter = parseInt((e.target as HTMLSelectElement).value) || 0;
      this.currentPage = 1;
      this.populateEpisodeFilter();
      this.loadSubtitles();
    });

    // Episode filter
    document.getElementById('episodeFilter')?.addEventListener('change', (e) => {
      this.currentEpisodeFilter = parseInt((e.target as HTMLSelectElement).value) || 0;
      this.currentPage = 1;
      this.loadSubtitles();
    });

    // Search input
    const searchInput = document.getElementById('searchSubtitles') as HTMLInputElement;
    if (searchInput) {
      let searchTimeout: number;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = window.setTimeout(() => {
          this.currentSearchTerm = (e.target as HTMLInputElement).value;
          this.currentPage = 1;
          this.loadSubtitles();
        }, 300);
      });
    }

    // Pagination
    document.getElementById('prevPage')?.addEventListener('click', () => {
      if (this.currentPage > 1) {
        this.currentPage--;
        this.loadSubtitles();
      }
    });

    document.getElementById('nextPage')?.addEventListener('click', () => {
      this.currentPage++;
      this.loadSubtitles();
    });
  }

  private async populateEpisodeFilter(): Promise<void> {
    try {
      const allSubtitles = await this.storageManager.getAllSubtitles();
      const episodeNumbers = new Set<number>();
      
      allSubtitles.forEach(subtitle => {
        // Only include episodes that match current filters
        let includeEpisode = true;
        
        // Platform filter
        if (this.currentPlatformFilter !== 'all' && subtitle.platform !== this.currentPlatformFilter) {
          includeEpisode = false;
        }
        
        // Content type filter
        if (this.currentContentTypeFilter !== 'all' && subtitle.contentType !== this.currentContentTypeFilter) {
          includeEpisode = false;
        }
        
        // Season filter (only apply if a specific season is selected)
        if (this.currentSeasonFilter > 0 && subtitle.seasonNumber !== this.currentSeasonFilter) {
          includeEpisode = false;
        }
        
        // Only include if it's a series with episode number
        if (subtitle.contentType === 'series' && subtitle.episodeNumber && subtitle.episodeNumber > 0 && includeEpisode) {
          episodeNumbers.add(subtitle.episodeNumber);
        }
      });

      const episodeFilter = document.getElementById('episodeFilter') as HTMLSelectElement;
      if (episodeFilter) {
        // Clear existing options except "All Episodes"
        episodeFilter.innerHTML = '<option value="0">All Episodes</option>';
        
        // Add options for found episodes
        if (episodeNumbers.size > 0) {
          const sortedEpisodes = Array.from(episodeNumbers).sort((a, b) => a - b);
          sortedEpisodes.forEach(episodeNum => {
            const option = document.createElement('option');
            option.value = episodeNum.toString();
            option.textContent = `Episode ${episodeNum}`;
            episodeFilter.appendChild(option);
          });
        }
      }
    } catch (error) {
      console.error('Failed to populate episode filter:', error);
    }
  }

  private updateFilterVisibility(): void {
    const seasonFilter = document.getElementById('seasonFilter') as HTMLSelectElement;
    const episodeFilter = document.getElementById('episodeFilter') as HTMLSelectElement;
    
    if (!seasonFilter || !episodeFilter) return;

    if (this.currentContentTypeFilter === 'series') {
      // Show season filter for series
      seasonFilter.style.display = 'inline-block';
      
      // Show episode filter only if a specific season is selected or if there are episodes
      if (this.currentSeasonFilter > 0) {
        episodeFilter.style.display = 'inline-block';
      } else {
        // For "All Seasons", show episode filter if there are any episodes
        episodeFilter.style.display = 'inline-block';
      }
    } else {
      // Hide both filters for movies, documentaries, and other content types
      seasonFilter.style.display = 'none';
      episodeFilter.style.display = 'none';
      
      // Reset filter values
      this.currentSeasonFilter = 0;
      this.currentEpisodeFilter = 0;
      seasonFilter.value = '0';
      episodeFilter.value = '0';
    }
  }

  private async populateSeasonFilter(): Promise<void> {
    try {
      const allSubtitles = await this.storageManager.getAllSubtitles();
      const seasonNumbers = new Set<number>();
      
      // Only get seasons for series content type
      allSubtitles.forEach(subtitle => {
        if (subtitle.contentType === 'series' && subtitle.seasonNumber && subtitle.seasonNumber > 0) {
          // Apply platform filter if needed
          if (this.currentPlatformFilter === 'all' || subtitle.platform === this.currentPlatformFilter) {
            seasonNumbers.add(subtitle.seasonNumber);
          }
        }
      });

      const seasonFilter = document.getElementById('seasonFilter') as HTMLSelectElement;
      if (seasonFilter) {
        // Clear existing options except "All Seasons"
        seasonFilter.innerHTML = '<option value="0">All Seasons</option>';
        
        // Add options for found seasons
        if (seasonNumbers.size > 0) {
          const sortedSeasons = Array.from(seasonNumbers).sort((a, b) => a - b);
          sortedSeasons.forEach(seasonNum => {
            const option = document.createElement('option');
            option.value = seasonNum.toString();
            option.textContent = `Season ${seasonNum}`;
            seasonFilter.appendChild(option);
          });
        }
      }
    } catch (error) {
      console.error('Failed to populate season filter:', error);
    }
  }

  private async loadSubtitles(): Promise<void> {
    const subtitleTable = document.getElementById('subtitleTable') as HTMLTableElement;
    const subtitleTableBody = document.getElementById('subtitleTableBody') as HTMLTableSectionElement;
    const emptyState = document.getElementById('emptyState') as HTMLElement;
    
    if (!subtitleTable || !subtitleTableBody || !emptyState) return;

    // Show loading state
    subtitleTable.style.display = 'none';
    emptyState.style.display = 'flex';
    emptyState.innerHTML = `
      <div class="loading-subtitles">
        <div class="loading-spinner"></div>
        <div class="loading-text">Loading subtitles...</div>
      </div>
    `;

    try {
      console.log('[Options] Loading subtitles with filters:', {
        page: this.currentPage,
        pageSize: this.pageSize,
        platform: this.currentPlatformFilter,
        contentType: this.currentContentTypeFilter,
        episodeNumber: this.currentEpisodeFilter || undefined,
        search: this.currentSearchTerm
      });
      
      const result = await this.storageManager.getSubtitles({
        page: this.currentPage,
        pageSize: this.pageSize,
        platform: this.currentPlatformFilter,
        contentType: this.currentContentTypeFilter,
        seasonNumber: this.currentSeasonFilter || undefined,
        episodeNumber: this.currentEpisodeFilter || undefined,
        search: this.currentSearchTerm
      });

      console.log('[Options] Loaded subtitles:', result);
      this.renderSubtitles(result.subtitles);
      this.updatePagination(result.pageCount, result.totalCount);
      this.updateViewerStats(result.totalCount);

    } catch (error) {
      console.error('Failed to load subtitles:', error);
      subtitleTable.style.display = 'none';
      emptyState.style.display = 'flex';
      emptyState.innerHTML = `
        <div class="empty-icon">⚠️</div>
        <h3>Failed to load subtitles</h3>
        <p>There was an error loading the subtitle data.</p>
      `;
    }
  }

  private renderSubtitles(subtitles: SubtitleEntry[]): void {
    console.log('[Options] Rendering subtitles:', subtitles.length, 'entries');
    
    const subtitleTable = document.getElementById('subtitleTable') as HTMLTableElement;
    const subtitleTableBody = document.getElementById('subtitleTableBody') as HTMLTableSectionElement;
    const emptyState = document.getElementById('emptyState') as HTMLElement;
    
    if (!subtitleTable || !subtitleTableBody || !emptyState) {
      console.error('[Options] Missing table elements:', { subtitleTable: !!subtitleTable, subtitleTableBody: !!subtitleTableBody, emptyState: !!emptyState });
      return;
    }

    if (subtitles.length === 0) {
      subtitleTable.style.display = 'none';
      emptyState.style.display = 'flex';
      emptyState.innerHTML = `
        <div class="empty-icon">📝</div>
        <h3>No subtitles found</h3>
        <p>No subtitles match your current filters.</p>
      `;
      return;
    }

    // Show table and hide empty state
    subtitleTable.style.display = 'table';
    emptyState.style.display = 'none';

    // Clear existing rows
    subtitleTableBody.innerHTML = '';

    // Generate table rows
    const subtitlesHTML = subtitles.map(subtitle => {
      const systemTimestamp = new Date(subtitle.dateCaptured).toLocaleString();
      const platformClass = subtitle.platform.toLowerCase();
      
      // Format video timestamp
      let videoTimestampHtml = '';
      if (subtitle.timestamp !== undefined) {
        const minutes = Math.floor(subtitle.timestamp / 60);
        const seconds = subtitle.timestamp % 60;
        const timeStr = `${minutes}:${String(seconds).padStart(2, '0')}`;
        videoTimestampHtml = `<span class="video-timestamp-cell">${timeStr}</span>`;
      } else {
        videoTimestampHtml = `<span class="video-timestamp-cell no-timestamp">--:--</span>`;
      }
      
      // Format content type and episode info
      let contentInfo = '';
      if (subtitle.contentType) {
        const contentTypeIcon = this.getContentTypeIcon(subtitle.contentType);
        contentInfo += `<span class="content-type">${contentTypeIcon} ${subtitle.contentType.toUpperCase()}</span><br>`;
        
        if (subtitle.contentType === 'series' && subtitle.episodeNumber) {
          contentInfo += `<span class="episode-info">S${subtitle.seasonNumber || 1}E${subtitle.episodeNumber}</span><br>`;
        }
      }
      
      // Platform info
      const platformInfo = `<span class="subtitle-platform ${platformClass}">${this.getPlatformIcon(subtitle.platform)} ${subtitle.platform.toUpperCase()}</span><br>`;
      
      // Movie/episode title
      let titleInfo = '';
      if (subtitle.movieTitle) {
        titleInfo += `<span class="movie-title">🎬 ${this.escapeHtml(subtitle.movieTitle)}</span>`;
      }
      if (subtitle.episodeTitle) {
        titleInfo += `<br><span class="movie-title">📺 ${this.escapeHtml(subtitle.episodeTitle)}</span>`;
      }
      
      return `
        <tr>
          <td class="video-timestamp-cell">${videoTimestampHtml}</td>
          <td class="content-cell">${this.escapeHtml(subtitle.text)}</td>
          <td class="date-captured-cell">${systemTimestamp}</td>
          <td class="info-cell">
            ${platformInfo}
            ${contentInfo}
            ${titleInfo}
          </td>
        </tr>
      `;
    }).join('');

    subtitleTableBody.innerHTML = subtitlesHTML;
  }

  private updatePagination(pageCount: number, totalCount: number): void {
    const prevBtn = document.getElementById('prevPage') as HTMLButtonElement;
    const nextBtn = document.getElementById('nextPage') as HTMLButtonElement;
    const pageInfo = document.getElementById('pageInfo');

    if (prevBtn) prevBtn.disabled = this.currentPage <= 1;
    if (nextBtn) nextBtn.disabled = this.currentPage >= pageCount;
    if (pageInfo) pageInfo.textContent = `Page ${this.currentPage} of ${Math.max(1, pageCount)} (${totalCount} total)`;
  }

  private updateViewerStats(totalCount: number): void {
    const viewerCount = document.getElementById('subtitleViewerCount');
    if (viewerCount) {
      viewerCount.textContent = `${totalCount} subtitle${totalCount !== 1 ? 's' : ''} captured`;
    }
  }

  private async clearSubtitles(): Promise<void> {
    if (!confirm('Are you sure you want to clear all captured subtitles? This action cannot be undone.')) {
      return;
    }

    try {
      await this.storageManager.clearAllSubtitles();
      this.currentPage = 1;
      this.loadSubtitles();
      this.showNotification('All subtitles cleared successfully!', 'success');
    } catch (error) {
      console.error('Failed to clear subtitles:', error);
      this.showNotification('Failed to clear subtitles.', 'error');
    }
  }

  private async exportSubtitles(): Promise<void> {
    try {
      const data = await this.storageManager.exportSubtitles('json');
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `movie-assistant-subtitles-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.showNotification('Subtitles exported successfully!', 'success');
    } catch (error) {
      console.error('Failed to export subtitles:', error);
      this.showNotification('Failed to export subtitles.', 'error');
    }
  }

  private getPlatformIcon(platform: string): string {
    const icons: Record<string, string> = {
      netflix: '📺',
      disney: '🏰',
      amazon: '📦',
      youtube: '▶️',
      other: '🎬'
    };
    return icons[platform.toLowerCase()] || icons.other;
  }

  private getContentTypeIcon(contentType: string): string {
    const icons: Record<string, string> = {
      movie: '🎬',
      series: '📺',
      documentary: '📹',
      other: '🎭'
    };
    return icons[contentType.toLowerCase()] || icons.other;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private showNotification(message: string, type: 'success' | 'error' = 'success'): void {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#00b894' : '#e17055'};
      color: white;
      padding: 15px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
      z-index: 10001;
      font-weight: 500;
      animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'slideIn 0.3s ease reverse';
      setTimeout(() => {
        notification.remove();
      }, 300);
    }, 3000);
  }
}

class OptionsManager {
  private settings: AppSettings = defaultSettings;

  constructor() {
    // Initialize subtitle viewer
    new SubtitleViewer();
    this.loadSettings();
    this.initializeEventListeners();
    this.updateStats();
  }

  private async loadSettings(): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.get(defaultSettings, (result) => {
        this.settings = { ...defaultSettings, ...result };
        this.updateUI();
        resolve();
      });
    });
  }

  private saveSettings(): void {
    chrome.storage.local.set(this.settings, () => {
      console.log('Settings saved:', this.settings);
    });
  }

  private updateUI(): void {
    // Update all form elements with current settings
    const elements = {
      subtitleMode: document.getElementById('subtitleMode') as HTMLSelectElement,
      selectedLanguage: document.getElementById('selectedLanguage') as HTMLSelectElement,
      autoDetectMovie: document.getElementById('autoDetectMovie') as HTMLInputElement,
      aiResponseStyle: document.getElementById('aiResponseStyle') as HTMLSelectElement,
      maxContextLength: document.getElementById('maxContextLength') as HTMLSelectElement,
      spoilerProtection: document.getElementById('spoilerProtection') as HTMLInputElement,
      aiPlatform: document.getElementById('aiPlatform') as HTMLSelectElement,
      apiKey: document.getElementById('apiKey') as HTMLInputElement,
      backendEndpoint: document.getElementById('backendEndpoint') as HTMLInputElement,
      overlayPosition: document.getElementById('overlayPosition') as HTMLSelectElement,
      overlayOpacity: document.getElementById('overlayOpacity') as HTMLInputElement,
      autoHideOverlay: document.getElementById('autoHideOverlay') as HTMLInputElement,
    };

    Object.entries(elements).forEach(([key, element]) => {
      if (element) {
        if (element.type === 'checkbox') {
          element.checked = this.settings[key as keyof AppSettings] as boolean;
        } else {
          element.value = String(this.settings[key as keyof AppSettings]);
        }
      }
    });

    // Update opacity display
    this.updateOpacityDisplay();
  }

  private initializeEventListeners(): void {
    // Setting change listeners
    document.getElementById('subtitleMode')?.addEventListener('change', (e) => {
      this.settings.subtitleMode = (e.target as HTMLSelectElement).value;
      this.saveSettings();
    });

    document.getElementById('selectedLanguage')?.addEventListener('change', (e) => {
      this.settings.selectedLanguage = (e.target as HTMLSelectElement).value;
      this.saveSettings();
    });

    document.getElementById('autoDetectMovie')?.addEventListener('change', (e) => {
      this.settings.autoDetectMovie = (e.target as HTMLInputElement).checked;
      this.saveSettings();
    });

    document.getElementById('aiResponseStyle')?.addEventListener('change', (e) => {
      this.settings.aiResponseStyle = (e.target as HTMLSelectElement).value;
      this.saveSettings();
    });

    document.getElementById('maxContextLength')?.addEventListener('change', (e) => {
      this.settings.maxContextLength = (e.target as HTMLSelectElement).value;
      this.saveSettings();
    });

    document.getElementById('spoilerProtection')?.addEventListener('change', (e) => {
      this.settings.spoilerProtection = (e.target as HTMLInputElement).checked;
      this.saveSettings();
    });

    document.getElementById('aiPlatform')?.addEventListener('change', (e) => {
      this.settings.aiPlatform = (e.target as HTMLSelectElement).value;
      this.saveSettings();
    });

    document.getElementById('apiKey')?.addEventListener('input', (e) => {
      this.settings.apiKey = (e.target as HTMLInputElement).value;
      this.saveSettings();
    });

    document.getElementById('backendEndpoint')?.addEventListener('input', (e) => {
      this.settings.backendEndpoint = (e.target as HTMLInputElement).value;
      this.saveSettings();
    });

    document.getElementById('overlayPosition')?.addEventListener('change', (e) => {
      this.settings.overlayPosition = (e.target as HTMLSelectElement).value;
      this.saveSettings();
    });

    document.getElementById('overlayOpacity')?.addEventListener('input', (e) => {
      this.settings.overlayOpacity = parseFloat((e.target as HTMLInputElement).value);
      this.updateOpacityDisplay();
      this.saveSettings();
    });

    document.getElementById('autoHideOverlay')?.addEventListener('change', (e) => {
      this.settings.autoHideOverlay = (e.target as HTMLInputElement).checked;
      this.saveSettings();
    });

    // Action button listeners
    document.getElementById('exportData')?.addEventListener('click', () => {
      this.exportData();
    });

    document.getElementById('clearData')?.addEventListener('click', () => {
      this.clearData();
    });

    // Footer link listeners
    document.getElementById('aboutLink')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.showAbout();
    });

    document.getElementById('privacyLink')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.showPrivacy();
    });

    document.getElementById('supportLink')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.showSupport();
    });
  }

  private updateOpacityDisplay(): void {
    const rangeValue = document.querySelector('.range-value');
    if (rangeValue) {
      rangeValue.textContent = `${Math.round(this.settings.overlayOpacity * 100)}%`;
    }
  }

  private updateStats(): void {
    chrome.storage.local.get(['netflixSubs', 'aiConversations', 'analyzedMovies'], (result) => {
      const subtitleCount = (result.netflixSubs || []).length;
      const conversationCount = (result.aiConversations || []).length;
      const movieCount = (result.analyzedMovies || []).length;

      document.getElementById('subtitleCount')!.textContent = subtitleCount.toString();
      document.getElementById('conversationCount')!.textContent = conversationCount.toString();
      document.getElementById('movieCount')!.textContent = movieCount.toString();
    });
  }

  private exportData(): void {
    chrome.storage.local.get(['netflixSubs', 'aiConversations', 'analyzedMovies'], (result) => {
      const data = {
        subtitles: result.netflixSubs || [],
        conversations: result.aiConversations || [],
        movies: result.analyzedMovies || [],
        settings: this.settings,
        exportDate: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `movie-assistant-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.showNotification('Data exported successfully!', 'success');
    });
  }

  private clearData(): void {
    if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
      chrome.storage.local.clear(() => {
        this.settings = defaultSettings;
        this.saveSettings();
        this.updateStats();
        this.showNotification('All data cleared successfully!', 'success');
      });
    }
  }

  private showAbout(): void {
    this.createModal('About TellMeMore', `
      <div style="text-align: center; padding: 20px;">
        <div style="font-size: 4rem; margin-bottom: 20px;">🎬</div>
        <h3>TellMeMore v1.0.0</h3>
        <p style="margin: 15px 0; color: #666;">
          An AI-powered Chrome extension that enhances your streaming experience 
          by capturing subtitles and answering questions about movies and shows.
        </p>
        <div style="margin: 20px 0;">
          <strong>Features:</strong>
          <ul style="text-align: left; margin: 10px 0;">
            <li>Real-time subtitle capture</li>
            <li>AI-powered question answering</li>
            <li>Multi-language support</li>
            <li>Customizable overlay interface</li>
            <li>Data export and management</li>
          </ul>
        </div>
        <p style="color: #888; font-size: 14px;">
          Built with ❤️ for movie enthusiasts
        </p>
      </div>
    `);
  }

  private showPrivacy(): void {
    this.createModal('Privacy Policy', `
      <div style="padding: 20px; max-height: 400px; overflow-y: auto;">
        <h3>Data Collection</h3>
        <p>TellMeMore collects:</p>
        <ul>
          <li>Subtitle text from supported streaming sites</li>
          <li>Your questions and AI responses</li>
          <li>Basic usage statistics</li>
        </ul>
        
        <h3>Data Storage</h3>
        <p>All data is stored locally on your device using Chrome's storage API. 
        No data is transmitted to external servers except when using AI features.</p>
        
        <h3>AI Processing</h3>
        <p>When you ask questions, subtitle context may be sent to AI services 
        for processing. This data is not stored by the AI provider.</p>
        
        <h3>Third-party Services</h3>
        <p>This extension may use third-party AI services for question answering. 
        Please review their privacy policies for more information.</p>
        
        <h3>Your Rights</h3>
        <p>You can export or delete all your data at any time using the 
        options in the Data Management section.</p>
      </div>
    `);
  }

  private showSupport(): void {
    this.createModal('Support & Help', `
      <div style="padding: 20px;">
        <h3>Getting Started</h3>
        <p>1. Navigate to a supported streaming site (Netflix, YouTube)</p>
        <p>2. Start watching content with subtitles enabled</p>
        <p>3. Click the overlay button to ask questions about the content</p>
        
        <h3>Troubleshooting</h3>
        <p><strong>Subtitles not being captured?</strong></p>
        <ul>
          <li>Make sure subtitles are enabled on the video player</li>
          <li>Check that subtitle mode is set to "On" in settings</li>
          <li>Try refreshing the page</li>
        </ul>
        
        <p><strong>AI not responding?</strong></p>
        <ul>
          <li>Ensure you have an internet connection</li>
          <li>Check that enough subtitle context has been captured</li>
          <li>Try asking a different question</li>
        </ul>
        
        <h3>Supported Sites</h3>
        <p>Currently supported: Netflix, YouTube</p>
        <p>Coming soon: Amazon Prime, Disney+, and more</p>
        
        <h3>Contact</h3>
        <p>For additional support, please check the extension's store page 
        or submit feedback through Chrome's extension management page.</p>
      </div>
    `);
  }

  private createModal(title: string, content: string): void {
    // Remove existing modal if any
    const existingModal = document.getElementById('options-modal');
    if (existingModal) {
      existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.id = 'options-modal';
    modal.innerHTML = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
      ">
        <div style="
          background: white;
          border-radius: 15px;
          max-width: 600px;
          width: 90%;
          max-height: 80vh;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        ">
          <div style="
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px;
            border-bottom: 1px solid #eee;
            background: #f8f9fa;
          ">
            <h2 style="margin: 0; color: #2c3e50;">${title}</h2>
            <button id="modal-close" style="
              background: none;
              border: none;
              font-size: 24px;
              cursor: pointer;
              color: #666;
              padding: 0;
              width: 30px;
              height: 30px;
              display: flex;
              align-items: center;
              justify-content: center;
              border-radius: 50%;
              transition: background 0.3s ease;
            ">&times;</button>
          </div>
          <div style="overflow-y: auto;">
            ${content}
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Close modal events
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });

    document.getElementById('modal-close')?.addEventListener('click', () => {
      modal.remove();
    });
  }

  private showNotification(message: string, type: 'success' | 'error' = 'success'): void {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#00b894' : '#e17055'};
      color: white;
      padding: 15px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
      z-index: 10001;
      font-weight: 500;
      animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;

    // Add slide-in animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'slideIn 0.3s ease reverse';
      setTimeout(() => {
        notification.remove();
        style.remove();
      }, 300);
    }, 3000);
  }
}

// Initialize options manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new OptionsManager();
});
