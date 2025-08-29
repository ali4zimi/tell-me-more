// AI Chat sidebar component for TellMeMore
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export class AIChatInterface {
  private chatContainer: HTMLElement;
  private backdrop: HTMLElement;
  private messagesContainer!: HTMLElement;
  private input!: HTMLTextAreaElement;
  private sendBtn!: HTMLElement;
  private conversationHistory: ChatMessage[] = [];
  private capturedSubtitles: string[];

  constructor(capturedSubtitles: string[]) {
    this.capturedSubtitles = capturedSubtitles;
    this.backdrop = this.createBackdrop();
    this.chatContainer = this.createChatContainer();
    this.setupEventListeners();
  }

  public render(): HTMLElement {
    document.body.appendChild(this.backdrop);
    return this.chatContainer;
  }

  public open(): void {
    console.log('[AIChatInterface] Opening chat interface');
    // Show backdrop
    this.backdrop.style.display = 'block';
    setTimeout(() => {
      this.backdrop.style.opacity = '1';
    }, 10);

    // Show and animate sidebar
    this.chatContainer.style.display = 'flex';
    setTimeout(() => {
      this.chatContainer.style.right = '0';
    }, 10);

    // Focus on input
    setTimeout(() => {
      if (this.input) this.input.focus();
    }, 300);
  }

  public close(): void {
    const isSmallScreen = window.innerWidth < 768;
    const hidePosition = isSmallScreen ? '-100%' : '-420px';

    // Hide backdrop
    this.backdrop.style.opacity = '0';
    setTimeout(() => {
      this.backdrop.style.display = 'none';
    }, 300);

    // Hide sidebar
    this.chatContainer.style.right = hidePosition;
    setTimeout(() => {
      this.chatContainer.style.display = 'none';
    }, 300);
  }

  public addMessage(role: 'user' | 'assistant', content: string): void {
    // Remove welcome message if it exists
    const welcomeMessage = this.messagesContainer.querySelector('.crx-welcome-message');
    if (welcomeMessage) {
      welcomeMessage.remove();
    }

    const messageDiv = document.createElement('div');
    messageDiv.style.cssText = `
      margin-bottom: 16px;
      display: flex;
      ${role === 'user' ? 'justify-content: flex-end;' : 'justify-content: flex-start;'}
    `;

    const messageBubble = document.createElement('div');
    messageBubble.style.cssText = `
      max-width: 95%;
      padding: 10px 12px;
      border-radius: 16px;
      font-size: 13px;
      line-height: 1.4;
      word-wrap: break-word;
      ${role === 'user' 
        ? 'background: linear-gradient(135deg, #667eea, #764ba2); color: white; border-bottom-right-radius: 4px;'
        : 'background: white; color: #333; border: 1px solid #e1e5e9; border-bottom-left-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);'
      }
    `;

    if (role === 'assistant') {
      messageBubble.innerHTML = `<strong>🤖 Assistant:</strong><br>${content}`;
    } else {
      messageBubble.textContent = content;
    }

    messageDiv.appendChild(messageBubble);
    this.messagesContainer.appendChild(messageDiv);
    
    // Scroll to bottom
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;

    // Save conversation
    const message: ChatMessage = {
      role,
      content,
      timestamp: new Date().toISOString()
    };
    
    this.conversationHistory.push(message);

    // Save to storage
    chrome.storage.local.get({ aiConversations: [] }, (result) => {
      const conversations = result.aiConversations;
      conversations.push({
        role,
        content,
        timestamp: new Date().toISOString(),
        subtitleContext: this.capturedSubtitles.slice(-10) // Last 10 subtitles for context
      });
      chrome.storage.local.set({ aiConversations: conversations });
    });
  }

  public showTypingIndicator(): void {
    const typingDiv = document.createElement('div');
    typingDiv.id = 'typing-indicator';
    typingDiv.style.cssText = `
      margin-bottom: 16px;
      display: flex;
      justify-content: flex-start;
    `;

    typingDiv.innerHTML = `
      <div style="
        background: white;
        border: 1px solid #e1e5e9;
        border-radius: 18px;
        border-bottom-left-radius: 4px;
        padding: 12px 16px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      ">
        <span style="opacity: 0.6;">🤖 Assistant is thinking</span>
        <span class="typing-dots">
          <span style="animation: blink 1.4s infinite;">.</span>
          <span style="animation: blink 1.4s infinite 0.2s;">.</span>
          <span style="animation: blink 1.4s infinite 0.4s;">.</span>
        </span>
      </div>
    `;

    // Add CSS for blinking animation
    if (!document.getElementById('typing-animation-style')) {
      const style = document.createElement('style');
      style.id = 'typing-animation-style';
      style.textContent = `
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    this.messagesContainer.appendChild(typingDiv);
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }

  public hideTypingIndicator(): void {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) indicator.remove();
  }

  private createBackdrop(): HTMLElement {
    const backdrop = document.createElement('div');
    backdrop.id = 'crx-chat-backdrop';
    Object.assign(backdrop.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      background: 'rgba(0, 0, 0, 0.3)',
      zIndex: '19999',
      display: 'none',
      opacity: '0',
      transition: 'opacity 0.3s ease',
    });

    return backdrop;
  }

  private createChatContainer(): HTMLElement {
    const container = document.createElement('div');
    container.id = 'crx-ai-chat';
    
    // Responsive width
    const isSmallScreen = window.innerWidth < 768;
    const sidebarWidth = isSmallScreen ? '100%' : '420px';
    const startPosition = isSmallScreen ? '-100%' : '-420px';
    
    Object.assign(container.style, {
      position: 'fixed',
      top: '0',
      right: startPosition,
      width: sidebarWidth,
      height: '100%',
      background: 'white',
      zIndex: '20000',
      display: 'none',
      flexDirection: 'column',
      boxShadow: '-5px 0 30px rgba(0,0,0,0.3)',
      transition: 'right 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      borderLeft: '1px solid #e1e5e9',
    });

    container.innerHTML = this.createChatHTML();
    
    // Get references to important elements
    this.messagesContainer = container.querySelector('#crx-chat-messages') as HTMLElement;
    this.input = container.querySelector('#crx-chat-input') as HTMLTextAreaElement;
    this.sendBtn = container.querySelector('#crx-chat-send') as HTMLElement;

    return container;
  }

  private createChatHTML(): string {
    return `
      <div id="crx-chat-panel" style="
        width: 100%;
        height: 100%;
        background: white;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      ">
        <!-- Chat Header -->
        <div style="
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          padding: 15px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        ">
          <div>
            <h2 style="margin: 0; font-size: 18px; font-weight: 600;">TellMeMore</h2>
            <p style="margin: 3px 0 0 0; opacity: 0.9; font-size: 12px;">Ask about this content</p>
          </div>
          <div style="display: flex; gap: 10px; align-items: center;">
            <button id="crx-chat-close" style="
              background: rgba(255,255,255,0.2);
              border: none;
              color: white;
              width: 35px;
              height: 35px;
              border-radius: 50%;
              cursor: pointer;
              font-size: 18px;
              transition: all 0.3s ease;
              display: flex;
              align-items: center;
              justify-content: center;
            ">×</button>
          </div>
        </div>

        <!-- Tab Navigation -->
        <div style="
          background: #f8f9fa;
          border-bottom: 1px solid #e1e5e9;
          display: flex;
        ">
          <button id="crx-chat-tab" class="crx-tab active" style="
            flex: 1;
            padding: 12px 20px;
            background: white;
            border: none;
            border-bottom: 3px solid #667eea;
            color: #667eea;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            font-size: 14px;
          ">💬 Chat</button>
          <button id="crx-settings-tab" class="crx-tab" style="
            flex: 1;
            padding: 12px 20px;
            background: #f8f9fa;
            border: none;
            border-bottom: 3px solid transparent;
            color: #666;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            font-size: 14px;
          ">⚙️ Settings</button>
        </div>

        <!-- Chat Content -->
        <div id="crx-chat-content" style="
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        ">
          <!-- Chat Messages -->
          <div id="crx-chat-messages" style="
            flex: 1;
            padding: 15px;
            overflow-y: auto;
            background: #f8f9fa;
          ">
            <div class="crx-welcome-message" style="
              text-align: center;
              color: #666;
              padding: 30px 15px;
            ">
              <div style="font-size: 40px; margin-bottom: 15px;">🎬</div>
              <h3 style="margin: 0 0 10px 0; color: #333; font-size: 16px;">Welcome!</h3>
              <p style="margin: 0; line-height: 1.5; font-size: 13px;">
                I can help answer questions about the movie or show you're watching based on the subtitles I've captured.
                <br><br>
                <strong>Try asking:</strong><br>
                • "Who is the main character?"<br>
                • "What happened in the last scene?"<br>
                • "Explain this plot point"<br>
                • "What did they just say?"
              </p>
            </div>
          </div>

          <!-- Chat Input -->
          <div id="crx-chat-input-container" style="
            padding: 15px;
            background: white;
            border-top: 1px solid #eee;
            display: flex;
            flex-direction: column;
            gap: 10px;
          ">
            <textarea id="crx-chat-input" placeholder="Ask about the movie..." style="
              width: 100%;
              min-height: 60px;
              max-height: 120px;
              padding: 12px;
              border: 2px solid #e1e5e9;
              border-radius: 12px;
              resize: none;
              font-family: inherit;
              font-size: 14px;
              outline: none;
              transition: border-color 0.3s ease;
              box-sizing: border-box;
            "></textarea>
            <button id="crx-chat-send" style="
              background: linear-gradient(135deg, #667eea, #764ba2);
              color: white;
              border: none;
              height: 40px;
              border-radius: 10px;
              cursor: pointer;
              font-size: 14px;
              font-weight: 600;
              transition: all 0.3s ease;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 8px;
            ">🚀 Send</button>
          </div>
        </div>

        <!-- Settings Content (Hidden by default) -->
        <div id="crx-settings-content" style="
          flex: 1;
          padding: 20px;
          background: #f8f9fa;
          overflow-y: auto;
          display: none;
        ">
          <div style="max-width: 400px;">
            <!-- Subtitle Settings -->
            <div style="margin-bottom: 25px;">
              <h3 style="margin: 0 0 15px 0; color: #333; font-size: 16px; font-weight: 600;">📝 Subtitle Settings</h3>
              
              <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; color: #555; font-size: 14px; font-weight: 500;">Subtitle Mode</label>
                <select id="crx-subtitle-mode-setting" style="
                  width: 100%;
                  padding: 10px;
                  border: 2px solid #e1e5e9;
                  border-radius: 8px;
                  font-size: 14px;
                  background: white;
                  color: #333;
                  cursor: pointer;
                  outline: none;
                  transition: border-color 0.3s ease;
                ">
                  <option value="On">On - Show and capture subtitles</option>
                  <option value="Off">Off - Don't capture subtitles</option>
                  <option value="On (hidden)">Hidden - Capture but don't show</option>
                </select>
              </div>

              <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; color: #555; font-size: 14px; font-weight: 500;">Subtitle Language</label>
                <select id="crx-language-setting" style="
                  width: 100%;
                  padding: 10px;
                  border: 2px solid #e1e5e9;
                  border-radius: 8px;
                  font-size: 14px;
                  background: white;
                  color: #333;
                  cursor: pointer;
                  outline: none;
                  transition: border-color 0.3s ease;
                ">
                  <option value="English">English</option>
                  <option value="German">German</option>
                  <option value="Spanish">Spanish</option>
                  <option value="French">French</option>
                  <option value="Italian">Italian</option>
                </select>
              </div>
            </div>

            <!-- AI Settings -->
            <div style="margin-bottom: 25px;">
              <h3 style="margin: 0 0 15px 0; color: #333; font-size: 16px; font-weight: 600;">🤖 AI Settings</h3>
              
              <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; color: #555; font-size: 14px; font-weight: 500;">AI Provider</label>
                <select id="crx-ai-provider-setting" style="
                  width: 100%;
                  padding: 10px;
                  border: 2px solid #e1e5e9;
                  border-radius: 8px;
                  font-size: 14px;
                  background: white;
                  color: #333;
                  cursor: pointer;
                  outline: none;
                  transition: border-color 0.3s ease;
                ">
                  <option value="OpenAI">OpenAI</option>
                  <option value="Claude">Claude</option>
                  <option value="Gemini">Gemini</option>
                </select>
              </div>

              <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; color: #555; font-size: 14px; font-weight: 500;">AI Model</label>
                <select id="crx-ai-model-setting" style="
                  width: 100%;
                  padding: 10px;
                  border: 2px solid #e1e5e9;
                  border-radius: 8px;
                  font-size: 14px;
                  background: white;
                  color: #333;
                  cursor: pointer;
                  outline: none;
                  transition: border-color 0.3s ease;
                ">
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                  <option value="gpt-4">GPT-4</option>
                  <option value="gpt-4o">GPT-4o</option>
                </select>
              </div>

              <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; color: #555; font-size: 14px; font-weight: 500;">API Key</label>
                <input type="password" id="crx-api-key-setting" placeholder="Enter your API key..." style="
                  width: 100%;
                  padding: 10px;
                  border: 2px solid #e1e5e9;
                  border-radius: 8px;
                  font-size: 14px;
                  background: white;
                  color: #333;
                  outline: none;
                  transition: border-color 0.3s ease;
                  box-sizing: border-box;
                ">
              </div>
            </div>

            <!-- Overlay Settings -->
            <div style="margin-bottom: 25px;">
              <h3 style="margin: 0 0 15px 0; color: #333; font-size: 16px; font-weight: 600;">📱 Overlay Settings</h3>
              
              <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; color: #555; font-size: 14px; font-weight: 500;">Button Position</label>
                <select id="crx-overlay-position-setting" style="
                  width: 100%;
                  padding: 10px;
                  border: 2px solid #e1e5e9;
                  border-radius: 8px;
                  font-size: 14px;
                  background: white;
                  color: #333;
                  cursor: pointer;
                  outline: none;
                  transition: border-color 0.3s ease;
                ">
                  <option value="top-left">Top Left</option>
                  <option value="top-right">Top Right</option>
                  <option value="bottom-left">Bottom Left</option>
                  <option value="bottom-right">Bottom Right</option>
                </select>
              </div>

              <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; color: #555; font-size: 14px; font-weight: 500;">Opacity</label>
                <div style="display: flex; align-items: center; gap: 10px;">
                  <input type="range" id="crx-overlay-opacity-setting" min="0.3" max="1" step="0.1" style="
                    flex: 1;
                    cursor: pointer;
                  ">
                  <span id="crx-opacity-value" style="
                    min-width: 40px;
                    font-size: 14px;
                    color: #666;
                    font-weight: 500;
                  ">0.8</span>
                </div>
              </div>
            </div>

            <!-- Advanced Settings -->
            <div style="margin-bottom: 20px;">
              <button id="crx-open-advanced-settings" style="
                width: 100%;
                padding: 12px;
                background: rgba(102, 126, 234, 0.1);
                color: #667eea;
                border: 2px solid #667eea;
                border-radius: 8px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 600;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
              ">⚙️ Advanced Settings</button>
            </div>

            <!-- Statistics -->
            <div style="
              background: white;
              padding: 15px;
              border-radius: 8px;
              border: 1px solid #e1e5e9;
            ">
              <h4 style="margin: 0 0 10px 0; color: #333; font-size: 14px; font-weight: 600;">📊 Statistics</h4>
              <div id="crx-subtitle-count" style="font-size: 13px; color: #666; margin-bottom: 5px;">
                0 subtitles captured
              </div>
              <div id="crx-session-info" style="font-size: 13px; color: #666;">
                No active session
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private setupEventListeners(): void {
    // Close button
    this.chatContainer.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.id === 'crx-chat-close') {
        this.close();
      }
    });

    // Tab switching
    this.chatContainer.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.id === 'crx-chat-tab') {
        this.switchToTab('chat');
      } else if (target.id === 'crx-settings-tab') {
        this.switchToTab('settings');
      } else if (target.id === 'crx-open-advanced-settings') {
        // Open the options page
        chrome.runtime.sendMessage({ action: 'openOptions' }).catch((error) => {
          console.warn('[AIChatInterface] Failed to open options page:', error);
          window.open(chrome.runtime.getURL('options.html'), '_blank');
        });
      }
    });

    // Settings change listeners
    this.chatContainer.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement | HTMLInputElement;
      this.handleSettingChange(target);
    });

    // Opacity slider real-time update
    this.chatContainer.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      if (target.id === 'crx-overlay-opacity-setting') {
        const valueElement = this.chatContainer.querySelector('#crx-opacity-value');
        if (valueElement) {
          valueElement.textContent = target.value;
        }
      }
    });

    // Backdrop click to close
    this.backdrop.addEventListener('click', () => {
      this.close();
    });

    // Send button click
    this.sendBtn.addEventListener('click', () => {
      this.sendMessage();
    });

    // Enter key to send message
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });
  }

  private sendMessage(): void {
    const message = this.input.value.trim();
    if (!message) return;

    // Add user message
    this.addMessage('user', message);
    
    // Clear input
    this.input.value = '';
    
    // Show typing indicator
    this.showTypingIndicator();
    
    // Dispatch event for AI response
    const event = new CustomEvent('crx-ai-question', {
      detail: { 
        question: message,
        context: this.capturedSubtitles.slice(-10)
      }
    });
    document.dispatchEvent(event);
  }

  // Method to be called from outside when AI response is ready
  public receiveAIResponse(response: string): void {
    this.hideTypingIndicator();
    this.addMessage('assistant', response);
  }

  // Switch between chat and settings tabs
  private switchToTab(tabName: 'chat' | 'settings'): void {
    const chatTab = this.chatContainer.querySelector('#crx-chat-tab') as HTMLElement;
    const settingsTab = this.chatContainer.querySelector('#crx-settings-tab') as HTMLElement;
    const chatContent = this.chatContainer.querySelector('#crx-chat-content') as HTMLElement;
    const settingsContent = this.chatContainer.querySelector('#crx-settings-content') as HTMLElement;

    if (!chatTab || !settingsTab || !chatContent || !settingsContent) return;

    if (tabName === 'chat') {
      // Update tab styles
      chatTab.style.cssText = `
        flex: 1;
        padding: 12px 20px;
        background: white;
        border: none;
        border-bottom: 3px solid #667eea;
        color: #667eea;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        font-size: 14px;
      `;
      settingsTab.style.cssText = `
        flex: 1;
        padding: 12px 20px;
        background: #f8f9fa;
        border: none;
        border-bottom: 3px solid transparent;
        color: #666;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        font-size: 14px;
      `;

      // Show/hide content
      chatContent.style.display = 'flex';
      settingsContent.style.display = 'none';
    } else {
      // Update tab styles
      chatTab.style.cssText = `
        flex: 1;
        padding: 12px 20px;
        background: #f8f9fa;
        border: none;
        border-bottom: 3px solid transparent;
        color: #666;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        font-size: 14px;
      `;
      settingsTab.style.cssText = `
        flex: 1;
        padding: 12px 20px;
        background: white;
        border: none;
        border-bottom: 3px solid #667eea;
        color: #667eea;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        font-size: 14px;
      `;

      // Show/hide content
      chatContent.style.display = 'none';
      settingsContent.style.display = 'block';

      // Load current settings when switching to settings tab
      this.loadCurrentSettings();
    }
  }

  // Handle setting changes
  private handleSettingChange(target: HTMLSelectElement | HTMLInputElement): void {
    const settingName = target.id.replace('-setting', '').replace('crx-', '');
    const value = target.value;

    // Map the setting names to the actual storage keys
    const settingMap: { [key: string]: string } = {
      'subtitle-mode': 'subtitleMode',
      'language': 'selectedLanguage',
      'ai-provider': 'aiProvider',
      'ai-model': 'aiModel',
      'api-key': 'apiKey',
      'overlay-position': 'overlayPosition',
      'overlay-opacity': 'overlayOpacity'
    };

    const storageKey = settingMap[settingName];
    if (!storageKey) return;

    // Convert opacity to number
    const finalValue = storageKey === 'overlayOpacity' ? parseFloat(value) : value;

    // Save to storage
    chrome.storage.local.set({ [storageKey]: finalValue }, () => {
      console.log(`[AIChatInterface] Setting saved: ${storageKey} = ${finalValue}`);
      
      // Dispatch event to update the main app
      const event = new CustomEvent('crx-settings-changed', {
        detail: { [storageKey]: finalValue }
      });
      document.dispatchEvent(event);
    });
  }

  // Load current settings into the form
  private loadCurrentSettings(): void {
    chrome.storage.local.get({
      subtitleMode: 'On',
      selectedLanguage: 'English',
      aiProvider: 'OpenAI',
      aiModel: 'gpt-3.5-turbo',
      apiKey: '',
      overlayPosition: 'top-right',
      overlayOpacity: 0.8
    }, (result) => {
      // Set subtitle mode
      const subtitleMode = this.chatContainer.querySelector('#crx-subtitle-mode-setting') as HTMLSelectElement;
      if (subtitleMode) subtitleMode.value = result.subtitleMode;

      // Set language
      const language = this.chatContainer.querySelector('#crx-language-setting') as HTMLSelectElement;
      if (language) language.value = result.selectedLanguage;

      // Set AI provider
      const aiProvider = this.chatContainer.querySelector('#crx-ai-provider-setting') as HTMLSelectElement;
      if (aiProvider) aiProvider.value = result.aiProvider;

      // Set AI model
      const aiModel = this.chatContainer.querySelector('#crx-ai-model-setting') as HTMLSelectElement;
      if (aiModel) aiModel.value = result.aiModel;

      // Set API key
      const apiKey = this.chatContainer.querySelector('#crx-api-key-setting') as HTMLInputElement;
      if (apiKey) apiKey.value = result.apiKey;

      // Set overlay position
      const overlayPosition = this.chatContainer.querySelector('#crx-overlay-position-setting') as HTMLSelectElement;
      if (overlayPosition) overlayPosition.value = result.overlayPosition;

      // Set overlay opacity
      const overlayOpacity = this.chatContainer.querySelector('#crx-overlay-opacity-setting') as HTMLInputElement;
      const opacityValue = this.chatContainer.querySelector('#crx-opacity-value');
      if (overlayOpacity) {
        overlayOpacity.value = result.overlayOpacity.toString();
        if (opacityValue) opacityValue.textContent = result.overlayOpacity.toString();
      }
    });
  }

  // Update statistics in settings tab
  public updateStatistics(subtitleCount: number, sessionInfo?: string): void {
    const subtitleCountElement = this.chatContainer.querySelector('#crx-subtitle-count');
    const sessionInfoElement = this.chatContainer.querySelector('#crx-session-info');

    if (subtitleCountElement) {
      subtitleCountElement.textContent = `${subtitleCount} subtitles captured`;
    }

    if (sessionInfoElement && sessionInfo) {
      sessionInfoElement.textContent = sessionInfo;
    }
  }
}
