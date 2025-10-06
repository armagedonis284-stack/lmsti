// Mobile detection and handling utilities

export const isMobile = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

export const isIOS = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
};

export const isAndroid = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  return /Android/.test(navigator.userAgent);
};

export const getMobileInfo = () => {
  if (typeof window === 'undefined') {
    return {
      isMobile: false,
      isIOS: false,
      isAndroid: false,
      userAgent: '',
      platform: ''
    };
  }

  return {
    isMobile: isMobile(),
    isIOS: isIOS(),
    isAndroid: isAndroid(),
    userAgent: navigator.userAgent,
    platform: navigator.platform
  };
};

// Safe localStorage operations for mobile
export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn(`Failed to get localStorage item '${key}':`, e);
      return null;
    }
  },

  setItem: (key: string, value: string): boolean => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (e) {
      console.warn(`Failed to set localStorage item '${key}':`, e);
      return false;
    }
  },

  removeItem: (key: string): boolean => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (e) {
      console.warn(`Failed to remove localStorage item '${key}':`, e);
      return false;
    }
  },

  clear: (): boolean => {
    try {
      localStorage.clear();
      return true;
    } catch (e) {
      console.warn('Failed to clear localStorage:', e);
      return false;
    }
  }
};

// Mobile-specific error handling
export const handleMobileError = (error: any, context: string) => {
  console.error(`Mobile error in ${context}:`, error);
  
  // Common mobile error patterns
  if (error?.message?.includes('QuotaExceededError')) {
    console.warn('localStorage quota exceeded, clearing old data...');
    safeLocalStorage.clear();
  }
  
  if (error?.message?.includes('SecurityError')) {
    console.warn('localStorage security error, likely in private browsing mode');
  }
  
  if (error?.message?.includes('NetworkError')) {
    console.warn('Network error detected, check internet connection');
  }
};