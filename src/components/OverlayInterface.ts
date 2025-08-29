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
  private settings: OverlaySettings;

  constructor(settings: OverlaySettings, _capturedSubtitles: string[]) {
    this.settings = settings;
    this.overlayContainer = this.createOverlayContainer();
    this.floatingButton = this.createFloatingButton();
  }

  public render(): HTMLElement {
    this.overlayContainer.appendChild(this.floatingButton);
    this.setupEventListeners();
    return this.overlayContainer;
  }

  public updateSubtitleCount(): void {
    // This method is no longer needed since we removed the settings menu
    // Keep for compatibility but make it a no-op
  }

  public updateSettings(newSettings: Partial<OverlaySettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.updateOverlayStyles();
  }

  // Remove showSettings method as it's no longer needed

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

  private setupEventListeners(): void {
    // Floating button click - opens chat directly
    this.floatingButton.addEventListener('click', (e) => {
      e.stopPropagation();
      console.log('[OverlayInterface] Floating button clicked, opening chat');
      this.dispatchEvent('openChat');
    });
  }

  private updateOverlayStyles(): void {
    const position = this.getPositionStyles(this.settings.overlayPosition);
    Object.assign(this.floatingButton.style, position);
    this.floatingButton.style.background = `rgba(74, 144, 226, ${this.settings.overlayOpacity})`;
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

  private dispatchEvent(eventType: string): void {
    const event = new CustomEvent(`crx-${eventType}`, {
      detail: { source: 'overlay' }
    });
    document.dispatchEvent(event);
  }
}
