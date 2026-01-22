/**
 * Frontend Logger Service
 * 
 * Provides structured logging for the frontend with:
 * - Multiple log levels (debug, info, warn, error)
 * - Console output for development
 * - Optional remote logging to backend
 * - Browser storage for log history
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  data?: any;
  url?: string;
  userAgent?: string;
}

class Logger {
  private currentLevel: LogLevel;
  private enableRemoteLogging: boolean;
  private maxLocalLogs: number;
  private localStorageKey = 'app_logs';

  constructor() {
    // Set log level based on environment
    this.currentLevel = import.meta.env.DEV ? LogLevel.DEBUG : LogLevel.INFO;
    this.enableRemoteLogging = import.meta.env.PROD;
    this.maxLocalLogs = 100;

    // Listen for unhandled errors
    this.setupErrorHandlers();
  }

  /**
   * Setup global error handlers
   */
  private setupErrorHandlers(): void {
    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.error('Unhandled Promise Rejection', {
        reason: event.reason,
        promise: event.promise
      });
    });

    // Capture global errors
    window.addEventListener('error', (event) => {
      this.error('Uncaught Error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
      });
    });
  }

  /**
   * Set the current log level
   */
  public setLevel(level: LogLevel): void {
    this.currentLevel = level;
  }

  /**
   * Enable or disable remote logging
   */
  public setRemoteLogging(enabled: boolean): void {
    this.enableRemoteLogging = enabled;
  }

  /**
   * Log a debug message
   */
  public debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  /**
   * Log an info message
   */
  public info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }

  /**
   * Log a warning message
   */
  public warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }

  /**
   * Log an error message
   */
  public error(message: string, data?: any): void {
    this.log(LogLevel.ERROR, message, data);
  }

  /**
   * Internal logging method
   */
  private log(level: LogLevel, message: string, data?: any): void {
    // Check if this log level should be output
    if (level < this.currentLevel) {
      return;
    }

    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel[level],
      message,
      data,
      url: window.location.href,
      userAgent: navigator.userAgent,
    };

    // Output to console
    this.logToConsole(level, logEntry);

    // Store locally
    this.storeLogLocally(logEntry);

    // Send to remote server if enabled and appropriate level
    if (this.enableRemoteLogging && level >= LogLevel.WARN) {
      this.sendToRemote(logEntry);
    }
  }

  /**
   * Output log to browser console
   */
  private logToConsole(level: LogLevel, entry: LogEntry): void {
    const style = this.getConsoleStyle(level);
    const prefix = `[${entry.timestamp}] [${entry.level}]`;

    switch (level) {
      case LogLevel.DEBUG:
        if (import.meta.env.DEV) console.debug(prefix, entry.message, entry.data || '');
        else console.debug(JSON.stringify(entry));
        break;
      case LogLevel.INFO:
        if (import.meta.env.DEV) console.info(prefix, entry.message, entry.data || '');
        else console.info(JSON.stringify(entry));
        break;
      case LogLevel.WARN:
        if (import.meta.env.DEV) console.warn(prefix, entry.message, entry.data || '');
        else console.warn(JSON.stringify(entry));
        break;
      case LogLevel.ERROR:
        if (import.meta.env.DEV) console.error(prefix, entry.message, entry.data || '');
        else console.error(JSON.stringify(entry));
        break;
    }
  }

  /**
   * Get console styling for log level
   */
  private getConsoleStyle(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG:
        return 'color: #888;';
      case LogLevel.INFO:
        return 'color: #0066cc;';
      case LogLevel.WARN:
        return 'color: #ff9900;';
      case LogLevel.ERROR:
        return 'color: #cc0000; font-weight: bold;';
      default:
        return '';
    }
  }

  /**
   * Store log entry in browser storage
   */
  private storeLogLocally(entry: LogEntry): void {
    try {
      const logs = this.getLocalLogs();
      logs.push(entry);

      // Keep only the last N logs
      if (logs.length > this.maxLocalLogs) {
        logs.shift();
      }

      localStorage.setItem(this.localStorageKey, JSON.stringify(logs));
    } catch (error) {
      console.error('Failed to store log locally:', error);
    }
  }

  /**
   * Get logs from local storage
   */
  public getLocalLogs(): LogEntry[] {
    try {
      const stored = localStorage.getItem(this.localStorageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to retrieve local logs:', error);
      return [];
    }
  }

  /**
   * Clear local logs
   */
  public clearLocalLogs(): void {
    try {
      localStorage.removeItem(this.localStorageKey);
    } catch (error) {
      console.error('Failed to clear local logs:', error);
    }
  }

  /**
   * Export logs as JSON for debugging
   */
  public exportLogs(): string {
    return JSON.stringify(this.getLocalLogs(), null, 2);
  }

  /**
   * Download logs as a file
   */
  public downloadLogs(): void {
    const logs = this.exportLogs();
    const blob = new Blob([logs], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `app-logs-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Send log to remote server
   */
  private async sendToRemote(entry: LogEntry): Promise<void> {
    // Only send errors and warnings to backend
    if (entry.level !== 'ERROR' && entry.level !== 'WARN') {
      return;
    }

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:40001';
      
      // You can create a dedicated logging endpoint in your backend
      // For now, we'll use the feedback endpoint or create a new one
      // Uncomment when you create the logging endpoint:
      
      // await fetch(`${apiUrl}/logs/frontend`, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify(entry),
      // });

    } catch (error) {
      // Silently fail - don't create infinite loop
      console.error('Failed to send log to remote:', error);
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Make available globally for debugging
if (import.meta.env.DEV) {
  (window as any).logger = logger;
}
