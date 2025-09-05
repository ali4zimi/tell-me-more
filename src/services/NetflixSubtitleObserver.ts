// Netflix-specific subtitle observer
import { BaseSubtitleObserver } from './BaseSubtitleObserver';

export interface NetflixContentInfo {
  contentType: 'movie' | 'series' | 'documentary' | 'other';
  title: string;
  episodeNumber?: number;
  episodeTitle?: string;
  seasonNumber?: number;
  movieId?: string; // Netflix internal movie ID
}

export interface NetflixPlayerAPI {
  getAllPlayerSessionIds(): string[];
  getVideoPlayerBySessionId(sessionId: string): any;
}

export interface NetflixAppContext {
  netflix?: {
    appContext?: {
      state?: {
        playerApp?: {
          getAPI(): {
            videoPlayer: NetflixPlayerAPI;
          };
        };
      };
    };
  };
}

export class NetflixSubtitleObserver extends BaseSubtitleObserver {
  private checkInterval: number | null = null;
  private cachedContentInfo: NetflixContentInfo | null = null;
  private lastPlayerCheck = 0;
  private readonly PLAYER_CHECK_INTERVAL = 5000; // Check player every 5 seconds
  private movieIdCache: Map<string, NetflixContentInfo> = new Map(); // Cache content info by movie ID
  private currentMovieId: string | null = null;
  private lastKnownGoodTitle: string | null = null; // Fallback title when API fails
  private lastKnownContentType: 'movie' | 'series' | 'documentary' | 'other' = 'movie';

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
    // Don't clear cache on stop - keep it for potential restart
  }

  // Method to proactively cache title when overlay is visible
  public cacheCurrentContentInfo(): void {
    try {
      console.log('[Netflix Observer] Proactively caching content info while overlay is visible...');
      
      const playerContentInfo = this.getContentInfoFromPlayer();
      if (playerContentInfo && playerContentInfo.title) {
        const urlMatch = window.location.href.match(/\/watch\/(\d+)/);
        const movieId = urlMatch ? urlMatch[1] : playerContentInfo.movieId;
        
        if (movieId) {
          playerContentInfo.movieId = movieId;
          this.currentMovieId = movieId;
          this.movieIdCache.set(movieId, playerContentInfo);
          this.lastKnownGoodTitle = playerContentInfo.title;
          this.lastKnownContentType = playerContentInfo.contentType;
          console.log('[Netflix Observer] Proactively cached content info:', playerContentInfo);
        }
      } else {
        // Try DOM-based detection as fallback
        const domContentInfo = this.getContentInfoFromDOM();
        if (domContentInfo && domContentInfo.title) {
          const urlMatch = window.location.href.match(/\/watch\/(\d+)/);
          if (urlMatch) {
            const movieId = urlMatch[1];
            domContentInfo.movieId = movieId;
            this.currentMovieId = movieId;
            this.movieIdCache.set(movieId, domContentInfo);
            this.lastKnownGoodTitle = domContentInfo.title;
            this.lastKnownContentType = domContentInfo.contentType;
            console.log('[Netflix Observer] Proactively cached DOM content info:', domContentInfo);
          }
        }
      }
    } catch (error) {
      console.error('[Netflix Observer] Error proactively caching content info:', error);
    }
  }

  // Method to clear cache when navigating to a new movie
  public clearCache(): void {
    console.log('[Netflix Observer] Clearing content cache');
    this.cachedContentInfo = null;
    this.currentMovieId = null;
    this.lastPlayerCheck = 0;
    // Note: We keep movieIdCache for cross-session persistence
  }

  // Method to check if current movie ID has changed
  public checkForMovieIdChange(): boolean {
    try {
      const urlMatch = window.location.href.match(/\/watch\/(\d+)/);
      const currentUrlMovieId = urlMatch ? urlMatch[1] : null;
      
      if (currentUrlMovieId && currentUrlMovieId !== this.currentMovieId) {
        console.log('[Netflix Observer] Movie ID changed:', this.currentMovieId, '->', currentUrlMovieId);
        this.currentMovieId = currentUrlMovieId;
        this.cachedContentInfo = null; // Clear cached content to force refresh
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('[Netflix Observer] Error checking movie ID change:', error);
      return false;
    }
  }

  // Get Netflix content information
  public getContentInfo(): NetflixContentInfo | null {
    try {
      console.log('[Netflix Observer] Starting content detection...');
      
      // Method 1: Get current movie ID from URL (most reliable for identification)
      const urlMatch = window.location.href.match(/\/watch\/(\d+)/);
      const currentUrlMovieId = urlMatch ? urlMatch[1] : null;
      
      if (currentUrlMovieId) {
        // Method 1a: Check if we have cached info for this movie ID
        if (this.movieIdCache.has(currentUrlMovieId)) {
          const cachedInfo = this.movieIdCache.get(currentUrlMovieId);
          console.log('[Netflix Observer] Using cached content info for movie ID:', currentUrlMovieId);
          this.currentMovieId = currentUrlMovieId;
          this.lastKnownGoodTitle = cachedInfo!.title;
          this.lastKnownContentType = cachedInfo!.contentType;
          return cachedInfo!;
        }
        
        // Update current movie ID if it changed
        if (currentUrlMovieId !== this.currentMovieId) {
          console.log('[Netflix Observer] Movie ID changed:', this.currentMovieId, '->', currentUrlMovieId);
          this.currentMovieId = currentUrlMovieId;
          this.cachedContentInfo = null; // Clear cache for new content
        }
      }
      
      // Method 2: Try to get from Netflix internal player API
      const playerContentInfo = this.getContentInfoFromPlayer();
      if (playerContentInfo && playerContentInfo.title) {
        console.log('[Netflix Observer] Got content info from Netflix player API:', playerContentInfo);
        
        // Ensure movie ID is set
        if (currentUrlMovieId && !playerContentInfo.movieId) {
          playerContentInfo.movieId = currentUrlMovieId;
        }
        
        // Cache the content info by movie ID
        if (playerContentInfo.movieId) {
          this.currentMovieId = playerContentInfo.movieId;
          this.movieIdCache.set(playerContentInfo.movieId, playerContentInfo);
          console.log('[Netflix Observer] Cached content info for movie ID:', playerContentInfo.movieId);
        }
        
        // Update fallback values
        this.lastKnownGoodTitle = playerContentInfo.title;
        this.lastKnownContentType = playerContentInfo.contentType;
        this.cachedContentInfo = playerContentInfo;
        this.lastPlayerCheck = Date.now();
        return playerContentInfo;
      }

      // Method 3: Try DOM-based detection
      console.log('[Netflix Observer] Player API failed, trying DOM-based detection...');
      const domContentInfo = this.getContentInfoFromDOM();
      if (domContentInfo && domContentInfo.title) {
        // Ensure movie ID is set from URL
        if (currentUrlMovieId) {
          domContentInfo.movieId = currentUrlMovieId;
          this.currentMovieId = currentUrlMovieId;
          this.movieIdCache.set(currentUrlMovieId, domContentInfo);
          console.log('[Netflix Observer] Cached DOM-based content info for movie ID:', currentUrlMovieId);
        }
        
        // Update fallback values
        this.lastKnownGoodTitle = domContentInfo.title;
        this.lastKnownContentType = domContentInfo.contentType;
        this.cachedContentInfo = domContentInfo;
        return domContentInfo;
      }

      // Method 4: Use cached content info if recent (even if no title from current detection)
      if (this.cachedContentInfo && this.cachedContentInfo.title && (Date.now() - this.lastPlayerCheck < this.PLAYER_CHECK_INTERVAL * 2)) {
        console.log('[Netflix Observer] Using recent cached content info');
        return this.cachedContentInfo;
      }

      // Method 5: Last resort - use fallback title if we have one
      if (this.lastKnownGoodTitle && currentUrlMovieId) {
        console.log('[Netflix Observer] Using fallback title for movie ID:', currentUrlMovieId, 'Title:', this.lastKnownGoodTitle);
        const fallbackInfo: NetflixContentInfo = {
          contentType: this.lastKnownContentType,
          title: this.lastKnownGoodTitle,
          movieId: currentUrlMovieId
        };
        
        // Cache this fallback for consistency
        this.movieIdCache.set(currentUrlMovieId, fallbackInfo);
        return fallbackInfo;
      }

      console.log('[Netflix Observer] Could not detect content info - no title available');
      return null;

    } catch (error) {
      console.error('[Netflix Observer] Error getting content info:', error);
      
      // Even on error, try to return fallback if available
      if (this.lastKnownGoodTitle) {
        console.log('[Netflix Observer] Error occurred, using fallback title:', this.lastKnownGoodTitle);
        const urlMatch = window.location.href.match(/\/watch\/(\d+)/);
        return {
          contentType: this.lastKnownContentType,
          title: this.lastKnownGoodTitle,
          movieId: urlMatch ? urlMatch[1] : undefined
        };
      }
      
      return null;
    }
  }

  private getContentInfoFromPlayer(): NetflixContentInfo | null {
    try {
      const windowWithNetflix = window as any as NetflixAppContext;
      const player = windowWithNetflix.netflix?.appContext?.state?.playerApp?.getAPI()?.videoPlayer;
      
      if (!player) {
        console.log('[Netflix Observer] Netflix player API not available');
        return null;
      }

      const sessionIds = player.getAllPlayerSessionIds();
      if (!sessionIds || sessionIds.length === 0) {
        console.log('[Netflix Observer] No active player sessions');
        return null;
      }

      const sessionId = sessionIds[0];
      const playerInstance = player.getVideoPlayerBySessionId(sessionId);
      
      if (!playerInstance) {
        console.log('[Netflix Observer] Could not get player instance');
        return null;
      }

      // Try to extract content information from player
      let title = '';
      let movieId = '';
      let contentType: 'movie' | 'series' | 'documentary' | 'other' = 'movie';
      let episodeNumber: number | undefined;
      let seasonNumber: number | undefined;
      let episodeTitle: string | undefined;

      // Get movie/show ID from player
      try {
        const metadata = playerInstance.getMovieId?.() || 
                        playerInstance.getTitleId?.() || 
                        playerInstance.getVideoId?.();
        if (metadata) {
          movieId = String(metadata);
          console.log('[Netflix Observer] Found content ID:', movieId);
        }
      } catch (e) {
        console.log('[Netflix Observer] Could not get content ID:', e);
      }

      // Try to get title from player metadata
      try {
        const titleData = playerInstance.getTitle?.() || 
                         playerInstance.getMovieTitle?.() || 
                         playerInstance.getVideoTitle?.();
        if (titleData) {
          title = String(titleData);
          console.log('[Netflix Observer] Found title from player:', title);
        }
      } catch (e) {
        console.log('[Netflix Observer] Could not get title from player:', e);
      }

      // Try to get episode information
      try {
        const episodeData = playerInstance.getEpisode?.() || 
                           playerInstance.getEpisodeNumber?.();
        const seasonData = playerInstance.getSeason?.() || 
                          playerInstance.getSeasonNumber?.();
        
        if (episodeData) {
          episodeNumber = parseInt(String(episodeData));
          contentType = 'series';
        }
        if (seasonData) {
          seasonNumber = parseInt(String(seasonData));
          contentType = 'series';
        }
      } catch (e) {
        console.log('[Netflix Observer] Could not get episode/season info:', e);
      }

      // Fallback to URL-based movie ID extraction
      if (!movieId) {
        const urlMatch = window.location.href.match(/\/watch\/(\d+)/);
        if (urlMatch) {
          movieId = urlMatch[1];
          console.log('[Netflix Observer] Extracted movie ID from URL:', movieId);
        }
      }

      // Fallback to DOM title if player doesn't provide it
      if (!title) {
        const domInfo = this.getContentInfoFromDOM();
        if (domInfo) {
          title = domInfo.title;
          if (domInfo.contentType !== 'other') {
            contentType = domInfo.contentType;
          }
          episodeNumber = domInfo.episodeNumber;
          seasonNumber = domInfo.seasonNumber;
          episodeTitle = domInfo.episodeTitle;
        }
      }

      if (!title && !movieId) {
        return null;
      }

      // Use movie ID as title fallback if needed
      if (!title && movieId) {
        title = movieId;
      }

      return {
        contentType,
        title,
        movieId,
        episodeNumber,
        seasonNumber,
        episodeTitle
      };

    } catch (error) {
      console.error('[Netflix Observer] Error accessing player API:', error);
      return null;
    }
  }

  private getContentInfoFromDOM(): NetflixContentInfo | null {
    try {
      console.log('[Netflix Observer] Starting DOM-based content detection...');
      
      // Method 1: Try to get from the modern Netflix UI structure
      const videoTitleContainer = document.querySelector('[data-uia="video-title"]');
      if (videoTitleContainer) {
        console.log('[Netflix Observer] Found video title container');
        
        const h4Element = videoTitleContainer.querySelector('h4');
        const spans = videoTitleContainer.querySelectorAll('span');
        
        // Check for series structure (h4 + spans)
        if (h4Element && spans.length >= 2) {
          const showTitle = h4Element.textContent?.trim() || '';
          const episodeInfo = spans[0]?.textContent?.trim() || '';
          const episodeTitle = spans[1]?.textContent?.trim() || '';
          
          console.log('[Netflix Observer] Found episode structure:', { showTitle, episodeInfo, episodeTitle });
          
          // Check if we have episode information (like "E1", "S1E1", etc.)
          const episodeMatch = episodeInfo.match(/^(?:S(\d+))?E(\d+)$/i);
          if (episodeMatch && showTitle) {
            const seasonNumber = episodeMatch[1] ? parseInt(episodeMatch[1]) : 1;
            const episodeNumber = parseInt(episodeMatch[2]);
            
            console.log('[Netflix Observer] Detected series from modern UI:', {
              showTitle,
              seasonNumber,
              episodeNumber,
              episodeTitle
            });
            
            return {
              contentType: 'series',
              title: showTitle,
              seasonNumber: seasonNumber,
              episodeNumber: episodeNumber,
              episodeTitle: episodeTitle || ''
            };
          }
        }
        
        // Check for movie structure (direct text content in the container)
        const containerText = videoTitleContainer.textContent?.trim() || '';
        if (containerText && !h4Element) {
          // If there's text but no h4 element, it's likely a movie title
          console.log('[Netflix Observer] Found direct movie title in container:', containerText);
          
          return {
            contentType: 'movie',
            title: containerText
          };
        } else if (h4Element && spans.length < 2) {
          // If there's an h4 but no episode spans, it's likely a movie
          const movieTitle = h4Element.textContent?.trim() || '';
          if (movieTitle) {
            console.log('[Netflix Observer] Found movie title in h4 element:', movieTitle);
            
            return {
              contentType: 'movie',
              title: movieTitle
            };
          }
        }
      }

      // Method 2: Try to get title from other Netflix-specific elements
      console.log('[Netflix Observer] Trying alternative title detection methods...');
      
      const titleElement = document.querySelector('h1[data-uia="video-title"]') ||
                          document.querySelector('.player-status-main-title') ||
                          document.querySelector('.video-title') ||
                          videoTitleContainer?.querySelector('h4') ||
                          document.querySelector('[data-uia="previewModal--player-titleTreatment-logo"] img') ||
                          document.querySelector('.title-logo img');
      
      let title = '';
      if (titleElement) {
        if (titleElement.tagName === 'IMG') {
          title = (titleElement as HTMLImageElement).alt || 
                  (titleElement as HTMLImageElement).title || '';
        } else {
          title = titleElement.textContent?.trim() || '';
        }
        console.log('[Netflix Observer] Found title from element:', title);
      }

      // Method 3: Try to get from page title as last resort
      if (!title) {
        console.log('[Netflix Observer] Trying page title...');
        const pageTitle = document.title;
        if (pageTitle && !pageTitle.includes('Netflix') && pageTitle !== 'Netflix') {
          title = pageTitle.replace(/\s*-\s*Netflix.*/, '').trim();
          console.log('[Netflix Observer] Found title from page title:', title);
        }
      }

      if (!title) {
        console.log('[Netflix Observer] Could not detect content title');
        return null;
      }

      // Detect if it's a series by looking for episode/season indicators in the title or DOM
      const contentInfo = this.analyzeContentType(title);
      
      console.log('[Netflix Observer] Final detected content info:', contentInfo);
      return contentInfo;

    } catch (error) {
      console.error('[Netflix Observer] Error getting content info:', error);
      return null;
    }
  }

  // Helper method to parse time strings like "1:23:45" or "23:45" into seconds
  private parseTimeString(timeStr: string): number | null {
    try {
      const parts = timeStr.split(':').map(part => parseInt(part.trim()));
      
      if (parts.length === 3) {
        // Format: HH:MM:SS
        const [hours, minutes, seconds] = parts;
        return hours * 3600 + minutes * 60 + seconds;
      } else if (parts.length === 2) {
        // Format: MM:SS
        const [minutes, seconds] = parts;
        return minutes * 60 + seconds;
      } else if (parts.length === 1) {
        // Format: SS
        return parts[0];
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  // Helper method to format seconds into HH:MM:SS or MM:SS format
  private formatTimestamp(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
  }

  private analyzeContentType(title: string): NetflixContentInfo {
    console.log('[Netflix Observer] Analyzing content type for title:', title);
    
    // First, check if we can find episode information in the DOM
    const episodeInfo = this.checkForEpisodeElements();
    if (episodeInfo) {
      console.log('[Netflix Observer] Found episode elements, marking as series');
      return {
        contentType: 'series',
        title: title,
        ...episodeInfo
      };
    }

    // Check for series patterns in the title
    const seriesPatterns = [
      /(.+?)\s*:\s*Season\s*(\d+)\s*:\s*(.+?)(?:\s*\(Episode\s*(\d+)\))?$/i,
      /(.+?)\s*-\s*Season\s*(\d+)\s*Episode\s*(\d+)\s*:\s*(.+)$/i,
      /(.+?)\s*S(\d+)\s*E(\d+)\s*:\s*(.+)$/i,
      /(.+?)\s*Season\s*(\d+)\s*Episode\s*(\d+)\s*:\s*(.+)$/i,
      /(.+?)\s*:\s*(.+?)\s*\(Season\s*(\d+)\s*Episode\s*(\d+)\)$/i,
      /(.+?)\s*E(\d+)\s*:\s*(.+)$/i, // Simple episode pattern like "Show E1: Title"
      /(.+?)\s*Episode\s*(\d+)\s*:\s*(.+)$/i // "Show Episode 1: Title"
    ];

    for (const pattern of seriesPatterns) {
      const match = title.match(pattern);
      if (match) {
        console.log('[Netflix Observer] Title matches series pattern, marking as series');
        // Handle different pattern structures
        if (pattern.source.includes('Season')) {
          const [, showTitle, season, episode, episodeTitle] = match;
          return {
            contentType: 'series',
            title: showTitle.trim(),
            seasonNumber: parseInt(season),
            episodeNumber: parseInt(episode || match[4] || '1'),
            episodeTitle: (episodeTitle || match[2] || '').trim()
          };
        } else {
          // Simple episode patterns
          const [, showTitle, episode, episodeTitle] = match;
          return {
            contentType: 'series',
            title: showTitle.trim(),
            seasonNumber: 1, // Default to season 1 if not specified
            episodeNumber: parseInt(episode),
            episodeTitle: (episodeTitle || '').trim()
          };
        }
      }
    }

    // Look for series indicators in the DOM structure
    const hasSeriesIndicators = this.checkForSeriesIndicators();
    if (hasSeriesIndicators) {
      console.log('[Netflix Observer] Found series indicators in DOM, marking as series');
      return {
        contentType: 'series',
        title: title,
        seasonNumber: 1,
        episodeNumber: 1
      };
    }

    // Check for documentary patterns
    const documentaryKeywords = ['documentary', 'docuseries', 'true story', 'real events', 'investigation'];
    const isDocumentary = documentaryKeywords.some(keyword => 
      title.toLowerCase().includes(keyword)
    );

    if (isDocumentary) {
      console.log('[Netflix Observer] Documentary keywords found, marking as documentary');
      return {
        contentType: 'documentary',
        title: title
      };
    }

    // Default to movie if no series indicators found
    console.log('[Netflix Observer] No series indicators found, defaulting to movie');
    return {
      contentType: 'movie',
      title: title
    };
  }

  private checkForEpisodeElements(): { episodeNumber?: number; episodeTitle?: string; seasonNumber?: number } | null {
    // Look for episode information in various Netflix UI elements
    const episodeElements = [
      '.episode-title',
      '.current-episode',
      '[data-uia="episode-title"]',
      '.player-status-episode-title'
    ];

    for (const selector of episodeElements) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.textContent?.trim() || '';
        
        // Try to extract episode info from text
        const episodeMatch = text.match(/(?:Episode\s*)?(\d+)(?:\s*:\s*(.+))?/i);
        if (episodeMatch) {
          return {
            episodeNumber: parseInt(episodeMatch[1]),
            episodeTitle: episodeMatch[2]?.trim() || ''
          };
        }
      }
    }

    return null;
  }

  private checkForSeriesIndicators(): boolean {
    // Look for UI elements that indicate series content
    const seriesIndicators = [
      // Episode/season selectors or displays
      '[data-uia="season-selector"]',
      '[data-uia="episode-selector"]', 
      '.season-selector',
      '.episode-selector',
      // Episode progress or next episode buttons
      '[data-uia="next-episode"]',
      '[data-uia="episode-progress"]',
      '.next-episode',
      '.episodes-container',
      // Netflix series UI elements
      '.episodes-tab',
      '.season-tab'
    ];

    for (const selector of seriesIndicators) {
      const element = document.querySelector(selector);
      if (element) {
        console.log('[Netflix Observer] Found series indicator element:', selector);
        return true;
      }
    }

    // Also check for series-related text in key areas
    const textElements = document.querySelectorAll('[data-uia*="episode"], [data-uia*="season"]');
    if (textElements.length > 0) {
      console.log('[Netflix Observer] Found series indicator in data-uia attributes');
      return true;
    }

    return false;
  }

  private startPeriodicCheck(): void {
    // Check every 2 seconds for subtitle containers and movie changes
    this.checkInterval = window.setInterval(() => {
      // Check for movie ID changes first
      this.checkForMovieIdChange();
      
      // Proactively cache content info if overlay/player is visible
      this.cacheCurrentContentInfo();
      
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

  /**
   * Override to get current video timestamp from Netflix player
   * @returns Current video playback time in seconds, or null if not available
   */
  protected getCurrentVideoTimestamp(): number | null {
    try {
      // Method 1: Try to get timestamp from video element
      const videoElement = document.querySelector('video') as HTMLVideoElement;
      if (videoElement && !isNaN(videoElement.currentTime)) {
        const timestamp = Math.floor(videoElement.currentTime);
        console.log(`[Netflix Observer] Video timestamp from video element: ${timestamp}s (${this.formatTimestamp(timestamp)})`);
        return timestamp;
      }

      // Method 2: Try to get timestamp from Netflix UI elements
      const progressElements = [
        '[data-uia="current-time"]',
        '.time-current'
      ];

      for (const selector of progressElements) {
        const element = document.querySelector(selector);
        if (element) {
          const timeText = element.textContent?.trim();
          if (timeText) {
            const seconds = this.parseTimeString(timeText);
            if (seconds !== null) {
              console.log(`[Netflix Observer] Video timestamp from UI element (${selector}): ${seconds}s (${timeText})`);
              return seconds;
            }
          }
        }
      }

      // Method 3: Try to find Netflix's internal player state
      // Netflix sometimes stores player state in window objects
      const netflixPlayer = (window as any).netflix?.player;
      if (netflixPlayer && typeof netflixPlayer.getCurrentTime === 'function') {
        const timestamp = Math.floor(netflixPlayer.getCurrentTime());
        console.log(`[Netflix Observer] Video timestamp from Netflix player API: ${timestamp}s (${this.formatTimestamp(timestamp)})`);
        return timestamp;
      }

      console.log('[Netflix Observer] Could not detect current video timestamp');
      return null;

    } catch (error) {
      console.error('[Netflix Observer] Error getting video timestamp:', error);
      return null;
    }
  }
}