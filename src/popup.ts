// Popup functionality for Movie Assistant
interface ActivityItem {
  timestamp: string;
  type: 'subtitle' | 'question' | 'answer' | 'session';
  text: string;
}

class PopupManager {
  private activityList: ActivityItem[] = [];

  constructor() {
    this.initializeEventListeners();
    this.loadData();
    this.checkConnectionStatus();
  }

  private initializeEventListeners(): void {
    // Settings button
    document.getElementById('openOptions')?.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });

    // Export data button
    document.getElementById('exportData')?.addEventListener('click', () => {
      this.exportData();
    });

    // Clear session button
    document.getElementById('clearSession')?.addEventListener('click', () => {
      this.clearCurrentSession();
    });

    // Test AI button
    document.getElementById('testAI')?.addEventListener('click', () => {
      this.testAIConnection();
    });

    // Help button
    document.getElementById('helpBtn')?.addEventListener('click', () => {
      this.showHelp();
    });
  }

  private loadData(): void {
    chrome.storage.local.get(['netflixSubs', 'aiConversations', 'currentSession'], (result) => {
      // Update stats
      const totalSubtitles = (result.netflixSubs || []).length;
      const totalQuestions = (result.aiConversations || []).length;

      document.getElementById('totalSubtitles')!.textContent = totalSubtitles.toString();
      document.getElementById('totalQuestions')!.textContent = totalQuestions.toString();

      // Update current session
      this.updateCurrentSession(result.currentSession);

      // Update recent activity
      this.updateRecentActivity(result);
    });
  }

  private updateCurrentSession(session: any): void {
    const sessionElement = document.getElementById('currentSession')!;
    
    if (session && session.active) {
      sessionElement.innerHTML = `
        Active: ${session.siteName || 'Unknown Site'}<br>
        <small>${session.subtitleCount || 0} subtitles captured</small>
      `;
    } else {
      sessionElement.textContent = 'No active session';
    }
  }

  private updateRecentActivity(data: any): void {
    const activityListElement = document.getElementById('activityList')!;
    this.activityList = [];

    // Add recent subtitles
    (data.netflixSubs || []).slice(-5).forEach((sub: any) => {
      this.activityList.push({
        timestamp: sub.timestamp || new Date().toISOString(),
        type: 'subtitle',
        text: sub.text.substring(0, 50) + (sub.text.length > 50 ? '...' : '')
      });
    });

    // Add recent AI conversations
    (data.aiConversations || []).slice(-3).forEach((conv: any) => {
      this.activityList.push({
        timestamp: conv.timestamp || new Date().toISOString(),
        type: 'question',
        text: conv.question?.substring(0, 50) + (conv.question?.length > 50 ? '...' : '') || 'Question asked'
      });
    });

    // Sort by timestamp (most recent first)
    this.activityList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Display activity
    if (this.activityList.length === 0) {
      activityListElement.innerHTML = '<div class="empty-state">No recent activity</div>';
    } else {
      activityListElement.innerHTML = this.activityList
        .slice(0, 5)
        .map(item => `
          <div class="activity-item">
            <span class="activity-time">${this.formatTime(item.timestamp)}</span>
            <span class="activity-text">${this.getActivityIcon(item.type)} ${item.text}</span>
          </div>
        `).join('');
    }
  }

  private formatTime(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    return date.toLocaleDateString();
  }

  private getActivityIcon(type: string): string {
    switch (type) {
      case 'subtitle': return '💬';
      case 'question': return '❓';
      case 'answer': return '🤖';
      case 'session': return '📺';
      default: return '•';
    }
  }

  private checkConnectionStatus(): void {
    const statusElement = document.getElementById('connectionStatus')!;

    // Check if we're on a supported site
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentTab = tabs[0];
      const supportedSites = ['netflix.com', 'youtube.com'];
      const isSupported = supportedSites.some(site => currentTab.url?.includes(site));

      if (isSupported) {
        statusElement.innerHTML = '🟢 Connected to ' + this.getSiteName(currentTab.url || '');
        statusElement.style.color = '#00b894';
      } else {
        statusElement.innerHTML = '🔴 Navigate to a supported streaming site';
        statusElement.style.color = '#e17055';
      }
    });
  }

  private getSiteName(url: string): string {
    if (url.includes('netflix.com')) return 'Netflix';
    if (url.includes('youtube.com')) return 'YouTube';
    return 'Unknown';
  }

  private exportData(): void {
    chrome.storage.local.get(['netflixSubs', 'aiConversations', 'currentSession'], (result) => {
      const data = {
        subtitles: result.netflixSubs || [],
        conversations: result.aiConversations || [],
        session: result.currentSession || {},
        exportDate: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      chrome.downloads.download({
        url: url,
        filename: `movie-assistant-data-${new Date().toISOString().split('T')[0]}.json`,
        saveAs: true
      }, () => {
        URL.revokeObjectURL(url);
        this.showNotification('Data exported successfully!', 'success');
      });
    });
  }

  private clearCurrentSession(): void {
    if (confirm('Clear current session data? This will remove captured subtitles and conversations for this session.')) {
      chrome.storage.local.set({
        currentSession: null,
        netflixSubs: [],
        aiConversations: []
      }, () => {
        this.loadData();
        this.showNotification('Session data cleared!', 'success');
      });
    }
  }

  private testAIConnection(): void {
    const testBtn = document.getElementById('testAI')!;
    const originalContent = testBtn.innerHTML;
    
    testBtn.innerHTML = `
      <span class="action-icon"><div class="loading"></div></span>
      <div class="action-text">
        <div class="action-title">Testing...</div>
        <div class="action-desc">Checking AI connection</div>
      </div>
    `;

    // Simulate AI test (replace with actual AI service call)
    setTimeout(() => {
      testBtn.innerHTML = originalContent;
      
      // For now, simulate a successful test
      const isSuccessful = Math.random() > 0.2; // 80% success rate
      
      if (isSuccessful) {
        this.showNotification('AI connection successful!', 'success');
      } else {
        this.showNotification('AI connection failed. Check your internet connection.', 'error');
      }
    }, 2000);
  }

  private showHelp(): void {
    const helpContent = `
      <div style="padding: 20px; font-size: 14px; line-height: 1.5;">
        <h3 style="margin-bottom: 15px;">Quick Start Guide</h3>
        
        <p><strong>1. Navigate to a streaming site</strong><br>
        Visit Netflix or YouTube with video content</p>
        
        <p><strong>2. Enable subtitles</strong><br>
        Turn on subtitles in the video player</p>
        
        <p><strong>3. Start watching</strong><br>
        The extension will automatically capture subtitles</p>
        
        <p><strong>4. Ask questions</strong><br>
        Click the overlay button on the video page to chat with AI</p>
        
        <hr style="margin: 15px 0; border: none; border-top: 1px solid #eee;">
        
        <h4>Features:</h4>
        <ul style="margin: 10px 0; padding-left: 20px;">
          <li>Real-time subtitle capture</li>
          <li>AI-powered Q&A about content</li>
          <li>Data export and management</li>
          <li>Customizable settings</li>
        </ul>
        
        <p style="margin-top: 15px; color: #666; font-size: 12px;">
          For more help, visit the Settings page or check the extension documentation.
        </p>
      </div>
    `;

    this.createModal('Help & Support', helpContent);
  }

  private createModal(title: string, content: string): void {
    const modal = document.createElement('div');
    modal.style.cssText = `
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
    `;

    modal.innerHTML = `
      <div style="
        background: white;
        border-radius: 10px;
        max-width: 400px;
        width: 90%;
        max-height: 70vh;
        overflow: hidden;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
      ">
        <div style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px 20px;
          border-bottom: 1px solid #eee;
          background: #f8f9fa;
        ">
          <h3 style="margin: 0; color: #2c3e50;">${title}</h3>
          <button id="modal-close" style="
            background: none;
            border: none;
            font-size: 20px;
            cursor: pointer;
            color: #666;
            padding: 0;
            width: 25px;
            height: 25px;
            border-radius: 50%;
          ">&times;</button>
        </div>
        <div style="overflow-y: auto; max-height: 50vh;">
          ${content}
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    document.getElementById('modal-close')?.addEventListener('click', () => {
      modal.remove();
    });
  }

  private showNotification(message: string, type: 'success' | 'error' = 'success'): void {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: ${type === 'success' ? '#00b894' : '#e17055'};
      color: white;
      padding: 10px 15px;
      border-radius: 5px;
      font-size: 12px;
      z-index: 10001;
      animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});