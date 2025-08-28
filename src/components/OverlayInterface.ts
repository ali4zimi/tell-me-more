// Overlay interface component for TellMeMore
export interface OverlaySettings {
  subtitleMode: string;
  selectedLanguage: string;
  overlayPosition: string;
  overlayOpacity: number;
}

export class OverlayInterface {
  private overlayContainer: HTMLElement;
  private floatingButton: HTMLElement;
  private settingsMenu: HTMLElement;
  private settings: OverlaySettings;
  private capturedSubtitles: string[];
  private menuOpen: boolean = false;

  constructor(settings: OverlaySettings, capturedSubtitles: string[]) {
    this.settings = settings;
    this.capturedSubtitles = capturedSubtitles;
    this.overlayContainer = this.createOverlayContainer();
    this.floatingButton = this.createFloatingButton();
    this.settingsMenu = this.createSettingsMenu();
  }

  public render(): HTMLElement {
    this.overlayContainer.appendChild(this.floatingButton);
    this.overlayContainer.appendChild(this.settingsMenu);
    this.setupEventListeners();
    return this.overlayContainer;
  }

  public updateSubtitleCount(): void {
    const countElement = this.settingsMenu.querySelector('[data-subtitle-count]');
    if (countElement) {
      countElement.textContent = `${this.capturedSubtitles.length} subtitles captured`;
    }
  }

  public updateSettings(newSettings: Partial<OverlaySettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.updateOverlayStyles();
  }

  public showSettings(): void {
    console.log('[OverlayInterface] showSettings called');
    console.log('[OverlayInterface] Settings menu element:', this.settingsMenu);
    console.log('[OverlayInterface] Settings menu current style:', this.settingsMenu.style.cssText);
    this.showSettingsMenu();
    this.menuOpen = true;
    console.log('[OverlayInterface] Settings menu shown, new style:', this.settingsMenu.style.cssText);
  }

  private createOverlayContainer(): HTMLElement {
    const container = document.createElement('div');
    container.id = 'crx-custom-menu';
    return container;
  }

  private createFloatingButton(): HTMLElement {
    const button = document.createElement('div');
    button.id = 'crx-floating-btn';
    button.innerHTML = 'TellMeMore';
    
    const position = this.getPositionStyles(this.settings.overlayPosition);
    Object.assign(button.style, {
      position: 'fixed',
      ...position,
      width: 'auto',
      minWidth: '100px',
      height: '40px',
      padding: '0 15px',
      background: `rgba(74, 144, 226, ${this.settings.overlayOpacity})`,
      borderRadius: '20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '14px',
      fontWeight: '600',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      cursor: 'pointer',
      zIndex: '10000',
      transition: 'all 0.3s ease',
      boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      backdropFilter: 'blur(10px)',
      border: '2px solid rgba(255, 255, 255, 0.2)',
    });

    return button;
  }

  private createSettingsMenu(): HTMLElement {
    const menu = document.createElement('div');
    menu.id = 'crx-settings-menu';
    
    Object.assign(menu.style, {
      position: 'fixed',
      ...this.getMenuPosition(this.settings.overlayPosition),
      width: '250px',
      background: `rgba(40, 40, 40, ${this.settings.overlayOpacity})`,
      borderRadius: '12px',
      padding: '15px',
      zIndex: '25000',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      transform: 'scale(0.8) translateY(-20px)',
      opacity: '0',
      visibility: 'hidden',
      transition: 'all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      backdropFilter: 'blur(15px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
    });

    menu.innerHTML = this.createSettingsHTML();
    return menu;
  }

  private createSettingsHTML(): string {
    return `
      <div style="color: #fff; font-size: 16px; font-weight: bold; margin-bottom: 15px; text-align: center; font-family: Arial, sans-serif;">
        TellMeMore
      </div>
      <div style="margin-bottom: 12px;">
        <button id="crx-chat-btn" style="
          width: 100%;
          padding: 12px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          font-size: 14px;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        ">
          💬 Ask AI About This Movie
        </button>
      </div>
      <div style="margin-bottom: 12px;">
        <label style="display: flex; justify-content: space-between; align-items: center; color: #fff; font-size: 14px; font-family: Arial, sans-serif;">
          <span>Subtitles</span>
          <select id="crx-subtitle-mode" style="
            background: rgba(60, 60, 60, 0.9);
            color: #fff;
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 4px;
            padding: 4px 8px;
            font-size: 12px;
            cursor: pointer;
            outline: none;
          ">
            <option value="On">On</option>
            <option value="Off">Off</option>
            <option value="On (hidden)">Hidden</option>
          </select>
        </label>
      </div>
      <div style="margin-bottom: 12px;">
        <label style="display: flex; justify-content: space-between; align-items: center; color: #fff; font-size: 14px; font-family: Arial, sans-serif;">
          <span>Language</span>
          <select id="crx-language" style="
            background: rgba(60, 60, 60, 0.9);
            color: #fff;
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 4px;
            padding: 4px 8px;
            font-size: 12px;
            cursor: pointer;
            outline: none;
          ">
            <option value="English">English</option>
            <option value="German">German</option>
            <option value="Spanish">Spanish</option>
            <option value="French">French</option>
            <option value="Italian">Italian</option>
          </select>
        </label>
      </div>
      <div style="margin-bottom: 15px;">
        <button id="crx-settings-btn" style="
          width: 100%;
          padding: 8px;
          background: rgba(255, 255, 255, 0.1);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.3s ease;
        ">
          ⚙️ More Settings
        </button>
      </div>
      <div data-subtitle-count style="text-align: center; font-size: 11px; color: rgba(255,255,255,0.6);">
        ${this.capturedSubtitles.length} subtitles captured
      </div>
    `;
  }

  private setupEventListeners(): void {
    // Floating button click - now opens chat directly
    this.floatingButton.addEventListener('click', (e) => {
      e.stopPropagation();
      console.log('[OverlayInterface] Floating button clicked, opening chat');
      this.dispatchEvent('openChat');
    });

    // Click outside to close menu
    document.addEventListener('click', (e) => {
      if (!this.floatingButton.contains(e.target as Node) && !this.settingsMenu.contains(e.target as Node)) {
        if (this.menuOpen) {
          this.hideSettingsMenu();
          this.menuOpen = false;
        }
      }
    });

    // Settings change listeners
    this.settingsMenu.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      if (target.id === 'crx-subtitle-mode') {
        this.settings.subtitleMode = target.value;
        chrome.storage.local.set({ subtitleMode: target.value });
        this.dispatchSettingChange('subtitleMode', target.value);
      } else if (target.id === 'crx-language') {
        this.settings.selectedLanguage = target.value;
        chrome.storage.local.set({ selectedLanguage: target.value });
        this.dispatchSettingChange('selectedLanguage', target.value);
      }
    });

    // Button clicks
    this.settingsMenu.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.id === 'crx-chat-btn') {
        console.log('[OverlayInterface] Chat button clicked, dispatching openChat event');
        this.dispatchEvent('openChat');
        this.hideSettingsMenu();
        this.menuOpen = false;
      } else if (target.id === 'crx-settings-btn') {
        // Send message to background script to open options page
        chrome.runtime.sendMessage({ action: 'openOptions' }).catch((error) => {
          console.warn('[OverlayInterface] Failed to open options page:', error);
          // Fallback: try to open options page directly
          window.open(chrome.runtime.getURL('options.html'), '_blank');
        });
      }
    });
  }

  private showSettingsMenu(): void {
    console.log('[OverlayInterface] showSettingsMenu called');
    console.log('[OverlayInterface] Settings menu before changes:', {
      display: this.settingsMenu.style.display,
      visibility: this.settingsMenu.style.visibility,
      opacity: this.settingsMenu.style.opacity,
      zIndex: this.settingsMenu.style.zIndex,
      position: this.settingsMenu.style.position
    });
    
    Object.assign(this.settingsMenu.style, {
      transform: 'scale(1) translateY(0)',
      opacity: '1',
      visibility: 'visible',
      display: 'block'
    });
    this.floatingButton.style.background = `rgba(74, 144, 226, 1)`;
    
    console.log('[OverlayInterface] Settings menu after changes:', {
      display: this.settingsMenu.style.display,
      visibility: this.settingsMenu.style.visibility,
      opacity: this.settingsMenu.style.opacity,
      transform: this.settingsMenu.style.transform
    });
  }

  private hideSettingsMenu(): void {
    Object.assign(this.settingsMenu.style, {
      transform: 'scale(0.8) translateY(-20px)',
      opacity: '0',
      visibility: 'hidden',
    });
    this.floatingButton.style.background = `rgba(74, 144, 226, ${this.settings.overlayOpacity})`;
  }

  private updateOverlayStyles(): void {
    const position = this.getPositionStyles(this.settings.overlayPosition);
    Object.assign(this.floatingButton.style, position);
    this.floatingButton.style.background = `rgba(74, 144, 226, ${this.settings.overlayOpacity})`;

    const menuPosition = this.getMenuPosition(this.settings.overlayPosition);
    Object.assign(this.settingsMenu.style, menuPosition);
    this.settingsMenu.style.background = `rgba(40, 40, 40, ${this.settings.overlayOpacity})`;
  }

  private getPositionStyles(position: string) {
    switch (position) {
      case 'top-left':
        return { top: '20px', left: '20px' };
      case 'top-right':
        return { top: '20px', right: '20px' };
      case 'bottom-left':
        return { bottom: '20px', left: '20px' };
      case 'bottom-right':
        return { bottom: '20px', right: '20px' };
      default:
        return { top: '20px', right: '20px' };
    }
  }

  private getMenuPosition(position: string) {
    switch (position) {
      case 'top-left':
        return { top: '80px', left: '20px' };
      case 'top-right':
        return { top: '80px', right: '20px' };
      case 'bottom-left':
        return { bottom: '80px', left: '20px' };
      case 'bottom-right':
        return { bottom: '80px', right: '20px' };
      default:
        return { top: '80px', right: '20px' };
    }
  }

  private dispatchEvent(eventType: string): void {
    const event = new CustomEvent(`crx-${eventType}`, {
      detail: { source: 'overlay' }
    });
    document.dispatchEvent(event);
  }

  private dispatchSettingChange(setting: string, value: string): void {
    const event = new CustomEvent('crx-setting-change', {
      detail: { setting, value }
    });
    document.dispatchEvent(event);
  }
}
