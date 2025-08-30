// Subtitle storage utility for TellMeMore
export interface SubtitleEntry {
  id: string;
  text: string;
  platform: 'netflix' | 'disney' | 'amazon' | 'youtube' | 'other';
  dateCaptured: number; // Computer timestamp when subtitle was captured
  timestamp?: number; // Video playback timestamp in seconds
  sessionId: string;
  url?: string;
  movieTitle?: string;
  contentType?: 'movie' | 'series' | 'documentary' | 'other';
  episodeNumber?: number;
  episodeTitle?: string;
  seasonNumber?: number;
}

export interface SubtitleSession {
  id: string;
  platform: string;
  startTime: number;
  endTime?: number;
  url: string;
  movieTitle?: string;
  subtitleCount: number;
  contentType?: 'movie' | 'series' | 'documentary' | 'other';
  episodeNumber?: number;
  episodeTitle?: string;
  seasonNumber?: number;
}

export class SubtitleStorageManager {
  private static instance: SubtitleStorageManager;
  private readonly SUBTITLES_KEY = 'movie_assistant_subtitles';
  private readonly SESSIONS_KEY = 'movie_assistant_sessions';
  private readonly MAX_SUBTITLES = 10000; // Prevent storage overflow

  public static getInstance(): SubtitleStorageManager {
    if (!SubtitleStorageManager.instance) {
      SubtitleStorageManager.instance = new SubtitleStorageManager();
    }
    return SubtitleStorageManager.instance;
  }

  private constructor() {}

  // Save a new subtitle entry
  public async saveSubtitle(subtitle: Omit<SubtitleEntry, 'id'>): Promise<void> {
    const subtitles = await this.getAllSubtitles();
    
    const newSubtitle: SubtitleEntry = {
      ...subtitle,
      id: this.generateId()
    };

    subtitles.unshift(newSubtitle); // Add to beginning

    // Limit storage size
    if (subtitles.length > this.MAX_SUBTITLES) {
      subtitles.splice(this.MAX_SUBTITLES);
    }

    await this.saveSubtitles(subtitles);
  }

  // Get all subtitles
  public async getAllSubtitles(): Promise<SubtitleEntry[]> {
    return new Promise((resolve) => {
      chrome.storage.local.get([this.SUBTITLES_KEY], (result) => {
        resolve(result[this.SUBTITLES_KEY] || []);
      });
    });
  }

  // Get subtitles with pagination and filtering
  public async getSubtitles(options: {
    page?: number;
    pageSize?: number;
    platform?: string;
    search?: string;
    sessionId?: string;
    contentType?: string;
    seasonNumber?: number;
    episodeNumber?: number;
  } = {}): Promise<{
    subtitles: SubtitleEntry[];
    totalCount: number;
    pageCount: number;
  }> {
    const allSubtitles = await this.getAllSubtitles();
    
    // Apply filters
    let filteredSubtitles = allSubtitles;

    if (options.platform && options.platform !== 'all') {
      filteredSubtitles = filteredSubtitles.filter(s => s.platform === options.platform);
    }

    if (options.contentType && options.contentType !== 'all') {
      filteredSubtitles = filteredSubtitles.filter(s => s.contentType === options.contentType);
    }

    if (options.seasonNumber && options.seasonNumber > 0) {
      filteredSubtitles = filteredSubtitles.filter(s => s.seasonNumber === options.seasonNumber);
    }

    if (options.episodeNumber && options.episodeNumber > 0) {
      filteredSubtitles = filteredSubtitles.filter(s => s.episodeNumber === options.episodeNumber);
    }

    if (options.search) {
      const searchTerm = options.search.toLowerCase();
      filteredSubtitles = filteredSubtitles.filter(s => 
        s.text.toLowerCase().includes(searchTerm) ||
        (s.movieTitle && s.movieTitle.toLowerCase().includes(searchTerm)) ||
        (s.episodeTitle && s.episodeTitle.toLowerCase().includes(searchTerm))
      );
    }

    if (options.sessionId) {
      filteredSubtitles = filteredSubtitles.filter(s => s.sessionId === options.sessionId);
    }

    const totalCount = filteredSubtitles.length;
    
    // Apply pagination
    const page = options.page || 1;
    const pageSize = options.pageSize || 50;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    
    const paginatedSubtitles = filteredSubtitles.slice(startIndex, endIndex);
    const pageCount = Math.ceil(totalCount / pageSize);

    return {
      subtitles: paginatedSubtitles,
      totalCount,
      pageCount
    };
  }

  // Clear all subtitles
  public async clearAllSubtitles(): Promise<void> {
    await chrome.storage.local.remove([this.SUBTITLES_KEY]);
  }

  // Clear subtitles for a specific session
  public async clearSessionSubtitles(sessionId: string): Promise<void> {
    const subtitles = await this.getAllSubtitles();
    const filteredSubtitles = subtitles.filter(s => s.sessionId !== sessionId);
    await this.saveSubtitles(filteredSubtitles);
  }

  // Get subtitle statistics
  public async getStatistics(): Promise<{
    totalSubtitles: number;
    platformBreakdown: Record<string, number>;
    recentSessionCount: number;
    todayCount: number;
  }> {
    const subtitles = await this.getAllSubtitles();
    const now = Date.now();
    const dayAgo = now - (24 * 60 * 60 * 1000);
    
    const platformBreakdown: Record<string, number> = {};
    let todayCount = 0;

    subtitles.forEach(subtitle => {
      // Platform breakdown
      platformBreakdown[subtitle.platform] = (platformBreakdown[subtitle.platform] || 0) + 1;
      
      // Today count
      if (subtitle.dateCaptured > dayAgo) {
        todayCount++;
      }
    });

    // Get recent sessions
    const sessions = await this.getSessions();
    const recentSessions = sessions.filter(s => s.startTime > dayAgo);

    return {
      totalSubtitles: subtitles.length,
      platformBreakdown,
      recentSessionCount: recentSessions.length,
      todayCount
    };
  }

  // Session management
  public async startSession(platform: string, url: string, movieTitle?: string): Promise<string> {
    const sessionId = this.generateId();
    const sessions = await this.getSessions();
    
    const newSession: SubtitleSession = {
      id: sessionId,
      platform,
      url,
      movieTitle,
      startTime: Date.now(),
      subtitleCount: 0
    };

    sessions.unshift(newSession);
    await this.saveSessions(sessions);
    
    return sessionId;
  }

  public async endSession(sessionId: string): Promise<void> {
    const sessions = await this.getSessions();
    const sessionIndex = sessions.findIndex(s => s.id === sessionId);
    
    if (sessionIndex !== -1) {
      sessions[sessionIndex].endTime = Date.now();
      
      // Update subtitle count
      const subtitles = await this.getAllSubtitles();
      const sessionSubtitles = subtitles.filter(s => s.sessionId === sessionId);
      sessions[sessionIndex].subtitleCount = sessionSubtitles.length;
      
      await this.saveSessions(sessions);
    }
  }

  public async updateSessionTitle(sessionId: string, movieTitle: string): Promise<void> {
    const sessions = await this.getSessions();
    const sessionIndex = sessions.findIndex(s => s.id === sessionId);
    
    if (sessionIndex !== -1) {
      const currentTitle = sessions[sessionIndex].movieTitle;
      // Only update if the new title is different and not empty
      if (movieTitle && movieTitle !== currentTitle) {
        sessions[sessionIndex].movieTitle = movieTitle;
        await this.saveSessions(sessions);
        console.log(`[SubtitleStorage] Updated session ${sessionId} title from "${currentTitle}" to "${movieTitle}"`);
      }
    }
  }

  public async getSessions(): Promise<SubtitleSession[]> {
    return new Promise((resolve) => {
      chrome.storage.local.get([this.SESSIONS_KEY], (result) => {
        resolve(result[this.SESSIONS_KEY] || []);
      });
    });
  }

  // Export functions
  public async exportSubtitles(format: 'json' | 'txt' | 'srt' = 'json'): Promise<string> {
    const subtitles = await this.getAllSubtitles();
    
    switch (format) {
      case 'txt':
        return subtitles.map(s => {
          const dateCaptured = new Date(s.dateCaptured).toLocaleString();
          const videoTime = s.timestamp ? `${Math.floor(s.timestamp / 60)}:${String(s.timestamp % 60).padStart(2, '0')}` : 'N/A';
          const contentInfo = s.contentType ? ` [${s.contentType.toUpperCase()}]` : '';
          const episodeInfo = s.episodeNumber ? ` S${s.seasonNumber || 1}E${s.episodeNumber}` : '';
          const title = s.movieTitle ? ` - ${s.movieTitle}` : '';
          const episodeTitle = s.episodeTitle ? `: ${s.episodeTitle}` : '';
          
          return `[${dateCaptured}] [${videoTime}] ${s.platform.toUpperCase()}${contentInfo}${title}${episodeInfo}${episodeTitle}\n${s.text}`;
        }).join('\n\n');
        
      case 'srt':
        return subtitles.map((s, i) => {
          const startTime = this.formatSRTTime(0); // Simplified for demo
          const endTime = this.formatSRTTime(3000);
          return `${i + 1}\n${startTime} --> ${endTime}\n${s.text}\n`;
        }).join('\n');
        
      case 'json':
      default:
        return JSON.stringify({ 
          subtitles, 
          exportDate: new Date().toISOString(),
          metadata: {
            totalSubtitles: subtitles.length,
            platforms: [...new Set(subtitles.map(s => s.platform))],
            contentTypes: [...new Set(subtitles.map(s => s.contentType).filter(Boolean))],
            movies: [...new Set(subtitles.map(s => s.movieTitle).filter(Boolean))]
          }
        }, null, 2);
    }
  }

  // Private helper methods
  private async saveSubtitles(subtitles: SubtitleEntry[]): Promise<void> {
    await chrome.storage.local.set({ [this.SUBTITLES_KEY]: subtitles });
  }

  private async saveSessions(sessions: SubtitleSession[]): Promise<void> {
    await chrome.storage.local.set({ [this.SESSIONS_KEY]: sessions });
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private formatSRTTime(milliseconds: number): string {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const ms = milliseconds % 1000;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
  }
}
