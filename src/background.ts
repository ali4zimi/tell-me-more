// Background script for TellMeMore
chrome.runtime.onInstalled.addListener(() => {
  console.log('TellMeMore installed successfully!');
  
  // Set up default settings
  chrome.storage.local.set({
    subtitleMode: 'On',
    selectedLanguage: 'English',
    overlayPosition: 'top-right',
    overlayOpacity: 0.8,
    aiResponseStyle: 'detailed',
    maxContextLength: '1000',
    spoilerProtection: true,
    autoHideOverlay: true,
    autoDetectMovie: true
  });
  
  // Initialize session tracking
  chrome.storage.local.set({
    currentSession: null,
    netflixSubs: [],
    aiConversations: [],
    analyzedMovies: []
  });
});

// Handle tab updates to track streaming sessions
chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const supportedSites = ['netflix.com', 'youtube.com', 'localhost:6040'];
    const isStreamingSite = supportedSites.some(site => tab.url?.includes(site));
    
    if (isStreamingSite) {
      // Start a new session
      const siteName = getSiteName(tab.url);
      chrome.storage.local.set({
        currentSession: {
          active: true,
          siteName: siteName,
          url: tab.url,
          startTime: new Date().toISOString(),
          subtitleCount: 0,
          questionCount: 0
        }
      });
    }
  }
});

// Handle tab removal to end sessions
chrome.tabs.onRemoved.addListener((_tabId) => {
  // End current session if it was a streaming tab
  chrome.storage.local.get(['currentSession'], (result) => {
    if (result.currentSession && result.currentSession.active) {
      chrome.storage.local.set({
        currentSession: {
          ...result.currentSession,
          active: false,
          endTime: new Date().toISOString()
        }
      });
    }
  });
});

// Handle extension messages
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  switch (request.action) {
    case 'updateSubtitleCount':
      updateSessionSubtitleCount();
      break;
    
    case 'updateQuestionCount':
      updateSessionQuestionCount();
      break;
    
    case 'getAIResponse':
      // This would be where you'd integrate with an actual AI service
      handleAIRequest(request.question, request.context, sendResponse);
      return true; // Keep the message channel open for async response
    
    case 'exportData':
      handleDataExport(sendResponse);
      return true;
    
    case 'openOptions':
      chrome.runtime.openOptionsPage();
      sendResponse({ success: true });
      break;
    
    default:
      sendResponse({ error: 'Unknown action' });
  }
});

function getSiteName(url: string): string {
  if (url.includes('netflix.com')) return 'Netflix';
  if (url.includes('youtube.com')) return 'YouTube';
  return 'Unknown';
}

function updateSessionSubtitleCount(): void {
  chrome.storage.local.get(['currentSession', 'netflixSubs'], (result) => {
    if (result.currentSession && result.currentSession.active) {
      const subtitleCount = (result.netflixSubs || []).length;
      chrome.storage.local.set({
        currentSession: {
          ...result.currentSession,
          subtitleCount: subtitleCount
        }
      });
    }
  });
}

function updateSessionQuestionCount(): void {
  chrome.storage.local.get(['currentSession', 'aiConversations'], (result) => {
    if (result.currentSession && result.currentSession.active) {
      const questionCount = (result.aiConversations || []).filter(
        (conv: any) => conv.role === 'user'
      ).length;
      chrome.storage.local.set({
        currentSession: {
          ...result.currentSession,
          questionCount: questionCount
        }
      });
    }
  });
}

function handleAIRequest(question: string, context: string[], sendResponse: (response: any) => void): void {
  // This is where you would integrate with an actual AI service
  // For now, we'll simulate an AI response
  
  setTimeout(() => {
    const mockResponse = generateMockAIResponse(question, context);
    sendResponse({
      success: true,
      response: mockResponse,
      timestamp: new Date().toISOString()
    });
  }, 1000 + Math.random() * 2000); // Simulate 1-3 second response time
}

function generateMockAIResponse(question: string, context: string[]): string {
  const questionLower = question.toLowerCase();
  const contextLength = context.length;
  
  if (questionLower.includes('character') || questionLower.includes('who')) {
    return `Based on the ${contextLength} subtitle entries I've analyzed, I can see several character interactions. The main characters appear to be engaged in significant dialogue that reveals their motivations and relationships. Would you like me to elaborate on any specific character?`;
  }
  
  if (questionLower.includes('plot') || questionLower.includes('story')) {
    return `From the subtitle context (${contextLength} entries), the story seems to be developing around key themes and conflicts. The dialogue indicates plot progression with important revelations and character development. The narrative structure suggests this is a pivotal moment in the story.`;
  }
  
  if (questionLower.includes('scene') || questionLower.includes('what happened')) {
    return `In the recent scenes captured through subtitles, the characters have been discussing important plot points. Based on the ${contextLength} subtitle entries, there appears to be significant character interaction and story development happening.`;
  }
  
  return `I've analyzed ${contextLength} subtitle entries from this content. The dialogue suggests interesting character dynamics and plot development. Could you be more specific about what aspect of the movie or show you'd like me to explain?`;
}

function handleDataExport(sendResponse: (response: any) => void): void {
  chrome.storage.local.get(['netflixSubs', 'aiConversations', 'currentSession', 'analyzedMovies'], (result) => {
    const exportData = {
      subtitles: result.netflixSubs || [],
      conversations: result.aiConversations || [],
      session: result.currentSession || {},
      movies: result.analyzedMovies || [],
      exportDate: new Date().toISOString(),
      version: '1.0.0'
    };
    
    sendResponse({
      success: true,
      data: exportData
    });
  });
}

