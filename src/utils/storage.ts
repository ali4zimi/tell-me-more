// Storage utilities for Movie Assistant
export interface StorageData {
  subtitleMode?: string;
  selectedLanguage?: string;
  aiProvider?: string;
  aiModel?: string;
  apiKey?: string;
  overlayPosition?: string;
  overlayOpacity?: number;
  netflixSubs?: any[];
  conversations?: any[];
  sessionStats?: any;
}

export function getStorageData(keys: string | string[] | object): Promise<any> {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys as any, resolve);
  });
}

export function setStorageData(data: StorageData): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set(data, resolve);
  });
}

export function clearStorageData(keys?: string[]): Promise<void> {
  return new Promise((resolve) => {
    if (keys) {
      chrome.storage.local.remove(keys, resolve);
    } else {
      chrome.storage.local.clear(resolve);
    }
  });
}
