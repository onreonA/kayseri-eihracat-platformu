
// Utility functions - Yardımcı fonksiyonlar

// Tarih formatlama fonksiyonları
export const formatDate = (date: Date | string): string => {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch (error) {
    console.error('Date formatting error:', error);
    return 'Geçersiz tarih';
  }
};

export const formatDateTime = (date: Date | string): string => {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error('DateTime formatting error:', error);
    return 'Geçersiz tarih';
  }
};

export const formatTime = (date: Date | string): string => {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error('Time formatting error:', error);
    return 'Geçersiz saat';
  }
};

// Metin yardımcı fonksiyonları
export const truncateText = (text: string, maxLength: number = 100): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

export const capitalizeFirst = (text: string): string => {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

export const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
};

// Sayı formatlama fonksiyonları
export const formatNumber = (num: number): string => {
  return num.toLocaleString('tr-TR');
};

export const formatCurrency = (amount: number, currency: string = 'TRY'): string => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: currency
  }).format(amount);
};

export const formatPercentage = (value: number, decimals: number = 1): string => {
  return `${value.toFixed(decimals)}%`;
};

// Dosya yardımcı fonksiyonları
export const getFileExtension = (filename: string): string => {
  return filename.split('.').pop()?.toLowerCase() || '';
};

export const getFileSize = (bytes: number): string => {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
};

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^(\\+90|0)?[1-9][0-9]{9}$/;
  return phoneRegex.test(phone.replace(/\\s/g, ''));
};

export const getYouTubeVideoId = (url: string): string | null => {
  if (!url) return null;
  return null;
};

export const getYouTubeThumbnail = (videoId: string, quality: 'default' | 'medium' | 'high' | 'maxres' = 'medium'): string => {
  return `https://img.youtube.com/vi/${videoId}/${quality}default.jpg`;
};

// Validation fonksiyonları
export const validateRequired = (value: any): boolean => {
  return value !== null && value !== undefined && value !== '';
};

export const validateMinLength = (value: string, minLength: number): boolean => {
  return value.length >= minLength;
};

export const validateMaxLength = (value: string, maxLength: number): boolean => {
  return value.length <= maxLength;
};

// Local storage yardımcı fonksiyonları
export const setLocalStorage = (key: string, value: any): void => {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(value));
    }
  } catch (error) {
    console.error('Local storage set error:', error);
  }
};

export const getLocalStorage = <T>(key: string, defaultValue: T): T => {
  try {
    if (typeof window !== 'undefined') {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    }
    return defaultValue;
  } catch (error) {
    console.error('Local storage get error:', error);
    return defaultValue;
  }
};

export const removeLocalStorage = (key: string): void => {
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(key);
    }
  } catch (error) {
    console.error('Local storage remove error:', error);
  }
};

// Async yardımcı fonksiyonları
export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void => {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// CSS class yardımcı fonksiyonları
export const cn = (...classes: (string | undefined | null | boolean)[]): string => {
  return classes.filter(Boolean).join(' ');
};

// Dizi yardımcı fonksiyonları
export const groupBy = <T, K extends keyof T>(array: T[], key: K): Record<string, T[]> => {
  return array.reduce((groups, item) => {
    const group = String(item[key]);
    groups[group] = groups[group] || [];
    groups[group].push(item);
    return groups;
  }, {} as Record<string, T[]>);
};

export const sortBy = <T>(array: T[], key: keyof T, order: 'asc' | 'desc' = 'asc'): T[] => {
  return [...array].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];

    if (aVal < bVal) return order === 'asc' ? -1 : 1;
    if (aVal > bVal) return order === 'asc' ? 1 : -1;
    return 0;
  });
};

export const unique = <T>(array: T[]): T[] => {
  return [...new Set(array)];
};

export const uniqueBy = <T, K extends keyof T>(array: T[], key: K): T[] => {
  const seen = new Set();
  return array.filter(item => {
    const value = item[key];
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
};

// Performans yardımcı fonksiyonları
export const measurePerformance = (name: string, fn: () => any): any => {
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  console.log(`${name} took ${end - start} milliseconds`);
  return result;
};

// Hata yönetimi
export const handleError = (error: unknown, context: string = 'Unknown'): void => {
  console.error(`Error in ${context}:`, error);

  // Gerçek uygulamada hata raporlama servisi kullanılabilir
  if (process.env.NODE_ENV === 'production') {
    // Hata raporlama servisi entegrasyonu
  }
};

// Clipboard işlemleri
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const result = document.execCommand('copy');
      textArea.remove();
      return result;
    }
  } catch (error) {
    console.error('Copy to clipboard failed:', error);
    return false;
  }
};

// Device detection
export const isMobile = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= 768;
};

export const isTablet = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth > 768 && window.innerWidth <= 1024;
};

export const isDesktop = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth > 1024;
};

// Scroll yardımcı fonksiyonları
export const scrollToTop = (smooth: boolean = true): void => {
  if (typeof window !== 'undefined') {
    window.scrollTo({
      top: 0,
      behavior: smooth ? 'smooth' : 'auto'
    });
  }
};

export const scrollToElement = (elementId: string, offset: number = 0): void => {
  if (typeof window !== 'undefined') {
    const element = document.getElementById(elementId);
    if (element) {
      const elementPosition = element.offsetTop - offset;
      window.scrollTo({
        top: elementPosition,
        behavior: 'smooth'
      });
    }
  }
};

// Random yardımcı fonksiyonları
export const generateRandomId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

export const generateRandomColor = (): string => {
  const colors = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
    '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

// Form validation
export const validateForm = (data: Record<string, any>, rules: Record<string, any>): Record<string, string> => {
  const errors: Record<string, string> = {}

  Object.keys(rules).forEach(field => {
    const value = data[field];
    const rule = rules[field];

    if (rule.required && !validateRequired(value)) {
      errors[field] = `${field} alanı zorunludur`;
    }

    if (rule.minLength && value && !validateMinLength(value, rule.minLength)) {
      errors[field] = `${field} en az ${rule.minLength} karakter olmalıdır`;
    }

    if (rule.maxLength && value && !validateMaxLength(value, rule.maxLength)) {
      errors[field] = `${field} en fazla ${rule.maxLength} karakter olmalıdır`;
    }

    if (rule.email && value && !isValidEmail(value)) {
      errors[field] = `${field} geçerli bir e-posta adresi olmalıdır`;
    }

    if (rule.phone && value && !isValidPhone(value)) {
      errors[field] = `${field} geçerli bir telefon numarası olmalıdır`;
    }
  });

  return errors;
};

export default {
  formatDate,
  formatDateTime,
  formatTime,
  truncateText,
  capitalizeFirst,
  slugify,
  formatNumber,
  formatCurrency,
  formatPercentage,
  getFileExtension,
  getFileSize,
  isValidEmail,
  isValidPhone,
  getYouTubeVideoId,
  getYouTubeThumbnail,
  validateRequired,
  validateMinLength,
  validateMaxLength,
  setLocalStorage,
  getLocalStorage,
  removeLocalStorage,
  delay,
  debounce,
  throttle,
  cn,
  groupBy,
  sortBy,
  unique,
  uniqueBy,
  measurePerformance,
  handleError,
  copyToClipboard,
  isMobile,
  isTablet,
  isDesktop,
  scrollToTop,
  scrollToElement,
  generateRandomId,
  generateRandomColor,
  validateForm
};
