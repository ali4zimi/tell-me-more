// Platform detection service for Movie Assistant
export type StreamingPlatform = 'netflix' | 'disney' | 'amazon' | 'unknown';

export interface PlatformConfig {
  name: StreamingPlatform;
  domain: string;
  subtitleSelectors: {
    container: string[];
    textElements: string[];
    shadowRoot?: boolean;
  };
  videoPlayerSelector: string;
  retryInterval: number;
}

export class PlatformDetectionService {
  private static instance: PlatformDetectionService;
  
  private platformConfigs: PlatformConfig[] = [
    {
      name: 'netflix',
      domain: 'netflix.com',
      subtitleSelectors: {
        container: ['.video-player-container'],
        textElements: ['.player-timedtext-text-container span span'],
        shadowRoot: true
      },
      videoPlayerSelector: '.video-player-container',
      retryInterval: 1000
    },
    {
      name: 'disney',
      domain: 'disneyplus.com',
      subtitleSelectors: {
        container: ['.dss-subtitle-renderer', '.subtitle-container'],
        textElements: ['.subtitle-text', '.dss-subtitle-text', 'span'],
        shadowRoot: false
      },
      videoPlayerSelector: '.btm-media-player',
      retryInterval: 1500
    },
    {
      name: 'amazon',
      domain: 'primevideo.com',
      subtitleSelectors: {
        container: ['.webPlayerContainer .webPlayerSDKContainer', '.subtitles'],
        textElements: ['.f35bt6a', '.atvwebplayersdk-captions-text', 'span'],
        shadowRoot: false
      },
      videoPlayerSelector: '.webPlayerContainer',
      retryInterval: 1200
    }
  ];

  public static getInstance(): PlatformDetectionService {
    if (!PlatformDetectionService.instance) {
      PlatformDetectionService.instance = new PlatformDetectionService();
    }
    return PlatformDetectionService.instance;
  }

  private constructor() {}

  public detectCurrentPlatform(): PlatformConfig | null {
    const currentDomain = window.location.hostname;
    
    for (const config of this.platformConfigs) {
      if (currentDomain.includes(config.domain)) {
        console.log(`[Platform Detection] Detected platform: ${config.name}`);
        return config;
      }
    }
    
    console.log(`[Platform Detection] Unknown platform: ${currentDomain}`);
    return null;
  }

  public isSupportedPlatform(): boolean {
    return this.detectCurrentPlatform() !== null;
  }

  public getPlatformName(): StreamingPlatform {
    const platform = this.detectCurrentPlatform();
    return platform ? platform.name : 'unknown';
  }

  public getPlatformConfig(): PlatformConfig | null {
    return this.detectCurrentPlatform();
  }

  public addCustomPlatform(config: PlatformConfig): void {
    this.platformConfigs.push(config);
  }
}
