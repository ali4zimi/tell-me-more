// Utility functions for Movie Assistant
export function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString();
}

export function sanitizeText(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: number;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = window.setTimeout(() => func(...args), wait);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

export function createNotification(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    border-radius: 8px;
    color: white;
    font-family: Arial, sans-serif;
    font-size: 14px;
    z-index: 10001;
    max-width: 300px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    transition: opacity 0.3s ease;
  `;

  switch (type) {
    case 'success':
      notification.style.backgroundColor = '#10b981';
      break;
    case 'error':
      notification.style.backgroundColor = '#ef4444';
      break;
    default:
      notification.style.backgroundColor = '#3b82f6';
  }

  notification.textContent = message;
  document.body.appendChild(notification);

  // Auto-remove after 3 seconds
  setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 3000);
}
