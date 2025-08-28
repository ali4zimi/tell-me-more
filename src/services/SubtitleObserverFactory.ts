// Subtitle observer factory for different platforms
import type { ISubtitleObserver } from './BaseSubtitleObserver';
import { NetflixSubtitleObserver } from './NetflixSubtitleObserver';
import { DisneySubtitleObserver } from './DisneySubtitleObserver';
import { AmazonSubtitleObserver } from './AmazonSubtitleObserver';
import { SubtitleObserver } from './SubtitleObserver'; // Fallback generic observer
import { PlatformDetectionService, type StreamingPlatform } from './PlatformDetectionService';

export class SubtitleObserverFactory {
  private static instance: SubtitleObserverFactory;

  public static getInstance(): SubtitleObserverFactory {
    if (!SubtitleObserverFactory.instance) {
      SubtitleObserverFactory.instance = new SubtitleObserverFactory();
    }
    return SubtitleObserverFactory.instance;
  }

  private constructor() {}

  public createObserver(
    capturedSubtitles: string[],
    settings: { subtitleMode: string; selectedLanguage: string }
  ): ISubtitleObserver {
    const platformService = PlatformDetectionService.getInstance();
    const platform = platformService.detectCurrentPlatform();

    if (!platform) {
      console.warn('[Subtitle Factory] Unknown platform, using generic observer');
      return new SubtitleObserver(capturedSubtitles, settings);
    }

    console.log(`[Subtitle Factory] Creating observer for platform: ${platform.name}`);

    switch (platform.name) {
      case 'netflix':
        return new NetflixSubtitleObserver(capturedSubtitles, settings, platform.retryInterval);
      
      case 'disney':
        return new DisneySubtitleObserver(capturedSubtitles, settings, platform.retryInterval);
      
      case 'amazon':
        return new AmazonSubtitleObserver(capturedSubtitles, settings, platform.retryInterval);
      
      default:
        console.warn(`[Subtitle Factory] Unsupported platform: ${platform.name}, using generic observer`);
        return new SubtitleObserver(capturedSubtitles, settings);
    }
  }

  public getSupportedPlatforms(): StreamingPlatform[] {
    return ['netflix', 'disney', 'amazon'];
  }

  public isPlatformSupported(): boolean {
    const platformService = PlatformDetectionService.getInstance();
    return platformService.isSupportedPlatform();
  }

  public getCurrentPlatform(): StreamingPlatform {
    const platformService = PlatformDetectionService.getInstance();
    return platformService.getPlatformName();
  }
}
