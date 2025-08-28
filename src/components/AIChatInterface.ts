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
            <h2 style="margin: 0; font-size: 18px; font-weight: 600;">🤖 TellMeMore</h2>
            <p style="margin: 3px 0 0 0; opacity: 0.9; font-size: 12px;">Ask about this content</p>
          </div>
          <div style="display: flex; gap: 10px; align-items: center;">
            <button id="crx-chat-settings" style="
              background: rgba(255,255,255,0.2);
              border: none;
              color: white;
              width: 35px;
              height: 35px;
              border-radius: 50%;
              cursor: pointer;
              font-size: 16px;
              transition: all 0.3s ease;
              display: flex;
              align-items: center;
              justify-content: center;
            " title="Settings">⚙️</button>
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
        <div style="
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
    `;
  }

  private setupEventListeners(): void {
    // Close button and settings button in chat header
    this.chatContainer.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.id === 'crx-chat-close') {
        this.close();
      } else if (target.id === 'crx-chat-settings') {
        console.log('[AIChatInterface] Settings button clicked');
        // Dispatch event to show settings
        const event = new CustomEvent('crx-show-settings');
        document.dispatchEvent(event);
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
}
